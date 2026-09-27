// Configuration Firebase officielle
const firebaseConfig = {
  apiKey: "AIzaSyBteD5R4XH3K-P0GtdjM5Y8e35AlKugnFU",
  authDomain: "decorum-collectiv.firebaseapp.com",
  projectId: "decorum-collectiv",
  storageBucket: "decorum-collectiv.firebasestorage.app",
  messagingSenderId: "743631473375",
  appId: "1:743631473375:web:2c2f6078f46c9e36a5376a",
  measurementId: "G-L6033RN4BQ"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

/* ==========================================================================
   EASTER EGG : ACCÈS SECRET À L'ADMINISTRATION (5 CLICS SUR LE LOGO)
   ========================================================================== */
function initLogoSecret() {
  const logos = document.querySelectorAll('.brand-logo');
  logos.forEach(logo => {
    let clickCount = 0;
    let clickTimer = null;

    logo.addEventListener('click', (e) => {
      e.preventDefault();
      clickCount++;

      if (clickTimer) clearTimeout(clickTimer);

      if (clickCount >= 5) {
        clickCount = 0;
        showNotification('Accès rédaction déverrouillé...');
        setTimeout(() => {
          window.location.href = 'admin.html';
        }, 500);
        return;
      }

      clickTimer = setTimeout(() => {
        clickCount = 0;
        const target = logo.getAttribute('href') || 'index.html';
        const isHomePage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');

        if (isHomePage) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          window.location.href = target;
        }
      }, 400);
    });
  });
}

/* ==========================================================================
   CARTE INTERACTIVE LEAFLET.JS
   ========================================================================== */
