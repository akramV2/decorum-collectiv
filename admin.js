/* Progressive newsroom: the legacy form stays available until server activation. */
document.addEventListener("DOMContentLoaded", () => {
  if (typeof firebase === "undefined" || !firebase.auth) return;
  let newsroom;
  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      if (newsroom) newsroom.hidden = true;
      return;
    }
    const health = await Decorum.ready();
    if (!health.ready) {
      if (!document.getElementById("activation-note")) {
        const note = document.createElement("p");
        note.id = "activation-note";
        note.className = "status-message";
        note.textContent =
          "Les nouveaux outils éditoriaux attendent l’activation du serveur. Le formulaire actuel reste disponible.";
        document.getElementById("admin-content").prepend(note);
      }
      return;
    }
    try {
      await Decorum.api("admin-list", {
        admin: true,
        params: { collection: "authors" },
      });
    } catch (e) {
      showNotification(e.message);
      document.getElementById("admin-content").style.display = "none";
      return;
    }
    document.getElementById("admin-content").style.display = "none";
    if (newsroom) {
      newsroom.hidden = false;
      return;
    }
    newsroom = document.createElement("main");
    newsroom.className = "container workspace";
    newsroom.innerHTML =
      '<header><span class="tag-outline">ESPACE RÉDACTION</span><h1>Le journal se construit ici.</h1></header><nav class="workspace-nav" aria-label="Outils éditoriaux"></nav><p id="workspace-status" class="status-message" role="status" aria-live="polite"></p><div id="workspace-panel"></div>';
    document.body.append(newsroom);
    const nav = newsroom.querySelector("nav"),
      panel = newsroom.querySelector("#workspace-panel"),
      status = newsroom.querySelector("#workspace-status");
    const labels = {
      dashboard: "Tableau de bord",
      articles: "Articles",
      drafts: "Brouillons & programmation",
      countdown: "Prochain article",
      places: "Lieux & carte",
      submissions: "Propositions",
      authors: "Auteurs",
      categories: "Catégories",
    };
    const e = escapeHtml;
    let dirty = false;
    let saving = false;
    let navigating = false;
    const leave = async () => {
      if (!dirty) return true;
      const dialog = document.createElement("dialog"); dialog.className = "admin-leave-dialog";
      dialog.setAttribute("aria-labelledby", "leave-title");
      dialog.innerHTML = '<h2 id="leave-title">Modifications non enregistrées</h2><p>Enregistrez votre travail avant de quitter, ou abandonnez les modifications de ce formulaire.</p><form method="dialog"><button value="stay" autofocus>Continuer à modifier</button><button value="leave">Abandonner les modifications</button></form>';
      document.body.append(dialog);
      return new Promise(resolve => { dialog.addEventListener("close", () => { const accepted = dialog.returnValue === "leave"; dialog.remove(); resolve(accepted); }, {once:true}); dialog.showModal(); });
    };
    window.addEventListener("beforeunload", event => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });
    panel.addEventListener("input", event => {
      if (event.target.closest("form")) dirty = true;
    });
    panel.addEventListener("change", event => {
      if (event.target.closest("form")) dirty = true;
    });
    document.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s" && !newsroom.hidden) {
        const form = panel.querySelector("form");
        if (form) { event.preventDefault(); form.requestSubmit(); }
      }
    });
    const states = { published: "Publié", draft: "Brouillon", scheduled: "Programmé" };
    const folded = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const dateLabel = value => value ? new Date(value).toLocaleString("fr-FR", {dateStyle:"medium", timeStyle:"short"}) : "";
    function download(name, value) {
      const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], {type:"application/json"}));
      const link = document.createElement("a");
      link.href = url; link.download = name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    function collectionView(items, {searchText, filters = {}, filterValue, filterMatch, render, heading}) {
      const section = document.createElement("section");
      section.innerHTML = `<h2>${e(heading)}</h2><div class="admin-filters"><label>Rechercher<input type="search" placeholder="Titre, ville, auteur…"></label><label>Filtrer<select><option value="">Tous</option>${Object.entries(filters).map(([key, label]) => `<option value="${e(key)}">${e(label)}</option>`).join("")}</select></label><label>Trier<select data-sort><option value="recent">Plus récents</option><option value="name">Ordre alphabétique</option><option value="old">Plus anciens</option></select></label></div><p data-count role="status"></p><div data-results></div><div class="admin-toolbar" data-pages></div>`;
      panel.append(section);
      const search = section.querySelector("input"), filter = section.querySelector("select"), sort = section.querySelector("[data-sort]"), results = section.querySelector("[data-results]"), pages = section.querySelector("[data-pages]");
      let page = 0;
      function paint() {
        const query = folded(search.value).trim();
        const found = items.filter(item => folded(searchText(item)).includes(query) && (!filter.value || (filterMatch ? filterMatch(item, filter.value) : filterValue(item) === filter.value)));
        found.sort((a,b) => sort.value === "name" ? (a.title || a.name || "").localeCompare(b.title || b.name || "", "fr") : ((Date.parse(b.updatedAt || b.createdAt) || 0) - (Date.parse(a.updatedAt || a.createdAt) || 0)) * (sort.value === "old" ? -1 : 1));
        page = Math.min(page, Math.max(0, Math.ceil(found.length / 20) - 1));
        section.querySelector("[data-count]").textContent = `${found.length} résultat${found.length === 1 ? "" : "s"}`;
        results.replaceChildren(); pages.replaceChildren();
        for (const item of found.slice(page * 20, (page + 1) * 20)) results.append(render(item));
        if (!found.length) results.textContent = "Aucun résultat. Essayez un autre filtre.";
        if (found.length > 20) {
          const previous = button("← Précédent", () => { page--; paint(); }); previous.disabled = page === 0;
          const next = button("Suivant →", () => { page++; paint(); }); next.disabled = (page + 1) * 20 >= found.length;
          pages.append(previous, `Page ${page + 1} / ${Math.ceil(found.length / 20)}`, next);
        }
      }
      for (const control of [search, filter, sort]) control.addEventListener(control === search ? "input" : "change", async () => { if (!await leave()) return; dirty = false; page = 0; paint(); });
      paint();
    }
    async function dashboard() {
      const [articles, drafts, places, proposals] = await Promise.all([all("articles", true), all("editorialArticles", true), all("places"), all("submissions")]);
      panel.innerHTML = `<h2>Votre rédaction en un regard</h2><div class="admin-metrics">${[[articles.length,"Articles publiés"],[drafts.filter(a=>a.status !== "scheduled").length,"Brouillons"],[drafts.filter(a=>a.status === "scheduled").length,"Programmations"],[places.filter(p=>!p.deleted).length,"Lieux sur la carte"],[proposals.filter(p=>p.status === "pending").length,"Propositions à examiner"]].map(([n,label])=>`<div><strong>${n}</strong><span>${label}</span></div>`).join("")}</div><div class="admin-toolbar" data-actions></div><h3>Publications programmées</h3><div data-schedule></div><p class="form-note">Les horaires sont affichés dans votre fuseau : ${e(Intl.DateTimeFormat().resolvedOptions().timeZone)}. La publication est déclenchée lors de la première consultation du site après l’heure prévue.</p>`;
      panel.querySelector("[data-actions]").append(button("Écrire un article", () => editArticle()), button("Ajouter un lieu", () => placeEditor()), button("Examiner les propositions", () => submissions()));
      const schedule = panel.querySelector("[data-schedule]");
      const upcoming = drafts.filter(a => a.status === "scheduled").sort((a,b)=>Date.parse(a.publishAt)-Date.parse(b.publishAt));
      if (!upcoming.length) schedule.textContent = "Aucune publication programmée.";
      for (const a of upcoming) {
        const row = document.createElement("div"); row.className = "admin-row";
        const info = document.createElement("p"); info.textContent = `${a.title} · ${dateLabel(a.publishAt)}`;
        row.append(info, button("Modifier", async () => editArticle(await call("admin-get", {params:{collection:"editorialArticles",id:a.id}})))); schedule.append(row);
      }
    }
    const notify = (message) => {
      status.textContent = message;
    };
    const call = (action, options = {}) =>
      Decorum.api(action, { ...options, admin: true });
    const field = (name, label, value = "", type = "text", required = false) =>
      `<div class="field"><label for="f-${name}">${e(label)}</label>${type === "textarea" ? `<textarea id="f-${name}" name="${name}" ${required ? "required" : ""}>${e(value)}</textarea>` : `<input id="f-${name}" name="${name}" type="${type}" value="${e(value ?? "")}" ${required ? "required" : ""}>`}</div>`;
    const group = (prefix, value, fields) =>
      Object.entries(fields)
        .map(([key, label]) =>
          field(
            `${prefix}.${key}`,
            label,
            value?.[key] || "",
            ["hours", "transport"].includes(key) ? "textarea" : "text",
          ),
        )
        .join("");
    function values(form) {
      const out = {};
      for (const [key, value] of new FormData(form)) {
        const [group, key2] = key.split(".");
        if (key2) {
          out[group] ||= {};
          out[group][key2] = value;
        } else out[key] = value;
      }
      return out;
    }
    function bind(form, handler) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const btn = form.querySelector("button[type=submit]");
        if (btn.disabled) return;
        btn.disabled = true;
        saving = true;
        form.inert = true;
        notify("Enregistrement…");
        try {
          await handler(values(form));
          dirty = false;
        } catch (error) {
          notify(error.message);
        } finally {
          btn.disabled = false;
          saving = false;
          form.inert = false;
        }
      });
    }
    function button(label, fn) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "small-button";
      b.textContent = label;
      b.addEventListener("click", () =>
        Promise.resolve()
          .then(() => { b.disabled = true; return fn(); })
          .catch((err) => notify(err.message))
          .finally(() => { b.disabled = false; }),
      );
      return b;
    }
    function localDate(iso) {
      if (!iso) return "";
      const date = new Date(iso);
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    }
    async function all(collection, summary = false) {
      let items = [],
        cursor;
      do {
        const page = await call("admin-list", {
          params: { collection, ...(summary ? {summary:"1"} : {}), ...(cursor ? { cursor } : {}) },
        });
        items.push(...page.items);
        cursor = page.nextCursor;
      } while (cursor);
      return items;
    }
    async function editArticle(a = {}) {
      dirty = !a.id && !!a.title;
      panel.innerHTML = `<h2>${a.id ? "Modifier l’article" : "Nouvel article"}</h2><form id="article-editor"><fieldset><legend>Publication</legend>${field("title", "Titre *", a.title, "text", true)}<div class="fields-grid">${field("author", "Auteur", a.author || "Raphaël")}${field("category", "Catégorie", a.category)}${field("type", "Format", a.type || "ARTICLE")}${field("edition", "Numéro / édition DECORUM", a.edition)}</div><label for="article-status">Statut</label><select id="article-status" name="status"><option value="draft">Brouillon privé</option><option value="scheduled">Publication programmée</option><option value="published">Publier maintenant</option></select>${field("publishAt", `Date et heure (${Intl.DateTimeFormat().resolvedOptions().timeZone})`, localDate(a.publishAt), "datetime-local")}<p class="form-note">Un brouillon d’un article déjà publié conserve la version actuellement en ligne. Pour la retirer, utilisez « Retirer du site » dans la liste des articles.</p></fieldset><fieldset><legend>Texte et photographie</legend>${field("image", "Photo principale — URL", a.image, "url")}<div class="field"><label for="editor-photo">Ou importer une image (500 Ko maximum)</label><input id="editor-photo" type="file" accept="image/jpeg,image/png,image/webp,image/avif"></div>${field("imageAlt", "Description de l’image", a.imageAlt)}${field("imageCredit", "Crédit photographique", a.imageCredit)}${field("excerpt", "Chapeau", a.excerpt, "textarea")}${field("content", "Contenu — texte ou HTML éditorial", a.content, "textarea")}</fieldset><fieldset><legend>Fiche technique — champs facultatifs</legend><div class="fields-grid">${group("technical", a.technical, Decorum.TECH)}</div></fieldset><fieldset><legend>Préparer la visite</legend><div class="fields-grid">${group("visit", a.visit, Decorum.VISIT)}${field("visit.lat", "Latitude", a.visit?.lat ?? "")}${field("visit.lng", "Longitude", a.visit?.lng ?? "")}${field("placeId", "Identifiant du lieu sur la carte", a.placeId)}</div></fieldset><fieldset><legend>Partage et référencement</legend>${field("seoTitle", "Titre SEO", a.seoTitle)}${field("seoDescription", "Description SEO", a.seoDescription, "textarea")}</fieldset><div class="admin-toolbar"><button type="button" class="btn-preview" id="editor-preview">APERÇU</button><button type="submit" class="btn-submit">ENREGISTRER</button></div></form><section id="editor-preview-output" hidden></section>`;
      const form = panel.querySelector("form");
      form.elements.status.value = a.status || "draft";
      form.elements.content.className = "content-field";
      form.elements.image.type = "text";
      const saveButton = form.querySelector("button[type=submit]");
      const scheduleField = form.elements.publishAt.closest(".field");
      function publicationMode() {
        const scheduled = form.elements.status.value === "scheduled";
        scheduleField.hidden = !scheduled;
        form.elements.publishAt.required = scheduled;
        saveButton.textContent = {draft:"ENREGISTRER LE BROUILLON", scheduled:"PROGRAMMER", published:"PUBLIER LES MODIFICATIONS"}[form.elements.status.value];
      }
      form.elements.status.addEventListener("change", publicationMode);
      publicationMode();
      const tools = document.createElement("div"); tools.className = "admin-toolbar editor-formatting";
      const contentInput = form.elements.content;
      function insert(before, after = "", placeholder = "Texte") {
        const start = contentInput.selectionStart, end = contentInput.selectionEnd;
        contentInput.setRangeText(before + (contentInput.value.slice(start,end) || placeholder) + after, start, end, "select");
        contentInput.focus(); contentInput.dispatchEvent(new Event("input", {bubbles:true}));
      }
      for (const [label, before, after] of [["Intertitre", "\n<h2>", "</h2>\n"],["Paragraphe", "\n<p>", "</p>\n"],["Gras", "<strong>", "</strong>"],["Italique", "<em>", "</em>"],["Citation", "\n<blockquote>", "</blockquote>\n"],["Liste", "\n<ul><li>", "</li></ul>\n"]]) tools.append(button(label, () => insert(before,after)));
      contentInput.before(tools);
      const indicators = document.createElement("div"); indicators.className = "editor-indicators"; indicators.setAttribute("aria-live", "polite");
      contentInput.after(indicators);
      const seoPreview = document.createElement("div"); seoPreview.className = "admin-seo-preview";
      form.elements.seoDescription.closest("fieldset").append(seoPreview);
      function updateIndicators() {
        const text = document.createElement("div"); renderEditorialContent(text, contentInput.value);
        const words = contentInput.value.trim() ? (text.textContent || "").trim().split(/\s+/).filter(Boolean).length : 0;
        const missing = [["auteur",form.elements.author.value],["chapeau",form.elements.excerpt.value],["contenu",contentInput.value],["photo",form.elements.image.value],["description de la photo",form.elements.imageAlt.value]].filter(([,value]) => !value.trim()).map(([label])=>label);
        indicators.textContent = `${words} mots · ${Math.max(1,Math.ceil(words/220))} min de lecture · ${missing.length ? "À compléter : " + missing.join(", ") : "Les principaux champs sont renseignés"}`;
        const title = form.elements.seoTitle.value || form.elements.title.value;
        const description = form.elements.seoDescription.value || form.elements.excerpt.value;
        seoPreview.replaceChildren();
        const heading = document.createElement("strong"); heading.textContent = title || "Titre dans les moteurs de recherche";
        const excerpt = document.createElement("p"); excerpt.textContent = description || "Description dans les moteurs de recherche";
        const lengths = document.createElement("small"); lengths.textContent = `Titre : ${title.length} caractères · Description : ${description.length} caractères. Repères indicatifs : 50–60 et 140–160 caractères.`;
        seoPreview.append(heading,excerpt,lengths);
      }
      let indicatorTimer;
      form.addEventListener("input", () => { clearTimeout(indicatorTimer); indicatorTimer = setTimeout(updateIndicators, 200); });
      updateIndicators();
      for (const fieldset of [...form.querySelectorAll("fieldset")].slice(2)) {
        const details = document.createElement("details"); details.className = "admin-details";
        const summary = document.createElement("summary"); summary.textContent = fieldset.querySelector("legend").textContent;
        fieldset.before(details); details.append(summary,fieldset);
      }
      const file = form.querySelector("#editor-photo");
      file.addEventListener("change", async () => {
        const f = file.files[0];
        if (!f) return;
        if (
          f.size > 500 * 1024 ||
          !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
            f.type,
          )
        ) {
          notify("Image de 500 Ko maximum, au format JPEG, PNG, WebP ou AVIF.");
          file.value = "";
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          form.elements.image.value = reader.result;
          dirty = true;
          updateIndicators();
          notify("Image prête à enregistrer.");
        };
        reader.readAsDataURL(f);
      });
      panel.querySelector("#editor-preview").addEventListener("click", () => {
        const v = values(form),
          box = panel.querySelector("#editor-preview-output");
        box.hidden = false;
        box.replaceChildren();
        const h = document.createElement("h2");
        h.textContent = v.title;
        const lead = document.createElement("p");
        lead.textContent = v.excerpt;
        const content = document.createElement("div");
        content.className = "article-body";
        renderEditorialContent(content, v.content);
        box.append(h, lead, content);
        const imageUrl = safeImageUrl(v.image);
        if (imageUrl) {
          const img = document.createElement("img"); img.src = imageUrl; img.alt = v.imageAlt || v.title;
          img.className = "admin-preview-image"; box.insertBefore(img, content);
        }
        const byline = document.createElement("p"); byline.textContent = [v.author, v.edition, v.imageCredit && "Photo : " + v.imageCredit].filter(Boolean).join(" · ");
        box.insertBefore(byline, lead);
        for (const [title, value, fields] of [["Fiche technique",v.technical,Decorum.TECH],["Informations de visite",v.visit,Decorum.VISIT]]) {
          const entries = Object.entries(fields).filter(([key]) => value?.[key]);
          if (!entries.length) continue;
          const facts = document.createElement("section"); facts.className = "editorial-facts";
          const heading = document.createElement("h3"); heading.textContent = title; facts.append(heading);
          const dl = document.createElement("dl");
          for (const [key,label] of entries) { const dt = document.createElement("dt"), dd = document.createElement("dd"); dt.textContent = label; dd.textContent = value[key]; dl.append(dt,dd); }
          facts.append(dl); box.append(facts);
        }
        box.append(button("Fermer l’aperçu", () => { box.hidden = true; form.querySelector("#editor-preview").focus(); }));
        box.scrollIntoView({ behavior: "auto" });
      });
      const [authors, categories, places, published, drafts] = await Promise.all([
        all("authors"),
        all("categories"),
        all("places"), all("articles", true), all("editorialArticles", true),
      ]);
      const placeSelect = document.createElement("select"); placeSelect.name = "placeId"; placeSelect.id = "f-placeId";
      placeSelect.add(new Option("Aucun lieu associé", ""));
      for (const p of places.filter(p=>!p.deleted || p.id === a.placeId)) placeSelect.add(new Option(`${p.name} — ${p.city || p.country || ""}`, p.id));
      if (a.placeId && !places.some(p=>p.id === a.placeId)) placeSelect.add(new Option("Lieu actuellement indisponible", a.placeId));
      placeSelect.value = a.placeId || ""; form.elements.placeId.replaceWith(placeSelect);
      form.querySelector('label[for="f-placeId"]').textContent = "Lieu associé sur la carte";
      form.elements.edition.after(button("Proposer le prochain numéro", () => {
        const numbers = [...published,...drafts].map(item => Number(String(item.edition || "").match(/#(\d+)/)?.[1] || 0));
        form.elements.edition.value = `Édition #${String(Math.max(0,...numbers) + 1).padStart(3,"0")}`;
        dirty = true;
      }));
      for (const [name, items] of [
        ["author", authors],
        ["category", [...new Set(["Architecture", "Fashion", "Design", "Visual Culture", ...categories.map(c => c.name)])].map(name => ({name}))],
      ]) {
        const dl = document.createElement("datalist");
        dl.id = `editor-${name}-options`;
        for (const item of items) {
          const opt = document.createElement("option");
          opt.value = item.name;
          dl.append(opt);
        }
        form.append(dl);
        form.elements[name].setAttribute("list", dl.id);
      }
      bind(form, async (v) => {
        v.publishAt = v.publishAt ? new Date(v.publishAt).toISOString() : null;
        const result = await call("admin-save", {
          body: {
            ...v,
            ...(a.id ? { id: a.id } : {}),
            revision: a.updatedAt || null,
          },
        });
        dirty = false;
        notify(
          v.status === "published"
            ? "Article publié."
            : v.status === "scheduled"
              ? "Publication programmée."
              : "Brouillon enregistré.",
        );
        await editArticle(
          await call("admin-get", {
            params: {
              id: result.id,
              collection:
                v.status === "published" ? "articles" : "editorialArticles",
            },
          }),
        );
      });
    }
    async function articleList(collection) {
      const items = await all(collection, true);
      panel.replaceChildren();
      const toolbar = document.createElement("div"); toolbar.className = "admin-toolbar";
      toolbar.append(button("Nouvel article", () => editArticle()), button("Exporter cette rubrique (JSON)", async () => download("decorum-" + collection + ".json", await all(collection))));
      panel.append(toolbar);
      collectionView(items, {
        heading: collection === "articles" ? "Articles publiés" : "Brouillons et programmation",
        searchText: a => [a.title, a.author, a.category, a.edition].join(" "),
        filters: states, filterValue: a => a.status || "published",
        render(a) {
          const row = document.createElement("div"); row.className = "admin-row";
          const info = document.createElement("div");
          const title = document.createElement("strong"); title.textContent = a.title || "Sans titre";
          const meta = document.createElement("p");
          meta.textContent = [states[a.status || "published"], a.edition, a.category, a.author, dateLabel(a.publishAt || a.updatedAt)].filter(Boolean).join(" · ");
          info.append(title, meta);
          const actions = document.createElement("div"); actions.className = "admin-row-actions";
          actions.append(button("Modifier", async () => editArticle(await call("admin-get", {params:{collection, id:a.id}}))), button("Dupliquer", async () => editArticle({...await call("admin-get", {params:{collection,id:a.id}}), id:undefined, updatedAt:undefined, title:a.title + " — copie", status:"draft", publishAt:null, edition:"", placeId:""})));
          if (collection === "articles") {
            const link = document.createElement("a"); link.className = "small-button"; link.textContent = "Voir ↗"; link.href = "article.html?id=" + encodeURIComponent(a.id); link.target = "_blank"; link.rel = "noopener";
            actions.append(link, button("Copier le lien", async () => { await navigator.clipboard.writeText(new URL(link.href).href); notify("Lien copié."); }), button("Retirer du site", async () => {
              if (!confirm("Retirer cet article du site et le conserver comme brouillon privé ?")) return;
              await call("admin-archive", {body:{id:a.id}}); notify("Article conservé dans les brouillons."); await articleList(collection);
            }));
          }
          row.append(info, actions); return row;
        }
      });
    }
    async function countdown() {
      const c = await call("admin-settings");
      const articles = [...await all("articles", true), ...await all("editorialArticles", true)];
      const unique = [...new Map(articles.map(a => [a.id,a])).values()];
      panel.innerHTML = `<h2>Prochaine publication</h2><form><fieldset><legend>Bloc d’accueil</legend><label><input type="checkbox" name="enabled" ${c.enabled ? "checked" : ""}> Afficher le bloc</label>${field("title", "Titre *", c.title || "Prochain article — Jeudi", "text", true)}${field("teaser", "Teaser", c.teaser, "textarea")}${field("publishAt", `Date et heure (${Intl.DateTimeFormat().resolvedOptions().timeZone})`, localDate(c.publishAt), "datetime-local")}${field("articleId", "Identifiant de l’article associé (facultatif)", c.articleId)}</fieldset><button type="submit" class="btn-submit">ENREGISTRER</button></form>`;
      const form = panel.querySelector("form");
      const articleSelect = document.createElement("select"); articleSelect.name = "articleId"; articleSelect.id = "f-articleId";
      articleSelect.add(new Option("Aucun article associé", ""));
      for (const a of unique) articleSelect.add(new Option(a.title + " — " + (states[a.status] || "Publié"), a.id));
      if (c.articleId && !unique.some(a => a.id === c.articleId)) articleSelect.add(new Option("Association à vérifier : " + c.articleId, c.articleId));
      articleSelect.value = c.articleId || ""; form.elements.articleId.replaceWith(articleSelect);
      form.querySelector('label[for="f-articleId"]').textContent = "Article associé (facultatif)";
      bind(form, async (v) => {
        await call("admin-countdown", {
          body: {
            ...v,
            enabled: form.elements.enabled.checked,
            publishAt: v.publishAt ? new Date(v.publishAt).toISOString() : null,
          },
        });
        notify("Bloc de prochaine publication enregistré.");
      });
    }
    async function placeEditor(p = {}) {
      const articles = await all("articles", true);
      const articleSelect = `<div class="field"><label for="f-articleId">Article associé</label><select id="f-articleId" name="articleId"><option value="">Aucun article</option>${articles.map(a => `<option value="${e(a.id)}" ${a.id === p.articleId ? "selected" : ""}>${e(a.title)}${a.edition ? ` — ${e(a.edition)}` : ""}</option>`).join("")}</select></div>`;
      panel.innerHTML = `<h2>${p.id ? "Modifier le lieu" : "Ajouter un lieu"}</h2><form><fieldset><legend>Bâtiment</legend><div class="fields-grid">${field("name", "Nom *", p.name, "text", true)}${field("architect", "Architecte", p.architect)}${field("city", "Ville", p.city)}${field("country", "Pays", p.country)}${field("lat", "Latitude", p.lat ?? "")}${field("lng", "Longitude", p.lng ?? "")}${articleSelect}${field("image", "Photographie — URL", p.image, "url")}</div>${field("description", "Description", p.description, "textarea")}</fieldset><fieldset><legend>Visite</legend>${group("visit", p.visit, Decorum.VISIT)}</fieldset><button type="submit" class="btn-submit">ENREGISTRER LE LIEU</button></form>`;
      bind(panel.querySelector("form"), async (v) => {
        await call("admin-place", {
          body: { ...v, ...(p.id ? { id: p.id } : {}) },
        });
        notify("Lieu enregistré sur la carte.");
        await placeList();
      });
    }
    async function placeList() {
      const items = await all("places");
      panel.replaceChildren();
      panel.append(button("Ajouter un lieu", () => placeEditor()));
      collectionView(items, {
        heading:"Lieux et carte", searchText:p => [p.name,p.city,p.country,p.architect].join(" "),
        filters:{active:"Sur la carte",deleted:"Retirés de la carte",unlinked:"Sans article associé"},
        filterValue:p => p.deleted ? "deleted" : "active",
        filterMatch:(p, value) => value === "unlinked" ? !p.deleted && !p.articleId : (p.deleted ? "deleted" : "active") === value,
        render(p) {
          const row = document.createElement("div"); row.className = "admin-row";
          const info = document.createElement("div");
          const label = document.createElement("strong"); label.textContent = p.name;
          const meta = document.createElement("p"); meta.textContent = [p.city,p.country,p.architect,p.deleted ? "Retiré de la carte" : p.articleId ? "Article associé" : "Sans article"].filter(Boolean).join(" · ");
          info.append(label,meta);
          const actions = document.createElement("div"); actions.className = "admin-row-actions";
          actions.append(button(p.deleted ? "Restaurer" : "Modifier", async () => {
            if (!p.deleted) return placeEditor(p);
            await call("admin-place-restore", {body:{id:p.id}}); notify("Lieu restauré."); await placeList();
          }));
          if (!p.deleted) actions.append(button("Supprimer", async () => {
            if (!confirm("Retirer « " + p.name + " » de la carte ? Son article sera conservé et le lieu pourra être restauré.")) return;
            await call("admin-place-delete", {body:{id:p.id}}); notify("Lieu retiré de la carte."); await placeList();
          }));
          row.append(info,actions); return row;
        }
      });
    }
    async function taxonomy(collection, item = {}) {
      const items = await all(collection);
      panel.innerHTML = `<h2>${labels[collection]}</h2><form><fieldset><legend>${item.id ? "Modifier" : "Ajouter"}</legend>${field("name", "Nom *", item.name, "text", true)}${field("description", collection === "authors" ? "Biographie" : "Description", item.description, "textarea")}</fieldset><button type="submit" class="btn-submit">ENREGISTRER</button></form><div data-items></div>`;
      bind(panel.querySelector("form"), async (v) => {
        await call("admin-taxonomy", {
          body: { ...v, collection, ...(item.id ? { id: item.id } : {}) },
        });
        notify("Référentiel enregistré.");
        await taxonomy(collection);
      });
      const list = panel.querySelector("[data-items]");
      for (const entry of items) {
        const row = document.createElement("div");
        row.className = "admin-row";
        const strong = document.createElement("strong");
        strong.textContent = entry.name;
        row.append(
          strong,
          button("Modifier", async () => { if (await leave()) { dirty = false; await taxonomy(collection, entry); } }),
        );
        list.append(row);
      }
    }
    async function submissions() {
      const items = await all("submissions");
      panel.replaceChildren();
      const h = document.createElement("h2");
      h.textContent = "Propositions des lecteurs";
      panel.append(h);
      if (!items.length) {
        panel.append("Aucune proposition à examiner.");
        return;
      }
      const statuses = {
        pending: "À examiner",
        accepted: "Acceptée",
        rejected: "Refusée",
        mapped: "Ajoutée à la carte",
      };
      collectionView(items, {heading:"Trier les propositions", searchText:s => [s.name,s.city,s.country,s.architect,s.email].join(" "), filters:statuses, filterValue:s => s.status, render(s) {
        const card = document.createElement("section");
        card.className = "editorial-facts";
        const title = document.createElement("h3");
        title.textContent = `${s.name} — ${s.city}, ${s.country}`;
        const p = document.createElement("p");
        p.className = "submission-details";
        p.textContent = `${s.architect || ""}\n${s.description}\n\nPourquoi : ${s.reason}\nContact privé : ${s.email}\nStatut : ${statuses[s.status] || s.status}`;
        card.append(title, p);
        if (s.website) {
          const link = document.createElement("a");
          link.href = s.website;
          link.textContent = "Consulter le lien proposé ↗";
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          card.append(link);
        }
        if (s.image) {
          const img = document.createElement("img");
          img.src = safeImageUrl(s.image);
          img.alt = s.name;
          img.loading = "lazy";
          img.style.maxWidth = "280px";
          card.append(img);
        }
        const form = document.createElement("form");
        form.innerHTML = `<label>Statut<select name="status">${Object.entries(
          statuses,
        )
          .map(([key, label]) => `<option value="${key}">${label}</option>`)
          .join(
            "",
          )}</select></label><div class="fields-grid">${field(`lat-${s.id}`, "Latitude (pour la carte)")}${field(`lng-${s.id}`, "Longitude (pour la carte)")}</div><button type="submit" class="small-button">Enregistrer la décision</button>`;
        form.elements.status.value = s.status;
        bind(form, async (v) => {
          await call("admin-moderate", {
            body: {
              id: s.id,
              status: v.status,
              lat: v[`lat-${s.id}`],
              lng: v[`lng-${s.id}`],
            },
          });
          notify("Décision enregistrée.");
          await submissions();
        });
        card.append(form);
        return card;
      }});
    }
    for (const [key, label] of Object.entries(labels)) {
      const b = button(label, async () => {
        if (saving) { notify("Enregistrement en cours…"); return; }
        if (navigating) return;
        navigating = true;
        try {
        if (!await leave()) return;
        dirty = false;
        for (const sibling of nav.children)
          sibling.setAttribute("aria-selected", "false");
        b.setAttribute("aria-selected", "true");
        notify("");
        panel.textContent = "Chargement…";
        if (key === "articles" || key === "drafts")
          await articleList(
            key === "articles" ? "articles" : "editorialArticles",
          );
        else if (key === "dashboard") await dashboard();
        else if (key === "countdown") await countdown();
        else if (key === "places") await placeList();
        else if (key === "submissions") await submissions();
        else await taxonomy(key);
        } finally { navigating = false; }
      });
      b.setAttribute("aria-selected", "false");
      nav.append(b);
    }
    nav.append(button("Se déconnecter", async () => { if (saving) return; if (await leave()) { dirty = false; return firebase.auth().signOut(); } }));
    nav.firstElementChild.setAttribute("aria-selected", "true");
    await dashboard();
  });
});
