// Configuration Firebase officielle
const firebaseConfig = {
  apiKey: "AIzaSyBteD5R4XH3K-P0GTdjM5Y8e35AlKugnFU",
  authDomain: "decorum-collectiv.firebaseapp.com",
  projectId: "decorum-collectiv",
  storageBucket: "decorum-collectiv.firebasestorage.app",
  messagingSenderId: "743631473375",
  appId: "1:743631473375:web:2c2f6078f46c9e36a5376a",
  measurementId: "G-L6033RN4BQ"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;

// Plain metadata must never be interpreted as HTML, including in attributes.
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function safeImageUrl(value) {
  const source = String(value || '').trim();
  if (/^data:image\/(?:png|jpeg|webp|avif);base64,[a-z0-9+/=]+$/i.test(source)) return source;
  try {
    const url = new URL(source);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

function renderEditorialContent(container, value) {
  const content = String(value || '');
  if (!content.trim()) {
    container.textContent = 'Aucun contenu rédigé.';
    return;
  }
  if (/<[a-z][\s\S]*>/i.test(content)) {
    if (typeof DOMPurify !== 'undefined') {
      container.innerHTML = DOMPurify.sanitize(content, { USE_PROFILES: { html: true } });
    } else {
      // CDN failure must not turn untrusted HTML into executable content.
      container.textContent = content;
    }
    return;
  }
  container.replaceChildren();
  content.split(/\n\s*\n/).forEach(block => {
    const text = block.trim();
    if (!text) return;
    const isHeading = text.length < 80 && !/[.?!]$/.test(text);
    const element = document.createElement(isHeading ? 'h2' : 'p');
    element.textContent = text;
    container.appendChild(element);
  });
}

function renderCover(container, source, title) {
  if (!container) return;
  container.replaceChildren();
  const url = safeImageUrl(source);
  if (!url) return;
  const image = document.createElement('img');
  image.src = url;
  image.alt = String(title || '');
  image.decoding = 'async';
  container.appendChild(image);
}

/* ==========================================================================
   FORMATAGE DE DATE UNIFIÉ (EX: JUN 8, 2024)
   ========================================================================== */
function formatDate(dateInput) {
  if (!dateInput) return '';

  let d;

  if (dateInput && typeof dateInput.toDate === 'function') {
    d = dateInput.toDate();
  } else if (dateInput && typeof dateInput._seconds === 'number') {
    d = new Date(dateInput._seconds * 1000);
  } else {
    d = new Date(dateInput);
  }

  if (isNaN(d.getTime())) {
    const str = String(dateInput).trim().toLowerCase();
    const frMonths = {
      'janvier': 0, 'février': 1, 'fevrier': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
      'juillet': 6, 'août': 7, 'aout': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11, 'decembre': 11
    };
    const parts = str.split(/\s+/);
    if (parts.length === 3 && frMonths[parts[1]] !== undefined) {
      d = new Date(parseInt(parts[2]), frMonths[parts[1]], parseInt(parts[0]));
    }
  }

  if (isNaN(d.getTime())) {
    return String(dateInput).toUpperCase();
  }

  const monthsEn = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${monthsEn[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/* ==========================================================================
   SMOOTH SCROLLING FLUIDE (LENIS)
   ========================================================================== */
let lenisInstance = null;

function initSmoothScroll() {
  if (typeof Lenis === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  lenisInstance = new Lenis({
    duration: 1.35,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false
  });

  let scrollFrame;
  function raf(time) {
    if (!lenisInstance) return;
    lenisInstance.raf(time);
    scrollFrame = requestAnimationFrame(raf);
  }
  scrollFrame = requestAnimationFrame(raf);
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {
    if (event.matches && lenisInstance) {
      cancelAnimationFrame(scrollFrame);
      lenisInstance.destroy();
      lenisInstance = null;
    }
  });

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        if (lenisInstance) lenisInstance.scrollTo(targetElement, { offset: -76, duration: 1.4 });
        else targetElement.scrollIntoView({ behavior: 'auto' });
      }
    });
  });
}

/* ==========================================================================
   SCROLLSPY : DÉTECTION AUTOMATIQUE DE LA SECTION ACTIVE DANS LE MENU
   ========================================================================== */
function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

  if (!sections.length || !navLinks.length) return;

  const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -60% 0px',
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const activeId = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${activeId}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }, observerOptions);

  sections.forEach(section => observer.observe(section));
}

