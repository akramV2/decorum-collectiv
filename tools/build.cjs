const fs = require("node:fs");
const path = require("node:path");
fs.mkdirSync("public", { recursive: true });
for (const name of [
  "index.html",
  "article.html",
  "admin.html",
  "proposer.html",
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
