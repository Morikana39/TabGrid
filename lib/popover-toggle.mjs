// Auto popovers can light-dismiss on pointerup, before the opener's click.
// Remember pointerdown state so the same click cannot reopen the popup.
export function bindPopoverToggle(trigger,{isOpen,open,close,beforeToggle=()=>{}}){
    let pressedOpen=null;
    trigger.addEventListener('pointerdown',event=>{
        if(event.button!==0)return;
        pressedOpen=isOpen();event.preventDefault();
    });
    trigger.addEventListener('pointercancel',()=>{pressedOpen=null;});
    trigger.addEventListener('keydown',()=>{pressedOpen=null;});
    trigger.addEventListener('click',event=>{
        const wasOpen=event.detail===0?isOpen():pressedOpen??isOpen();pressedOpen=null;
        beforeToggle();if(wasOpen)close();else open();
    });
}