/* ==========================================================================
   CURSEUR SUIVEUR DE SOURIS (SECTION HERO)
   ========================================================================== */
function initCustomCursor() {
  const cursor = document.getElementById('custom-cursor');
  const hero = document.querySelector('.hero');

  if (!cursor || !hero) return;

  hero.addEventListener('mousemove', (e) => {
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
    cursor.style.opacity = '1';
    cursor.style.transform = 'translate(-50%, -50%) scale(1)';
  });

  hero.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
    cursor.style.transform = 'translate(-50%, -50%) scale(0.8)';
  });

  hero.addEventListener('click', () => {
    const nextSection = document.getElementById('intro');
    if (nextSection && lenisInstance) {
      lenisInstance.scrollTo(nextSection, { offset: -60 });
    }
  });
}

/* ==========================================================================
   EASTER EGG : ACCÈS SECRET À L'ADMINISTRATION
   ========================================================================== */
function initLogoSecret() {
  const logos = document.querySelectorAll('.brand-logo');
  logos.forEach(logo => {
    let clickCount = 0;
    let clickTimer = null;

    logo.addEventListener('click', (e) => {
      clickCount++;

      if (clickTimer) clearTimeout(clickTimer);

      if (clickCount >= 5) {
        e.preventDefault();
        clickCount = 0;
        showNotification('Accès rédaction déverrouillé...');
        setTimeout(() => {
          window.location.href = 'admin.html';
        }, 500);
        return;
      }

      clickTimer = setTimeout(() => {
        clickCount = 0;
      }, 400);
    });
  });
}

/* ==========================================================================
   CARTE INTERACTIVE LEAFLET
   ========================================================================== */
