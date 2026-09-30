# DECORUM — Audit initial et plan de développement

29 septembre 2026. Référence confirmée par le propriétaire : [akramV2/decorum-collectiv](https://github.com/akramV2/decorum-collectiv), branche main, commit `e1a1fc5089bdb4b1997fb466b424e6d6d177cd16`.

## Périmètre et limites

Lecture des sept fichiers texte du dépôt, inventaire des deux PNG, inspection du site Vercel en navigateur, lecture d'un article public, inventaire du kit graphique et inspection d'un modèle visuel. Le dossier local Desktop/DECORUM.COLL/SITE est une version antérieure distincte : il n'est pas utilisé pour les modifications.

L'audit couvre l'intégralité du code présent dans ce dépôt. Il ne constitue pas un audit complet de l'infrastructure Firebase : les règles effectivement déployées, comptes, rôles, index, sauvegardes, fonctions éventuelles hors dépôt et configuration Vercel ne sont pas accessibles dans les fichiers. Deux articles sont visibles sur l'accueil ; ce constat ne prouve pas que la base contient seulement deux documents. Aucune écriture ou suppression n'a été effectuée dans la base de production.

## 1. Architecture actuelle

```text
index.html          Accueil, journal, carte, manifeste, contact
article.html        Gabarit d'article chargé via ?id=IDENTIFIANT
admin.html          Connexion et formulaire de publication
script.js           Firebase, rendu des articles, carte, likes, interactions
style.css           Charte, composants, administration et adaptations mobiles
manifest.json       Métadonnées d'installation de l'application web
logo.svg            Symbole géométrique bleu/corail
illustration 1.png   Asset raster
illustration 2.png   Asset raster
```

Pas de framework, gestionnaire de paquets, compilation, serveur applicatif ou suite de tests dans la version initiale. Le dépôt renseigne `https://decorum-collectiv.vercel.app` comme site ; son contenu a été observé en ligne. Aucune configuration de déploiement n'est versionnée.

Le backend existant est Firebase : Firestore pour la collection `articles`, Firebase Authentication pour la connexion email/mot de passe. Le navigateur lit et écrit directement dans Firestore. La configuration cliente Firebase est publique par conception ; elle ne remplace pas les règles d'autorisation.

Schéma déduit du code : `title`, `type`, `category`, `author`, `image`, `excerpt`, `content`, `likes`, `date` (texte français), `createdAt` (horodatage serveur). Il s'agit d'un schéma implicite, pas d'un inventaire de tous les documents.

Les bibliothèques sont chargées depuis des CDN : Firebase compat 10.8.0, DOMPurify 3.0.8, Leaflet 1.9.4, Lenis 1.1.18. Les polices proviennent de Google Fonts. Aucun backend propriétaire à remplacer : conserver HTML/CSS/JS et Firebase est raisonnable.

## 2. Identité graphique

Le ZIP contient des logos vectoriels et raster, avatars, quatre familles d'icônes, illustrations et modèles Instagram. Le fichier LISEZ-MOI fournit :

| Élément | Référence |
|---|---|
| Bleu | #2A38F5 |
| Corail | #FF5A3C |
| Citron | #FFE14D |
| Encre | #111114 |
| Papier | #F5F3EE |
| Titres | Bricolage Grotesque |
| Texte | Schibsted Grotesk |

Les couleurs et les deux polices sont déjà intégrées. La page article ajoute quatre autres familles (Inter, Lora, Space Grotesk, Plus Jakarta Sans). Cette surcharge mérite une décision éditoriale ultérieure : consolider les styles sans changer brusquement la lecture actuelle. Le modèle Instagram confirme une composition généreuse en blanc, des titres massifs et un filet éditorial. Il fournit une référence graphique, pas des instructions d'exécution.

## 3. Problèmes techniques prioritaires

| Priorité | Constat initial | Conséquence |
|---|---|---|
| Haute | `script.js` chargé deux fois sur l'accueil | Erreur réelle en production : `Identifier 'firebaseConfig' has already been declared` |
| Haute | Métadonnées des articles interpolées dans `innerHTML` | Des valeurs malveillantes pourraient injecter du HTML dans les cartes ou l'administration |
| Haute | Contenu HTML brut utilisé si DOMPurify manque | Une panne CDN retire la protection au lieu de conserver un affichage sûr |
| Haute | Règles Firestore absentes du dépôt | Impossible de confirmer les droits d'écriture, la confidentialité et les protections serveur |
| Haute | Tout utilisateur connecté voit les commandes d'administration | Le rôle de rédacteur n'est pas vérifié dans l'interface ; les autorisations réelles dépendent des règles |
| Haute | Import jusqu'à 2 Mo, puis Base64 dans le document | Incompatible avec la limite Firestore de 1 Mio pour l'ensemble du document ; transferts inutilement lourds |
| Haute | Bouton de confirmation de l'aperçu contourne la validation native | Publication possible de champs incomplets ; doubles envois possibles |
| Moyenne | Lecture d'article déclenchée deux fois | Requêtes et écouteurs de progression redondants |
| Moyenne | Les erreurs de lecture sont converties en liste vide | Une panne apparaît comme une absence d'articles |
| Moyenne | Journal et administration limités aux 20 derniers documents | Les articles plus anciens n'ont pas de navigation/pagination dans ces listes |
| Moyenne | Likes modifiés directement, dédoublonnage seulement par localStorage | Protection contre les abus insuffisante côté client ; règles serveur à examiner |
| Moyenne | Documents sans `createdAt` exclus par la requête triée | Risque à contrôler avant toute migration de contenus anciens |
| Moyenne | Cartes cliquables uniquement via `onclick` | Navigation clavier et découverte des liens moins bonnes |
| Moyenne | Grilles à largeur minimale fixe et email long | Risques de débordement sur petits écrans |
| Moyenne | Absence de titres/aperçus sociaux propres à chaque article dans le HTML initial | Le titre est changé après lecture Firebase, ce qui ne suffit pas aux robots de partage |
| Basse | Balise body manquante sur l'accueil, fermeture div superflue dans l'article | HTML réparé implicitement par le navigateur |

La limite des documents est vérifiée dans la [documentation Firebase](https://firebase.google.com/docs/firestore/quotas). Les contrôles d'accès doivent être imposés par les [règles Firestore](https://firebase.google.com/docs/firestore/security/rules-conditions), pas par le masquage des boutons. Les versions CDN devront être examinées et mises à jour avec des tests de compatibilité ; aucune conclusion exhaustive sur leurs vulnérabilités n'est donnée ici.

## 4. Fonctionnalités demandées : état réel

| Demande | Existe déjà | Travail nécessaire |
|---|---|---|
| Compte à rebours | Non | Réglage éditorial activable, teaser, date, article associé, traitement de l'expiration |
| Fiche technique | Non | Neuf champs facultatifs, édition et emplacement stable dans les articles |
| Informations de visite | Non | Adresse, horaires, tarifs, accès, URL officielle, coordonnées, lien carte |
| PDF à emporter | Non | Gabarit imprimable et véritable génération PDF automatisée |
| Proposer un lieu | Non | Formulaire, stockage privé, modération et contrôles anti-spam serveur |
| Carte | Oui | Leaflet/OpenStreetMap, 20 lieux codés en dur ; aucun lien article ni gestion admin |
| Administration | Partielle | Connexion, création, aperçu, liste et suppression ; édition, brouillons et programmation absents |
| Auteurs et catégories | Champs libres | Référentiels administrables sans casser les anciennes valeurs |
| SEO | Partiel | Titre/description d'accueil, langue et viewport ; OG, X cards, canonical, sitemap, robots et JSON-LD absents |
| Performance | Partielle | JS différé, images des cartes lazy ; pas de variantes d'images, budgets ni mesures CWV |
| Responsive | Partiel | Menu mobile et colonnes adaptées à 768 px ; composition à affiner et parcours admin à éprouver |

Le manifest ne suffit pas à établir une application hors ligne : aucun service worker n'est présent.

## 5. Plan d'implémentation

### Étape 1 — Stabiliser l'existant

Éliminer les doubles initialisations, sécuriser les sorties, traiter les pannes explicitement, fiabiliser la publication, corriger les débordements et introduire des tests ciblés. Cette étape est commencée dans la copie locale décrite ci-dessous.

### Étape 2 — Définir les données, les droits et les médias

Récupérer les règles/index Firebase et la configuration d'hébergement ; sauvegarder avant migration. Ajouter un rôle de rédaction contrôlé côté serveur, des tests d'émulateur et des règles versionnées. Migrer les images vers un stockage objet avec limites de taille/type, dimensions et variantes, sans supprimer les anciennes images avant contrôle.

Conserver les identifiants et URL `article.html?id=…`. Introduire progressivement :

| Collection proposée | Contenu et visibilité |
|---|---|
| `articles` | Publications publiques compatibles avec l'existant, slug, SEO, relations, dates normalisées |
| `editorialArticles` | Brouillons et versions programmées privés, accès rédaction uniquement |
| `authors` | Nom, biographie, portrait et identifiant |
| `categories` | Libellé, slug et ordre |
| `places` | Bâtiment, architecte, localisation, photos, visite, articles associés |
| `submissions` | Propositions privées, email privé et statuts de modération |
| `settings/nextPublication` | Activation, titre, teaser, échéance et référence éventuelle |

Cette séparation protège les brouillons sans exposer leur texte à une requête publique. La publication programmée doit être exécutée par un processus serveur idempotent ; l'horloge du visiteur ne doit jamais autoriser l'accès. Les horaires seront stockés en UTC, saisis avec un fuseau explicite (Europe/Paris par défaut), avec traitement des changements d'heure.

### Étape 3 — Enrichir le travail éditorial

Ajouter l'édition d'articles, brouillons, pagination, auteurs et catégories, SEO, fiche technique et informations de visite. Prévoir une migration tolérante aux anciens documents et des validations serveur. Afficher la fiche technique après le chapeau, avant le corps ; placer la visite en fin d'article. Les champs vides ne génèrent aucune ligne.

Ajouter le bloc « Prochain article — Jeudi ». À l'échéance, actualiser l'état publié auprès du serveur : afficher le lien uniquement si l'article est effectivement public, sinon « Publication imminente ». Arrêter le minuteur et empêcher les valeurs négatives. Aucun identifiant de brouillon ne doit donner accès à son contenu.

### Étape 4 — Relier les lieux et les contributions

Migrer les 20 lieux vers un référentiel sans les perdre. Relier articles, fiches et informations de visite. Ajouter une liste accessible en complément de la carte et un chargement différé des tuiles.

Le formulaire recueillera les champs demandés ; les emails seront réservés à la modération. Statuts : À examiner, Acceptée, Refusée, Ajoutée à la carte. Vérifier les transitions et rendre l'ajout à la carte idempotent. Anti-spam : validation serveur, limitation de débit, protection d'intégrité/App Check adaptée au déploiement, piège à robots en complément, limites d'upload. Une protection JavaScript seule n'est pas suffisante. Préciser l'information des contributeurs et la durée de conservation avec le propriétaire.

### Étape 5 — Diffusion, PDF, performances et finition

Conserver Vercel/Firebase si leur configuration le permet. Produire un HTML public propre à chaque article, à la publication ou côté serveur, avec title, description, OG, X cards et canonical présents avant JavaScript. Définir le domaine canonique, maintenir les anciennes URL, générer sitemap et robots. JSON-LD Article et Person, Place/TouristAttraction selon le bâtiment ; vérifier les types réellement reconnus avant d'utiliser ArchitecturalStructure.

Produire les PDF depuis les seules versions publiées, via un gabarit éditorial réutilisable et un moteur de rendu serveur. Prévoir une ouverture en double page, puis autant de pages que le texte l'exige : ne pas tronquer un long article pour tenir sur deux pages. Inclure titre, auteur, images/crédits, texte, fiche, date et numéro d'édition administrable. Mettre le PDF en cache par révision. Tester le français, la sélection de texte, les sauts de page, les images et l'impression.

Mesurer LCP, CLS et INP sur des données représentatives avant/après ; optimiser les images, réserver leurs dimensions, réduire les polices et différer la carte. Valider ordinateur, tablette et téléphone, clavier, réduction des animations et états d'erreur. Aucun score Lighthouse ou résultat CWV n'a été inventé dans cet audit.

## 6. Première étape réalisée localement

Branche : `codex/fondations-editoriales`. Aucun push ni déploiement.

- Script chargé une fois sur l'accueil ; une seule initialisation de la page article.
- Métadonnées échappées et liens de cartes accessibles ; identifiant Firestore non remplaçable par une propriété du document.
- Images créées via le DOM et protocoles filtrés ; HTML rendu comme texte si le filtre est indisponible.
- Aperçu et lecture partagent la même logique de formatage du contenu.
- Validation du formulaire également depuis l'aperçu, protection contre double envoi et restitution des erreurs.
- Import raster limité provisoirement à 500 Ko, avec garde de 900 000 octets sur la charge sérialisée. Cette marge est une précaution cliente, pas le calcul exact de taille Firestore ni un substitut au futur stockage objet.
- Erreurs de lecture distinctes d'une liste vide ; états article absent/indisponible.
- Grilles adaptatives, email sécable, menu avec état ARIA et fermeture Échap, réduction des animations, administration noindex.
- Suite de tests Node sans dépendance ajoutée.

Les nouvelles fonctions éditoriales restent à implémenter selon les étapes 2 à 5. Les règles Firebase et les dépendances CDN ne sont pas déclarées sécurisées par ces corrections clientes.

## 7. Validation

`node --test tests/foundations.test.cjs` : 11 tests réussis. Vérification syntaxique du JavaScript et des scripts inline ; `git diff --check` réussi.

Navigateur local : deux articles publics chargés, 20 marqueurs préservés, aucune erreur console à l'accueil lors du contrôle. Largeurs 320, 768 et 1440 px : pas de débordement horizontal du document observé. Menu ouvert puis fermé par Échap : aria-expanded passe de true à false. Les écritures de publication sont testées avec des doubles de test ; la connexion administrateur et les écritures réelles ne sont pas testées sur la production.

La prochaine étape nécessitera les règles Firebase réellement déployées et l'accès à une configuration de test pour vérifier les droits, les migrations, le stockage et le processus de publication. Ne pas créer de brouillons sensibles dans la collection publique actuelle avant ces contrôles.
