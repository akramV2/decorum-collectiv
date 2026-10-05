# Le panneau de rédaction DECORUM

Le tableau de bord récapitule les articles publiés, brouillons, programmations, lieux et propositions à examiner. Les prochaines publications sont classées par date. Les heures suivent le fuseau du navigateur ; une publication programmée devient publique à la première consultation du site après l'heure prévue.

## Retrouver et organiser

Les rubriques Articles, Brouillons, Lieux et Propositions proposent une recherche sans distinction d'accents, des filtres, un tri et des pages de vingt résultats. La recherche porte sur toute la rubrique chargée. Les listes d'articles chargent leurs métadonnées ; le texte et les images sont récupérés à l'ouverture de l'éditeur ou lors d'un export.

« Dupliquer » ouvre une copie privée à enregistrer. Le numéro d'édition et l'association au lieu sont vidés volontairement. « Voir » ouvre l'article public dans un autre onglet. « Copier le lien » copie son adresse. L'export JSON contient les données complètes de la rubrique sélectionnée ; ce téléchargement n'est pas une sauvegarde complète de Firebase et il n'existe pas de fonction de réimportation.

## Rédiger

Les boutons de mise en forme insèrent des balises HTML autour de la sélection : intertitre, paragraphe, gras, italique, citation et liste. L'aperçu affiche le texte, la photographie, la signature, la fiche technique et les informations de visite. Il reste indicatif et ne constitue pas un aperçu PDF.

Le compteur indique le nombre de mots et une durée estimée de lecture. Les indicateurs signalent les champs à compléter. Le panneau SEO affiche le titre et la description avec leurs longueurs ; ce sont des repères éditoriaux et non une garantie du rendu des moteurs de recherche.

« Proposer le prochain numéro » suggère un numéro supérieur à ceux présents dans les articles et brouillons. Il est modifiable et n'est pas réservé : deux rédacteurs simultanés doivent coordonner leur numérotation.

Ctrl+S (ou Cmd+S) enregistre le formulaire actif selon le statut sélectionné. Il peut donc publier si le statut est « Publier maintenant ». Les boutons restent accessibles en bas de l'éditeur. Il n'y a pas d'enregistrement automatique : l'alerte de sortie protège la saisie pendant la navigation mais ne remplace pas l'enregistrement.

## Associations et lieux

Choisir les articles et lieux associés dans les listes par leur nom. Le compte à rebours permet de choisir un article publié ou un brouillon ; son lien public reste masqué tant que l'article n'est pas publié. Les lieux retirés restent disponibles avec le filtre correspondant et peuvent être restaurés.

## Vérification locale

`node tools/admin-preview.cjs` démarre un panneau avec des données fictives sur `http://127.0.0.1:4175`. Il ne se connecte pas à Firebase. Les modifications simulées disparaissent au rechargement. Cette page de test n'est pas copiée par le build public.