async function initArchitectureMap() {
  const mapContainer = document.getElementById('architecture-map');
  if (!mapContainer || typeof L === 'undefined') return;

  const map = L.map('architecture-map', { scrollWheelZoom: false }).setView([20, 10], 2.3);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  const customPinIcon = L.divIcon({
    className: 'custom-map-pin',
    html: `<div class="pin-inner"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  const locations = [
    { name: "Villa Savoye", city: "Poissy (France)", coords: [48.9244, 2.0283], desc: "Le Corbusier — Manifeste du Modernisme (1931)" },
    { name: "Cité Radieuse", city: "Marseille (France)", coords: [43.2612, 5.3965], desc: "Le Corbusier — Unité d'habitation emblématique (1952)" },
    { name: "Chapelle Notre-Dame du Haut", city: "Ronchamp (France)", coords: [47.7044, 6.6206], desc: "Le Corbusier — Expressionnisme sculptural en béton (1955)" },
    { name: "Couvent de La Tourette", city: "Éveux (France)", coords: [45.8192, 4.6228], desc: "Le Corbusier — Architecture monastique brutaliste (1960)" },
    { name: "Cabanon de Le Corbusier", city: "Roquebrune-Cap-Martin (France)", coords: [43.7602, 7.4646], desc: "Le Corbusier — Réflexion minimale sur la cellule d'habitation (1951)" },
    { name: "Complexe du Capitole", city: "Chandigarh (Inde)", coords: [30.7593, 76.8018], desc: "Le Corbusier — Urbanisme et palais gouvernementaux (1953)" },
    { name: "Maison Curutchet", city: "La Plata (Argentine)", coords: [-34.9129, -57.9427], desc: "Le Corbusier — Résidence privée avec rampe intérieure (1953)" },
    { name: "Musée National d'Art Occidental", city: "Tokyo (Japon)", coords: [35.7154, 139.7758], desc: "Le Corbusier — Musée à croissance illimitée (1959)" },
    { name: "Carpenter Center", city: "Cambridge (États-Unis)", coords: [42.3736, -71.1147], desc: "Le Corbusier — Seul bâtiment de l'architecte aux USA (1963)" },
    { name: "Unité d'Habitation Berlin", city: "Berlin (Allemagne)", coords: [52.5113, 13.2405], desc: "Le Corbusier — Type « Corbusierhaus » (1958)" },
    { name: "Église de la Lumière", city: "Ibaraki, Osaka (Japon)", coords: [34.8161, 135.5383], desc: "Tadao Andō — Fente en croix sculptée par le soleil (1989)" },
    { name: "Chichu Art Museum", city: "Naoshima (Japon)", coords: [34.4489, 133.9877], desc: "Tadao Andō — Architecture enterrée au service de l'art (2004)" },
    { name: "Maison Row (Azuma)", city: "Osaka (Japon)", coords: [34.6083, 135.4950], desc: "Tadao Andō — Maison étroite en béton brut avec patio (1976)" },
    { name: "Temple de l'Eau (Honpuku-ji)", city: "Île d'Awaji (Japon)", coords: [34.5458, 134.9814], desc: "Tadao Andō — Sanctuaire sous un bassin de lotus (1991)" },
    { name: "Bourse de Commerce", city: "Paris (France)", coords: [48.8625, 2.3426], desc: "Tadao Andō — Rotonde en béton insérée dans le monument (2021)" },
    { name: "Espace de Méditation UNESCO", city: "Paris (France)", coords: [48.8503, 2.3056], desc: "Tadao Andō — Cylindre en béton et granite d'Hiroshima (1995)" },
    { name: "Punta della Dogana", city: "Venise (Italie)", coords: [45.4308, 12.3323], desc: "Tadao Andō — Restauration et aménagement du bâtiment historique (2009)" },
    { name: "Modern Art Museum of Fort Worth", city: "Texas (États-Unis)", coords: [32.7489, -97.3688], desc: "Tadao Andō — Pavillons en verre et béton au-dessus d'un plan d'eau (2002)" },
    { name: "Centro Roberto Garza Sada", city: "Monterrey (Mexique)", coords: [25.6611, -100.4208], desc: "Tadao Andō — Bâtiment en arche de béton « Gate of Creation » (2012)" },
    { name: "Poly Grand Theater", city: "Shanghai (Chine)", coords: [31.3562, 121.2728], desc: "Tadao Andō — Cylindres en bois perçant un cube en béton (2014)" }
  ];

  if (window.Decorum && await Decorum.places(map, customPinIcon)) return;
  locations.forEach(loc => {
    L.marker(loc.coords, { icon: customPinIcon }).addTo(map)
      .bindPopup(`
        <div class="popup-meta">${loc.city}</div>
        <div class="popup-title">${loc.name}</div>
        <div class="popup-desc">${loc.desc}</div>
      `);
  });
}

/* ==========================================================================
   PROGRESSION & TEMPS DE LECTURE
   ========================================================================== */
function initReadingProgress() {
  const progressBar = document.getElementById('read-progress');
  const content = document.getElementById('art-content');
  const timeBadge = document.getElementById('art-read-time');

  if (content && timeBadge) {
    const text = content.innerText || '';
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const readMinutes = Math.max(1, Math.ceil(wordCount / 200));
    timeBadge.innerText = `${readMinutes} min de lecture`;
  }

  if (progressBar) {
    window.addEventListener('scroll', () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
      progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    });
  }
}

/* ==========================================================================
   REDIRECTION INTELLIGENTE DU LIEN EMAIL
   ========================================================================== */
function initSmartEmailLink() {
  const emailLink = document.getElementById('email-contact-link');
  if (!emailLink) return;

  emailLink.addEventListener('click', (e) => {
    e.preventDefault();
    const email = 'decorumcollectiv@gmail.com';
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      window.location.href = `mailto:${email}`;
    } else {
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${email}`, '_blank');
    }
  });
}

/* ==========================================================================
   SYSTÈME DE NOTIFICATIONS (TOASTS)
   ========================================================================== */
function showNotification(message, duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  container.innerHTML = '';

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;
  container.appendChild(toast);

  setTimeout(() => { toast.classList.add('show'); }, 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { toast.remove(); }, 300);
  }, duration);
}

/* ==========================================================================
   GESTION CLOUD FIREBASE
   ========================================================================== */
let legacyArticleCursor = null;
async function getArticlesFromCloud(more = false) {
  if (window.Decorum && (await Decorum.ready()).ready) {
    const result = await Decorum.api('articles', {params: more && window.decorumArticleCursor ? {cursor:window.decorumArticleCursor} : {}});
    window.decorumArticleCursor = result.nextCursor;
    return result.items;
  }
  if (!db) throw new Error('Connexion au journal indisponible.');
  try {
    let query = db.collection('articles').orderBy('createdAt', 'desc').limit(21);
    if (more && legacyArticleCursor) query = query.startAfter(legacyArticleCursor);
    const snapshot = await query.get();
    legacyArticleCursor = snapshot.docs.length > 20 ? snapshot.docs[19] : null;
    window.decorumArticleCursor = legacyArticleCursor?.id || null;
    return snapshot.docs.slice(0, 20).map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Erreur Cloud :", error);
    throw error;
  }
}

