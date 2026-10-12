'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {inviteActionScript}=require('../src/invite-adapter.cjs');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(en=false,hasInvite=false){
 const rotate=en?'Rotate invite link; viewers using the old link will need to rejoin':'更新邀请链接；使用旧链接的观众需要重新加入';
 const revoke=en?'Revoke invite link and disconnect viewers who joined with it':'撤销邀请链接，并断开通过该链接加入的观众';
 return new JSDOM(`<div class="lr-row"><div class="lr-group-actions"><button class="lr-btn">Copy</button><span class="lr-comic-tip-wrap"><button class="lr-btn" aria-label="${rotate}"><span class="lr-cap">${en?'Rotate link':'更新链接'}</span></button><span class="lr-comic-tip-caption">${rotate}</span></span><button class="lr-btn" aria-label="${revoke}" aria-disabled="${!hasInvite}"></button></div><div class="lr-invite-field"></div></div>`,{runScripts:'outside-only'});
}
for(const en of [false,true])test(`invitation labels follow missing/existing/revoked link in ${en?'English':'Chinese'}`,async()=>{
 const dom=fixture(en);try{
  const buttons=dom.window.document.querySelectorAll('button');let clicks=0;buttons[1].addEventListener('click',()=>clicks++);
  dom.window.eval(inviteActionScript());await settle();
  assert.equal(buttons[1].querySelector('.lr-cap').textContent,en?'Create link':'创建链接');
  assert.equal(buttons[1].getAttribute('aria-label'),en?'Create invite link':'创建邀请链接');
  assert.equal(clicks,0); // Never silently generates an invitation.
  buttons[1].click();assert.equal(clicks,1); // Existing upstream handler survives.
  buttons[2].setAttribute('aria-disabled','false');await settle();
  assert.equal(buttons[1].querySelector('.lr-cap').textContent,en?'Rotate link':'更新链接');
  buttons[2].setAttribute('aria-disabled','true');await settle();
  assert.equal(buttons[1].querySelector('.lr-cap').textContent,en?'Create link':'创建链接');
 }finally{dom.window.__piikDesktopInviteObserver?.disconnect();await settle();dom.window.close();}
});
test('busy mutation does not mislabel an existing invitation; visual mode stays icon only',async()=>{
 const dom=fixture(false,true);try{
  dom.window.eval(inviteActionScript());await settle();
  const buttons=dom.window.document.querySelectorAll('button');
  buttons[1].setAttribute('aria-disabled','true');buttons[2].setAttribute('aria-disabled','true');await settle();
  assert.equal(buttons[1].querySelector('.lr-cap').textContent,'更新链接');
  buttons[1].querySelector('.lr-cap').remove();buttons[1].setAttribute('aria-disabled','false');await settle();
  assert.equal(buttons[1].getAttribute('aria-label'),'创建邀请链接');
  assert.equal(buttons[1].querySelector('.lr-cap'),null);
 }finally{dom.window.__piikDesktopInviteObserver?.disconnect();await settle();dom.window.close();}
});