function initArchitectureMap() {
  const mapContainer = document.getElementById('architecture-map');
  if (!mapContainer || typeof L === 'undefined') return;

  const map = L.map('architecture-map', { scrollWheelZoom: false }).setView([46.603354, 1.888334], 5.5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 18
  }).addTo(map);

  const locations = [
    { name: "Villa Cavrois", city: "Croix", coords: [50.6781, 3.1558], desc: "Robert Mallet-Stevens (1932)" },
    { name: "Cité Radieuse", city: "Marseille", coords: [43.2612, 5.3965], desc: "Le Corbusier (1952)" },
    { name: "Maison de Verre", city: "Paris", coords: [48.8525, 2.3218], desc: "Pierre Chareau (1932)" },
    { name: "Couvent de La Tourette", city: "Éveux", coords: [45.8192, 4.6228], desc: "Le Corbusier (1960)" }
  ];

  locations.forEach(loc => {
    L.marker(loc.coords).addTo(map)
      .bindPopup(`
        <div class="popup-meta">${loc.city}</div>
        <div class="popup-title">${loc.name}</div>
        <div style="font-size:0.8rem; color:#ccc;">${loc.desc}</div>
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
    const wordCount = text.trim().split(/\s+/).length;
    const readMinutes = Math.max(1, Math.ceil(wordCount / 200));
    timeBadge.innerText = `${readMinutes} min de lecture`;
  }

  if (progressBar) {
    window.addEventListener('scroll', () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    });
  }
}

/* ==========================================================================
   IMPORT PHOTO DIRECT (IMGBB API)
   ========================================================================== */
async function uploadImageDirect(input) {
  const file = input.files[0];
  if (!file) return;

  const status = document.getElementById('upload-status');
  if (status) status.innerText = "Téléversement en cours...";

  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch('https://api.imgbb.com/1/upload?key=6d3a5ef91271b0453009772ccf31175c', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();

    if (data.success) {
      document.getElementById('image-url').value = data.data.url;
      if (status) status.innerText = "✓ Photo téléversée avec succès !";
    } else {
      if (status) status.innerText = "Erreur lors du téléversement.";
    }
  } catch (err) {
    console.error(err);
    if (status) status.innerText = "Erreur de connexion lors de l'envoi.";
  }
}

/* ==========================================================================
   MODALE D'APERÇU (ADMIN)
   ========================================================================== */
function openPreviewModal() {
  const title = document.getElementById('title').value || 'Titre de la publication';
  const type = document.getElementById('pub-type').value;
  const category = (document.getElementById('category').value || 'Thématique').toUpperCase();
  const author = document.getElementById('author').value || 'Raphaël';
  const imageUrl = document.getElementById('image-url').value;
  const excerpt = document.getElementById('excerpt').value || 'Extrait / Chapeau de présentation...';
  const content = document.getElementById('content').value || 'Contenu complet de l\'article...';

  document.getElementById('prev-type').innerText = type;
  document.getElementById('prev-category').innerText = category;
  document.getElementById('prev-title').innerText = title;
  document.getElementById('prev-author').innerText = `Par ${author}`;
  document.getElementById('prev-excerpt').innerText = excerpt;

  const imgContainer = document.getElementById('prev-image');
  if (imageUrl) {
    imgContainer.innerHTML = `<img src="${imageUrl}" style="width:100%; max-height: 400px; object-fit: cover; border-radius:4px;">`;
  } else {
    imgContainer.innerHTML = '';
  }

  const formattedContent = content.split('\n').filter(p => p.trim() !== '').map(p => `<p style="margin-bottom:16px; line-height:1.7;">${p}</p>`).join('');
  document.getElementById('prev-content').innerHTML = formattedContent;

  document.getElementById('preview-modal').style.display = 'block';
}

function closePreviewModal() {
  document.getElementById('preview-modal').style.display = 'none';
}

/* ==========================================================================
   SYSTÈME DE NOTIFICATIONS (TOASTS)
   ========================================================================== */
function showNotification(message, duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;
  container.appendChild(toast);

  setTimeout(() => { toast.classList.add('show'); }, 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { toast.remove(); }, 400);
  }, duration);
}

/* ==========================================================================
   GESTION DES ARTICLES (FIREBASE CLOUD)
   ========================================================================== */
async function getArticlesFromCloud() {
  try {
    const snapshot = await db.collection('articles').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erreur Cloud :", error);
    return [];
  }
}

async function saveNewArticle(article) {
  try {
    await db.collection('articles').add(article);
  } catch (error) {
    console.error("Erreur sauvegarde :", error);
  }
}

async function deleteCurrentArticle() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) return;

  if (sessionStorage.getItem('decorum_admin_auth') !== 'true') {
    const pwd = prompt("Mot de passe administrateur requis pour supprimer :");
    if (pwd !== "decorum2026") {
      showNotification("Accès refusé.");
      return;
    }
  }

  if (confirm("Confirmer la suppression définitive de cette publication ?")) {
    try {
      await db.collection('articles').doc(id).delete();
      sessionStorage.setItem('decorum_toast', 'Publication supprimée avec succès.');
      window.location.href = 'index.html';
    } catch (error) {
      showNotification("Erreur lors de la suppression.");
    }
  }
}

/* ==========================================================================
   RENDU DES PAGES
   ========================================================================== */
async function renderArticlesGrid() {
  const container = document.getElementById('articles-grid');
  if (!container) return;

  container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px 0;">Chargement des publications...</p>';

  const articles = await getArticlesFromCloud();
  
  if (articles.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px 0;">Aucune publication pour le moment.</p>';
    return;
  }

  container.innerHTML = articles.map(art => `
    <article class="article-card reveal" onclick="window.location.href='article.html?id=${art.id}'">
      <div class="card-image ${!art.image ? 'placeholder-box' : ''}">
        ${art.image ? `<img src="${art.image}" alt="${art.title}">` : `<span>${art.title.toUpperCase()}</span>`}
        <span class="tag">${art.category}</span>
      </div>
      <div class="card-meta">
        <span style="color: var(--rust); font-weight: 600; text-transform: uppercase; margin-right: 8px;">${art.type || 'ARTICLE'}</span>
        <time>${art.date}</time>
      </div>
      <h3 class="card-title">${art.title}</h3>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 8px; line-height: 1.5;">${art.excerpt}</p>
    </article>
  `).join('');

  initScrollReveal();
}

async function renderSingleArticle() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) return;

  try {
    const doc = await db.collection('articles').doc(id).get();
    if (!doc.exists) return;

    const art = doc.data();

    document.title = `${art.title} — Decorum Collectiv`;
    document.getElementById('art-type').innerText = art.type || 'ARTICLE';
    document.getElementById('art-category').innerText = art.category;
    document.getElementById('art-title').innerText = art.title;
    document.getElementById('art-author').innerText = `Par ${art.author}`;
    document.getElementById('art-date').innerText = art.date;
    document.getElementById('art-excerpt').innerText = art.excerpt;

    const imgContainer = document.getElementById('art-image-wrapper');
    if (art.image) {
      imgContainer.innerHTML = `<img src="${art.image}" style="width:100%; max-height: 550px; object-fit: cover; border-radius:4px;">`;
    } else {
      imgContainer.innerHTML = `<div class="placeholder-box" style="height:250px;"><span>${art.title.toUpperCase()}</span></div>`;
    }

    const formattedContent = art.content.split('\n').filter(p => p.trim() !== '').map(p => `<p>${p}</p>`).join('');
    document.getElementById('art-content').innerHTML = formattedContent;

    initReadingProgress();
  } catch (error) {
    console.error("Erreur d'affichage :", error);
  }
}

/* ==========================================================================
   ANIMATIONS & MOBILE
   ========================================================================== */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal, .principle-card, .highlight-box, .intro-text, .contact-card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('active');
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  reveals.forEach(el => {
    el.classList.add('reveal');
    observer.observe(el);
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
    menuBtn.addEventListener('click', () => navLinks.classList.toggle('active'));
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => navLinks.classList.remove('active'));
    });
  }
}

/* ==========================================================================
   INITIALISATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  renderArticlesGrid();
  initScrollReveal();
  initNavbarScroll();
  initMobileMenu();
  initLogoSecret();
  initArchitectureMap();

  const pendingToast = sessionStorage.getItem('decorum_toast');
  if (pendingToast) {
    showNotification(pendingToast);
    sessionStorage.removeItem('decorum_toast');
  }
});
