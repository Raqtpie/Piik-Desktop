#!/usr/bin/env node
'use strict';
const http=require('node:http');
const args=process.argv.slice(2);
const mode=args.some(x=>x.startsWith('--site='))?'site':args.includes('--link')?'link':'local';
const site=args.find(x=>x.startsWith('--site='))?.slice('--site='.length)||'';
let port=39721;
const server=http.createServer((req,res)=>{
  if(req.url==='/health'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({service:'fake-piik',port}));return;}
  res.writeHead(404);res.end();
});
function listen(){
  server.once('error',e=>{
    if(e.code==='EADDRINUSE' && port<39730){port++;listen();}
    else {console.error(e.message);process.exit(1);}
  });
  server.listen(port,'127.0.0.1',()=>{
    console.log(JSON.stringify({url:`http://127.0.0.1:${port}`,host:`127.0.0.1:${port}`,port,instanceToken:'aaaaaaaaaaaaaaaaaaaaaaaaa'}));
    if(mode==='site')console.log('Piik Site: '+site);
    if(mode==='local')console.log('LAN invitation origin: http://192.168.1.9:8787');
    if(mode==='link')console.log('Public invitation origin: https://fake.trycloudflare.com');
  });
}
listen();
process.stdin.once('data',()=>server.close(()=>process.exit(0)));
