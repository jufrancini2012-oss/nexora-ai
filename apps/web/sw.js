const C='rva-v5';
const ASSETS=['./','./index.html','./styles.css','./app.js?v=5','./manifest.webmanifest','./api-client.js?v=5','./autonomous-dashboard.js?v=5'];
self.addEventListener('install',event=>event.waitUntil(caches.open(C).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>event.respondWith(caches.match(event.request).then(r=>r||fetch(event.request))));
self.addEventListener('push',event=>{if(!event.data)return;let data={};try{data=event.data.json()}catch{data={title:'NEXORA AI',body:event.data.text()}}event.waitUntil(self.registration.showNotification(data.title||'NEXORA AI',{body:data.body||'',icon:data.icon||'./icon-192.png',badge:data.badge||'./icon-192.png',tag:data.tag||'nexora-event',data:data.data||{}}))});
self.addEventListener('notificationclick',event=>{event.notification.close();const target=event.notification.data?.url||'./';event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{for(const client of clients){if('focus' in client){client.focus();if('navigate' in client&&target)client.navigate(target);return}}if(self.clients.openWindow)return self.clients.openWindow(target)}))});
