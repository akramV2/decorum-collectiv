const fs = require("node:fs");
const path = require("node:path");
fs.mkdirSync("public", { recursive: true });
for (const name of [
  "index.html",
  "usage.html",
  "regard.html",
  "selection.html",
  "essentiel.html",
  "archives.html",
  "archives.js",
  "architecture.html",
  "fashion.html",
  "design.html",
  "visual-culture.html",
  "recherche.html",
  "latence.js",
  "latence.css",
  "universes.js",
  "archive.js",
  "admin.html",
  "proposer.html",
  "mentions-legales.html",
  "script.js",
  "editorial.js",
  "admin.js",
  "admin-workbench.js",
  "style.css",
  "editorial.css",
  "logo.svg",
  "manifest.json",
  "robots.txt",
])
  fs.copyFileSync(name, path.join("public", name));
if (fs.existsSync("assets"))
  fs.cpSync("assets", "public/assets", { recursive: true });
// Keep the large generation source out of the public deployment bundle.
fs.rmSync(path.join("public", "assets", "brand", "latence-hero-source.png"), { force: true });
// Keep the template in the function bundle only: static files take precedence over rewrites.
fs.rmSync(path.join("public", "article.html"), { force: true });
