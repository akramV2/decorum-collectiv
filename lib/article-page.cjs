const C = require('./content.cjs');

// Fill stable IDs rather than depending on the template's class names or tag order.
module.exports = function renderArticlePage(template, article, metadata) {
  template = template.replace(/<meta\b[^>]*(?:name="(?:description|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/gi, '')
    .replace(/<link\b[^>]*rel="canonical"[^>]*>/gi, '')
    .replace(/<title>[\s\S]*?<\/title>/, metadata);
  function fill(id, value) {
    const pattern = new RegExp(`(<([a-z][a-z0-9]*)\\b[^>]*\\bid="${id}"[^>]*>)[\\s\\S]*?(</\\2>)`, 'i');
    template = template.replace(pattern, (_, open, tag, close) => open + value + close);
  }
  fill('art-title', C.escape(article.title || 'Sans titre'));
  fill('art-author', C.escape(`Par ${article.author || 'La rédaction'}`));
  fill('art-category', C.escape(article.category || 'LATENCE'));
  fill('art-type', C.escape(article.type || 'ARTICLE'));
  const date = new Date(article.publishedAt || article.createdAt || Date.now());
  fill('art-date', C.escape(article.date || (Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR'))));
  fill('art-excerpt', C.escape(article.excerpt || ''));
  fill('art-read-time', `${Math.max(1, Math.ceil(C.plain(article.content).trim().split(/\s+/).filter(Boolean).length / 200))} min de lecture`);
  let src = '';
  try { src = C.image(article.image); } catch { /* Invalid legacy images remain hidden. */ }
  fill('art-image-wrapper', src ? `<img src="${C.escape(src)}" alt="${C.escape(article.imageAlt || article.title)}" fetchpriority="high" decoding="async">${article.imageCredit ? `<figcaption>${C.escape(article.imageCredit)}</figcaption>` : ''}` : '');
  const body = /<[a-z]/i.test(article.content || '') ? C.html(article.content) : String(article.content || '').split(/\n\s*\n/).map(p => `<p>${C.escape(p)}</p>`).join('');
  fill('art-content', body);
  const safe = JSON.stringify(article).replace(/</g, '\\u003c');
  return template.replace('</body>', `<script type="application/json" id="article-data">${safe}</script></body>`);
};