async function renderArticlesGrid(more = false) {
  const container = document.getElementById('articles-grid');
  if (!container) return;

  if (!more) container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--encre); padding: 40px 0;">Chargement des publications...</p>';

  let articles;
  try {
    articles = await getArticlesFromCloud(more);
  } catch {
    if (more) {
      const button = document.getElementById('journal-more');
      if (button) button.textContent = 'Réessayer de charger la suite';
    } else container.textContent = 'Le journal est momentanément indisponible. Veuillez réessayer.';
    return;
  }

  if (articles.length === 0 && !more) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--encre); padding: 40px 0;">Aucune publication pour le moment.</p>';
    return;
  }

  const cards = articles.map(art => `
    <article class="article-card reveal">
      <a class="article-card-link" href="article.html?id=${escapeHtml(encodeURIComponent(art.id))}">
      <div class="card-image ${!art.image ? 'placeholder-box' : ''}">
        ${safeImageUrl(art.image) ? `<img src="${escapeHtml(safeImageUrl(art.image))}" alt="${escapeHtml(art.title)}" loading="lazy" decoding="async">` : `<span>${escapeHtml((art.title || '').toUpperCase())}</span>`}
        <span class="tag">${escapeHtml(art.category || 'ARCHITECTURE')}</span>
      </div>
      <div class="card-meta">
        <span style="color: var(--coral); font-weight: 600; text-transform: uppercase; margin-right: 8px;">${escapeHtml(art.type || 'ARTICLE')}</span>
        <time>${escapeHtml(formatDate(art.date || art.createdAt))}</time>
      </div>
      <h3 class="card-title">${escapeHtml(art.title || 'Sans titre')}</h3>
      <p style="font-size: 0.85rem; color: var(--encre); margin-top: 8px; line-height: 1.5;">${escapeHtml(art.excerpt || '')}</p>
      </a>
    </article>
  `).join('');

  if (more) container.insertAdjacentHTML('beforeend', cards);
  else container.innerHTML = cards;
  let button = document.getElementById('journal-more');
  if (!button) {
    button = document.createElement('button');
    button.id = 'journal-more'; button.className = 'btn-link';
    button.addEventListener('click', async () => {
      button.disabled = true;
      try { await renderArticlesGrid(true); } finally { button.disabled = false; }
    });
    container.after(button);
  }
  button.textContent = 'Lire la suite du journal →';
  button.hidden = !window.decorumArticleCursor;
  initScrollReveal();
}

/* ==========================================================================
   PAGE ARTICLE INDIVIDUELLE
   ========================================================================== */
async function renderSingleArticle() {
  if (!document.getElementById('art-content')) return;
  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get('id');

  if (!articleId || articleId.includes('/') || !db) {
    document.getElementById('art-title').textContent = 'Article indisponible';
    return;
  }

  try {
    const useApi = window.Decorum && (await Decorum.ready()).ready;
    const result = useApi ? await Decorum.api('article', {params:{id:articleId}}) : null;
    const doc = useApi ? {exists:true,data:()=>result} : await db.collection('articles').doc(articleId).get();

    if (!doc.exists) {
      document.getElementById('art-title').textContent = 'Article introuvable';
      console.error("Aucun article trouvé avec cet ID.");
      return;
    }

    const data = doc.data();

    document.title = `${data.title || 'Article'} — Decorum Collectiv`;

    const titleEl = document.getElementById('art-title');
    if (titleEl) titleEl.textContent = data.title || 'Sans titre';

    const formatEl = document.getElementById('art-type');
    if (formatEl) formatEl.textContent = data.type || 'ESSAI';

    const categoryEl = document.getElementById('art-category');
    if (categoryEl) categoryEl.textContent = data.category || 'ARCHITECTURE';

    const authorEl = document.getElementById('art-author');
    if (authorEl) authorEl.textContent = `Par ${data.author || 'Decorum'}`;

    const dateEl = document.getElementById('art-date');
    if (dateEl) dateEl.textContent = formatDate(data.date || data.createdAt);

    const imgWrapper = document.getElementById('art-image-wrapper');
    renderCover(imgWrapper, data.image, data.title);

    const excerptEl = document.getElementById('art-excerpt');
    if (excerptEl) excerptEl.textContent = data.excerpt || '';

    const contentEl = document.getElementById('art-content');
    if (contentEl) {
      renderEditorialContent(contentEl, data.content);
    }

    const likeCountEl = document.getElementById('like-count');
    if (likeCountEl) likeCountEl.textContent = data.likes || 0;

    const storageKey = `liked_${articleId}`;
    if (localStorage.getItem(storageKey)) {
      const btn = document.getElementById('like-btn');
      if (btn) btn.classList.add('liked');
    }

    initReadingProgress();
    if (window.Decorum) Decorum.enrichArticle(data, articleId);

  } catch (error) {
    document.getElementById('art-title').textContent = 'Article momentanément indisponible';
    console.error("Erreur de récupération de l'article :", error);
  }
}

