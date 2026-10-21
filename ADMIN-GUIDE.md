# Le panneau de rédaction LATENCE

Le tableau de bord récapitule les articles publiés, brouillons et programmations. Les prochaines publications sont classées par date. Les heures suivent le fuseau du navigateur ; une publication programmée devient publique à la première consultation du site après l'heure prévue.

## Retrouver et organiser

Les rubriques Articles et Brouillons proposent une recherche sans distinction d'accents, des filtres, un tri et des pages de vingt résultats. La recherche porte sur toute la rubrique chargée. Les listes d'articles chargent leurs métadonnées ; le texte et les images sont récupérés à l'ouverture de l'éditeur ou lors d'un export.

« Dupliquer » ouvre une copie privée à enregistrer. Le numéro d'édition et l'association au lieu sont vidés volontairement. « Voir » ouvre l'article public dans un autre onglet. « Copier le lien » copie son adresse. L'export JSON contient les données complètes de la rubrique sélectionnée ; ce téléchargement n'est pas une sauvegarde complète de Firebase et il n'existe pas de fonction de réimportation.

## Rédiger

Les boutons de mise en forme insèrent des balises HTML autour de la sélection : intertitre, paragraphe, gras, italique, citation et liste. L'aperçu affiche le texte, la photographie, la signature, la fiche technique et les informations de visite. Il reste indicatif et ne constitue pas un aperçu PDF.

Le compteur indique le nombre de mots et une durée estimée de lecture. Les indicateurs signalent les champs à compléter. Le panneau SEO affiche le titre et la description avec leurs longueurs ; ce sont des repères éditoriaux et non une garantie du rendu des moteurs de recherche.

« Proposer le prochain numéro » suggère un numéro supérieur à ceux présents dans les articles et brouillons. Il est modifiable et n'est pas réservé : deux rédacteurs simultanés doivent coordonner leur numérotation.

Ctrl+S (ou Cmd+S) enregistre le formulaire actif selon le statut sélectionné. Il peut donc publier si le statut est « Publier maintenant ». Les boutons restent accessibles en bas de l'éditeur. Il n'y a pas d'enregistrement automatique : l'alerte de sortie protège la saisie pendant la navigation mais ne remplace pas l'enregistrement.

## Associations et lieux

Choisir les articles et lieux associés dans les listes par leur nom. Le compte à rebours permet de choisir un article publié ou un brouillon ; son lien public reste masqué tant que l'article n'est pas publié. Les associations historiques sont conservées ; la gestion des lieux n’est plus exposée dans la navigation LATENCE.

## Vérification locale

`node tools/admin-preview.cjs` démarre un panneau avec des données fictives sur `http://127.0.0.1:4175`. Il ne se connecte pas à Firebase. Les modifications simulées disparaissent au rechargement. Cette page de test n'est pas copiée par le build public.


## Choisir une publication

Dans Articles → Nouvel article (ou Tableau de bord → Écrire un article), choisissez la **Rubrique du site** : À l’usage, Le regard, Sélection ou L’essentiel. Ce choix détermine la page de rubrique où la publication apparaît. Choisissez ensuite le **Type de publication** : Article, Analyse, Interview, Reportage, Portrait, Portfolio ou Chronique. « Autre format / format existant » permet de conserver ou saisir un format personnalisé. Les anciennes catégories et les anciens formats ne sont pas modifiés automatiquement. Le statut contrôle indépendamment le brouillon, la programmation et la publication. Une rubrique est demandée avant publication ; un brouillon peut rester sans rubrique.

## LATENCE : rédaction et archives

Source / référence et Image légendée ajoutent des liens, légendes et crédits. Les repères produits sont facultatifs. Les anciens champs architecturaux et de visite sont repliés, sans supprimer leurs valeurs. Les outils de lieux et propositions historiques ne figurent plus dans la navigation principale.

## Nouveaux outils de rédaction

- **Toutes les publications** rassemble les versions en ligne et les versions de travail, même lorsqu’elles partagent le même identifiant. Combiner recherche, statut, rubrique et format ; trier par titre ou date de modification. Les résultats sont paginés par quinze versions.
- **Calendrier** affiche les publications en ligne à leur date de publication et les programmations à leur échéance, dans le fuseau du navigateur. Navigation par mois et retour à aujourd’hui. Sur téléphone, les jours du mois sont présentés en liste.
- Le tableau de bord présente la répartition des publications dans les quatre rubriques et les cinq dernières versions modifiées.
- **Modèle de rédaction** fournit une structure vide pour un essai à l’usage, une analyse, une sélection, un décryptage ou un entretien. Le modèle choisit la rubrique et le format. Il demande confirmation avant de remplacer un texte existant ; les autres informations sont conservées.
- **Contrôles de publication** signale les informations présentes ou à compléter : titre, rubrique, auteur, chapeau, texte, image, description, crédit, intertitres et date future. Ces repères ne remplacent pas la relecture et la vérification des sources.
- **Récupération locale** conserve les saisies dans sessionStorage, par compte et publication, dans cet onglet. Après rechargement, ouvrir la même publication (ou Nouvelle publication pour un texte neuf), puis choisir Récupérer en brouillon. La récupération ne publie jamais : le statut revient à Brouillon et la programmation est vidée. Un message avertit si la version du serveur a changé. La copie est effacée après enregistrement réussi ou déconnexion ; elle peut disparaître à la fermeture de l’onglet. Si le stockage est plein ou interdit, le panneau le signale. Cette protection ne remplace pas un brouillon enregistré sur le serveur.
- **Exporter ce travail (JSON)** télécharge les valeurs du formulaire courant, y compris avant enregistrement. Il n’y a pas de réimport automatique.

Validation : npm test ; npm run build ; node tools/verify-admin.cjs avec Playwright disponible. Les tests de parcours utilisent exclusivement des données locales fictives, jamais la base de production.
