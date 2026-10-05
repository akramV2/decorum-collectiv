const fs = require("node:fs");
const path = require("node:path");
fs.mkdirSync("public", { recursive: true });
for (const name of [
  "index.html",
  "admin.html",
  "proposer.html",
  "mentions-legales.html",
  "script.js",
  "editorial.js",
  "admin.js",
  "style.css",
  "editorial.css",
  "logo.svg",
  "manifest.json",
  "robots.txt",
])
  fs.copyFileSync(name, path.join("public", name));
if (fs.existsSync("assets"))
  fs.cpSync("assets", "public/assets", { recursive: true });
// Keep the template in the function bundle only: static files take precedence over rewrites.
fs.rmSync(path.join("public", "article.html"), { force: true });
