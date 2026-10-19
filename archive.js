document.addEventListener('DOMContentLoaded',()=>{
  const page=document.querySelector('[data-universe]'); if(!page)return;
  const grid=document.getElementById('archive-grid'),status=document.getElementById('archive-status'),retry=document.getElementById('archive-retry'),form=document.querySelector('.archive-search'),input=document.getElementById('search-query');
  if(!grid||!status)return;
  const universe=page.dataset.universe; let articles=[],loading=false,failed=false;
  if(input)input.value=(new URLSearchParams(location.search).get('q')||'').slice(0,200);
  function render(){
    const result=articles.filter(a=>universe==='recherche'?DecorumUniverses.definitions.some(u=>DecorumUniverses.belongs(a,u.slug))&&DecorumUniverses.matches(a,input?.value||''):DecorumUniverses.belongs(a,universe));
    grid.innerHTML=result.map(articleCardMarkup).join('');
    const empty=universe==='recherche'?'Aucun article LATENCE ne correspond à cette recherche.':'Les premiers articles de cette rubrique apparaîtront ici.';
    status.textContent=failed?'Le chargement est incomplet. Vous pouvez réessayer.':`${result.length} publication${result.length>1?'s':''}`;
    if(!result.length&&!failed)grid.innerHTML=`<p class="latence-empty">${empty}</p>`;
  }
  async function load(){if(loading)return;loading=true;failed=false;retry.hidden=true;grid.setAttribute('aria-busy','true');try{
    const seen=new Set();let cursor;articles=[];
    do {const params=cursor?{cursor}:{};const response=await Decorum.api('articles',{params});for(const article of response.items||[])if(!articles.some(a=>a.id===article.id))articles.push(article);cursor=response.nextCursor;if(cursor&&seen.has(cursor))throw new Error('Pagination répétée');if(cursor)seen.add(cursor);}while(cursor);
  }catch{failed=true;retry.hidden=false;}finally{loading=false;grid.setAttribute('aria-busy','false');render();}}
  form?.addEventListener('submit',event=>{event.preventDefault();const url=new URL(location.href);const q=input.value.trim();if(q)url.searchParams.set('q',q);else url.searchParams.delete('q');history.replaceState(null,'',url);render();});
  retry?.addEventListener('click',load);load();
});
