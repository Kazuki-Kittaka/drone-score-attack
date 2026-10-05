import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
function offlineCache(): Plugin {
  let base = "/";
  return {
    name: "offline-cache",
    apply: "build",
    configResolved(c) {
      base = c.base;
    },
    generateBundle(_, bundle) {
      const paths = [
        "index.html",
        ...Object.keys(bundle).filter((p) => !p.endsWith(".map")),
      ];
      const version = Date.now().toString(36);
      const code = `const BASE=new URL(${JSON.stringify(base)},self.location.origin).pathname;const PREFIX='drone-race-'+encodeURIComponent(BASE)+'-';const CACHE=PREFIX+'${version}';const FILES=${JSON.stringify(paths)}.map(p=>BASE+p);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.open(CACHE).then(c=>c.match(BASE+'index.html'))));}else{e.respondWith(caches.open(CACHE).then(async c=>(await c.match(e.request,{ignoreVary:true}))||fetch(e.request)));}});`;
      this.emitFile({ type: "asset", fileName: "sw.js", source: code });
    },
  };
}
export default defineConfig({ plugins: [react(), offlineCache()], base: "/" });
