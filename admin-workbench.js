/* Newsroom tools. Local recovery stays in this browser tab and never publishes. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LatenceWorkbench = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const templates = [
    {name: 'Essai à l’usage', category: "À l'usage", type: 'ARTICLE', content: '<h2>Le contexte</h2>\n<p></p>\n<h2>Au quotidien</h2>\n<p></p>\n<h2>Ce qui fonctionne</h2>\n<p></p>\n<h2>Les limites</h2>\n<p></p>\n<h2>Notre regard</h2>\n<p></p>'},
    {name: 'Analyse', category: 'Le regard', type: 'ANALYSE', content: '<h2>Le point de départ</h2>\n<p></p>\n<h2>Ce qui change</h2>\n<p></p>\n<h2>Les enjeux</h2>\n<p></p>\n<h2>Pour aller plus loin</h2>\n<p></p>\n<h2>Sources et références</h2>\n<ul><li></li></ul>'},
    {name: 'Sélection commentée', category: 'Sélection', type: 'SÉLECTION', content: '<h2>Nos critères de sélection</h2>\n<p></p>\n<h2>Premier choix</h2>\n<p></p>\n<h2>Deuxième choix</h2>\n<p></p>\n<h2>Troisième choix</h2>\n<p></p>'},
    {name: 'Décryptage essentiel', category: "L'essentiel", type: 'ARTICLE', content: '<h2>Les faits</h2>\n<p></p>\n<h2>Pourquoi cela compte</h2>\n<p></p>\n<h2>Ce qu’il faut retenir</h2>\n<p></p>\n<h2>Sources et références</h2>\n<ul><li></li></ul>'},
    {name: 'Entretien', category: 'Le regard', type: 'INTERVIEW', content: '<h2>La rencontre</h2>\n<p></p>\n<h2>Première question</h2>\n<p></p>\n<h2>Deuxième question</h2>\n<p></p>\n<h2>Pour conclure</h2>\n<p></p>'},
  ];
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function filterPublications(items, {query = '', status = '', category = '', type = '', order = 'recent'} = {}) {
    const words = normalize(query).trim().split(/\s+/).filter(Boolean);
    return items.filter(a => (!status || a.status === status) && (!category || a.category === category) && (!type || a.type === type) && words.every(word => normalize([a.title, a.author, a.category, a.type, a.edition].join(' ')).includes(word)))
      .sort((a, b) => order === 'title' ? String(a.title || '').localeCompare(b.title || '', 'fr') : ((Date.parse(b.updatedAt || b.createdAt) || 0) - (Date.parse(a.updatedAt || a.createdAt) || 0)) * (order === 'old' ? -1 : 1));
  }
  function monthDays(year, month) {
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    return Array.from({length: Math.ceil((offset + new Date(year, month + 1, 0).getDate()) / 7) * 7}, (_, i) => new Date(year, month, 1 - offset + i));
  }
  const dayKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  function create({panel, call, all, editArticle, button, notify, values, leave, userId, markDirty}) {
    const node = (tag, text, cls) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; };
    const states = {published: 'Publié', draft: 'Brouillon', scheduled: 'Programmé'};
    const prefix = 'latence-recovery:' + userId + ':';
    const recoveryKey = a => prefix + (a.id || 'new');
    function clearRecovery(a) { try { sessionStorage.removeItem(recoveryKey(a)); } catch {} }
    function clearSession() {
      try { Object.keys(sessionStorage).filter(key => key.startsWith(prefix)).forEach(key => sessionStorage.removeItem(key)); } catch {}
    }
    // Called by the existing auth flow, including sign-out from another tab.
    firebase.auth().onAuthStateChanged(user => { if (!user || user.uid !== userId) clearSession(); });
    const recordDate = a => new Date(a.status === 'scheduled' ? a.publishAt : a.publishedAt || a.createdAt || a.updatedAt);
    async function records() {
      const [published, drafts] = await Promise.all([all('articles', true), all('editorialArticles', true)]);
      return [...published.map(a => ({...a, status:'published', collection:'articles'})), ...drafts.map(a => ({...a, status:a.status || 'draft', collection:'editorialArticles'}))];
    }
    const open = a => editArticleFrom(a);
    async function editArticleFrom(a) { if (await leave()) await editArticle(await call('admin-get', {params:{collection:a.collection, id:a.id}})); }
    function enhanceEditor(form, a) {
      const top = node('section', undefined, 'workbench-editor-tools');
      top.append(node('h3', 'Votre espace de rédaction'));
      const line = node('p', 'Ctrl / ⌘ + S pour enregistrer. La récupération locale reste privée dans cet onglet ; enregistrez un brouillon pour conserver votre travail sur le serveur.', 'form-note');
      const recoveryStatus = node('p', 'Aucune modification locale en attente.', 'form-note'); recoveryStatus.setAttribute('role','status');
      top.append(line, recoveryStatus);
      const chooser = node('select'); chooser.setAttribute('aria-label','Modèle de rédaction');
      chooser.add(new Option('Partir d’un modèle…',''));
      templates.forEach((t,i) => chooser.add(new Option(t.name,String(i))));
      const tools = node('div', undefined, 'admin-toolbar'); tools.append(chooser, button('Appliquer le modèle', () => {
        if (chooser.value === '') return;
        const t = templates[Number(chooser.value)];
        if (form.elements.content.value.trim() && !confirm('Remplacer le contenu du texte par ce modèle ? Le titre et les autres informations sont conservés.')) return;
        form.elements.content.value = t.content; form.elements.category.value = t.category;
        const format = form.querySelector('#publication-format');
        format.value = [...format.options].some(o => o.value === t.type) ? t.type : 'custom';
        form.elements.type.value = t.type; form.elements.type.dispatchEvent(new Event('input',{bubbles:true})); format.dispatchEvent(new Event('change',{bubbles:true}));
        form.elements.content.dispatchEvent(new Event('input',{bubbles:true})); markDirty();
        notify('Structure appliquée. Complétez chaque section avant de publier.');
      }));
      top.append(tools); form.prepend(top);
      // Synchronous storage: even an immediate reload preserves the last keystroke.
      function remember() {
        if (!form.isConnected) return;
        try {
          sessionStorage.setItem(recoveryKey(a), JSON.stringify({revision:a.updatedAt || null, at:new Date().toISOString(), data:values(form)}));
          recoveryStatus.textContent = 'Copie locale actualisée à ' + new Date().toLocaleTimeString('fr-FR') + ' — non enregistrée sur le serveur.';
        } catch { recoveryStatus.textContent = 'Copie locale indisponible ou pleine. Enregistrez votre brouillon sur le serveur.'; }
      }
      let saved;
      try { saved = JSON.parse(sessionStorage.getItem(recoveryKey(a)) || 'null'); } catch {}
      if (saved?.data && typeof saved.data === 'object') {
        const banner = node('aside', undefined, 'workbench-recovery');
        banner.append(node('p', 'Une copie locale est disponible (' + new Date(saved.at).toLocaleString('fr-FR') + ').' + (saved.revision !== (a.updatedAt || null) ? ' La version du serveur a changé : comparez avant d’enregistrer.' : '')));
        banner.append(button('Récupérer en brouillon', () => {
          const format = form.querySelector('#publication-format'); format.value = 'custom';
          for (const [key,value] of Object.entries(saved.data)) {
            if (value && typeof value === 'object') { for (const [sub,val] of Object.entries(value)) { const input = form.elements[key+'.'+sub]; if (input && typeof val === 'string') input.value = val; } }
            else if (form.elements[key] && typeof value === 'string') form.elements[key].value = value;
          }
          form.elements.status.value = 'draft'; form.elements.publishAt.value = '';
          form.elements.type.dispatchEvent(new Event('input',{bubbles:true})); format.dispatchEvent(new Event('change',{bubbles:true}));
          form.elements.status.dispatchEvent(new Event('change',{bubbles:true}));
          form.elements.content.dispatchEvent(new Event('input',{bubbles:true}));
          markDirty(); banner.remove(); notify('Copie récupérée en brouillon. Vérifiez les informations avant d’enregistrer.');
        }), button('Ignorer cette copie', () => { clearRecovery(a); banner.remove(); recoveryStatus.textContent = 'Copie locale effacée.'; }));
        top.append(banner);
      }
      form.addEventListener('input', remember); form.addEventListener('change', remember);
      const checklist = node('details', undefined, 'workbench-checklist'); checklist.open = true;
      checklist.append(node('summary','Contrôles de publication'));
      const checks = node('ul'); checklist.append(checks); top.append(checklist);
      function review() {
        const v = values(form), text = node('div'); renderEditorialContent(text,v.content);
        const entries = [
          ['Titre renseigné', !!v.title?.trim()], ['Rubrique choisie', !!v.category], ['Auteur renseigné', !!v.author?.trim()],
          ['Chapeau renseigné', !!v.excerpt?.trim()], ['Texte renseigné', !!text.textContent.trim()],
          ['Image principale', !!safeImageUrl(v.image)], ['Description de l’image', !!v.imageAlt?.trim()], ['Crédit de l’image', !!v.imageCredit?.trim()],
          ['Intertitres pour guider la lecture', !!text.querySelector('h2')],
          ['Date future si programmation', v.status !== 'scheduled' || Date.parse(v.publishAt) > Date.now()],
        ];
        checks.replaceChildren(...entries.map(([label,ok]) => node('li',(ok ? '✓ ' : 'À vérifier · ') + label, ok ? 'check-done' : 'check-pending')));
      }
      form.addEventListener('input', review); form.addEventListener('change',review); review();
      tools.append(button('Exporter ce travail (JSON)', () => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(values(form),null,2)], {type:'application/json'}));
        const link = node('a'); link.href = url; link.download = 'latence-travail.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
      }));
    }
    async function publicationLibrary() {
      const items = await records(); panel.replaceChildren();
      panel.append(node('h2','Toutes les publications'),node('p','Les versions en ligne et les versions de travail apparaissent séparément pour préserver vos modifications.', 'form-note'));
      panel.append(button('Nouvelle publication', () => editArticle()));
      const filters = node('div',undefined,'workbench-filters'), controls = {};
      for (const [name,label,options] of [
        ['query','Rechercher',null], ['status','Statut',Object.entries(states)],
        ['category','Rubrique',[...new Set(items.map(a=>a.category).filter(Boolean))].sort().map(v=>[v,v])],
        ['type','Format',[...new Set(items.map(a=>a.type).filter(Boolean))].sort().map(v=>[v,v])],
        ['order','Trier',[['recent','Modification récente'],['old','Modification ancienne'],['title','Titre A–Z']]],
      ]) {
        const wrap = node('label',label), input = node(options ? 'select' : 'input'); input.name = name;
        if (options) { if (name !== 'order') input.add(new Option('Tous','')); options.forEach(([v,l])=>input.add(new Option(l,v))); }
        else { input.type = 'search'; input.placeholder = 'Titre, auteur, édition…'; }
        controls[name] = input; wrap.append(input); filters.append(wrap);
      }
      const count=node('p'); count.setAttribute('role','status'); const results=node('div'), pagination=node('div',undefined,'admin-toolbar');
      panel.append(filters,count,results,pagination); let page=0;
      function paint() {
        const found=filterPublications(items,Object.fromEntries(Object.entries(controls).map(([k,v])=>[k,v.value])));
        page=Math.min(page,Math.max(0,Math.ceil(found.length/15)-1)); count.textContent=found.length+' version(s)'; results.replaceChildren(); pagination.replaceChildren();
        for(const a of found.slice(page*15,(page+1)*15)) {
          const row=node('article',undefined,'admin-row'), info=node('div'); info.append(node('strong',a.title||'Sans titre'),node('p',[states[a.status],a.category,a.type,a.author,a.edition].filter(Boolean).join(' · ')));
          const actions=node('div',undefined,'admin-row-actions'); actions.append(button('Modifier',()=>open(a)));
          if(a.status==='published') { const link=node('a','Voir ↗','small-button'); link.href='article.html?id='+encodeURIComponent(a.id); link.target='_blank'; link.rel='noopener'; actions.append(link); }
          actions.append(button('Dupliquer',async()=> { const original=await call('admin-get',{params:{collection:a.collection,id:a.id}}); await editArticle({...original,id:undefined,updatedAt:undefined,title:(original.title||'')+' — copie',status:'draft',publishAt:null,edition:'',placeId:''}); }));
          row.append(info,actions); results.append(row);
        }
        if(!found.length) results.append(node('p','Aucune publication ne correspond à ces filtres.'));
        if(found.length>15) { const prev=button('← Précédent',()=>{page--;paint();}), next=button('Suivant →',()=>{page++;paint();}); prev.disabled=page===0; next.disabled=(page+1)*15>=found.length; pagination.append(prev,`Page ${page+1} / ${Math.ceil(found.length/15)}`,next); }
      }
      Object.values(controls).forEach(input=>input.addEventListener(input.tagName==='INPUT'?'input':'change',()=>{page=0;paint();}));
      filters.append(button('Réinitialiser les filtres',()=>{Object.entries(controls).forEach(([k,v])=>{v.value=k==='order'?'recent':'';});page=0;paint();})); paint();
    }
    async function calendar() {
      const items=(await records()).filter(a=>a.status!=='draft'); let month=new Date(); month=new Date(month.getFullYear(),month.getMonth(),1);
      panel.replaceChildren(); panel.append(node('h2','Calendrier éditorial'),node('p','Publications en ligne et programmations, dans votre fuseau horaire. Les brouillons sans date restent dans la bibliothèque.', 'form-note'));
      const nav=node('div',undefined,'admin-toolbar'), title=node('h3'), grid=node('div',undefined,'workbench-calendar'); panel.append(nav,grid);
      nav.append(button('← Mois précédent',()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);paint();}),title,button('Mois suivant →',()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);paint();}),button('Aujourd’hui',()=>{month=new Date();month=new Date(month.getFullYear(),month.getMonth(),1);paint();}));
      function paint() {
        title.textContent=month.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}); grid.replaceChildren();
        for(const date of monthDays(month.getFullYear(),month.getMonth())) {
          const cell=node('section',undefined,'workbench-day'); if(date.getMonth()!==month.getMonth()) cell.classList.add('outside-month');
          const label=node('h4',date.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric'})); if(dayKey(date)===dayKey(new Date())) label.textContent+=' · Aujourd’hui'; cell.append(label);
          for(const a of items.filter(a=>dayKey(recordDate(a))===dayKey(date)).sort((a,b)=>recordDate(a)-recordDate(b))) {
            const time=recordDate(a).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
            cell.append(button(`${time} · ${states[a.status]} · ${a.title||'Sans titre'}`,()=>open(a)));
          }
          grid.append(cell);
        }
      } paint();
    }
    function dashboardOverview(articles,drafts) {
      const box=node('section',undefined,'workbench-overview'); box.append(node('h3','L’équilibre des rubriques'));
      const stats=node('div',undefined,'admin-metrics');
      for(const def of DecorumUniverses.definitions) {
        const published=articles.filter(a=>DecorumUniverses.belongs(a,def.slug)).length, work=drafts.filter(a=>DecorumUniverses.belongs(a,def.slug)).length;
        const card=node('div'); card.append(node('strong',String(published)),node('span',def.label),node('small',work+' version(s) de travail')); stats.append(card);
      }
      box.append(stats,node('h3','Dernières modifications'));
      const recent=[...articles.map(a=>({...a,collection:'articles'})),...drafts.map(a=>({...a,collection:'editorialArticles'}))].sort((a,b)=>(Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0)).slice(0,5);
      for(const a of recent) box.append(button(`${a.title || 'Sans titre'} · ${states[a.status || 'published']}`,()=>open(a)));
      panel.append(box);
    }
    return {enhanceEditor, clearRecovery, publicationLibrary, calendar, dashboardOverview};
  }
  return {templates,filterPublications,monthDays,dayKey,create};
});
