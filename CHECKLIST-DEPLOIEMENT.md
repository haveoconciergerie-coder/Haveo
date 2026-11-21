# Checklist post-deploiement Haveo

A faire une fois le site en ligne sur un hebergeur (GitHub Pages, Netlify, etc.)

## 1. Google Analytics — Mettre a jour l'URL
- Aller sur https://analytics.google.com
- Se connecter avec haveo.conciergerie@gmail.com
- Admin (en bas a gauche) → Flux de donnees → cliquer sur le flux web
- Remplacer l'URL par la vraie URL du site (ex: https://haveo-conciergerie.fr)
- L'ID de mesure est deja dans le code : G-SELVF2RX1X

## 2. FormSubmit — Confirmer l'email
- La premiere fois qu'un visiteur soumettra un formulaire (simulateur ou audit), FormSubmit enverra un email de confirmation a haveo.conciergerie@gmail.com
- Ouvrir cet email et cliquer sur le lien de verification
- Apres ca, toutes les soumissions arriveront automatiquement par email

## 3. HTTPS
- GitHub Pages active HTTPS automatiquement
- Si autre hebergeur, verifier que HTTPS est bien active

## 4. Nom de domaine (optionnel)
- Si tu achetes un domaine (ex: haveo-conciergerie.fr), configurer le DNS pour pointer vers l'hebergeur
- Mettre a jour l'URL dans Google Analytics (etape 1)
- Mettre a jour l'URL dans le flux web GA4

## 5. Mentions legales
Fait (20 novembre 2026) :
- [x] Editeur : James Withey, EI, Haveo Conciergerie, adresse, RCS Pontoise 132 816 141, TVA non applicable
- [x] Directeur de la publication : James Withey
- [x] Responsable du traitement (RGPD) : James Withey, EI, Haveo Conciergerie
- [x] Nature de l'activite : conciergerie, pas d'activite loi Hoguet
- [x] Mention Airbnb marque deposee
- [x] Section mediation de la consommation (art. L. 612-1)
- [x] Date de mise a jour

Reste a faire :
- [x] Section "Hebergement" completee : Cloudflare, Inc. (section 2)
- [ ] Completer les coordonnees du mediateur de la consommation (section 9)