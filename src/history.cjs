'use strict';
const {validateSite}=require('./security.cjs');
const LIMIT=5;
function validSite(value){try{return validateSite(value);}catch{return null;}}
function normalizeHistory(values=[],legacy=''){
  const result=[];
  for(const value of [...(Array.isArray(values)?values:[]),legacy]){
    const site=validSite(value);
    if(site&&!result.includes(site))result.push(site);
    if(result.length>=LIMIT)break;
  }
  return result;
}
function rememberSite(values,site){
  const clean=validSite(site);
  if(!clean)throw new Error('Invalid site');
  return normalizeHistory([clean,...values]);
}
function forgetSite(values,site){
  const clean=validSite(site);
  if(!clean)return normalizeHistory(values);
  return normalizeHistory(values).filter(item=>item!==clean);
}
module.exports={LIMIT,normalizeHistory,rememberSite,forgetSite};
