import {canCaptureUrl,shrinkPreview} from './preview-capture.mjs';
import { DEFAULTS, PREFS_KEY, siteMatches } from './preferences.mjs';
import { isGridUrl } from './tab-model.mjs';
const INDEX = 'tabgridPreviewIndex';
const GRANT = 'tabgridPreviewGrant_';
export class PreviewCache {
    constructor(api, gridUrl, {now = () => Date.now(), wait = ms => new Promise(resolve => setTimeout(resolve, ms))} = {}) { this.api=api;this.gridUrl=gridUrl;this.epoch=0;this.writeEpoch=0;this.recent=new Map();this.queue=Promise.resolve();this.captureQueue=Promise.resolve();this.lastCapture=-Infinity;this.now=now;this.wait=wait; }
    serial(work) { const result=this.queue.then(work,work);this.queue=result.catch(()=>{});return result; }
    invalidateCaptures() { this.epoch++; }
    invalidate() { this.epoch++; this.writeEpoch++; this.recent.clear(); }
    async activity(tabId) {
        let timer;
        try {
            const state=await Promise.race([
                this.api.tabs.sendMessage(tabId, {type:'tabgrid-preview-state'}, {frameId:0}),
                new Promise(resolve => { timer=setTimeout(()=>resolve(null),50); })
            ]);
            return typeof state?.documentId==='string' && Number.isSafeInteger(state.revision) && state.revision>=0 ? state : null;
        } catch { return null; } finally { clearTimeout(timer); }
    }
    async canReuse(tabId, url) {
        const recent=this.recent.get(tabId);
        if(!recent||recent.url!==url||!recent.activity||this.now()-recent.time>1500)return false;
        const activity=await this.activity(tabId);
        return this.recent.get(tabId)===recent && this.now()-recent.time<=1500 &&
            activity?.documentId===recent.activity.documentId && activity?.revision===recent.activity.revision;
    }
    async preferences() { return {...DEFAULTS,...(await this.api.storage.local.get(PREFS_KEY))[PREFS_KEY]}; }
    async bytes(keys) { if(!keys.length)return 0; if(this.api.storage.local.getBytesInUse)return this.api.storage.local.getBytesInUse(keys);const data=await this.api.storage.local.get(null);return keys.reduce((n,k)=>n+new TextEncoder().encode(JSON.stringify({[k]:data[k]})).length,0); }
    async trim(index, limit) {
        const kept=Object.keys(index).sort((a,b)=>index[a].time-index[b].time);
        let usage=await this.bytes(kept);
        while(usage>limit && kept.length) {const key=kept.shift();await this.api.storage.local.remove(key);delete index[key];this.recent.delete(Number(key.slice(11)));usage=await this.bytes(kept);}
        await this.api.storage.local.set({[INDEX]:index});
        return {bytes:usage,count:kept.length,limit};
    }
    async reconcileNow() {
        const [data,tabs,prefs]=await Promise.all([this.api.storage.local.get(null),this.api.tabs.query({}),this.preferences()]);
        const index=data[INDEX]||{},keys=Object.keys(data).filter(k=>k.startsWith('screenshot_')),remove=[];
        for(const key of keys) {
            const tab=tabs.find(t=>t.id===Number(key.slice(11))), meta=index[key];
            if(!tab || tab.incognito || isGridUrl(tab.url,this.gridUrl) || siteMatches(tab.url,prefs.previewSites) || (meta && meta.url!==tab.url)) {remove.push(key);delete index[key];continue;}
            index[key]={url:tab.url,time:meta?.time||0};
        }
        for(const key of Object.keys(index))if(!keys.includes(key))delete index[key];
        if(remove.length)await this.api.storage.local.remove(remove);
        return this.trim(index,prefs.previewLimit*1024*1024);
    }
    reconcile() { return this.serial(()=>this.reconcileNow()); }
    async clear(tabId=null) {
        this.invalidate();
        // Navigation/closure also retires remembered capture eligibility. This
        // session hint never grants permission; Chrome validates every attempt.
        const session=this.api.storage.session;
        if(session){const keys=tabId===null?Object.keys(await session.get(null)).filter(k=>k.startsWith(GRANT)):[`${GRANT}${tabId}`];for(const key of keys)await session.remove(key);}
        return this.serial(async()=>{const data=await this.api.storage.local.get(null);const keys=Object.keys(data).filter(k=>k.startsWith('screenshot_')&&(tabId===null||k===`screenshot_${tabId}`));if(keys.length)await this.api.storage.local.remove(keys);return this.reconcileNow();});
    }
    capture(tabId, {signal, expectedUrl, backgroundSave = false, userInvoked = false} = {}) {
        const token=this.epoch;
        const work=()=>this.captureNow(tabId,token,signal,expectedUrl,userInvoked);
        const result=this.captureQueue.then(work,work);
        this.captureQueue=result.catch(()=>{});
        return result.then(snapshot=>{
            if(!snapshot)return;
            const saved=this.serial(()=>this.saveSnapshot(snapshot));
            // Once pixels and their source are confirmed, storage need not hold
            // up opening. Later activation does not invalidate these pixels.
            if(backgroundSave){saved.catch(()=>{});return;}
            return saved;
        });
    }
    async saveSnapshot({tab,data,time,activity,writeEpoch,quality}) {
        data=await shrinkPreview(data,quality);
        const [current,p]=await Promise.all([this.api.tabs.get(tab.id).catch(()=>null),this.preferences()]);
        if(writeEpoch!==this.writeEpoch||!current||current.incognito||current.url!==tab.url||!p.capture||siteMatches(current.url,p.previewSites))return;
        const key=`screenshot_${tab.id}`,size=new TextEncoder().encode(JSON.stringify({[key]:data})).length;
        if(size>p.previewLimit*1024*1024)return;
        const index=(await this.api.storage.local.get(INDEX))[INDEX]||{};index[key]={url:tab.url,time};
        if(writeEpoch!==this.writeEpoch)return;
        await this.api.storage.local.set({[key]:data});
        await this.trim(index,p.previewLimit*1024*1024);
        if(writeEpoch===this.writeEpoch&&index[key]) { this.recent.set(tab.id,{url:tab.url,time,activity}); return true; }
    }
    async captureNow(tabId, token, signal, expectedUrl, userInvoked=false) {
        try {
            if(signal?.aborted||token!==this.epoch)return;
            // Chrome's capture quota is shared across windows. Wait rather than
            // dropping the last settled interaction or the pre-open capture.
            const remaining=600-(this.now()-this.lastCapture);
            if(remaining>0)await this.wait(remaining);
            const [tab,prefs]=await Promise.all([this.api.tabs.get(tabId),this.preferences()]);
            if(signal?.aborted||token!==this.epoch||(expectedUrl&&expectedUrl!==tab.url))return;
            if(!prefs.capture||!tab.active||tab.incognito||isGridUrl(tab.url,this.gridUrl)||siteMatches(tab.url,prefs.previewSites))return;
            const restricted=!canCaptureUrl(tab.url),grantKey=`${GRANT}${tabId}`,session=this.api.storage.session;
            const remembered=restricted&&session?(await session.get(grantKey))[grantKey]===tab.url:false;
            if(!canCaptureUrl(tab.url,userInvoked||remembered))return;
            const activity=await this.activity(tabId);
            if(signal?.aborted||token!==this.epoch)return;
            const writeEpoch=this.writeEpoch;
            this.lastCapture=this.now();
            const time=this.lastCapture;
            let data;
            try { data=await this.api.tabs.captureVisibleTab(tab.windowId,{format:'jpeg',quality:prefs.previewQuality}); }
            catch(error){if(restricted&&session)await session.remove(grantKey);throw error;}
            const [current,p,activeTabs]=await Promise.all([
                this.api.tabs.get(tabId).catch(()=>null),this.preferences(),this.api.tabs.query({windowId:tab.windowId})
            ]);
            if(signal?.aborted||token!==this.epoch||!current||current.incognito||activeTabs.find(t=>t.active)?.id!==tabId||current.url!==tab.url||!p.capture||siteMatches(current.url,p.previewSites))return;
            // Only remember a successful capture in this browser session, scoped
            // to this exact tab and URL. Do not store large data URLs here.
            if(restricted&&session&&tab.url.length<=4096)await session.set({[grantKey]:tab.url});
            return {tab,data,time,activity,writeEpoch,quality:prefs.previewQuality};
        } catch { /* Restricted or closed pages retain the local fallback. */ }
    }
}
