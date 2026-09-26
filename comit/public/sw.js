const CACHE="comit-static-v3";
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE));self.skipWaiting()});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("comit-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=="GET"||url.origin!==self.location.origin||!url.pathname.startsWith("/_next/static/"))return;
  e.respondWith(caches.open(CACHE).then(async cache=>{
    const cached=await cache.match(e.request);
    if(cached)return cached;
    const response=await fetch(e.request);
    if(response.ok)await cache.put(e.request,response.clone());
    return response;
  }));
});
