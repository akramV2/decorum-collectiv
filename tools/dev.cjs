const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.join(__dirname, "..");
const handler = require("../api/editorial.js");
const allowed = new Set([
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
]);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".txt": "text/plain",
};
http
  .createServer(async (req, res) => {
    try {
      const u = new URL(req.url, "http://localhost"),
        name = u.pathname.slice(1) || "index.html";
      req.query = Object.fromEntries(u.searchParams);
      if (
        name === "api/editorial" ||
        name === "article.html" ||
        name === "sitemap.xml"
      ) {
        if (name === "article.html") req.query.action = "article-page";
        if (name === "sitemap.xml") req.query.action = "sitemap";
        if (req.method === "POST") {
          let chunks = [],
            size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 1000000) {
              res.writeHead(413).end();
              return;
            }
            chunks.push(chunk);
          }
          req.body = Buffer.concat(chunks).toString();
        }
        return await handler(req, res);
      }
      const asset =
        name.startsWith("assets/") &&
        path
          .resolve(root, name)
          .startsWith(path.join(root, "assets") + path.sep);
      if (
        (!allowed.has(name) && !asset) ||
        !fs.existsSync(path.join(root, name))
      ) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, {
        "Content-Type": types[path.extname(name)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      fs.createReadStream(path.join(root, name)).pipe(res);
    } catch (e) {
      res.writeHead(500).end("Erreur locale");
      console.error(e.message);
    }
  })
  .listen(4174, "127.0.0.1", () =>
    console.log("DECORUM http://127.0.0.1:4174"),
  );
