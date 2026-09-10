const NotificationCenter=(()=>{
  const VAPID_PUBLIC_KEY=window.RVA_VAPID_PUBLIC_KEY||'';
  async function registration(){return navigator.serviceWorker.ready;}
  async function permission(){
    if(!('Notification' in window)) throw new Error('Notificações não são suportadas neste navegador.');
    if(Notification.permission==='granted') return true;
    const result=await Notification.requestPermission();
    return result==='granted';
  }
  function base64ToUint8Array(base64){
    const pad='='.repeat((4-base64.length%4)%4); const b=(base64+pad).replace(/-/g,'+').replace(/_/g,'/');
    const raw=atob(b); return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
  }
  async function subscribe(){
    const ok=await permission(); if(!ok) return {enabled:false,reason:'permission-denied'};
    const reg=await registration();
    if(!reg.push) return {enabled:false,reason:'push-unsupported'};
    let sub=await reg.pushManager.getSubscription();
    if(!sub && VAPID_PUBLIC_KEY){sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64ToUint8Array(VAPID_PUBLIC_KEY)});}
    if(sub){localStorage.setItem('rva_push_subscription',JSON.stringify(sub)); return {enabled:true,subscription:sub};}
    return {enabled:false,reason:'vapid-not-configured'};
  }
  async function demoSale(){
    const ok=await permission(); if(!ok)return false;
    const reg=await registration();
    await reg.showNotification('🎉 NOVA VENDA — Robo Vendas AI',{body:'Venda de teste recebida. O robô continua trabalhando.',tag:'demo-sale',data:{url:'./?page=sales'}});
    return true;
  }
  async function status(){
    return {permission:('Notification' in window)?Notification.permission:'unsupported',subscription:!!(await (await registration()).pushManager?.getSubscription?.())};
  }
  return {subscribe,demoSale,status};
})();
window.NotificationCenter=NotificationCenter;
