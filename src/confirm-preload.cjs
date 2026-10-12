'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('piikConfirm',Object.freeze({
  onData:callback=>ipcRenderer.on('piik-confirm:data',(_event,data)=>callback(data)),
  choose:index=>ipcRenderer.send('piik-confirm:choose',index)
}));
