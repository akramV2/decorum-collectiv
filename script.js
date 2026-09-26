// Articles par défaut sans emojis
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

  // Animation d'entrée
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Animation de sortie et suppression
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
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
    
    // Notification enregistrée pour l'affichage après redirection
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
    <article class="article-card" onclick="window.location.href='article.html?id=${art.id}'">
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
   INITIALISATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  renderArticlesGrid();

  // Gestion de la newsletter
  const newsletterForm = document.querySelector('.newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      newsletterForm.reset();
      showNotification('Incription enregistrée. Merci pour votre abonnement.');
    });
  }

  // Vérifier s'il y a un message toast en attente
  const pendingToast = sessionStorage.getItem('decorum_toast');
  if (pendingToast) {
    showNotification(pendingToast);
    sessionStorage.removeItem('decorum_toast');
  }
});