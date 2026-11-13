# Étude de marché Haveo

Outil qui produit l'étude de rentabilité remise aux propriétaires : 12 slides aux couleurs Haveo, chiffres calculés automatiquement à partir d'une fiche par bien.

## Principe

```
biens/<bien>.json  ──►  node generer.mjs  ──►  deck Slides (claude.ai) + aperçu + PDF
```

Tu ne remplis **que la fiche du bien**. Tous les montants (CA, frais, net, net annuel, taux d'occupation, comparaison longue durée, fourchettes arrondies) sont calculés une seule fois puis réutilisés sur chaque slide : un chiffre ne peut plus être différent d'une page à l'autre.

## Créer l'étude d'un nouveau bien

Le plus simple, dans Claude Code :

> « Nouvelle étude de marché : T2 de 45 m² à Nice, quartier du port, 4 voyageurs, pour M. Dupont. Voici les photos. »

Claude copie `biens/boulogne-exemple.json`, adapte les textes, cherche les données du marché, lance le générateur et publie le deck.

À la main :

1. Copier `biens/boulogne-exemple.json` → `biens/<ville-bien>.json` et changer `slug`.
2. Remplir `bien`, `marche` (données AirROI / loyer au m²), `hypotheses` et les 3 `scenarios` (prix et nuits par mois).
3. Adapter les `textes` (localisation, caractéristiques, atouts…).
4. `node generer.mjs biens/<ville-bien>.json --pdf`
5. Ouvrir `sortie/<slug>/apercu.html` pour relire, puis publier le dossier `sortie/<slug>/deck/` sur claude.ai.

## Les jetons dans les textes

Dans n'importe quel texte de la fiche, `{…}` est remplacé par la valeur calculée, et `**…**` met une phrase en valeur.

| Jeton | Exemple | |
|---|---|---|
| `{ville}` `{quartier}` `{surface}` `{voyageurs}` | Boulogne-Billancourt | Fiche du bien |
| `{prix.normal}` `{nuits.normal}` `{occ.normal}` | 340 € · 14 · 47 % | Par scénario (`prudent`, `normal`, `optimise`) |
| `{ca.normal}` `{net.normal}` `{netAn.normal}` | 4 760 € · 3 455 € · 41 462 € | Par scénario |
| `{netEnviron.prudent}` | 2 600 € | Net arrondi à la centaine |
| `{ratio.normal}` | 1,2 | Net ÷ loyer longue durée |
| `{loyerLD}` `{loyerM2}` | 2 860 € · 30,10 € | Longue durée |
| `{prixMoyenSegment}` `{prixMoyenTous}` | 325 € · 178 € | Marché |
| `{occupationSegment}` `{occupationPic}` `{moisPic}` | 39 % · 56 % · juin 2026 | Marché |
| `{commission}` `{plateforme}` | 20 % · 3 % | Hypothèses |
| `{nuitsEquivalent}` | 27 | Nuits à prix moyen pour égaler le CA du scénario de référence |

Un jeton mal orthographié arrête le générateur avec un message clair, plutôt que d'imprimer une coquille.

## Formules

```
CA        = prix × nuits
Net       = CA − commission Haveo % − plateforme % − linge (€/nuit × nuits)
Net/an    = Net × 12
Occupation= nuits ÷ 30
Loyer LD  = surface × loyer au m²
Ratio     = Net ÷ Loyer LD
```

## Les 12 slides

1. Couverture · 2. Synthèse (chiffres clés + graphique des scénarios) · 3. Localisation · 4. Le bien · 5. Atouts · 6. Prix par nuit (échelle de positionnement + grille) · 7. Taux d'occupation · 8. Estimation mensuelle (répartition de 100 € encaissés) · 9. Trois scénarios · 10. Courte contre longue durée + cadre légal · 11. L'accompagnement Haveo · 12. Conclusion

## Photos

Chaque photo de la fiche a deux sources : `blob` (l'image envoyée sur le deck claude.ai) et `fichier` (le fichier local utilisé pour l'aperçu et le PDF). Sans `blob`, la slide affiche un cadre sable vide à l'emplacement de la photo.
