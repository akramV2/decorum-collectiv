document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("archive-grid");
  const status = document.getElementById("archive-status");
  if (!grid || !status || !window.Decorum) return;
  try {
    const items = [];
    const seen = new Set();
    let cursor;
    do {
      const response = await Decorum.api("articles", { params: cursor ? { cursor } : {} });
      for (const article of response.items || []) {
        if (seen.has(article.id)) continue;
        seen.add(article.id);
        items.push(article);
      }
      cursor = response.nextCursor;
    } while (cursor);
    const current = new Set(["À l'usage", "Le regard", "Sélection", "L'essentiel"]);
    const legacy = items.filter(article => !current.has(article.category));
    legacy.sort((a,b) => Date.parse(b.publishedAt || b.date || b.createdAt || 0) - Date.parse(a.publishedAt || a.date || a.createdAt || 0));
    grid.replaceChildren();
    for (const article of legacy) {
      const item = document.createElement("article"); item.className = "latence-archive-item";
      const link = document.createElement("a"); link.href = `article.html?id=${encodeURIComponent(article.id)}`;
      const title = document.createElement("h2"); title.textContent = article.title || "Publication sans titre";
      const meta = document.createElement("p"); meta.textContent = [article.category || "Archive", article.author].filter(Boolean).join(" · ");
      const summary = document.createElement("p"); summary.textContent = article.excerpt || "";
      link.append(title, meta, summary); item.append(link); grid.append(item);
    }
    if (!legacy.length) { const empty = document.createElement("p"); empty.className = "latence-empty"; empty.textContent = "Aucune publication archivée n’est actuellement disponible."; grid.append(empty); }
    status.textContent = `${legacy.length} publication${legacy.length > 1 ? "s" : ""}`;
  } catch {
    status.textContent = "Les archives ne peuvent pas être chargées pour le moment.";
    grid.textContent = "Réessayez dans quelques instants.";
  } finally { grid.setAttribute("aria-busy", "false"); }
});
