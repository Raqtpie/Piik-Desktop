'use strict';

// Labels only. The existing upstream click handler owns invitation credentials.
function inviteActionScript(){
  return `(()=>{
    window.__piikDesktopInviteObserver?.disconnect();
    let pending=false;
    function run(){
      pending=false;
      for(const field of document.querySelectorAll('.lr-invite-field')){
        const row=field.closest('.lr-row');
        const actions=row?.querySelector('.lr-group-actions');
        const buttons=actions?[...actions.querySelectorAll('button.lr-btn')]:[];
        if(buttons.length!==3)continue;
        const [,rotate,revoke]=buttons;
        const original=rotate.getAttribute('aria-label')||'';
        if(!/^(更新邀请链接|Rotate invite link|创建邀请链接|Create invite link)/.test(original))continue;
        if(rotate.disabled||rotate.getAttribute('aria-disabled')==='true')continue;
        const empty=revoke.disabled||revoke.getAttribute('aria-disabled')==='true';
        const en=/^Revoke invite link/.test(revoke.getAttribute('aria-label')||'');
        const caption=empty?(en?'Create link':'创建链接'):(en?'Rotate link':'更新链接');
        const title=empty?(en?'Create invite link':'创建邀请链接'):
          (en?'Rotate invite link; viewers using the old link will need to rejoin':'更新邀请链接；使用旧链接的观众需要重新加入');
        if(original!==title)rotate.setAttribute('aria-label',title);
        const cap=rotate.querySelector('.lr-cap');
        if(cap&&cap.textContent!==caption)cap.textContent=caption;
        const tip=rotate.closest('.lr-comic-tip-wrap')?.querySelector('.lr-comic-tip-caption');
        if(tip&&tip.textContent!==title)tip.textContent=title;
      }
    }
    const observer=new MutationObserver(()=>{if(!pending){pending=true;queueMicrotask(run);}});
    observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,
      attributeFilter:['aria-disabled','disabled','aria-label','lang']});
    window.__piikDesktopInviteObserver=observer;
    run();
  })();`;
}
module.exports={inviteActionScript};
