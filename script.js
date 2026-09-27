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

// Initialisation de Firebase
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
      // Bloque le rechargement immédiat pour pouvoir compter les clics
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

      // Si pas d'autres clics dans les 400ms, comportement normal du lien
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

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 400);
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
    console.error("Erreur lors de la récupération des articles :", error);
    return [];
  }
}

async function saveNewArticle(article) {
  try {
    await db.collection('articles').add(article);
  } catch (error) {
    console.error("Erreur lors de la sauvegarde :", error);
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

  container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px 0;">Chargement des données Cloud...</p>';

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

  const newsletterForm = document.querySelector('.newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      newsletterForm.reset();
      showNotification('Inscription enregistrée. Merci pour votre abonnement.');
    });
  }

  const pendingToast = sessionStorage.getItem('decorum_toast');
  if (pendingToast) {
    showNotification(pendingToast);
    sessionStorage.removeItem('decorum_toast');
  }
});
