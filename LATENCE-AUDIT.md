# LATENCE — reprise du projet existant

## Architecture conservée

HTML statique, CSS et JavaScript natif, sans framework. Les polices Schibsted Grotesk et Bricolage sont auto-hébergées. LATENCE utilise Schibsted, une alternative sans-serif libre déjà présente. Une fonction Node (`api/editorial.js`) gère articles, SEO côté serveur, PDF, propositions, administration et publications programmées. Firebase Auth protège les comptes ; Firestore stocke publications, brouillons, lieux, propositions et réglages. Les mutations passent par le serveur avec vérification du jeton et de l'UID autorisé. Les identifiants techniques DECORUM sont conservés pour éviter une migration destructrice.

## Répartition

- Conserver : authentification, publication, brouillons, programmation, images, SEO, PDF, recherche, données historiques.
- Adapter : logo, palette, accueil, rubriques, lecture, animations, rédaction et textes publics.
- Isoler : archives d'architecture, fiches de bâtiments, lieux et visites. Les catégories historiques ne deviennent pas des rubriques tech.
- Ne pas simuler : abonnements newsletter, faux tests produit, articles fictifs publiés ou succès de connexion.

## Défauts trouvés à la reprise

L'accueil ne chargeait pas ses scripts éditoriaux. Le rendu serveur des articles cherchait des classes et textes qui avaient disparu du nouveau modèle. Les métadonnées SEO génériques et spécifiques étaient dupliquées. L'accueil ne parcourait que la première page de données, et les filtres excluaient les trois articles mis à la une. Les images importées en base64 étaient exclues de certaines cartes. Le menu mobile caché restait navigable au clavier ; Échap volait le focus même menu fermé. Les révélations n’étaient pas initialisées sur l’accueil et pouvaient masquer du contenu sans JavaScript. Le gris de marque ne contrastait pas suffisamment pour les petits textes.

## Plan appliqué

1. Rebrancher les parcours et fiabiliser le rendu serveur.
2. Centraliser les données paginées, harmoniser taxonomie, filtres et recherche.
3. Compléter interactions natives, accessibilité et adaptation mobile.
4. Préserver la rédaction et les blocs, puis vérifier avec données locales explicitement fictives.
5. Construire, tester, produire les aperçus. Aucune fusion ni mise en production pendant cette reprise.

## Prévisualisation

`npm install`, `npm test`, `npm run build`, puis `npm run dev` (http://127.0.0.1:4174).
Le serveur de développement utilise l'API réelle : sans configuration serveur Firebase il reste en lecture publique historique. Aucun secret n'est nécessaire pour les tests locaux. `node tools/admin-preview.cjs` fournit une rédaction fictive en mémoire sur le port 4175, sans écriture dans Firebase.

La newsletter est absente faute de service configuré. Le domaine et l'adresse de contact existants restent inchangés. La publication programmée existante est déclenchée à la lecture suivante après l'heure prévue ; ce n'est pas une tâche cron. Les tests locaux ne prouvent pas une connexion ou une publication dans Firebase en production.

## Vérifications de cette reprise

42 tests automatisés passent. Le build public réussit. Le parcours navigateur vérifie pagination, filtres, recherche, rubrique, article avec et sans JavaScript, menu clavier mobile, réduction des animations, absence de débordement à 390/768/1024 px et panne API. Les captures sont dans outputs/latence à la racine de l’espace de travail. La rédaction a été testée sur une simulation en mémoire : choix de rubrique et format, date obligatoire pour programmation, enregistrement de brouillon sans erreur JavaScript. Ces essais ne modifient pas Firebase.

Fichiers principaux : index.html et pages publiques ; latence.css ; latence.js ; editorial.js ; script.js ; admin.js ; api/editorial.js ; lib/article-page.cjs ; lib/pdf.cjs ; tools/admin-preview.cjs ; tools/verify-latence.cjs ; tests/article-page.test.cjs. PALETTE.md et ADMIN-GUIDE.md documentent la nouvelle direction.
