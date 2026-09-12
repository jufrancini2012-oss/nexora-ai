const API_BASE = window.ROBO_API_BASE || '';
async function api(path, options){ const r=await fetch(API_BASE+path,options); if(!r.ok) throw new Error((await r.text())||`HTTP ${r.status}`); return r.json(); }
window.RoboAPI={
  dashboard:()=>api('/api/dashboard'),
  products:()=>api('/api/products'),
  autonomy:()=>api('/api/autonomy'),
  finance:()=>api('/api/finance'),
  commercialPlan:()=>api('/api/commercial/plan'),
  checkout:(body)=>api('/api/commercial/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
};
