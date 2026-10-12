'use strict';
const $=id=>document.getElementById(id);
let resolved=false;
let defaultIndex=0;
let actions=[];
function choose(index){if(resolved)return;resolved=true;window.piikConfirm.choose(index);}
window.piikConfirm.onData(data=>{
  document.body.dataset.theme=data.theme==='dark'?'dark':'light';
  document.documentElement.lang=data.language==='en'?'en':'zh-CN';
  $('eyebrow').textContent='PIIK DESKTOP';
  $('title').textContent=data.title||'Confirm';
  $('description').textContent=data.description||'';
  const details=$('details');details.replaceChildren();
  for(const field of (data.fields||[]).slice(0,4)){
    const row=document.createElement('div');row.className='detail-line';
    const label=document.createElement('span');label.className='detail-label';label.textContent=field.label;
    const value=document.createElement('span');value.className='detail-value';value.textContent=field.value;
    row.append(label,value);details.append(row);
  }
  details.hidden=!details.childElementCount;
  $('footnote').textContent=data.footnote||'';$('footnote').hidden=!data.footnote;
  const buttons=$('actions');buttons.replaceChildren();
  actions=(data.buttons||[]).slice(0,13);
  defaultIndex=Number.isInteger(data.defaultIndex)?data.defaultIndex:0;
  actions.forEach((button,i)=>{
    const el=document.createElement('button');el.type='button';el.textContent=button.label;
    if(button.style==='primary'||button.style==='danger')el.className=button.style;
    el.addEventListener('click',()=>choose(i));buttons.append(el);
  });
  requestAnimationFrame(()=>{const button=buttons.children[defaultIndex]||buttons.firstElementChild;button?.focus();});
});
$('close').addEventListener('click',()=>choose(0));
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();choose(0);}
  else if(event.key==='Enter'&&event.target.tagName!=='BUTTON'){event.preventDefault();choose(defaultIndex);}
});
