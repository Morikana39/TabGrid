import {reorderAroundSplits,planSplitReorder} from '../../lib/split-reorder.mjs';
const output=document.querySelector('#output'),run=document.querySelector('#run');
const cleanup=document.querySelector('#cleanup'),download=document.querySelector('#download');
let report,windowId,owned=[],runToken;
const show=()=>{output.textContent=JSON.stringify(report,null,2);download.disabled=false;};
const snapshot=async()=> (await chrome.tabs.query({windowId})).sort((a,b)=>a.index-b.index).map(({id,index,groupId,splitViewId,pinned,windowId})=>({id,index,groupId,splitViewId,pinned,windowId}));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const verify=(state,ids,splitId)=>{
    const pair=ids.map(id=>state.find(t=>t.id===id));
    if(pair.some(t=>!t || t.splitViewId!==splitId) || pair[1].index!==pair[0].index+1)throw Error('Original split ID or adjacency was lost.');
};
run.addEventListener('click',async()=>{
    run.disabled=true;report={started:new Date().toISOString(),userAgent:navigator.userAgent,results:[]};show();
    try{
        if(!chrome.tabs.createSplit)throw Error('Chrome 155 or later is required.');
        runToken=crypto.randomUUID();
        const urls=['A','B','C','D'].map(label=>chrome.runtime.getURL(`tests/native-split/target.html?label=${label}&run=${runToken}`));
        const win=await chrome.windows.create({url:urls,focused:false});windowId=win.id;
        const initial=await snapshot();owned=initial.map(t=>t.id);cleanup.disabled=false;
        if(owned.length!==4)throw Error('Unexpected test-window tab count.');
        const [a,b,c,d]=owned;
        await chrome.tabs.createSplit([a,b]);
        const splitId=(await chrome.tabs.get(a)).splitViewId;
        if(!(splitId>=0))throw Error('Chrome did not return split membership.');
        const execute=async(label,ids,options)=>{
            const result={label,before:await snapshot(),moves:[]};report.results.push(result);show();
            // Every move goes through the production planner. Record its native
            // result and ensure it never passes either pane to tabs.move.
            const api={tabs:{query:q=>chrome.tabs.query(q),move:async(id,props)=>{
                if([a,b].includes(id))throw Error('Attempted to move a split member.');
                const value=await chrome.tabs.move(id,props);const state=await snapshot();
                result.moves.push({kind:'tab',id,index:props.index,state});verify(state,[a,b],splitId);return value;
            }},tabGroups:{move:async(id,props)=>{
                const value=await chrome.tabGroups.move(id,props);const state=await snapshot();
                result.moves.push({kind:'group',id,index:props.index,state});verify(state,[a,b],splitId);return value;
            }}};
            try{
                await reorderAroundSplits(api,await chrome.tabs.query({windowId}),ids,options);
                result.after=await snapshot();verify(result.after,[a,b],splitId);
                if(!same(result.after.map(t=>t.id),ids))throw Error('Wrong final order.');
                result.passed=true;
            }catch(error){result.error=error.message;result.passed=false;throw error;}
            finally{show();}
        };
        await execute('Pair to right',[c,d,a,b]);
        await execute('Pair to left',[a,b,c,d]);
        await execute('Pair between ordinary tabs',[c,a,b,d]);
        const groupId=await chrome.tabs.group({tabIds:owned,createProperties:{windowId}});
        await chrome.tabGroups.update(groupId,{title:'Disposable split test',color:'blue'});
        await execute('Reorder within group',[a,b,d,c],{groupId});
        await chrome.tabs.ungroup([a,b]);
        verify(await snapshot(),[a,b],splitId);
        report.results.push({label:'Ungroup both panes for continue drag',passed:true,state:await snapshot()});show();
        const grouped=(await snapshot()).filter(t=>t.groupId===groupId).map(t=>t.id);
        await execute('Place pair after remaining group',[...grouped,a,b]);
        await execute('Place pair before remaining group',[a,b,...grouped]);
        await chrome.tabs.ungroup(grouped);
        await chrome.tabs.createSplit(grouped);
        const before=await chrome.tabs.query({windowId});
        let rejected=false;
        try{planSplitReorder(before,[...grouped,a,b]);}catch{rejected=true;}
        if(!rejected || !same(await snapshot(),before.sort((a,b)=>a.index-b.index).map(({id,index,groupId,splitViewId,pinned,windowId})=>({id,index,groupId,splitViewId,pinned,windowId}))))throw Error('Unsafe crossing was not rejected before mutation.');
        report.results.push({label:'Crossing two split pairs rejected without changes',passed:true});
        report.passed=true;
    }catch(error){report.passed=false;report.error=error.message;}
    report.finished=new Date().toISOString();show();
});
cleanup.addEventListener('click',async()=>{
    // Verify ownership again: never close a test tab navigated to another page.
    for(const id of owned){
        const tab=await chrome.tabs.get(id).catch(()=>null);
        if(tab?.url?.startsWith(chrome.runtime.getURL('tests/native-split/target.html')) && new URL(tab.url).searchParams.get('run')===runToken)await chrome.tabs.remove(id);
    }
    cleanup.disabled=true;run.disabled=false;owned=[];
});
download.addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='TabGrid-native-split-test.json';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
});
