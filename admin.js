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
      articles: "Articles",
      drafts: "Brouillons & programmation",
      countdown: "Prochain article",
      places: "Lieux & carte",
      submissions: "Propositions",
      authors: "Auteurs",
      categories: "Catégories",
    };
    const e = escapeHtml;
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
        notify("Enregistrement…");
        try {
          await handler(values(form));
        } catch (error) {
          notify(error.message);
        } finally {
          btn.disabled = false;
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
          .then(fn)
          .catch((err) => notify(err.message)),
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
    async function all(collection) {
      let items = [],
        cursor;
      do {
        const page = await call("admin-list", {
          params: { collection, ...(cursor ? { cursor } : {}) },
        });
        items.push(...page.items);
        cursor = page.nextCursor;
      } while (cursor);
      return items;
    }
    async function editArticle(a = {}) {
      panel.innerHTML = `<h2>${a.id ? "Modifier l’article" : "Nouvel article"}</h2><form id="article-editor"><fieldset><legend>Publication</legend>${field("title", "Titre *", a.title, "text", true)}<div class="fields-grid">${field("author", "Auteur", a.author || "Raphaël")}${field("category", "Catégorie", a.category)}${field("type", "Format", a.type || "ARTICLE")}${field("edition", "Numéro / édition DECORUM", a.edition)}</div><label for="article-status">Statut</label><select id="article-status" name="status"><option value="draft">Brouillon privé</option><option value="scheduled">Publication programmée</option><option value="published">Publier maintenant</option></select>${field("publishAt", `Date et heure (${Intl.DateTimeFormat().resolvedOptions().timeZone})`, localDate(a.publishAt), "datetime-local")}<p class="form-note">Un brouillon d’un article déjà publié conserve la version actuellement en ligne. Pour la retirer, utilisez « Retirer du site » dans la liste des articles.</p></fieldset><fieldset><legend>Texte et photographie</legend>${field("image", "Photo principale — URL", a.image, "url")}<div class="field"><label for="editor-photo">Ou importer une image (500 Ko maximum)</label><input id="editor-photo" type="file" accept="image/jpeg,image/png,image/webp,image/avif"></div>${field("imageAlt", "Description de l’image", a.imageAlt)}${field("imageCredit", "Crédit photographique", a.imageCredit)}${field("excerpt", "Chapeau", a.excerpt, "textarea")}${field("content", "Contenu — texte ou HTML éditorial", a.content, "textarea")}</fieldset><fieldset><legend>Fiche technique — champs facultatifs</legend><div class="fields-grid">${group("technical", a.technical, Decorum.TECH)}</div></fieldset><fieldset><legend>Préparer la visite</legend><div class="fields-grid">${group("visit", a.visit, Decorum.VISIT)}${field("visit.lat", "Latitude", a.visit?.lat ?? "")}${field("visit.lng", "Longitude", a.visit?.lng ?? "")}${field("placeId", "Identifiant du lieu sur la carte", a.placeId)}</div></fieldset><fieldset><legend>Partage et référencement</legend>${field("seoTitle", "Titre SEO", a.seoTitle)}${field("seoDescription", "Description SEO", a.seoDescription, "textarea")}</fieldset><div class="admin-toolbar"><button type="button" class="btn-preview" id="editor-preview">APERÇU</button><button type="submit" class="btn-submit">ENREGISTRER</button></div></form><section id="editor-preview-output" hidden></section>`;
      const form = panel.querySelector("form");
      form.elements.status.value = a.status || "draft";
      form.elements.content.className = "content-field";
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
        box.scrollIntoView({ behavior: "auto" });
      });
      const [authors, categories] = await Promise.all([
        all("authors"),
        all("categories"),
      ]);
      for (const [name, items] of [
        ["author", authors],
        ["category", categories],
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
      panel.replaceChildren();
      panel.append(button("Nouvel article", () => editArticle()));
      const list = document.createElement("div");
      panel.append(list);
      let cursor;
      const more = button("Charger la suite", load);
      panel.append(more);
      async function load() {
        more.disabled = true;
        const result = await call("admin-list", {
          params: { collection, ...(cursor ? { cursor } : {}) },
        });
        if (!result.items.length && !cursor)
          list.textContent = "Aucun article dans cette rubrique.";
        for (const a of result.items) {
          const row = document.createElement("div");
          row.className = "admin-row";
          const info = document.createElement("div");
          const strong = document.createElement("strong");
          strong.textContent = a.title || "Sans titre";
          const meta = document.createElement("p");
          meta.textContent = `${a.status || "published"}${a.publishAt ? " · " + new Date(a.publishAt).toLocaleString("fr-FR") : ""}`;
          info.append(strong, meta);
          row.append(
            info,
            button("Modifier", async () =>
              editArticle(
                await call("admin-get", { params: { collection, id: a.id } }),
              ),
            ),
          );
          if (collection === "articles")
            row.append(
              button("Retirer du site", async () => {
                if (
                  !confirm(
                    "Retirer cet article du site et le conserver comme brouillon privé ?",
                  )
                )
                  return;
                await call("admin-archive", { body: { id: a.id } });
                notify("Article conservé dans les brouillons.");
                articleList(collection);
              }),
            );
          list.append(row);
        }
        cursor = result.nextCursor;
        more.hidden = !cursor;
        more.disabled = false;
      }
      await load();
    }
    async function countdown() {
      const c = await call("admin-settings");
      panel.innerHTML = `<h2>Prochaine publication</h2><form><fieldset><legend>Bloc d’accueil</legend><label><input type="checkbox" name="enabled" ${c.enabled ? "checked" : ""}> Afficher le bloc</label>${field("title", "Titre *", c.title || "Prochain article — Jeudi", "text", true)}${field("teaser", "Teaser", c.teaser, "textarea")}${field("publishAt", `Date et heure (${Intl.DateTimeFormat().resolvedOptions().timeZone})`, localDate(c.publishAt), "datetime-local")}${field("articleId", "Identifiant de l’article associé (facultatif)", c.articleId)}</fieldset><button type="submit" class="btn-submit">ENREGISTRER</button></form>`;
      const form = panel.querySelector("form");
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
      panel.innerHTML = `<h2>${p.id ? "Modifier le lieu" : "Ajouter un lieu"}</h2><form><fieldset><legend>Bâtiment</legend><div class="fields-grid">${field("name", "Nom *", p.name, "text", true)}${field("architect", "Architecte", p.architect)}${field("city", "Ville", p.city)}${field("country", "Pays", p.country)}${field("lat", "Latitude", p.lat ?? "")}${field("lng", "Longitude", p.lng ?? "")}${field("articleId", "Identifiant de l’article associé", p.articleId)}${field("image", "Photographie — URL", p.image, "url")}</div>${field("description", "Description", p.description, "textarea")}</fieldset><fieldset><legend>Visite</legend>${group("visit", p.visit, Decorum.VISIT)}</fieldset><button type="submit" class="btn-submit">ENREGISTRER LE LIEU</button></form>`;
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
      for (const p of items) {
        const row = document.createElement("div");
        row.className = "admin-row";
        const label = document.createElement("strong");
        label.textContent = p.name;
        row.append(
          label,
          button("Modifier", () => placeEditor(p)),
        );
        panel.append(row);
      }
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
          button("Modifier", () => taxonomy(collection, entry)),
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
      for (const s of items) {
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
        panel.append(card);
      }
    }
    for (const [key, label] of Object.entries(labels)) {
      const b = button(label, async () => {
        for (const sibling of nav.children)
          sibling.setAttribute("aria-selected", "false");
        b.setAttribute("aria-selected", "true");
        notify("");
        panel.textContent = "Chargement…";
        if (key === "articles" || key === "drafts")
          await articleList(
            key === "articles" ? "articles" : "editorialArticles",
          );
        else if (key === "countdown") await countdown();
        else if (key === "places") await placeList();
        else if (key === "submissions") await submissions();
        else await taxonomy(key);
      });
      b.setAttribute("aria-selected", "false");
      nav.append(b);
    }
    nav.append(button("Se déconnecter", () => firebase.auth().signOut()));
    await articleList("articles");
  });
});