/* ==========================================================================
   GESTION DES LIKES
   ========================================================================== */
async function toggleLikeArticle() {
  if (window.Decorum && (await Decorum.ready()).ready) {
    const id = new URLSearchParams(location.search).get('id');
    const btn = document.getElementById('like-btn');
    if (!id || btn.disabled) return;
    btn.disabled = true;
    try {
      let device = localStorage.getItem('decorum_device');
      if (!device) { device = crypto.randomUUID(); localStorage.setItem('decorum_device', device); }
      const result = await Decorum.api('like', {body:{id,device}});
      document.getElementById('like-count').textContent = result.likes;
      localStorage.setItem('liked_' + id, 'true');
      btn.classList.add('liked');
      showNotification('Merci pour votre soutien !');
    } catch (error) { showNotification(error.message); }
    finally { btn.disabled = false; }
    return;
  }
  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get('id');
  if (!articleId || !db) return;

  const storageKey = `liked_${articleId}`;

  if (localStorage.getItem(storageKey)) {
    showNotification('Vous avez déjà aimé cet article.');
    return;
  }

  const btn = document.getElementById('like-btn');
  if (btn) btn.disabled = true;

  const docRef = db.collection('articles').doc(articleId);
  try {
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) return;
      const newLikes = (doc.data().likes || 0) + 1;
      transaction.update(docRef, { likes: newLikes });

      const countEl = document.getElementById('like-count');
      if (countEl) countEl.textContent = newLikes;
    });

    localStorage.setItem(storageKey, 'true');
    if (btn) {
      btn.classList.add('liked');
      btn.disabled = false;
    }
    showNotification('Merci pour votre soutien !');
  } catch (error) {
    console.error("Erreur lors du like :", error);
    if (btn) btn.disabled = false;
  }
}

/* ==========================================================================
   ESPACE RÉDACTION / ADMIN
   ========================================================================== */
function uploadImageDirect(input) {
  const status = document.getElementById('upload-status');
  if (input.files && input.files[0]) {
    const file = input.files[0];
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
      if (status) status.innerText = 'Choisissez une image JPEG, PNG, WebP ou AVIF.';
      input.value = '';
      return;
    }
    if (file.size > 500 * 1024) {
      if (status) status.innerText = 'Import limité à 500 Ko. Pour une grande image, utilisez son URL.';
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('image-url').value = e.target.result;
      if (status) status.innerText = 'Image chargée avec succès !';
    };
    reader.readAsDataURL(file);
  }
}

function openPreviewModal() {
  const modal = document.getElementById('preview-modal');
  if (!modal) return;

  document.getElementById('prev-type').innerText = document.getElementById('pub-type').value;
  document.getElementById('prev-category').innerText = document.getElementById('category').value.toUpperCase();
  document.getElementById('prev-title').innerText = document.getElementById('title').value || 'Titre de l\'article';
  document.getElementById('prev-author').innerText = `Par ${document.getElementById('author').value}`;
  document.getElementById('prev-excerpt').innerText = document.getElementById('excerpt').value;

  const rawContent = document.getElementById('content').value;
  renderEditorialContent(document.getElementById('prev-content'), rawContent);

  const imgUrl = document.getElementById('image-url').value;
  const imgBox = document.getElementById('prev-image');
  renderCover(imgBox, imgUrl, 'Aperçu');

  modal.style.display = 'block';
}

function closePreviewModal() {
  const modal = document.getElementById('preview-modal');
  if (modal) modal.style.display = 'none';
}

async function saveNewArticle(articleData) {
  if (!db) throw new Error('Connexion indisponible. Votre texte est conservé.');
  // Temporary safety margin until images move to object storage.
  if (new TextEncoder().encode(JSON.stringify(articleData)).length > 900000) {
    throw new Error('Article trop volumineux. Utilisez un lien pour la photo principale.');
  }
  try {
    await db.collection('articles').add(articleData);
  } catch (error) {
    console.error("Erreur lors de la publication :", error);
    throw error;
  }
}

