const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { services, authorize, configured } = require("../lib/firebase.cjs");
const C = require("../lib/content.cjs");
const SITE = () =>
  (process.env.SITE_URL || "https://decorum-collectiv.vercel.app").replace(
    /\/$/,
    "",
  );
const now = () => new Date().toISOString();
const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
};
const data = (doc) => {
  const value = { ...doc.data(), id: doc.id };
  for (const key of ["createdAt", "updatedAt", "publishedAt", "publishAt"]) {
    if (typeof value[key]?.toDate === "function")
      value[key] = value[key].toDate().toISOString();
  }
  return value;
};
const publicData = (doc) => {
  const value = data(doc);
  delete value.updatedBy;
  return value;
};
async function allPlaces(db, includeDeleted = false) {
  const overrides = (await db.collection("places").limit(500).get()).docs.map(
    data,
  );
  const merged = new Map(
    require("../lib/places-seed.json").map((p) => [p.id, p]),
  );
  for (const p of overrides) merged.set(p.id, p);
  const places = [...merged.values()].filter(p => includeDeleted || !p.deleted);
  // Older entries used the edition label instead of the article document ID.
  // Resolve only a unique edition; ambiguous references must never open another article.
  const editionKey = value => String(value || "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  let editions;
  return Promise.all(places.map(async p => {
    if (!p.articleId) return p;
    let articleId = p.articleId;
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(articleId)) {
      editions ||= db.collection("articles").select("edition", "status", "publishAt").limit(500).get();
      const matches = (await editions).docs.filter(d =>
        editionKey(d.data().edition) === editionKey(articleId));
      articleId = matches.length === 1 ? matches[0].id : "";
    }
    const article = articleId ? await db.collection("articles").doc(articleId).get() : null;
    return { ...p, articleId: article?.exists && (includeDeleted || visible(article.data())) ? articleId : "" };
  }));
}
const visible = (a) =>
  (!a.status || a.status === "published") &&
  (!a.publishAt || Date.parse(a.publishAt) <= Date.now());

