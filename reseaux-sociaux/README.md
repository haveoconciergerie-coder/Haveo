# Réseaux sociaux Haveo

Outil qui produit les posts Instagram et Facebook : visuels 1080 × 1350, légendes, textes alternatifs, calendrier et aperçu du profil. Même principe que l'étude de marché et l'audit : tu ne modifies qu'une fiche, le script fait le reste.

## Principe

```
posts.json  ──►  node generer.mjs  ──►  sortie/visuels/*.png
                                        sortie/a-la-une/*.png
                                        sortie/legendes.md
                                        sortie/index.html   (aperçu du profil)
```

## Le code couleur

La couleur d'un post **n'est jamais choisie à la main** : elle vient de sa place dans `posts.json`, dans l'ordre de `reglages.couleurs` (corail, sable, vert, puis on recommence).

Sur le profil, le post le plus récent est en haut à gauche et chaque nouveau post pousse les autres d'une case. Avec 3 couleurs et 3 colonnes, chaque colonne garde une seule couleur, quel que soit le nombre de posts. L'aperçu (`sortie/index.html`) le montre : fais varier « Grille après le post n° ».

Pour garder la grille propre :
- ne supprime pas, n'archive pas et n'épingle pas de post (un post retiré décale toutes les couleurs) ;
- une vraie photo de logement prend sa place dans la suite comme les autres, avec le modèle `photo` : son cadre prend la couleur du tour ;
- publie 9 posts (3 lignes pleines) avant de faire connaître le compte.

## Ajouter un post

Le plus simple, dans Claude Code :

> « Nouveau post Instagram : photo du T2 rue de la Roquette, prêt à accueillir. Voici la photo. »

À la main : copier un bloc de `posts` dans `posts.json`, l'ajouter **à la fin**, changer `id`, `jour`, `contenu`, `legende`, `hashtags`, `alt`, puis `node generer.mjs`.

| Champ | Rôle |
|---|---|
| `modele` | `presentation`, `grille`, `etapes`, `checklist`, `offre`, `liste`, `methode`, `estimation`, `zone`, `photo` |
| `jour` | Nombre de jours après `reglages.lancement` (la date est calculée) |
| `contenu.titre` | `\n` = retour à la ligne, `**…**` = partie en couleur, le point final devient le point du logo |
| `legende` | Une ligne par élément, `""` pour une ligne vide. La 1re ligne est l'accroche : moins de 125 caractères, c'est tout ce qu'on voit avant « … plus » |
| `hashtags` | Sans `#`, 5 au maximum. Facebook garde les 2 premiers |
| `alt` | Texte alternatif (Instagram : Paramètres avancés › Accessibilité) |
| `contrat` | Articles du contrat qui justifient le post. Jamais publié |
| `statut` | Absent = prêt. `proposition` = à valider. `exemple` = modèle, à ne pas publier |

### Jetons dans les légendes

| Jeton | Instagram | Facebook |
|---|---|---|
| `{lien}` | lien en bio | `profil.lien` |
| `{finOffre}` | vide, ou « et jusqu'au … » si `reglages.finOffre` est rempli | idem |
| `{zone}` | `reglages.zone` | idem |

## Les contrôles

À chaque génération, le script arrête tout si :
- un mot de `reglages.motsInterdits` apparaît (gestion locative, mandat, piloter, garanti, 7j/7…) ;
- un post a plus de 5 hashtags, une légende dépasse 2 200 caractères, la bio dépasse 150 caractères ;
- un jeton, un modèle ou une icône est inconnu.

Il signale aussi : une accroche de plus de 125 caractères, un texte entre crochets à compléter, un texte qui déborde du visuel ou qui est trop près du bord (la grille recadre en 3:4), une police qui ne s'est pas chargée.

## Icônes

`camera`, `key`, `bed`, `message`, `chart`, `filecheck`, `user`, `euro`, `sliders`, `calendar`, `search`, `filetext`, `house`, `bell`, `check`, `arrow`, `gift`, `mappin`.

## Prérequis

Node 18 ou plus, Playwright (`npm i -g playwright`) et une connexion pour la police Plus Jakarta Sans. Les logos viennent de `brand/logo/`.
