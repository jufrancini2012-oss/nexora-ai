import app from './autonomous-worker.js';
import { ensureAffiliateCatalog } from './affiliate-catalog.js';
import { handlePartnerRedirect, loadMicroPartnerships, runMicroPartnershipCycle } from './micro-partnerships.js';

function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'});
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname.startsWith('/parceiro/')){
      try{
        await ensureAffiliateCatalog(env);
        const response=await handlePartnerRedirect(request,env);
        if(response) return response;
      }catch(error){
        return json({ok:false,error:error.message},500);
      }
    }
    if(url.pathname==='/api/microparcerias' && request.method==='GET'){
      try{return json({ok:true,microparcerias:await loadMicroPartnerships(env)});}
      catch(error){return json({ok:false,error:error.message},500);}
    }
    return app.fetch(request,env,ctx);
  },
  async scheduled(controller,env,ctx){
    ctx.waitUntil((async()=>{
      try{await ensureAffiliateCatalog(env);await runMicroPartnershipCycle(env);}
      catch(error){console.error('NEXORA_MICRO_PARTNERSHIP_FAILED',error.message);}
    })());
    return app.scheduled(controller,env,ctx);
  }
};
