// Articles par défaut
const initialArticles = [
  {
    id: "1",
    title: "Tadao Andō : La Poétique du Béton et la Magie du Vide",
    category: "ESSAI SPATIAL",
    author: "La Rédaction",
    date: "26 SEPTEMBRE 2026",
    image: "https://images.unsplash.com/photo-1513694203232-719a280e022f",
    excerpt: "Figure incontournable de l'architecture contemporaine, Tadao Andō a su transformer le béton brut en une matière spirituelle. Retour sur une œuvre fondée sur le silence, la lumière naturelle et la géométrie pure.",
    content: "Ancien boxeur autodidacte né à Osaka en 1941, Tadao Andō s'est imposé comme l'un des plus grands maîtres de l'architecture mondiale. Sans formation académique traditionnelle, c'est au fil de ses voyages et d'une observation minutieuse de la nature et du patrimoine japonais qu'il a forgé sa philosophie spatiale.\n\nAu cœur du travail d'Andō se trouve un matériau singulier : le béton armé lissé, laissé à nu et rythmé par les trous d'ancrage de coffrage. Loin d'être froid ou industriel, son béton devient sous ses mains une surface extrêmement douce, presque soyeuse, façonnée pour capter les plus subtiles variations de la lumière.\n\nL'Église de la Lumière à Ibaraki illustre parfaitement cette maîtrise. Une simple fente cruciforme découpée dans un mur frontal laisse pénétrer la lumière du jour, transformant l'ombre intérieure en une expérience spirituelle poignante.\n\nDe l'île d'art de Naoshima avec le musée Chichu jusqu'à la réhabilitation récente de la Bourse de Commerce à Paris, Tadao Andō continue de prouver que l'architecture contemporaine peut être à la fois radicale, minimaliste et profondément poétique."
  },
  {
    id: "2",
    title: "Le Corbusier : Du Modulor au Brutalisme de la Cité Radieuse",
    category: "PIONNIERS",
    author: "La Rédaction",
    date: "25 SEPTEMBRE 2026",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
    excerpt: "Pionnier du modernisme, Charles-Édouard Jeanneret, dit Le Corbusier, a redéfini l'habitat au XXe siècle. Entre les cinq points de l'architecture moderne, l'invention du Modulor et l'essor du béton brut, retour sur une œuvre monumentale.",
    content: "Théoricien exigeant, urbaniste et architecte, Le Corbusier a marqué le XXe siècle en remettant en cause la conception traditionnelle du logement. Dès les années 1920, il formule ses célèbres « cinq points d'une architecture nouvelle » : les pilotis, le toit-jardin, le plan libre, la fenêtre en bandeau et la façade libre.\n\nLa Villa Savoye à Poissy incarne parfaitement cette vision manifeste. Élevée sur pilotis pour libérer le sol, elle offre une promenade architecturale où l'intérieur et l'extérieur se répondent dans une clarté géométrique rigoureuse.\n\nAprès la Seconde Guerre mondiale, Le Corbusier s'oriente vers des structures plus sculpturales et matérielles avec l'utilisation du béton brut. La Cité Radieuse de Marseille (l'Unité d'Habitation) concrétise son concept de « village vertical », intégrant logements, commerces et espaces communautaires sous un même toit.\n\nPour concevoir ces espaces à l'échelle humaine, il crée le Modulor, un système de proportions fondé sur la taille humaine et le nombre d'or. De la chapelle Notre-Dame du Haut à Ronchamp jusqu'au complexe gouvernemental de Chandigarh en Inde, Le Corbusier a prouvé que la matière brute pouvait susciter une émotion architecturale universelle."
  }
];

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
   GESTION DES ARTICLES (LOCALSTORAGE)
   ========================================================================== */
function getArticles() {
  const stored = localStorage.getItem('decorum_articles');
  if (!stored) {
    localStorage.setItem('decorum_articles', JSON.stringify(initialArticles));
    return initialArticles;
  }
  return JSON.parse(stored);
}

function saveNewArticle(article) {
  const articles = getArticles();
  articles.unshift(article);
  localStorage.setItem('decorum_articles', JSON.stringify(articles));
}

function deleteCurrentArticle() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) return;

  if (confirm("Confirmer la suppression définitive de cet article ?")) {
    let articles = getArticles();
    articles = articles.filter(a => a.id !== id);
    localStorage.setItem('decorum_articles', JSON.stringify(articles));
    
    sessionStorage.setItem('decorum_toast', 'Article supprimé avec succès.');
    window.location.href = 'index.html';
  }
}

/* ==========================================================================
   RENDU DES PAGES
   ========================================================================== */
function renderArticlesGrid() {
  const container = document.getElementById('articles-grid');
  if (!container) return;

  const articles = getArticles();
  
  if (articles.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px 0;">Aucun article publié pour le moment.</p>';
    return;
  }

  container.innerHTML = articles.map(art => `
    <article class="article-card reveal" onclick="window.location.href='article.html?id=${art.id}'">
      <div class="card-image ${!art.image ? 'placeholder-box' : ''}">
        ${art.image ? `<img src="${art.image}" alt="${art.title}">` : `<span>${art.title.toUpperCase()}</span>`}
        <span class="tag">${art.category}</span>
      </div>
      <div class="card-meta">
        <time>${art.date}</time>
      </div>
      <h3 class="card-title">${art.title}</h3>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 8px; line-height: 1.5;">${art.excerpt}</p>
    </article>
  `).join('');

  initScrollReveal();
}

function renderSingleArticle() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const articles = getArticles();
  const art = articles.find(a => a.id === id) || articles[0];

  if (!art) return;

  document.title = `${art.title} — Decorum Collectiv`;
  document.getElementById('art-category').innerText = art.category;
  document.getElementById('art-title').innerText = art.title;
  document.getElementById('art-author').innerText = `Par ${art.author}`;
  document.getElementById('art-date').innerText = art.date;
  document.getElementById('art-excerpt').innerText = art.excerpt;

  const imgContainer = document.getElementById('art-image-wrapper');
  if (art.image) {
    imgContainer.innerHTML = `<img src="${art.image}" style="width:100%; max-height: 500px; object-fit: cover; border-radius:4px;">`;
  } else {
    imgContainer.innerHTML = `<div class="placeholder-box" style="height:250px;"><span>${art.title.toUpperCase()}</span></div>`;
  }

  const formattedContent = art.content.split('\n').filter(p => p.trim() !== '').map(p => `<p>${p}</p>`).join('');
  document.getElementById('art-content').innerHTML = formattedContent;
}

/* ==========================================================================
   ANIMATIONS & DEFILEMENT (INTERSECTION OBSERVER)
   ========================================================================== */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal, .principle-card, .highlight-box, .intro-text, .contact-card');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  reveals.forEach(el => {
    el.classList.add('reveal');
    observer.observe(el);
  });
}

function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

function initMobileMenu() {
  const menuBtn = document.querySelector('.menu-btn');
  const navLinks = document.querySelector('.nav-links');

  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
      });
    });
  }
}

/* ==========================================================================
   INITIALISATION GLOBALE
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  renderArticlesGrid();
  initScrollReveal();
  initNavbarScroll();
  initMobileMenu();

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
