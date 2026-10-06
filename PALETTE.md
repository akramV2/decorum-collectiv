# DECORUM — palette confirmée le 6 octobre 2026

Noir #000000, blanc #FFFAFA, anthracite #2D2D2D, violet #BF00FF, vert #2CFF05. Les noms `--color-brown-red` et `--color-orange` sont conservés tels que demandés ; leurs valeurs sont bien anthracite et violet. Les composants utilisent les rôles sémantiques `--color-editorial` et `--color-accent-primary`.

Le noir et le blanc structurent la page. L'anthracite sert aux zones éditoriales et aux liens. Le violet souligne les liens, le logo et quelques interactions ; le vert est limité à la progression de lecture, au repère du prochain article et au survol des marqueurs de carte. Aucun grand fond vert.

Contrastes WCAG calculés : noir/violet 4,66:1 ; noir/vert 15,41:1 ; violet/blanc 4,36:1 ; vert/blanc 1,32:1. Les deux derniers couples sont exclus des petits textes. Les boutons violets portent du texte noir. Les textes sur fonds sombres sont clairs, jamais anthracite. Les gris intermédiaires sont réservés aux surfaces et bordures.

Les anciennes variables sont maintenues comme alias pour les templates et contenus existants. Les illustrations vectorielles conservent leurs formes ; leurs aplats suivent les nouvelles variables. Les PDF emploient des couleurs centralisées dans `lib/pdf.cjs`, avec le violet réservé au grand masthead.

Cette livraison traite la direction colorimétrique ; elle ne constitue pas la refonte éditoriale complète décrite dans le document de référence. Pas de migration de données ni de changement de catégories.
