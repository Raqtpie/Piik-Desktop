'use strict';
// UI-only compatibility shim. Does not request or expose local capture pixels.
const {browserTabVisibilityScript}=module.exports={
  browserTabVisibilityScript: function browserTabVisibilityScript(){
    return `(()=>{
      const MARK='data-piik-desktop-browser-tab';
      if(window.__piikDesktopBrowserTabObserver){
        window.__piikDesktopBrowserTabObserver.disconnect();
        window.__piikDesktopBrowserTabObserver=null;
      }
      let pending=false;
      function run(){pending=false;
        for(const picker of document.querySelectorAll('.lr-source-picker')){
          const list=picker.querySelector('[role="tablist"]');
          const b=list?.querySelector('[data-source-tab="browser"]');
          if(!b)continue;
          const native=[...list.querySelectorAll('[data-source-tab]')].filter(x=>x!==b);
          // During discovery only browser/camera exist. Wait for native tabs;
          // switching to camera here would open a device without a camera click.
          const target=native.find(x=>x.dataset.sourceTab==='window'&&!x.disabled)||native.find(x=>x.dataset.sourceTab==='display'&&!x.disabled);
          const wrapper=b.closest('.lr-comic-tip-wrap')||b;
          // Popovers live in Chromium's top layer, outside ordinary grid layout.
          // Hide them explicitly as well as removing the whole grid item.
          for(const tip of wrapper.querySelectorAll('[popover],[role="tooltip"]')){
            if(typeof tip.hidePopover==='function')try{tip.hidePopover();}catch{}
            if(tip.style.display!=='none')tip.style.setProperty('display','none','important');
          }
          if(!wrapper.hasAttribute(MARK)){
            wrapper.setAttribute(MARK,'1');wrapper.style.setProperty('display','none','important');
            b.hidden=true;
          }
          const columns='repeat('+native.length+', minmax(0, 1fr))';
          if(list.style.gridTemplateColumns!==columns)list.style.gridTemplateColumns=columns;
          if(target&&b.getAttribute('aria-selected')==='true')target.click();
          const browserAction=picker.querySelector('.lr-source-option.is-browser');
          if(browserAction&&browserAction.style.display!=='none')browserAction.style.setProperty('display','none','important');
          if(!list.hasAttribute('data-desktop-navigation')){
            list.setAttribute('data-desktop-navigation','1');
            list.addEventListener('keydown',event=>{
              if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
              event.preventDefault();event.stopImmediatePropagation();
              const available=[...list.querySelectorAll('[data-source-tab]')].filter(x=>x.dataset.sourceTab!=='browser'&&!x.disabled);
              if(!available.length)return;
              const index=available.findIndex(x=>x.getAttribute('aria-selected')==='true');
              const next=event.key==='Home'?0:event.key==='End'?available.length-1:
                (index+(event.key==='ArrowRight'?1:-1)+available.length)%available.length;
              available[next].click();available[next].focus();
            },true);
          }
        }
      }
      const observer=new MutationObserver(()=>{
        if(!pending){pending=true;queueMicrotask(run);}
      });
      observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-selected','disabled','style']});
      window.__piikDesktopBrowserTabObserver=observer;
      run();
    })();`;
  }
};
