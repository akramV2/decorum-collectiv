/* Shared categorisation preserves historical free-text categories. */
(function(root,factory){ const api=factory(); if(typeof module==='object' && module.exports) module.exports=api; else root.DecorumUniverses=api; })(typeof globalThis!=='undefined'?globalThis:this,function(){
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const definitions=[{slug:'architecture',label:'Architecture',terms:['architecture','architectural','architecturale']},{slug:'fashion',label:'Fashion',terms:['fashion','mode','couture']},{slug:'design',label:'Design',terms:['design']},{slug:'visual-culture',label:'Visual Culture',terms:['visual culture','culture visuelle','art','arts','photographie','photography','graphisme']}];
  function belongs(article,slug){ const def=definitions.find(u=>u.slug===slug); if(!def)return false; const category=normalize(article.category); return def.terms.some(term=>new RegExp('(^|[^a-z])'+term+'([^a-z]|$)').test(category)); }
  function matches(article,query){const text=normalize([article.title,article.excerpt,article.author,article.category].join(' ')); return normalize(query).trim().split(/\s+/).every(word=>text.includes(word));}
  return {definitions,normalize,belongs,matches};
});
