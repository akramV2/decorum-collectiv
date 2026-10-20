// Local browser integration checks. Fixtures never enter Firebase or the public build.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.LATENCE_PLAYWRIGHT_PATH || 'playwright');
const render = require('../lib/article-page.cjs');
const root = path.join(__dirname,'..');
const output = path.join(root,'..','..','outputs','latence');
fs.mkdirSync(output,{recursive:true});
const labels = ["À l'usage",'Le regard','Sélection',"L'essentiel"];
const examples = Array.from({length:8},(_,i)=>({id:`example-${i}`,title:['Le temps du premier geste','Un écran, une attention','Choisir moins, choisir mieux','Comprendre une annonce'][i%4],category:labels[i%4],author:'Rédaction — exemple non publié',excerpt:'Exemple non publié — maquette de lecture et de navigation, sans test produit ni actualité réelle.',date:'19 octobre 2026',createdAt:'2026-10-19T08:00:00Z',image:`http://127.0.0.1:4178/assets/brand/latence-hero.webp`,imageCredit:'Visuel de démonstration LATENCE',content:'<p>Exemple non publié. Ce contenu sert uniquement à vérifier la composition du magazine.</p>'.repeat(20)}));
const historical = {id:'old-1',category:'Architecture',title:'Archive conservée'};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'};
let failList=false;
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  res.setHeader('Cache-Control','no-store');
  if(u.pathname==='/api/editorial'){
    res.setHeader('Content-Type','application/json');
    const action=u.searchParams.get('action');
    if(action==='health')return res.end(JSON.stringify({ready:true,pdf:false}));
    if(action==='articles'){
      if(failList){res.statusCode=503;return res.end(JSON.stringify({error:'Service indisponible — test local'}));}
      return res.end(JSON.stringify(u.searchParams.has('cursor')?{items:examples,nextCursor:null}:{items:[historical],nextCursor:'page-2'}));
    }
    if(action==='article')return res.end(JSON.stringify(examples.find(x=>x.id===u.searchParams.get('id'))));
    return res.end('{}');
  }
  if(u.pathname==='/article.html'){
    res.setHeader('Content-Type',mime['.html']);
    const article=examples.find(x=>x.id===u.searchParams.get('id'));
    if(!article){res.statusCode=404;return res.end('Article introuvable');}
    return res.end(render(fs.readFileSync(path.join(root,'article.html'),'utf8'),article,`<title>${article.title} — LATENCE</title>`));
  }
  const file=path.resolve(root,'public',u.pathname==='/'?'index.html':u.pathname.slice(1));
  if(!file.startsWith(path.join(root,'public')+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;return res.end();}
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
  await new Promise(resolve=>server.listen(4178,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true, channel:process.env.LATENCE_BROWSER_CHANNEL || 'msedge'});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    await page.route('https://www.gstatic.com/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4178/');
    await page.waitForFunction(()=>document.querySelectorAll('#latest-grid article').length===8);
    assert.equal(await page.locator('#featured-grid article').count(),3);
    await page.locator('[data-filter=usage]').click();
    assert.equal(await page.locator('#latest-grid article').count(),2);
    assert.ok(await page.locator('#latest-grid a').first().getAttribute('href')==='article.html?id=example-0');
    await page.locator('[data-filter=all]').click();
    await page.evaluate(()=>scrollTo(0,0));
    await page.waitForTimeout(1000);
    console.log('navigation', await page.locator('#latence-navigation').evaluate(el=>({opacity:getComputedStyle(el).opacity,color:getComputedStyle(el).color,display:getComputedStyle(el).display,inert:el.inert,width:el.getBoundingClientRect().width})));
    await page.screenshot({path:path.join(output,'accueil-desktop-viewport.png')});
    await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,120));}scrollTo(0,0);});
    await page.waitForTimeout(1000);
    await page.screenshot({path:path.join(output,'accueil-desktop.png'),fullPage:true});
    await page.goto('http://127.0.0.1:4178/recherche.html?q=attention');
    await page.waitForFunction(()=>document.querySelectorAll('#archive-grid article').length===2);
    await page.goto('http://127.0.0.1:4178/usage.html');
    await page.waitForFunction(()=>document.querySelectorAll('#archive-grid article').length===2);
    await page.locator('#archive-grid a').first().click();
    await page.waitForSelector('#technical-sheet',{state:'hidden'});
    assert.match(await page.locator('#art-content').innerText(),/Exemple non publié/);
    assert.equal(await page.locator('#art-image-wrapper img').count(),1);
    await page.waitForFunction(()=>getComputedStyle(document.body).opacity==='1');
    await page.waitForTimeout(600);
    assert.equal(await page.locator('#art-image-wrapper figcaption').count(),1);
    assert.equal(await page.locator('#art-image-wrapper .image-credit').count(),0);
    await page.screenshot({path:path.join(output,'article-desktop.png'),fullPage:true});
    const noJS=await browser.newPage({javaScriptEnabled:false});
    await noJS.goto('http://127.0.0.1:4178/article.html?id=example-0');
    assert.equal(await noJS.locator('#art-title').innerText(),examples[0].title);
    assert.match(await noJS.locator('#art-content').innerText(),/Exemple non publié/);
    await noJS.close();
    for(const width of [390,768,1024]){
      await page.setViewportSize({width,height:844});await page.goto('http://127.0.0.1:4178/');
      await page.waitForFunction(()=>document.querySelectorAll('#latest-grid article').length===8);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`horizontal overflow at ${width}`);
      if(width===390){
        assert.equal(await page.locator('#latence-navigation').evaluate(el=>el.inert),true);
        await page.locator('.latence-menu-toggle').click();
        assert.equal(await page.locator('#latence-navigation').evaluate(el=>el.inert),false);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.latence-menu-toggle').getAttribute('aria-expanded'),'false');
        await page.emulateMedia({reducedMotion:'reduce'});
        assert.equal(await page.locator('.latence-hero-media img').evaluate(el=>getComputedStyle(el).transform),'none');
        await page.screenshot({path:path.join(output,'accueil-mobile.png'),fullPage:true});
        await page.screenshot({path:path.join(output,'accueil-mobile-viewport.png')});
      }
    }
    failList=true;await page.goto('http://127.0.0.1:4178/');
    await page.waitForFunction(()=>document.querySelector('#featured-grid').textContent.includes('ne peut pas'));
    assert.deepEqual(errors,[]);
    const result={passed:true,checks:['pagination beyond legacy page','featured and latest filtering','search','category','article navigation','server-rendered article without JS','mobile keyboard menu','reduced motion','390/768/1024 overflow','network failure','no page errors'],screenshots:output};
    fs.writeFileSync(path.join(output,'browser-checks.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
