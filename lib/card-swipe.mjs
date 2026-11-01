import {SNAP_BACK_TIMING,isCardReturning} from './card-return.mjs';
// A swipe must be horizontal and deliberate; a held mouse belongs to Sortable.
export const DRAG_HOLD_MS = 250;
export const swipeThreshold = width => Math.max(96, Math.min(160, width * .35));
export const horizontalSwipe = (x,y) => Math.abs(x) >= 12 && Math.abs(x) > Math.abs(y) * 1.6;
export const swipeReady = (x,y,width,elapsed) => elapsed >= 60 && horizontalSwipe(x,y) && Math.abs(x) >= swipeThreshold(width);
export const mouseSwipeEnabled = prefs => Boolean(prefs.swipeClose);
export function mountCardSwipe({getPrefs,available,close,motion,doc=document,win=window,now=()=>performance.now()}) {
    let gesture=null, suppressUntil=0;
    const pending=new Set();
    const driver=doc.createElement('div');driver.hidden=true;doc.body.append(driver);
    const syncLock=()=>doc.documentElement.classList.toggle('card-swipe-active',Boolean(gesture?.engaged||pending.size));
    function cardAt(event){const card=event.target.closest?.('.card[data-key]');return card&&!isCardReturning(card)&&![...pending].some(g=>g.card===card)&&!card.classList.contains('sortable-ghost')&&!event.target.closest('.card-menu,.card-close,.card-mute,input')&&available(card)?card:null;}
    function begin(card,event){const surface=card.querySelector('.card-surface');motion.cancel(surface);return {card,surface,id:event.pointerId,start:now(),x:event.clientX,y:event.clientY,dx:0,dy:0,engaged:false,width:card.offsetWidth};}
    function paint(){
        const g=gesture;if(!g)return;g.engaged=true;
        g.card.dataset.swipe=swipeReady(g.dx,g.dy,g.width,now()-g.start)?'ready':'pending';
        g.surface.style.translate=`${g.dx}px 0`;
        g.surface.style.opacity=String(Math.max(0,1-Math.abs(g.dx)/swipeThreshold(g.width)));
        syncLock();
    }
    function restore(g){
        const before={translate:g.surface.style.translate||'0px',opacity:g.surface.style.opacity||'1'};
        delete g.card.dataset.swipe;g.surface.style.removeProperty('translate');g.surface.style.removeProperty('opacity');
        if(getPrefs().motion==='off'||win.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
        if(g.engaged&&g.card.isConnected&&g.card.dataset.key){
            // Reserve the surface before clearing the active gesture lock. A new
            // swipe or Sortable drag must not cancel a half-finished return.
            g.card.dataset.cardReturn='';
            const duration=SNAP_BACK_TIMING.duration*({efficient:.65,standard:1,smooth:1.6}[getPrefs().animationSpeed]||1);
            let timer,done=false;
            const finish=()=>{if(done)return;done=true;clearTimeout(timer);motion.cancel(g.surface);delete g.card.dataset.cardReturn;};
            motion.play(driver,g.surface,[before,{translate:'0px',opacity:1}],{anchor:driver,effectTiming:{...SNAP_BACK_TIMING,duration},onFinish:finish});
            // Also release when motion is disabled, interrupted, or the card is removed.
            timer=setTimeout(finish,duration+100);
        }
    }
    function finish(commit=false){
        const g=gesture;gesture=null;if(!g)return;
        const ready=commit&&g.engaged&&available(g.card)&&swipeReady(g.dx,g.dy,g.width,now()-g.start);
        if(g.engaged)suppressUntil=now()+700;
        if(ready){
            // Keep the departing card invisible until removal. A cancelled confirmation
            // or failed close leaves it connected, so restore it when the action settles.
            g.surface.style.opacity='0';pending.add(g);syncLock();
            Promise.resolve().then(()=>close(g.card.itemModel)).catch(()=>{}).finally(()=>{pending.delete(g);restore(g);syncLock();});
        }else restore(g);
        syncLock();
    }
    const cancel=()=>finish();
    doc.addEventListener('pointerdown',e=>{
        cancel();if(e.pointerType!=='mouse'||e.button!==0||!mouseSwipeEnabled(getPrefs()))return;
        const card=cardAt(e);if(card)gesture=begin(card,e);
    },true);
    doc.addEventListener('pointermove',e=>{const g=gesture;if(!g||e.pointerId!==g.id)return;if(!available(g.card)||!mouseSwipeEnabled(getPrefs())){finish();return;}g.dx=e.clientX-g.x;g.dy=e.clientY-g.y;if(!g.engaged){if(now()-g.start>=DRAG_HOLD_MS||Math.abs(g.dy)>12&&!horizontalSwipe(g.dx,g.dy)){finish();return;}if(!horizontalSwipe(g.dx,g.dy))return;}e.preventDefault();paint();},{capture:true,passive:false});
    doc.addEventListener('pointerup',e=>{if(gesture&&e.pointerId===gesture.id)finish(true);},true);
    doc.addEventListener('pointercancel',cancel,true);
    doc.addEventListener('click',e=>{if(e.detail&&now()<suppressUntil&&e.target.closest('.card')){e.preventDefault();e.stopImmediatePropagation();}},true);
    doc.addEventListener('keydown',e=>{if(e.key==='Escape')cancel();},true);win.addEventListener('blur',cancel);
    return {cancel};
}
