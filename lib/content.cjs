const sanitizeHtml = require("sanitize-html");
const crypto = require("node:crypto");
const TECH = {
  architect: "Architecte",
  project: "Projet",
  year: "Année",
  city: "Lieu",
  country: "Pays",
  materials: "Matériaux",
  height: "Hauteur",
  area: "Surface",
  program: "Programme",
};
const VISIT = {
  address: "Adresse",
  hours: "Horaires",
  prices: "Tarifs",
  transport: "Accès / transports",
  website: "Site officiel",
};
const error = (message, status = 400) =>
  Object.assign(new Error(message), { status });
function text(v, max = 500, required = false) {
  if (v !== undefined && v !== null && typeof v !== "string")
    throw error("Format de texte invalide.");
  const s = (v || "").trim();
  if (s.length > max || (required && !s))
    throw error(`Champ requis ou trop long (maximum ${max} caractères).`);
  return s;
}
function url(v) {
  const s = text(v, 2048);
  if (!s) return "";
  let u;
  try {
    u = new URL(s);
  } catch {
    throw error("Lien invalide.");
  }
  if (!["https:", "http:"].includes(u.protocol) || u.username || u.password)
    throw error("Utilisez un lien HTTP ou HTTPS.");
  return u.href;
}
function image(v) {
  if (!v) return "";
  if (typeof v !== "string") throw error("Image invalide.");
  if (/^data:image\/(png|jpeg|webp|avif);base64,[a-z0-9+/=]+$/i.test(v)) {
    if (Buffer.byteLength(v) > 700000)
      throw error("Image trop lourde (500 Ko maximum avant encodage).");
    return v;
  }
  return url(v);
}
function html(v) {
  return sanitizeHtml(text(v, 150000), {
    allowedTags: [
      "p",
      "br",
      "h2",
      "h3",
      "h4",
      "strong",
      "em",
      "blockquote",
      "ul",
      "ol",
      "li",
      "a",
      "figure",
      "figcaption",
      "img",
      "hr",
    ],
    allowedAttributes: {
      a: ["href", "title"],
      img: ["src", "alt", "width", "height"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["https", "http"] },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}
const plain = (v) =>
  sanitizeHtml(String(v || ""), { allowedTags: [], allowedAttributes: {} });
const escape = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function fields(v = {}, labels) {
  return Object.fromEntries(
    Object.keys(labels).map((k) => [k, text(v?.[k], 1000)]),
  );
}
function coordinates(v = {}) {
  if ((v.lat === "" || v.lat == null) && (v.lng === "" || v.lng == null))
    return {};
  if (v.lat === "" || v.lat == null || v.lng === "" || v.lng == null)
    throw error("Latitude et longitude doivent être renseignées ensemble.");
  const lat = Number(v.lat),
    lng = Number(v.lng);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  )
    throw error("Coordonnées invalides.");
  return { lat, lng };
}
function visit(v = {}) {
  return { ...fields(v, VISIT), website: url(v.website), ...coordinates(v) };
}
function article(v) {
  const status = v.status || "draft";
  if (!["draft", "scheduled", "published"].includes(status))
    throw error("Statut invalide.");
  const publishAt = v.publishAt ? new Date(v.publishAt).toISOString() : null;
  if (
    status === "scheduled" &&
    (!publishAt || Date.parse(publishAt) <= Date.now())
  )
    throw error("Choisissez une date de publication future.");
  const out = {
    title: text(v.title, 250, true),
    type: text(v.type, 100),
    category: text(v.category, 200),
    author: text(v.author, 150),
    authorId: text(v.authorId, 128),
    image: image(v.image),
    imageCredit: text(v.imageCredit, 300),
    imageAlt: text(v.imageAlt, 300),
    excerpt: text(v.excerpt, 2000),
    content: html(v.content),
    technical: fields(v.technical, TECH),
    visit: visit(v.visit),
    placeId: text(v.placeId, 128),
    seoTitle: text(v.seoTitle, 150),
    seoDescription: text(v.seoDescription, 350),
    edition: text(v.edition, 80),
    status,
    publishAt,
  };
  if (status !== "draft" && (!out.content || !out.excerpt || !out.author))
    throw error("Auteur, chapeau et contenu sont requis pour publier.");
  if (Buffer.byteLength(JSON.stringify(out)) > 900000)
    throw error("Article trop volumineux.");
  return out;
}
function place(v) {
  return {
    name: text(v.name, 200, true),
    architect: text(v.architect, 200),
    city: text(v.city, 150),
    country: text(v.country, 100),
    description: text(v.description, 3000),
    articleId: text(v.articleId, 128),
    image: image(v.image),
    visit: visit(v.visit),
    ...coordinates(v),
  };
}
function submission(v) {
  if (v.company) throw error("Envoi non accepté.");
  const email = text(v.email, 254, true);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw error("Adresse email invalide.");
  return {
    name: text(v.name, 200, true),
    city: text(v.city, 150, true),
    country: text(v.country, 100, true),
    architect: text(v.architect, 200),
    description: text(v.description, 3000, true),
    reason: text(v.reason, 2000, true),
    website: url(v.website),
    image: image(v.image),
    email,
    status: "pending",
  };
}
function countdown(v) {
  const publishAt = v.publishAt ? new Date(v.publishAt).toISOString() : null;
  if (v.enabled && !publishAt) throw error("La date est obligatoire.");
  return {
    enabled: v.enabled === true,
    title: text(v.title, 200, true),
    teaser: text(v.teaser, 500),
    publishAt,
    articleId: text(v.articleId, 128),
  };
}
function id(v) {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(v || ""))
    throw error("Identifiant invalide.");
  return v;
}
function rateKey(ip, scope, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${scope}:${ip}`)
    .digest("hex");
}
module.exports = {
  TECH,
  VISIT,
  error,
  text,
  url,
  image,
  html,
  plain,
  escape,
  article,
  place,
  submission,
  countdown,
  id,
  rateKey,
  coordinates,
};
