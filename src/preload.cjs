'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('piikDesktop',Object.freeze({
  get:()=>ipcRenderer.invoke('desktop:get'),
  connect:args=>ipcRenderer.invoke('desktop:connect',args),
  home:()=>ipcRenderer.invoke('desktop:home'),
  disconnect:()=>ipcRenderer.invoke('desktop:disconnect'),
  reload:()=>ipcRenderer.invoke('desktop:reload'),
  removeRecentSite:site=>ipcRenderer.invoke('desktop:remove-recent-site',site),
  openLog:()=>ipcRenderer.invoke('desktop:open-log'),
  openExternal:url=>ipcRenderer.invoke('desktop:open-external',url),
  preferences:data=>ipcRenderer.invoke('desktop:preferences',data),
  quit:()=>ipcRenderer.invoke('desktop:quit'),
  onState:callback=>{
    const handler=(_e,payload)=>callback(payload);
    ipcRenderer.on('desktop:state',handler);
    return ()=>ipcRenderer.removeListener('desktop:state',handler);
  }
}));