async function renderAdminArticlesList() {
  const listContainer = document.getElementById('admin-articles-list');
  if (!listContainer || !db) return;
  if (window.Decorum && (await Decorum.ready()).ready) return;

  let articles;
  try {
    articles = await getArticlesFromCloud();
  } catch {
    listContainer.textContent = 'Impossible de charger les publications. Veuillez réessayer.';
    return;
  }
  if (articles.length === 0) {
    listContainer.innerHTML = '<p style="color: var(--encre);">Aucun article publié pour le moment.</p>';
    return;
  }

  listContainer.innerHTML = articles.map(art => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border: 2px solid var(--encre); background: var(--white); margin-bottom: 12px;">
      <div>
        <strong>${escapeHtml(art.title)}</strong>
        <span style="font-size: 0.8rem; color: var(--coral); margin-left: 8px;">[${escapeHtml(art.type || 'ARTICLE')}]</span>
      </div>
      <button data-delete-id="${escapeHtml(art.id)}" class="btn-delete" style="padding: 6px 12px; font-size: 0.8rem;">Supprimer</button>
    </div>
  `).join('');
  listContainer.querySelectorAll('[data-delete-id]').forEach(button => {
    button.addEventListener('click', () => deleteArticleFromAdmin(button.dataset.deleteId));
  });
}

async function deleteArticleFromAdmin(id) {
  if (!db || !confirm("Confirmer la suppression définitive de cet article ?")) return;
  try {
    await db.collection('articles').doc(id).delete();
    showNotification("Article supprimé avec succès.");
    renderAdminArticlesList();
  } catch (error) {
    console.error("Erreur de suppression :", error);
    showNotification("Erreur lors de la suppression.");
  }
}

/* ==========================================================================
   ANIMATIONS & MOBILE
   ========================================================================== */
let motionPreference;
const revealedElements = new WeakSet();
const runningReveals = new Set();
let revealObserver;
function initScrollReveal() {
  if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;
  motionPreference ||= window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(entries => {
      let order = 0;
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        revealObserver.unobserve(entry.target);
        if (motionPreference.matches) return;
        const animation = entry.target.animate([
          { opacity: 0, transform: 'translateY(14px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 900, delay: Math.min(order++ * 60, 180),
          easing: 'cubic-bezier(.22,.68,0,1.01)', fill: 'backwards' });
        runningReveals.add(animation);
        animation.finished.catch(() => {}).finally(() => runningReveals.delete(animation));
      });
    }, { threshold: 0.08 });
    motionPreference.addEventListener('change', event => {
      if (event.matches) runningReveals.forEach(animation => animation.cancel());
    });
  }
  // Reused when asynchronous article cards arrive; content is never hidden by CSS.
  document.querySelectorAll('.reveal, .principle-card, .highlight-box, .intro-text, .contact-card, .section-header, .map-header, .manifesto-hero-title, .about-text, .illustration-card, .contact-header').forEach(element => {
    if (revealedElements.has(element)) return;
    revealedElements.add(element);
    revealObserver.observe(element);
  });
}

function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  });
}

function initMobileMenu() {
  const menuBtn = document.querySelector('.menu-btn');
  const navLinks = document.querySelector('.nav-links');

  if (menuBtn && navLinks) {
    navLinks.id = 'primary-navigation';
    menuBtn.setAttribute('aria-controls', navLinks.id);
    menuBtn.setAttribute('aria-expanded', 'false');
    const setOpen = open => {
      navLinks.classList.toggle('active', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    };
    menuBtn.addEventListener('click', () => setOpen(!navLinks.classList.contains('active')));
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => setOpen(false));
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && navLinks.classList.contains('active')) {
        setOpen(false);
        menuBtn.focus();
      }
    });
  }
}

/* ==========================================================================
   INITIALISATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initSmoothScroll();
  initCustomCursor();
  initScrollSpy();
  renderArticlesGrid();
  renderSingleArticle();
  initScrollReveal();
  initNavbarScroll();
  initMobileMenu();
  initLogoSecret();
  initArchitectureMap();
  initSmartEmailLink();

  const pendingToast = sessionStorage.getItem('decorum_toast');
  if (pendingToast) {
    showNotification(pendingToast);
    sessionStorage.removeItem('decorum_toast');
  }
});
