# DECORUM Collectiv

Site HTML/CSS/JavaScript conservé, Firebase Auth/Firestore, Leaflet et API Node sur Vercel. Design, articles et vingt lieux historiques conservés.

## Fonctions

Articles modifiables, brouillons privés, programmation, retrait réversible, auteurs, catégories, SEO, fiches techniques, visites, compte à rebours, lieux, propositions modérées et PDF automatique avec les polices DECORUM. Métadonnées sociales rendues côté serveur, canonical, sitemap et Schema.org Article/Person/Place.

## Installation

Node 24 : `npm ci`, `npm test`, `npm run dev` puis http://127.0.0.1:4174.
`node tools/build.cjs` copie uniquement les ressources publiques dans `public/`.

Voir [DEPLOYMENT.md](DEPLOYMENT.md) pour activer les outils privés. Sans configuration serveur, le journal et le formulaire historique restent utilisables ; PDF, sitemap et métadonnées fonctionnent par lecture publique. Les nouvelles écritures restent désactivées.

## Données

`articles` : versions publiques uniquement. `editorialArticles` : brouillons privés. `scheduledArticles` : versions programmées. Modifier un brouillon ne retire pas la version publiée. Publier conserve identifiant et mentions J’aime. `places` complète les vingt lieux de `lib/places-seed.json`. Les autres collections sont privées et accessibles seulement via l’API autorisée.

La programmation est déclenchée par la première requête publique après l’échéance, par transaction ; ce n’est pas une exécution à la seconde garantie sans trafic.

## Tests et limites

Tests : validation, XSS, erreurs de publication, brouillons, concurrence d’édition, programmation, modération, archivage et limitation des envois. Stockage et identités simulés : vérifier séparément les règles Firebase déployées.

Images importées : 500 Ko maximum, Base64 conservé provisoirement. Le stockage objet et les variantes responsives restent à prévoir. Le PDF optimise les images raster et accepte les hôtes listés dans `lib/pdf.cjs` (Unsplash, Wikimedia, Firebase Storage, Pinterest). Les autres images restent visibles sur le site mais sont omises du PDF. Export : image de couverture, texte intégral en colonnes, fiche et visite ; les longs articles occupent plus de deux pages. Les illustrations internes du corps de texte ne sont pas reprises.

Polices de marque auto-hébergées sous OFL et DOMPurify 3.4.16 embarqué avec licence. Des bibliothèques et polices historiques restent sur CDN. Les Core Web Vitals doivent être mesurés sur le trafic réel.

Propositions : piège antispam et limitation par IP pseudonymisée ; CAPTCHA à envisager en cas d’abus. Journal paginé par 20, administration par 50. Carte : au maximum 500 lieux enregistrés en complément des lieux historiques.
