'use strict';
// Intentionally no provider-specific origin rules: e.g. dynamic HTTPS redirects
// are handled identically regardless of DNS, STUN, reverse proxy, or CDN.
function allowedOrigin(url, origin) {
  if (!origin) return false;
  try {
    const u=new URL(url);
    return (u.protocol==='https:'||u.protocol==='http:') && !u.username && !u.password && u.origin===origin;
  } catch {return false;}
}
function displayName(mode,origin){
  if(mode==='local')return 'Local room';
  if(mode==='link')return 'Public invitation';
  try{return new URL(origin).host;}catch{return '';}
}
/** Only suppress the initial website-address confirmation after explicit opt-in.
 * Later site navigation still asks the user. Never silently trust insecure or
 * loopback destinations.
 */
function mayAutoFollowAtConnect(input, destination, userOptedIn){
  if(userOptedIn!==true)return false;
  try{
    const from=new URL(input),to=new URL(destination);
    if(from.protocol!=='https:'||to.protocol!=='https:')return false;
    if(from.username||from.password||to.username||to.password)return false;
    if(['localhost','127.0.0.1','[::1]'].includes(to.hostname.toLowerCase()))return false;
    return true;
  }catch{return false;}
}
module.exports={allowedOrigin,displayName,mayAutoFollowAtConnect};
