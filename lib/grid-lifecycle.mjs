import {isGridUrl} from './tab-model.mjs';

// Chrome tabs, rather than page focus/blur, own this lifecycle. Separate split
// incognito workers never close or reuse the other browsing context's grid.
export class GridLifecycle {
    constructor(api,gridUrl,{privateMode=false,preferences,now=()=>Date.now()}={}){
        Object.assign(this,{api,gridUrl,privateMode,preferences,now});this.queue=Promise.resolve();
        this.resumeKey=`tabgridQuickView:${privateMode?'private':'regular'}`;
    }
    serial(work){const result=this.queue.then(work,work);this.queue=result.catch(()=>{});return result;}
    isGrid(tab){return Boolean(tab)&&Boolean(tab.incognito)===this.privateMode&&(!tab.pendingUrl||isGridUrl(tab.pendingUrl,this.gridUrl))&&isGridUrl(tab.url||tab.pendingUrl,this.gridUrl);}
    async findExisting(windowId){
        if (!Number.isInteger(windowId)) return null;
        const grids=(await this.api.tabs.query({windowId})).filter(t=>t.windowId===windowId&&this.isGrid(t));
        const preferred=grids.find(t=>t.active);
        if(preferred){grids.splice(grids.indexOf(preferred),1);grids.unshift(preferred);}
        // Never close restored/manual duplicates: each removal creates another
        // recently-closed entry and makes Chrome's restore shortcut loop.
        for(const tab of grids){
            const live=await this.api.tabs.get(tab.id).catch(()=>null);
            if(live?.windowId===windowId&&this.isGrid(live))return live;
        }
        return null;
    }
    open(source){return this.serial(async()=>{
        const current=await this.api.tabs.get(source.id).catch(()=>null);
        if(!current?.active||Boolean(current.incognito)!==this.privateMode)return;
        const existing=await this.findExisting(current.windowId);
        const liveSource=await this.api.tabs.get(source.id).catch(()=>null);
        if(!liveSource?.active||liveSource.windowId!==current.windowId)return;
        if(existing){await this.api.tabs.update(existing.id,{active:true});await this.api.windows.update(existing.windowId,{focused:true});}
        else await this.api.tabs.create({url:this.gridUrl,windowId:current.windowId,active:true});
    });}
    viewKey(windowId){return `${this.resumeKey}:${windowId}`;}
    async takeView(windowId){if(!Number.isInteger(windowId))return null;const key=this.viewKey(windowId),value=(await this.api.storage.session.get(key))[key];await this.api.storage.session.remove(key);return value||null;}
    switchTo(sourceId,targetId,{keepOpen=false,view=null}={}){return this.serial(async()=>{
        const source=await this.api.tabs.get(sourceId),target=await this.api.tabs.get(targetId);
        if(!this.isGrid(source)||Boolean(target.incognito)!==this.privateMode||this.isGrid(target))throw Error('Invalid tab switch');
        const prefs=await this.preferences();
        await this.api.tabs.update(targetId,{active:true});await this.api.windows.update(target.windowId,{focused:true});
        if(!prefs.closeAfterSwitch||keepOpen)return {closed:false};
        const {tabgridUndo=[]}=await this.api.storage.session.get('tabgridUndo');
        if(!this.privateMode&&tabgridUndo.some(e=>e.completedAt&&this.now()-e.completedAt<prefs.undoMs&&e.tabs.some(t=>['closed','changed'].includes(t.state))))return {closed:false};
        const [live,selected,win]=await Promise.all([this.api.tabs.get(sourceId).catch(()=>null),this.api.tabs.get(targetId).catch(()=>null),this.api.windows.get(target.windowId).catch(()=>null)]);
        // Do not close if the user returned to the grid while the switch waited.
        if(!this.isGrid(live)||!selected?.active||win?.focused===false||(live.windowId===target.windowId&&live.active))return {closed:false};
        const resumeKey=this.viewKey(source.windowId);
        if(view)await this.api.storage.session.set({[resumeKey]:view});
        try{await this.api.tabs.remove(sourceId);}catch(error){await this.api.storage.session.remove(resumeKey);throw error;}
        return {closed:true};
    });}
}