// Publication is atomic and is checked on public requests: no open browser or paid cron required.
async function publishDue(db) {
  const due = await db
    .collection("scheduledArticles")
    .where("publishAt", "<=", now())
    .limit(20)
    .get();
  await Promise.all(
    due.docs.map((doc) =>
      db.runTransaction(async (tx) => {
        const fresh = await tx.get(doc.ref);
        if (!fresh.exists || fresh.data().publishAt > now()) return;
        const pubRef = db.collection("articles").doc(doc.id),
          existing = await tx.get(pubRef);
        const article = {
          ...fresh.data(),
          status: "published",
          publishedAt: fresh.data().publishAt,
          updatedAt: now(),
          likes: existing.data()?.likes || 0,
        };
        delete article.revision;
        delete article.updatedBy;
        tx.set(pubRef, article);
        tx.delete(doc.ref);
        tx.delete(db.collection("editorialArticles").doc(doc.id));
      }),
    ),
  );
}
async function throttle(db, req, scope, max, windowMs) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret)
    throw C.error("Le formulaire est momentanément indisponible.", 503);
  // Vercel supplies this trusted edge header; local development uses the socket address.
  const ip = String(
    req.headers["x-vercel-forwarded-for"] ||
      req.socket?.remoteAddress ||
      "unknown",
  )
    .split(",")[0]
    .trim();
  const key = C.rateKey(ip, scope, secret),
    ref = db.collection("_rateLimits").doc(key),
    time = Date.now();
  await db.runTransaction(async (tx) => {
    const old = (await tx.get(ref)).data();
    const fresh = !old || time >= old.expiresAt;
    if (!fresh && old.count >= max)
      throw C.error("Trop de demandes. Réessayez plus tard.", 429);
    tx.set(ref, {
      count: fresh ? 1 : old.count + 1,
      expiresAt: fresh ? time + windowMs : old.expiresAt,
    });
  });
}
async function publicArticles(db, cursor) {
  let query = db.collection("articles").orderBy("createdAt", "desc").limit(21);
  if (cursor) {
    const doc = await db.collection("articles").doc(C.id(cursor)).get();
    if (doc.exists) query = query.startAfter(doc);
  }
  const snapshot = await query.get();
  return {
    items: snapshot.docs.slice(0, 20).map(publicData).filter(visible),
    nextCursor: snapshot.docs.length > 20 ? snapshot.docs[19].id : null,
  };
}
function decode(v) {
  if ("stringValue" in v) return v.stringValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("integerValue" in v || "doubleValue" in v)
    return Number(v.integerValue ?? v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if (v.mapValue)
    return Object.fromEntries(
      Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, decode(x)]),
    );
  return null;
}
// Read-only legacy fallback keeps the public journal available before server credentials are configured.
async function legacyArticle(id) {
  const r = await fetch(
    `https://firestore.googleapis.com/v1/projects/decorum-collectiv/databases/(default)/documents/articles/${C.id(id)}`,
  );
  if (!r.ok) throw C.error("Article introuvable.", 404);
  const doc = await r.json(),
    a = {
      ...Object.fromEntries(
        Object.entries(doc.fields || {}).map(([k, v]) => [k, decode(v)]),
      ),
      id,
    };
  if (!visible(a)) throw C.error("Article introuvable.", 404);
  return a;
}
async function legacyList() {
  const response = await fetch(
    "https://firestore.googleapis.com/v1/projects/decorum-collectiv/databases/(default)/documents:runQuery",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "articles" }],
          orderBy: [
            { field: { fieldPath: "createdAt" }, direction: "DESCENDING" },
          ],
          limit: 500,
        },
      }),
    },
  );
  if (!response.ok) throw C.error("Journal momentanément indisponible.", 503);
  return (await response.json())
    .filter((row) => row.document)
    .map((row) => {
      const doc = row.document;
      return {
        ...Object.fromEntries(
          Object.entries(doc.fields || {}).map(([k, v]) => [k, decode(v)]),
        ),
        id: doc.name.split("/").pop(),
      };
    })
    .filter(visible);
}
function metadata(a, id) {
  const canonical = `${SITE()}/article.html?id=${encodeURIComponent(id)}`;
  const title = a.seoTitle || a.title || "Article",
    description = a.seoDescription || a.excerpt || "";
  const author = { "@type": "Person", name: a.author || "La rédaction" };
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description,
    author,
    mainEntityOfPage: canonical,
    publisher: {
      "@type": "Organization",
      name: "DECORUM Collectiv",
      logo: { "@type": "ImageObject", url: `${SITE()}/logo.svg` },
    },
  };
  const date =
    a.publishedAt ||
    (typeof a.createdAt === "string"
      ? a.createdAt
      : a.createdAt?._seconds
        ? new Date(a.createdAt._seconds * 1000).toISOString()
        : null);
  if (date) schema.datePublished = date;
  if (a.updatedAt) schema.dateModified = a.updatedAt;
  const cover = /^https?:\/\//.test(a.image || "") ? a.image : null;
  if (cover) schema.image = [cover];
  if (a.technical?.project)
    schema.about = {
      "@type": "Place",
      name: a.technical.project,
      address: a.visit?.address || a.technical.city,
      ...(a.visit?.lat != null
        ? {
            geo: {
              "@type": "GeoCoordinates",
              latitude: a.visit.lat,
              longitude: a.visit.lng,
            },
          }
        : {}),
    };
  return `<title>${C.escape(title)} — DECORUM</title><meta name="description" content="${C.escape(description)}"><link rel="canonical" href="${C.escape(canonical)}"><meta property="og:type" content="article"><meta property="og:site_name" content="DECORUM"><meta property="og:title" content="${C.escape(title)}"><meta property="og:description" content="${C.escape(description)}"><meta property="og:url" content="${C.escape(canonical)}"><meta name="twitter:card" content="${cover ? "summary_large_image" : "summary"}">${cover ? `<meta property="og:image" content="${C.escape(cover)}"><meta name="twitter:image" content="${C.escape(cover)}">` : ""}<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`;
}
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  try {
    const query =
      req.query ||
      Object.fromEntries(new URL(req.url, "http://localhost").searchParams);
    const action = query.action || "health";
    if (action === "health")
      return json(res, 200, {
        ready: configured(),
        submissions: configured() && !!process.env.RATE_LIMIT_SECRET,
        pdf: true,
      });
    if (!["GET", "POST"].includes(req.method))
      throw C.error("Méthode non autorisée.", 405);
    if (action === "article-page") {
      let article;
      if (configured()) {
        const { db } = services();
        await publishDue(db);
        const doc = await db.collection("articles").doc(C.id(query.id)).get();
        if (!doc.exists || !visible(doc.data()))
          throw C.error("Article introuvable.", 404);
        article = publicData(doc);
      } else article = await legacyArticle(query.id);
      let template = fs.readFileSync(
        path.join(__dirname, "../article.html"),
        "utf8",
      );
      template = template.replace(
        /<title>[\s\S]*?<\/title>/,
        metadata(article, query.id),
      );
      template = template.replace(
        "Titre de l'article",
        C.escape(article.title),
      );
      const fill = (id, text) => {
        template = template.replace(new RegExp(`(<[^>]+id="${id}"[^>]*>)[\\s\\S]*?(</[^>]+>)`), (_, open, close) => open + C.escape(text) + close);
      };
      fill("art-author", `Par ${article.author || "La rédaction"}`);
      fill("art-category", article.category || "ARCHITECTURE");
      fill("art-type", article.type || "ARTICLE");
      fill("art-date", article.date || new Date(article.publishedAt || article.createdAt || Date.now()).toLocaleDateString("fr-FR"));
      fill("art-excerpt", article.excerpt || "");
      fill("art-read-time", `${Math.max(1, Math.ceil(C.plain(article.content).split(/\s+/).length / 220))} min de lecture`);
      if (/^https?:\/\//.test(article.image || "") || /^data:image\/(png|jpeg|webp|avif);base64,[a-z0-9+/=]+$/i.test(article.image || "")) {
        template = template.replace('<div id="art-image-wrapper" class="article-hero-image"></div>', `<div id="art-image-wrapper" class="article-hero-image"><img src="${C.escape(article.image)}" alt="${C.escape(article.imageAlt || article.title)}" fetchpriority="high" decoding="async"></div>`);
      }
      const content = /<[a-z]/i.test(article.content || "")
        ? C.html(article.content)
        : String(article.content || "")
            .split(/\n\s*\n/)
            .map((p) => `<p>${C.escape(p)}</p>`)
            .join("");
      template = template.replace(
        '<div class="article-body" id="art-content"></div>',
        `<div class="article-body" id="art-content">${content}</div>`,
      );
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.end(template);
    }
    if (!configured()) {
      if (action === "pdf" && req.method === "GET") {
        const a = await legacyArticle(query.id);
        const pdf = await require("../lib/pdf.cjs").makePdf(a, SITE());
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="decorum-${query.id}.pdf"`,
        );
        return res.end(pdf);
      }
      if (action === "sitemap" && req.method === "GET") {
        const items = await legacyList();
        res.setHeader("Content-Type", "application/xml; charset=utf-8");
        return res.end(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE()}/</loc></url><url><loc>${SITE()}/proposer.html</loc></url>${items.map((a) => `<url><loc>${C.escape(`${SITE()}/article.html?id=${a.id}`)}</loc></url>`).join("")}</urlset>`,
        );
      }
      throw C.error("Le service éditorial est en cours d’activation.", 503);
    }
    const { db } = services();
    if (req.method === "GET" && !action.startsWith("admin"))
      await publishDue(db);
    if (action === "articles" && req.method === "GET")
      return json(res, 200, await publicArticles(db, query.cursor));
    if (action === "article" && req.method === "GET") {
      const doc = await db.collection("articles").doc(C.id(query.id)).get();
      if (!doc.exists || !visible(doc.data()))
        throw C.error("Article introuvable.", 404);
      return json(res, 200, publicData(doc));
    }
    if (action === "countdown" && req.method === "GET") {
      const doc = await db.collection("settings").doc("nextPublication").get(),
        value = doc.data() || { enabled: false };
      if (value.articleId) {
        const a = await db.collection("articles").doc(value.articleId).get();
        value.available = a.exists && visible(a.data());
        if (!value.available) delete value.articleId;
      }
      return json(res, 200, { ...value, serverTime: now() });
    }
    if (action === "places" && req.method === "GET")
      return json(res, 200, { items: await allPlaces(db) });
    if (action === "pdf" && req.method === "GET") {
      await throttle(db, req, "pdf", 20, 3600000);
      const doc = await db.collection("articles").doc(C.id(query.id)).get();
      if (!doc.exists || !visible(doc.data()))
        throw C.error("Article introuvable.", 404);
      const pdf = await require("../lib/pdf.cjs").makePdf(data(doc), SITE());
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="decorum-${query.id}.pdf"`,
      );
      return res.end(pdf);
    }
    if (action === "sitemap" && req.method === "GET") {
      const docs = await db
        .collection("articles")
        .select("status", "publishAt", "updatedAt")
        .get();
      const urls = [
        `${SITE()}/`,
        `${SITE()}/proposer.html`,
        ...docs.docs
          .filter((d) => visible(d.data()))
          .map((d) => `${SITE()}/article.html?id=${d.id}`),
      ];
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      return res.end(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${C.escape(u)}</loc></url>`).join("")}</urlset>`,
      );
    }
    if (req.method === "POST") {
      const origin = req.headers.origin;
      if (
        origin &&
        origin !== SITE() &&
        origin !== `https://${process.env.VERCEL_URL}` &&
        !(
          process.env.NODE_ENV !== "production" &&
          /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
        )
      )
        throw C.error("Origine non autorisée.", 403);
      let body = req.body;
      if (typeof body === "string") body = JSON.parse(body);
      if (
        !body ||
        typeof body !== "object" ||
        Buffer.byteLength(JSON.stringify(body)) > 1000000
      )
        throw C.error("Requête invalide ou trop volumineuse.", 413);
      if (action === "submit") {
        await throttle(db, req, "submission", 3, 3600000);
        const value = C.submission(body);
        await db.collection("submissions").add({ ...value, createdAt: now() });
        return json(res, 201, { ok: true });
      }
      if (action === "like") {
        await throttle(db, req, "likes", 30, 3600000);
        const ref = db.collection("articles").doc(C.id(body.id));
        const device = C.id(body.device),
          likeRef = db
            .collection("_likes")
            .doc(
              crypto
                .createHash("sha256")
                .update(`${body.id}:${device}`)
                .digest("hex"),
            );
        const likes = await db.runTransaction(async (tx) => {
          const [doc, liked] = await Promise.all([
            tx.get(ref),
            tx.get(likeRef),
          ]);
          if (!doc.exists || !visible(doc.data()))
            throw C.error("Article introuvable.", 404);
          const n = Number(doc.data().likes) || 0;
          if (liked.exists) return n;
          tx.set(likeRef, { createdAt: now() });
          tx.update(ref, { likes: n + 1 });
          return n + 1;
        });
        return json(res, 200, { likes });
      }
    }
    const user = await authorize(req);
    if (action === "admin-list" && req.method === "GET") {
      const collection = [
        "articles",
        "editorialArticles",
        "places",
        "submissions",
        "authors",
        "categories",
      ].includes(query.collection)
        ? query.collection
        : "articles";
      if (collection === "places")
        return json(res, 200, { items: await allPlaces(db, true), nextCursor: null });
      let q = db.collection(collection).orderBy("__name__").limit(51);
      if (query.cursor) q = q.startAfter(C.id(query.cursor));
      const docs = (await q.get()).docs;
      return json(res, 200, {
        items: docs.slice(0, 50).map(doc => {
          const item = data(doc);
          if (query.summary === "1" && ["articles", "editorialArticles"].includes(collection)) {
            delete item.content;
            delete item.image;
          }
          return item;
        }),
        nextCursor: docs.length > 50 ? docs[49].id : null,
      });
    }
    if (action === "admin-get" && req.method === "GET") {
      const collection = [
        "articles",
        "editorialArticles",
        "places",
        "authors",
        "categories",
      ].includes(query.collection)
        ? query.collection
        : "articles";
      const doc = await db.collection(collection).doc(C.id(query.id)).get();
      if (!doc.exists) throw C.error("Contenu introuvable.", 404);
      return json(res, 200, data(doc));
    }
    if (action === "admin-settings" && req.method === "GET")
      return json(
        res,
        200,
        (
          await db.collection("settings").doc("nextPublication").get()
        ).data() || { enabled: false, title: "Prochain article — Jeudi" },
      );
    if (req.method !== "POST") throw C.error("Action inconnue.", 404);
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (action === "admin-save") {
      const value = C.article(body),
        id = body.id ? C.id(body.id) : db.collection("articles").doc().id;
      const pub = db.collection("articles").doc(id),
        draft = db.collection("editorialArticles").doc(id),
        scheduled = db.collection("scheduledArticles").doc(id);
      await db.runTransaction(async (tx) => {
        const [oldPub, oldDraft] = await Promise.all([
          tx.get(pub),
          tx.get(draft),
        ]);
        const old = oldDraft.exists ? oldDraft.data() : oldPub.data();
        if (old && (body.revision || null) !== (old.updatedAt || null))
          throw C.error(
            "Cet article a changé. Rechargez-le avant de sauvegarder.",
            409,
          );
        const saved = {
          ...value,
          updatedAt: now(),
          updatedBy: user.uid,
          createdAt: old?.createdAt || new Date(),
          likes: oldPub.data()?.likes || 0,
        };
        if (value.status === "published") {
          delete saved.updatedBy;
          tx.set(pub, {
            ...saved,
            publishedAt: oldPub.data()?.publishedAt || now(),
            publishAt: null,
          });
          tx.delete(draft);
          tx.delete(scheduled);
        } else {
          tx.set(draft, saved);
          if (value.status === "scheduled") tx.set(scheduled, saved);
          else tx.delete(scheduled);
        }
      });
      return json(res, 200, { id });
    }
    if (action === "admin-archive") {
      const id = C.id(body.id),
        ref = db.collection("articles").doc(id),
        draft = db.collection("editorialArticles").doc(id);
      await db.runTransaction(async (tx) => {
        const [pub, edit] = await Promise.all([tx.get(ref), tx.get(draft)]);
        if (!pub.exists && !edit.exists)
          throw C.error("Article introuvable.", 404);
        tx.set(draft, {
          ...(edit.exists ? edit.data() : pub.data()),
          status: "draft",
          publishAt: null,
          updatedAt: now(),
        });
        tx.delete(ref);
        tx.delete(db.collection("scheduledArticles").doc(id));
      });
      return json(res, 200, { ok: true });
    }
    if (action === "admin-countdown") {
      await db
        .collection("settings")
        .doc("nextPublication")
        .set(C.countdown(body));
      return json(res, 200, { ok: true });
    }
    if (action === "admin-place-delete" || action === "admin-place-restore") {
      if (req.method !== "POST") throw C.error("Méthode non autorisée.", 405);
      const id = C.id(body.id);
      const ref = db.collection("places").doc(id);
      await db.runTransaction(async tx => {
        const doc = await tx.get(ref);
        const seed = require("../lib/places-seed.json").find(p => p.id === id);
        if (!doc.exists && !seed) throw C.error("Lieu introuvable.", 404);
        tx.set(ref, { ...(doc.exists ? doc.data() : seed),
          deleted: action === "admin-place-delete", updatedAt: now() });
      });
      return json(res, 200, { ok: true });
    }
    if (action === "admin-place") {
      const value = C.place(body);
      if (value.articleId && !(await db.collection("articles").doc(value.articleId).get()).exists)
        throw C.error("Choisissez un article existant dans la liste.");
      const id = body.id ? C.id(body.id) : db.collection("places").doc().id;
      await db
        .collection("places")
        .doc(id)
        .set({ ...value, updatedAt: now() });
      return json(res, 200, { id });
    }
    if (action === "admin-taxonomy") {
      if (!["authors", "categories"].includes(body.collection))
        throw C.error("Référentiel invalide.");
      const value = {
        name: C.text(body.name, 150, true),
        description: C.text(body.description, 2000),
        updatedAt: now(),
      };
      const id = body.id
        ? C.id(body.id)
        : db.collection(body.collection).doc().id;
      await db.collection(body.collection).doc(id).set(value);
      return json(res, 200, { id });
    }
    if (action === "admin-moderate") {
      if (!["pending", "accepted", "rejected", "mapped"].includes(body.status))
        throw C.error("Statut invalide.");
      const id = C.id(body.id),
        ref = db.collection("submissions").doc(id);
      await db.runTransaction(async (tx) => {
        const doc = await tx.get(ref);
        if (!doc.exists) throw C.error("Proposition introuvable.", 404);
        if (body.status === "mapped") {
          const coords = C.coordinates(body);
          if (coords.lat == null)
            throw C.error("Coordonnées requises pour la carte.");
          const s = doc.data();
          tx.set(db.collection("places").doc(`submission-${id}`), {
            name: s.name,
            city: s.city,
            country: s.country,
            architect: s.architect,
            description: s.description,
            image: s.image,
            articleId: "",
            visit: { website: s.website },
            ...coords,
            updatedAt: now(),
          });
        }
        tx.update(ref, {
          status: body.status,
          reviewedAt: now(),
          reviewedBy: user.uid,
        });
      });
      return json(res, 200, { ok: true });
    }
    throw C.error("Action inconnue.", 404);
  } catch (e) {
    const status =
      e.status ||
      (e instanceof RangeError || e instanceof SyntaxError ? 400 : 500);
    if (status === 500)
      console.error("Editorial request failed:", e.code || e.name);
    json(res, status, {
      error:
        status === 500
          ? "Le service est momentanément indisponible."
          : e.message,
    });
  }
};
module.exports.visible = visible;
module.exports.metadata = metadata;
