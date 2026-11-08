import { tr } from './i18n.mjs';
// Chromium TabListCoordinator uses a strict 50% overlap threshold.
export const GROUP_OVERLAP_THRESHOLD = .5;
export const GROUP_EXIT_MS=450, GROUP_EXIT_MARGIN=24;
export function outsideGroup(point,rect,viewport={width:Infinity,height:Infinity}){
    return point.x<rect.left-Math.min(GROUP_EXIT_MARGIN,rect.left/2)||point.x>rect.right+Math.min(GROUP_EXIT_MARGIN,(viewport.width-rect.right)/2)||point.y<rect.top-Math.min(GROUP_EXIT_MARGIN,rect.top/2)||point.y>rect.bottom+Math.min(GROUP_EXIT_MARGIN,(viewport.height-rect.bottom)/2);
}
export function cardOverlap(a,b){
    const area=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
    const maximum=Math.min(a.width,b.width)*Math.min(a.height,b.height);
    return maximum>0?area/maximum:0;
}
export function draggedRect(rect,origin,point){
    const x=point.x-origin.x,y=point.y-origin.y;
    return {...rect,left:rect.left+x,right:rect.right+x,top:rect.top+y,bottom:rect.bottom+y};
}
// Use the far edge on the grid's ordering axis: horizontal within a row,
// vertical between rows. An unrelated edge must not authorize an insertion.
// Compare stable slots and ignore subpixel layout differences.
export function reorderDirection(source,target,dragged){
    const epsilon=1;
    const rowOverlap=Math.min(source.bottom,target.bottom)-Math.max(source.top,target.top);
    const sameRow=rowOverlap>Math.min(source.height,target.height)/2;
    if(sameRow){
        if(target.left>source.left+epsilon&&dragged.right>target.right+epsilon)return 1;
        if(target.left<source.left-epsilon&&dragged.left<target.left-epsilon)return -1;
    }else{
        if(target.top>source.top+epsilon&&dragged.bottom>target.bottom+epsilon)return 1;
        if(target.top<source.top-epsilon&&dragged.top<target.top-epsilon)return -1;
    }
    return 0;
}
export function overUngroupBar(point,bar){
    return point.x>=bar.left&&point.x<=bar.right&&point.y>=bar.top&&point.y<=bar.bottom;
}
export function groupDestination(source,target){
    if(!source||!target||source.key===target.key||source.tab?.pinned||target.tab?.pinned)return null;
    const members=source.members||[source.tab],groupId=target.group?.id??target.tab?.groupId;
    if(groupId>=0&&members.every(tab=>tab?.groupId===groupId))return null;
    if(target.tab&&members.some(tab=>tab?.id===target.tab.id))return null;
    return {destination:groupId>=0?groupId:'new',targetId:groupId>=0?null:target.tab?.id,...(target.splitViewId!==undefined?{targetIds:target.members.map(tab=>tab.id)}:{}),windowId:(target.group||target.tab).windowId};
}
export function createDragGrouping({enabled,dialog,feedback,canReorder=()=>true,handoff=()=>{},notify=()=>{},doc=document,win=window}){
    let drag=null,candidate=null,pressed=null,exitTimer;
    const bar=doc.createElement('div');bar.className='group-ungroup-bar';bar.hidden=true;bar.textContent=tr("Remove from group");bar.setAttribute('role','status');dialog.append(bar);
    const rectOf=card=>{const r=card.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    function clearCandidate(){feedback.direct(null);if(candidate)delete candidate.card.dataset.groupDrop;candidate=null;}
    function clearExit(){clearTimeout(exitTimer);exitTimer=null;delete dialog.dataset.dragExit;}
    function reset(){clearCandidate();clearExit();delete bar.dataset.ready;bar.hidden=true;notify('');drag=null;}
    function status(text){notify(text);}
    // Capture the grab point before Sortable moves its stable slot. The footprint
    // follows the pointer without depending on the animated/shrunken fallback.
    doc.addEventListener('mousedown',event=>{
        const card=event.target.closest?.('.card[data-key]');
        pressed=card?{card,rect:rectOf(card),origin:{x:event.clientX,y:event.clientY}}:null;
    },true);
    function point(event){
        if(!drag||drag.cancelled||!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return;
        if(!enabled()){cancel();return;}
        const p={x:event.clientX,y:event.clientY},footprint=draggedRect(drag.rect,drag.origin,p);drag.point=p;
        if(doc.elementFromPoint(p.x,p.y)?.closest('.drop-target')){clearCandidate();clearExit();drag.ungroup=false;drag.outside=false;delete bar.dataset.ready;status('');return;}
        if(drag.scope==='group'&&!drag.handedOff){
            clearCandidate();
            if(!dialog.open){cancel();return;}
            const bounds=dialog.getBoundingClientRect();
            drag.ungroup=overUngroupBar(p,bar.getBoundingClientRect());
            drag.outside=p.x<bounds.left||p.x>bounds.right||p.y<bounds.top||p.y>bounds.bottom;
            if(outsideGroup(p,bounds,{width:win.innerWidth,height:win.innerHeight})){
                delete bar.dataset.ready;dialog.dataset.dragExit='pending';bar.textContent=tr("Keep holding outside to continue on the main grid");
                if(!exitTimer)exitTimer=setTimeout(()=>{
                    exitTimer=null;if(!drag||drag.cancelled||!enabled())return;
                    drag.handedOff=true;drag.outside=false;drag.ungroup=false;bar.hidden=true;delete dialog.dataset.dragExit;
                    handoff(drag.card,drag.groupId);status(tr("Continue dragging · Release on empty space to ungroup"));
                    point({clientX:drag.point.x,clientY:drag.point.y});
                },GROUP_EXIT_MS);
                return;
            }
            clearExit();
            if(drag.ungroup){bar.dataset.ready='';dialog.dataset.dragExit='ready';bar.textContent=tr("Release to remove from group");}
            else {delete bar.dataset.ready;delete dialog.dataset.dragExit;bar.textContent=tr("Remove from group");}
            return;
        }
        // Chrome uses the first eligible visible card whose rectangle overlaps
        // more than half the smaller card area. A dwell timer is not involved.
        const card=[...doc.querySelectorAll('.grid-container[data-scope="root"] > .card[data-key]')].find(card=>{
            if(card===drag.card||card.classList.contains('sortable-ghost')||card.classList.contains('sortable-drag')||card.closest('[hidden],[inert]')||!groupDestination(drag.card.itemModel,card.itemModel))return false;
            const r=card.getBoundingClientRect();
            return r.bottom>0&&r.top<win.innerHeight&&r.right>0&&r.left<win.innerWidth&&cardOverlap(footprint,r)>GROUP_OVERLAP_THRESHOLD&&!(canReorder(card)&&reorderDirection(rectOf(drag.card),r,footprint));
        });
        if(candidate?.card===card&&card)return;
        clearCandidate();
        if(!card){status(drag.handedOff?tr("Continue dragging · Release on empty space to ungroup"):'');return;}
        const destination=groupDestination(drag.card.itemModel,card.itemModel);
        candidate={card,...destination};feedback.direct(String(destination.destination),card);card.dataset.groupDrop='ready';status(destination.destination==='new'?tr("Release to create a group"):tr("Release to add to this group"));
    }
    doc.addEventListener('mousemove',point,true);doc.addEventListener('pointermove',point,true);
    const cancel=()=>{if(drag){drag.cancelled=true;clearCandidate();clearExit();bar.hidden=true;status(tr("Drag cancelled"));}};
    doc.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag){e.preventDefault();e.stopPropagation();cancel();}},true);win.addEventListener('blur',cancel);doc.addEventListener('pointercancel',cancel,true);
    return {
        start(card,scope,groupId){
            reset();if(!enabled()||card.itemModel?.tab?.pinned)return;
            const rect=pressed?.card===card?pressed.rect:rectOf(card),origin=pressed?.card===card?pressed.origin:{x:(rect.left+rect.right)/2,y:(rect.top+rect.bottom)/2};
            drag={card,scope,groupId,rect,origin};bar.hidden=scope!=='group';bar.textContent=tr("Remove from group");
        },
        move(event){point(event);return Boolean(drag&&(drag.cancelled||drag.outside||drag.ungroup||candidate));},
        sortMove(event){
            point(event.originalEvent||{});
            if(!drag)return;
            if(drag.cancelled||drag.outside||drag.ungroup)return false;
            if(event.to?.dataset.scope!=='root'||(drag.scope==='group'&&!drag.handedOff))return;
            if(candidate)return false;
            const target=event.related;
            // Empty containers and ineligible grouping targets retain ordinary
            // Sortable behavior (including pinned and same-group reorders).
            if(!drag.point||!target?.itemModel||target===drag.card||!canReorder(target)||!groupDestination(drag.card.itemModel,target.itemModel))return;
            const direction=reorderDirection(rectOf(drag.card),rectOf(target),draggedRect(drag.rect,drag.origin,drag.point));
            return direction||false;
        },
        reordered(){clearCandidate();status('');},
        handedOff:()=>Boolean(drag?.handedOff),
        finish(event){
            if(event)point(event);
            const result=drag?{cancelled:Boolean(drag.cancelled||!enabled()||(drag.outside&&!drag.ungroup)),handedOff:Boolean(drag.handedOff),groupId:drag.groupId,ungroup:Boolean(drag.ungroup||drag.handedOff),target:candidate?{destination:candidate.destination,targetId:candidate.targetId,targetIds:candidate.targetIds,windowId:candidate.windowId}:null}:null;
            reset();pressed=null;return result;
        }
    };
}
