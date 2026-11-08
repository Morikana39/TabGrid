import {AnimationManager, spring, easing, Easing} from '../node_modules/@liquid-dom/layout/dist/animation.js';

// Live liquid-dom values bridge to native DOM controls. No keyframe sampling.
export function createLiquidMotion({allowed, speed = () => 1, raf = requestAnimationFrame, caf = cancelAnimationFrame, doc = document} = {}) {
    const manager = new AnimationManager(), records = new Map(), timeScaleRef = {current:1};
    let frame = 0, previous = 0;
    function clean(target, record) {
        manager.stop(record.state);
        for (const [key,value] of record.restore) value ? target.style.setProperty(key,value) : target.style.removeProperty(key);
        target.removeAttribute('data-liquid-motion'); records.delete(target);
    }
    function cancel(target) { const record = records.get(target); if (record) clean(target,record); }
    function paint(target, record) {
        for (const [key,format] of record.formats) target.style.setProperty(key,format(record.state));
    }
    function tick(time) {
        frame = 0; timeScaleRef.current = 1 / speed();
        if (!allowed() || doc.hidden) { for (const [target,record] of records) clean(target,record); }
        else {
            manager.tick(previous ? Math.min(time-previous,64) : 0);
            for (const [target,record] of records) {
                if (!target.isConnected || record.done) clean(target,record); else paint(target,record);
            }
        }
        doc.dispatchEvent(new Event('liquid-glass-frame'));
        previous = time;
        if (records.size) frame = raf(tick); else previous = 0;
    }
    function play(target, from, to, {springMotion = false, duration = .18, persist = false} = {}) {
        cancel(target);
        if (!allowed()) return;
        const state = {}, end = {}, formats = new Map(), restore = new Map();
        for (const key of Object.keys(to)) {
            const css = key.replace(/[A-Z]/g,c=>`-${c.toLowerCase()}`);
            if (key === 'transformOrigin') continue;
            restore.set(css,persist ? String(to[key]) : target.style.getPropertyValue(css));
            if (key === 'transform') {
                const a = new DOMMatrix(from[key] === 'none' ? '' : from[key]), b = new DOMMatrix(to[key] === 'none' ? '' : to[key]);
                const names = ['a','b','c','d','e','f'];
                for (const name of names) {state[name] = a[name];end[name] = b[name];}
                formats.set(css,s=>`matrix(${names.map(n=>s[n]).join(',')})`);
            } else {
                const start = parseFloat(from[key]), finish = parseFloat(to[key]);
                if (!Number.isFinite(start) || !Number.isFinite(finish)) {restore.delete(css);continue;}
                state[key] = start; end[key] = finish;
                const unit = String(to[key]).replace(/^[-+.\d]+/,'');
                formats.set(css,s=>`${s[key]}${unit}`);
            }
        }
        if (!formats.size) return;
        const record = {state,formats,restore,done:false};records.set(target,record);
        target.dataset.liquidMotion = 'running';target.dataset.liquidMotionEngine = 'liquid-dom';
        // VideoControlsDemo's button spring; menu visibility uses the library's easeOut.
        const handle = manager.animate(state,end,springMotion ? spring({stiffness:700,damping:38}) : easing({duration,ease:Easing.easeOut}),{timeScaleRef});
        handle.finished.then(()=>{record.done=true;});paint(target,record);
        if (!frame) frame = raf(tick);
    }
    return {play,cancel,has:target=>records.has(target),sync(){if(!allowed())for(const [target,record]of records)clean(target,record);},destroy(){caf(frame);for(const [target,record]of records)clean(target,record);}};
}

export function mountLiquidInteractions(getPrefs) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const allowed = () => getPrefs().visualStyle === 'glass' && getPrefs().motion !== 'off' && !reduced.matches;
    const motion = createLiquidMotion({allowed,speed:()=>({efficient:.65,standard:1,smooth:1.6}[getPrefs().animationSpeed]||1)});
    const selector = 'button:not(.card-open),input[type=range],input[role=switch],.filter-picker-option,[role=option]';
    function update(target,pressed=false,leaving=false) {
        if (!target || target.disabled || target.closest('.sources') || !allowed()) return;
        const current = getComputedStyle(target).getPropertyValue('--liquid-press').trim() || '1';
        const wideDisclosure = target.matches('.window-toggle,.session-expand,.tint-toggle');
        // A custom property isolates control feedback from layout and disclosure transforms.
        // Wide rows need only a slight compression, with no spring overshoot.
        motion.play(target,{'--liquid-press':current},{'--liquid-press':pressed ? (wideDisclosure ? .998 : .97) : 1},{springMotion:!wideDisclosure,duration:.14,persist:true});
        target.classList.toggle('liquid-hover',!leaving);
    }
    const over = event => {const target=event.target.closest(selector);if(target&&!target.contains(event.relatedTarget))update(target);};
    const out = event => {const target=event.target.closest(selector);if(target&&!target.contains(event.relatedTarget))update(target,false,true);};
    const down = event => update(event.target.closest(selector),true);
    const up = () => document.querySelectorAll(`${selector}`).forEach(el=>{if(el.style.getPropertyValue('--liquid-press'))update(el,false,!el.matches(':hover'));});
    const keydown = e => {if([' ','Enter'].includes(e.key)&&!e.repeat)update(e.target.closest('button'),true);};
    const keyup = e => {if([' ','Enter'].includes(e.key))update(e.target.closest('button'));};
    for(const [name,fn]of [['pointerover',over],['pointerout',out],['pointerdown',down],['pointerup',up],['pointercancel',up],['keydown',keydown],['keyup',keyup]]) document.addEventListener(name,fn);
    const change = event => {
        const target=event.target;if(!target.matches('input[role=switch]')||!allowed())return;
        const current=getComputedStyle(target).getPropertyValue('--liquid-switch').trim()||(target.checked?'0px':'14px');
        motion.play(target,{'--liquid-switch':current},{'--liquid-switch':target.checked?'14px':'0px'},{springMotion:true,persist:true});
    };
    document.addEventListener('change',change);
    const sync=()=>{motion.sync();if(!allowed())document.querySelectorAll(selector).forEach(el=>{el.classList.remove('liquid-hover');el.style.removeProperty('--liquid-press');el.style.removeProperty('--liquid-switch');});};
    new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['class','data-visual-style']});
    reduced.addEventListener('change',sync);return motion;
}
