// Local-only UI fixture. No credentials, network database or production writes.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../lib/content.cjs');
const root = path.join(__dirname, '..');
const helpers = fs.readFileSync(path.join(root, 'script.js'), 'utf8').split('// Plain metadata')[1].split('function renderCover')[0];
const fixture = `
const records = {
 articles: [{id:'article-1',title:'La Philharmonie de Paris',edition:'Édition #001',author:'DECORUM',category:'Architecture',status:'published',content:'<p>Un lieu pour écouter la ville.</p>',excerpt:'Architecture et musique.',technical:{architect:'Jean Nouvel'},updatedAt:'2026-10-05T12:00:00Z'}],
 editorialArticles:[{id:'draft-1',title:'Une maison à Mexico',status:'draft',edition:'Édition #002',content:'Texte de travail',updatedAt:'2026-10-05T13:00:00Z'}],
 places:[{id:'place-1',name:'Philharmonie',city:'Paris',country:'France',articleId:'article-1',lat:48,lng:2},{id:'place-2',name:'Maison',city:'Mexico',country:'Mexique',deleted:true}],
 submissions:[{id:'proposal-1',name:'Musée',city:'Lille',country:'France',status:'pending',description:'Un musée',reason:'Sa lumière',email:'test@example.org'}],authors:[],categories:[]
};
const firebase={auth:()=>({onAuthStateChanged:fn=>fn({uid:'fixture'}),signOut:async()=>location.reload()})};
const Decorum={TECH:${JSON.stringify(C.TECH)},VISIT:${JSON.stringify(C.VISIT)},ready:async()=>({ready:true}),api:async(action,options={})=>{
 const {params={},body={}}=options;
 if(action==='admin-list') return {items:records[params.collection]||[],nextCursor:null};
 if(action==='admin-get') return records[params.collection].find(a=>a.id===params.id);
 if(action==='admin-settings') return {title:'Prochain article',enabled:false};
 if(action==='admin-save') {const id=body.id||'local-'+Date.now();const collection=body.status==='published'?'articles':'editorialArticles';records[collection]=records[collection].filter(a=>a.id!==id);records[collection].push({...body,id,updatedAt:new Date().toISOString()});return {id};}
 if(action==='admin-countdown') return {ok:true};
 throw Error('Action non simulée : '+action);
}};
function showNotification(message){console.log(message)}
`;
const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DECORUM — test local</title><link rel="stylesheet" href="style.css"><link rel="stylesheet" href="editorial.css"><div id="admin-content"></div><script src="assets/vendor/purify-3.4.16.min.js"></script><script>// Plain metadata${helpers}\n${fixture}</script><script src="universes.js"></script><script src="admin.js"></script></html>`;
const allowed = new Set(['style.css','editorial.css','admin.js','universes.js','assets/fonts/Bricolage-800.woff2','assets/fonts/Schibsted-400.woff2','assets/fonts/Schibsted-700.woff2','assets/vendor/purify-3.4.16.min.js']);
http.createServer((req,res)=>{
 const name=new URL(req.url,'http://localhost').pathname.slice(1);
 res.setHeader('Cache-Control','no-store');
 if(!name){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(html);}
 if(!allowed.has(name)){res.statusCode=404;return res.end();}
 res.setHeader('Content-Type',name.endsWith('.css')?'text/css':'text/javascript');
 res.end(fs.readFileSync(path.join(root,name)));
}).listen(4175,'127.0.0.1',()=>console.log('Admin fixture: http://127.0.0.1:4175'));
