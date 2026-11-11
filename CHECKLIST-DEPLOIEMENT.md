# Checklist post-deploiement Haveo

A faire une fois le site en ligne sur un hebergeur (GitHub Pages, Netlify, etc.)

## 1. Google Analytics — Mettre a jour l'URL
- Aller sur https://analytics.google.com
- Se connecter avec haveo.conciergerie@gmail.com
- Admin (en bas a gauche) → Flux de donnees → cliquer sur le flux web
- Remplacer l'URL par la vraie URL du site (ex: https://haveo.fr)
- L'ID de mesure est deja dans le code : G-SELVF2RX1X

## 2. FormSubmit — Confirmer l'email
- La premiere fois qu'un visiteur soumettra un formulaire (simulateur ou audit), FormSubmit enverra un email de confirmation a haveo.conciergerie@gmail.com
- Ouvrir cet email et cliquer sur le lien de verification
- Apres ca, toutes les soumissions arriveront automatiquement par email

## 3. HTTPS
- GitHub Pages active HTTPS automatiquement
- Si autre hebergeur, verifier que HTTPS est bien active

## 4. Nom de domaine (optionnel)
- Si tu achetes un domaine (ex: haveo.fr), configurer le DNS pour pointer vers l'hebergeur
- Mettre a jour l'URL dans Google Analytics (etape 1)
- Mettre a jour l'URL dans le flux web GA4

## 5. Mentions legales — Completer avec la micro-entreprise
Une fois la micro-entreprise creee, mettre a jour le fichier `mentions-legales.html` :
- Section "1. Editeur du site" : ajouter le nom complet du representant legal
- Ajouter le nom de la micro-entreprise (raison sociale)
- Ajouter le numero SIRET
- Ajouter l'adresse du siege social
- Section "2. Hebergement" : completer avec le nom et l'adresse de l'hebergeur (ex: GitHub Pages, Netlify, OVH...)
- Mettre a jour la date de derniere mise a jour en haut de la page