/* LATENCE taxonomy. DECORUM-era categories remain in storage and are not exposed in LATENCE feeds. */
(function(root,factory){ const api=factory(); if(typeof module==='object' && module.exports) module.exports=api; else root.DecorumUniverses=api; })(typeof globalThis!=='undefined'?globalThis:this,function(){
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,' ').replace(/\s+/g,' ').trim();
  const definitions=[
    {slug:'usage',label:"À l'usage",terms:['a l usage','a l usage','usage']},
    {slug:'regard',label:'Le regard',terms:['le regard','regard']},
    {slug:'selection',label:'Sélection',terms:['selection']},
    {slug:'essentiel',label:"L'essentiel",terms:['l essentiel','essentiel']},
  ];
  function belongs(article,slug){ const def=definitions.find(u=>u.slug===slug); if(!def)return false; const category=normalize(article.category); return def.terms.some(term=>category===normalize(term)); }
  function matches(article,query){const text=normalize([article.title,article.excerpt,article.author,article.category].join(' ')); return normalize(query).split(/\s+/).filter(Boolean).every(word=>text.includes(word));}
  return {definitions,normalize,belongs,matches};
});
