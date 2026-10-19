(() => {
  const taxonomies = {
    usage: "À l'usage",
    regard: 'Le regard',
    selection: 'Sélection',
    essentiel: "L'essentiel",
  };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
  const imageUrl = (value) => {
    try {
      const url = new URL(String(value || ''), location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  };
  const categorySlug = (article) => {
    const normalize = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const value = normalize(article.category);
    return Object.keys(taxonomies).find((slug) => normalize(taxonomies[slug]) === value) || '';
  };
  const readTime = (article) => article.readingTime || Math.max(1, Math.ceil(String(article.content || '').replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length / 200));
  const card = (article, featured = false) => {
    const slug = categorySlug(article);
    if (!slug) return '';
    const image = imageUrl(article.image);
    return `<article class="latence-card ${featured ? 'latence-card-featured' : ''}"><a class="latence-card-link" href="article.html?id=${encodeURIComponent(article.id)}"><div class="latence-card-image">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(article.imageAlt || article.title || '')}" loading="lazy" decoding="async">` : '<span class="latence-card-placeholder" aria-hidden="true">LATENCE</span>'}</div><div class="latence-card-meta"><span class="latence-card-category">${escapeHtml(taxonomies[slug])}</span><time>${escapeHtml(window.formatDate?.(article.date || article.createdAt) || '')}</time></div><h3>${escapeHtml(article.title || 'Sans titre')}</h3>${article.excerpt ? `<p class="latence-card-excerpt">${escapeHtml(article.excerpt)}</p>` : ''}<span class="latence-card-read">${readTime(article)} min de lecture</span></a></article>`;
  };
  async function loadHome() {
    const featured = document.getElementById('featured-grid');
    const latest = document.getElementById('latest-grid');
    if (!featured || !latest) return;
    let items = [];
    try {
      if (typeof window.getArticlesFromCloud !== 'function') throw new Error('Le journal est indisponible.');
      items = (await window.getArticlesFromCloud()).filter((a) => categorySlug(a));
      featured.innerHTML = items.length
        ? items.slice(0, 3).map((a, i) => card(a, i === 0)).join('')
        : '<p class="latence-empty">Aucun article LATENCE n’est publié pour le moment. Les archives de l’ancien média restent conservées.</p>';
      const filters = document.querySelectorAll('[data-filter]');
      const status = document.getElementById('latest-status');
      const render = (filter = 'all') => {
        const remaining = items.slice(3).filter((a) => filter === 'all' || categorySlug(a) === filter);
        latest.innerHTML = remaining.length
          ? remaining.slice(0, 8).map((a) => card(a)).join('')
          : '<p class="latence-empty">Aucune autre publication ne correspond à cette sélection.</p>';
        if (status) status.textContent = `${remaining.length} publication${remaining.length > 1 ? 's' : ''}`;
      };
      filters.forEach((button) => button.addEventListener('click', () => {
        filters.forEach((item) => { const active = item === button; item.classList.toggle('is-active', active); item.setAttribute('aria-pressed', String(active)); });
        render(button.dataset.filter);
      }));
      render();
    } catch (error) {
      featured.innerHTML = '<p class="latence-empty">Le journal ne peut pas être chargé pour le moment.</p>';
      latest.innerHTML = '<p class="latence-empty">Réessayez dans quelques instants.</p>';
      const status = document.getElementById('latest-status');
      if (status) status.textContent = error.message;
    }
  }
  async function loadRelated() {
    const section = document.getElementById('latence-related');
    const grid = document.getElementById('related-grid');
    const id = new URLSearchParams(location.search).get('id');
    if (!section || !grid || !id || !window.Decorum) return;
    try {
      const current = await Decorum.api('article', { params: { id } });
      const response = await Decorum.api('articles');
      const related = (response.items || []).filter((item) => item.id !== id && item.category === current.category && categorySlug(item)).slice(0, 3);
      if (!related.length) return;
      grid.innerHTML = related.map((item) => card(item)).join('');
      section.hidden = false;
    } catch { /* Related content is optional when the editorial service is unavailable. */ }
  }
  function initNavigation() {
    const button = document.querySelector('.latence-menu-toggle');
    const nav = document.getElementById('latence-navigation');
    if (!button || !nav) return;
    const setOpen = (open) => { button.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open); };
    button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { setOpen(false); button.focus(); } });
    document.addEventListener('click', (event) => { if (!nav.contains(event.target) && !button.contains(event.target)) setOpen(false); });
  }
  function initReveals() {
    const elements = document.querySelectorAll('[data-reveal]');
    if (!elements.length) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold: .12, rootMargin: '0px 0px -32px 0px' });
    elements.forEach((el) => observer.observe(el));
  }
  function initHeroDepth() {
    const hero = document.querySelector('.latence-hero-media');
    const image = hero?.querySelector('img');
    if (!hero || !image || matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(pointer: coarse)').matches) return;
    let frame = 0;
    hero.addEventListener('pointermove', (event) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        image.style.setProperty('--hero-x', `${x * -7}px`);
        image.style.setProperty('--hero-y', `${y * -5}px`);
        frame = 0;
      });
    });
    hero.addEventListener('pointerleave', () => { image.style.setProperty('--hero-x', '0px'); image.style.setProperty('--hero-y', '0px'); });
  }
  function initYear() {
    document.querySelectorAll('[data-current-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  }
  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initReveals();
    initHeroDepth();
    initYear();
    loadHome();
    loadRelated();
  });
})();
