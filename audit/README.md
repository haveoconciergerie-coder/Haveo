# Audit du logement Haveo

Outil qui produit l'audit remis aux propriétaires après la visite : 15 à 16 slides aux couleurs Haveo. Tu remplis une fiche par bien, le script calcule toutes les notes, tous les totaux et tous les revenus, puis génère le deck.

## Principe

```
biens/<bien>.json  ──►  node generer.mjs  ──►  deck Slides (claude.ai) + aperçu + PDF
```

Même fonctionnement que l'étude de marché (`etude-de-marche/`). Un chiffre n'est calculé qu'une fois, puis réutilisé sur chaque slide : il ne peut plus y avoir deux montants différents pour la même chose.

## Créer l'audit d'un nouveau bien

Le plus simple, dans Claude Code :

> « Nouvel audit : T2 de 45 m² à Nice pour M. Dupont. Voici mes notes de visite, les photos et ses chiffres Airbnb. »

Claude copie `biens/boulogne-exemple.json`, remplit la fiche, lance le générateur, vérifie la mise en page et publie le deck.

À la main :

1. Pendant la visite, suivre `FICHE-VISITE.md`.
2. Copier `biens/boulogne-exemple.json` → `biens/<ville-bien>.json`, changer `slug` et vider `deck.url`.
3. Remplir la fiche (voir plus bas).
4. `node generer.mjs biens/<ville-bien>.json --verifier --pdf`
5. Relire `sortie/<slug>/apercu.html`, puis publier le dossier `sortie/<slug>/deck/` sur claude.ai.

## Ce qui est calculé tout seul

| Sur la slide | Calcul |
|---|---|
| Note « Le logement et son état » | Moyenne des notes des pièces × 10 (`"note": "pieces"`) |
| Note globale | Moyenne des critères, arrondie |
| Couleur des barres et des notes | Corail sous 60, doré de 60 à 69, vert à partir de 70 (`hypotheses.seuils`) |
| Situation actuelle | Revenus = prix × nuits ; occupation = nuits ÷ 30 ; écart de prix avec le marché |
| Total des équipements | Somme des budgets (une fourchette `[min, max]` ou un montant) |
| Plan d'action | Coût de chaque action, total à la charge du propriétaire, délai de remboursement |
| Revenus | Net = revenus − commission Haveo − plateforme − linge × nuits ; aujourd'hui sans commission |
| Gain | Net du scénario de référence − net actuel, par mois et par an |
| Pagination, nombre d'actions, d'équipements, de points réglementaires | Comptés dans la fiche |

### Coût d'une action du plan

| Dans la fiche | Effet |
|---|---|
| `"cout": "inclus"` | Inclus dans l'offre Haveo (0 €) |
| `"cout": 400` ou `[80, 250]` | Montant ou fourchette |
| `"cout": { "equipements": ["boite-cles"] }` | Reprend le budget de ces équipements |
| `"cout": { "equipements": "reste" }` | Tous les équipements que les autres actions ne citent pas |

Ainsi le plan d'action et la page Équipements donnent toujours le même total.

## Les slides

1. Couverture · 2. Synthèse (note globale, 8 critères, 3 priorités) · 3. Situation actuelle · 4. Le bien et son marché · 5. Visite pièce par pièce · 6. La visite en images · 7. L'annonce · 8. Équipements · 9. Expérience voyageur · 10. Prix et calendrier · 11. Avis, réactivité et visibilité · 12. Réglementation · 13. Plan d'action · 14. Revenus avant et après · 15. Services Haveo · 16. Et après l'audit ?

**Slides facultatives :**
- **Situation actuelle** : seulement si la fiche a un bloc `situation`. Pour un bien jamais loué, supprime ce bloc : la slide disparaît, le tableau des revenus ne montre que les scénarios et le gain est le net du scénario de référence. Pense alors à retirer les jetons `{prixActuel}`, `{note}`… des textes (le générateur te dit lesquels).
- **La visite en images** : les 3 premières pièces qui ont une `"photo"`. Sans photo, la slide disparaît.

## Les jetons dans les textes

Dans n'importe quel texte de la fiche, `{…}` est remplacé par la valeur calculée et `**…**` met une phrase en valeur.

| Jeton | Exemple |
|---|---|
| `{ville}` `{surface}` `{chambres}` `{sallesDeBain}` `{voyageurs}` | Boulogne-Billancourt · 95 · 3 · 2 · 6 |
| `{noteGlobale}` | 57 |
| `{prixActuel}` `{nuitsActuelles}` `{occActuelle}` `{caActuel}` `{netActuel}` | 260 € · 10 · 33 % · 2 600 € · 2 372 € |
| `{note}` `{noteCible}` `{nbAvis}` `{depuis}` | 4,62 · 4,85 · 38 · [18 mois] |
| `{ecartPrix}` `{hausseParNuit}` | 20 % · 80 € |
| `{prix.normal}` `{nuits.normal}` `{ca.normal}` `{net.normal}` `{netAn.normal}` | Par scénario (`prudent`, `normal`, `optimise`) |
| `{prixMoyenSegment}` `{occupationSegment}` `{libelleSegment}` | 325 € · 39 % · 3 chambres |
| `{totalEquip}` `{totalPlan}` `{totalEnviron}` | 830 à 1 000 € · 1 550 à 1 720 € · 1 600 € |
| `{gain}` `{gainEnviron}` `{gainAn}` `{remboursement}` | 1 083 € · 1 080 € · 13 000 € · en moins de deux mois |
| `{NbActionsMot}` `{NbManquantsMot}` `{NbPointsRegleMot}` | Huit · Six · Six (en minuscule : `{nbActionsMot}`…) |
| `{commission}` `{plateforme}` | 20 % · 3 % |

Un jeton mal orthographié arrête le générateur avec un message clair, plutôt que d'imprimer une coquille.

## Les contrôles

À chaque génération, le script signale :
- un titre d'annonce proposé de plus de 50 caractères ;
- une synthèse qui n'a pas exactement 3 priorités ;
- une note hors échelle ;
- des équipements manquants qu'aucune action du plan ne reprend ;
- un scénario de référence qui ne rapporte pas plus que la situation actuelle.

Avec `--verifier`, il ouvre l'aperçu dans un navigateur et signale tout texte qui déborde de la slide ou descend dans le pied de page.

## Contact

`contact.whatsapp` est le numéro affiché sur la dernière slide, `contact.whatsappLien` le lien WhatsApp Business qu'il ouvre. Sans lien, le numéro ouvre une conversation WhatsApp classique (wa.me).

## Photos

Chaque photo a deux sources : `blob` (l'image envoyée sur le deck claude.ai) et `fichier` (le fichier local, pour l'aperçu et le PDF). Sans `blob`, la slide affiche un cadre sable vide à la place de la photo.
