const C='rva-v3';
const ASSETS=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./api-client.js','./autonomous-dashboard.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(C).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>event.respondWith(caches.match(event.request).then(r=>r||fetch(event.request))));
self.addEventListener('push',event=>{
  if(!event.data) return;
  let data={}; try{data=event.data.json()}catch{data={title:'Robo Vendas AI',body:event.data.text()}};
  event.waitUntil(self.registration.showNotification(data.title||'Robo Vendas AI',{body:data.body||'',icon:data.icon||'./icon-192.png',badge:data.badge||'./icon-192.png',tag:data.tag||'rva-event',data:data.data||{}}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification.data?.url||'./';
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{
    for(const client of clients){if('focus' in client){client.focus();if('navigate' in client && target) client.navigate(target);return;}}
    if(self.clients.openWindow)return self.clients.openWindow(target);
  }));
});
