# Activer la rédaction DECORUM

Le code ne suffit pas à activer les fonctions privées. Aucun secret ne doit être ajouté à GitHub ou envoyé dans une conversation.

## Préparer

Conserver les règles Firestore actuelles et une sauvegarde des articles. Projet attendu : `decorum-collectiv`. Dans Firebase Authentication, relever l’UID du compte de rédaction existant.

Dans Vercel → projet DECORUM → Settings → Environment Variables, renseigner pour Production :

| Nom | Valeur |
|---|---|
| FIREBASE_SERVICE_ACCOUNT | JSON du compte de service Firebase, uniquement dans le champ sécurisé Vercel |
| DECORUM_ADMIN_UIDS | UID du compte de rédaction autorisé (virgules si plusieurs) |
| SITE_URL | https://decorum-collectiv.vercel.app |
| RATE_LIMIT_SECRET | Secret aléatoire d’au moins 32 octets |
| DECORUM_RULES_VERIFIED | false pendant la préparation |

Le compte de service doit accéder à Firestore et vérifier les comptes Firebase Auth ; limiter ses permissions à ces usages. Ne jamais exposer sa clé au navigateur. Redéployer après chaque modification d’environnement.

## Publier les règles

Publier `firestore.rules` dans Firebase Console → Firestore Database → Rules. Ces règles permettent la lecture publique des articles et interdisent toute écriture directe ainsi que la lecture des collections privées.

Pendant cette transition, l’ancien formulaire ne peut plus publier, mais le journal reste lisible. Dans le simulateur de règles, vérifier qu’un visiteur anonyme ET un compte simplement connecté ne peuvent ni lire `editorialArticles`/`submissions`, ni écrire dans `articles`. Vérifier la lecture publique d’un article.

## Activer et vérifier

Après ces vérifications, passer `DECORUM_RULES_VERIFIED` à `true` dans Vercel puis redéployer. `/api/editorial?action=health` doit répondre `ready: true` et `submissions: true`.

Se connecter sur `/admin.html` avec le compte autorisé. Vérifier un brouillon invisible au public, sa modification, le compte à rebours désactivé et les lieux. Tester les écritures avec un projet Firebase de test avant des contenus réels. La programmation se vérifie en ouvrant le journal après l’échéance. Ne publier aucun faux article sur le site public.

## Exploitation

Vercel : branche main, Node 24, installation npm ci, build node tools/build.cjs, sortie public. Les règles Firebase ne sont pas publiées automatiquement par Vercel.

Les contributions et emails restent privés ; prévoir leur suppression manuelle selon la durée de conservation retenue. Les documents `_rateLimits` expirés peuvent être nettoyés par maintenance : leur champ numérique expiresAt n’est pas un TTL Firestore. L’IP brute n’est pas stockée ; HMAC et limite de trois propositions par heure. Garder le secret stable pendant cette fenêtre.

Aucun abonnement payant, service email ou stockage externe n’est créé par le code. Un retour arrière applicatif se fait en restaurant un déploiement Vercel précédent. Ne jamais rouvrir les collections privées pour rétablir l’ancien formulaire.
