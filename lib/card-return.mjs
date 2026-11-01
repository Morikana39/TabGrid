// A quick Material-style settling return. Sortable still owns every outer slot;
// AutoAnimate moves only the inner surface after Sortable removes its fallback.
export const SNAP_BACK_TIMING={duration:280,easing:'cubic-bezier(.2,0,0,1)'};
export const isCardReturning=card=>card?.dataset.cardReturn!==undefined;
export function returnFrames(from,to){
    if(!from||!to?.width||!to?.height)return null;
    const x=from.left+from.width/2-to.left-to.width/2,y=from.top+from.height/2-to.top-to.height/2;
    const sx=from.width/to.width,sy=from.height/to.height;
    if(Math.abs(x)+Math.abs(y)+Math.abs(sx-1)+Math.abs(sy-1)<.01)return null;
    return [{translate:`${x}px ${y}px`,scale:`${sx} ${sy}`},{translate:'0px 0px',scale:'1 1'}];
}
export function createCardReturn({getGhost,motion,speed=()=>1,allowed=()=>true,doc=document}){
    const driver=doc.createElement('div');driver.hidden=true;doc.body.append(driver);let last;
    doc.addEventListener('mouseup',()=>{const ghost=getGhost();last=ghost?{rect:ghost.querySelector('.card-surface').getBoundingClientRect(),time:performance.now()}:null;},true);
    return card=>{
        const saved=last;last=null;if(!saved||performance.now()-saved.time>1000)return;
        if(!card.isConnected||!card.dataset.key||!allowed())return;
        const surface=card.querySelector('.card-surface');
        motion.cancel(surface);for(const animation of surface.getAnimations())animation.cancel();
        const frames=returnFrames(saved.rect,card.getBoundingClientRect());if(!frames)return;
        // Reserve this surface synchronously, before the grid observer consumes
        // Sortable's final mutation. The grid can still animate its neighbors.
        card.dataset.cardReturn='';
        const prior={translate:surface.style.translate,scale:surface.style.scale,transform:surface.style.transform};
        Object.assign(surface.style,frames[0],{transform:'none'});
        let done=false,timer;
        const finish=()=>{if(done)return;done=true;clearTimeout(timer);delete card.dataset.cardReturn;Object.assign(surface.style,prior);motion.cancel(surface);};
        const duration=SNAP_BACK_TIMING.duration*speed();
        motion.play(driver,surface,frames.map(frame=>({...frame,transform:'none'})),{anchor:driver,effectTiming:{...SNAP_BACK_TIMING,duration,fill:'forwards'},onFinish:finish});
        timer=setTimeout(finish,duration+100);
    };
}
