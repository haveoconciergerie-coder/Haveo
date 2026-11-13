#!/usr/bin/env node
// ============================================================
// HAVEO — Générateur des posts Instagram et Facebook
// ------------------------------------------------------------
// Une fiche (posts.json) → tout le reste est produit ici :
//   sortie/visuels/haveo-NN-<id>.png   visuels 1080 × 1350 (format 4:5)
//   sortie/a-la-une/haveo-une-<x>.png  couvertures des stories à la une
//   sortie/legendes.md                 calendrier, bio, légendes IG + FB
//   sortie/index.html                  aperçu : profil, grille, légendes
//
// La couleur de fond n'est jamais choisie à la main : elle vient de
// la place du post dans la série (corail, sable, vert, et on recommence).
// Déplacer un post dans la fiche = il prend la couleur de sa nouvelle place.
//
// Usage : node generer.mjs [posts.json] [--sans-images]
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '..');
const LOGOS = path.join(RACINE, 'brand', 'logo');

// ---------- Palette Haveo (identique au site) ----------
const C = {
  vert: '#0F4C4C', encre: '#0B3A3A', corail: '#F26B5B', corailFonce: '#D9503F',
  sable: '#F4EBDD', creme: '#FBF6EE', papier: '#FFFDF9', or: '#E8B04A', sourd: '#47706F',
};
const POLICE = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap';
const THEME = { corail: 'coral', sable: 'sand', vert: 'green' };
const NOM_COULEUR = { corail: 'Corail', sable: 'Beige', vert: 'Vert' };
const HEX_COULEUR = { corail: C.corail, sable: C.sable, vert: C.vert };

// ---------- Icônes (Lucide, un seul trait) ----------
const I = {
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  key: '<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>',
  bed: '<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 8H7"/><path d="M17 12H7"/>',
  chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  filecheck: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  euro: '<path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/>',
  sliders: '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  filetext: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  house: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
  mappin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  whatsapp: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M9.5 9.5c.3 1.6 1.4 3.4 3 4.5l1.1-1.1 2 .9-.4 1.6c-3.2.3-6.4-2.9-6.6-6.3l1.6-.4.9 2z"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
};
const ic = (n, s = 30, w = 1.75) => {
  if (!I[n]) throw new Error(`Icône inconnue : « ${n} ». Icônes disponibles : ${Object.keys(I).join(', ')}`);
  return `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;
};

// ---------- Petits outils ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const NBSP = '\u00a0';
// Espaces insécables devant ; : ? ! € % et après « (typographie française)
const typo = (s) => s.replace(/ ([;:?!€%»])/g, NBSP + '$1').replace(/« /g, '«' + NBSP)
  .replace(/\b(0\d)((?: \d{2}){4})\b/g, (m) => m.replace(/ /g, NBSP)); // numéro de téléphone jamais coupé
const pad2 = (n) => String(n).padStart(2, '0');
const logo = (nom) => fs.readFileSync(path.join(LOGOS, nom), 'utf8');

// Titre : \n = retour à la ligne, **…** = mise en couleur, point final = point du logo
function titre(s) {
  return s.split('\n').map((ligne) => {
    let h = esc(typo(ligne)).replace(/\*\*(.+?)\*\*/g, '<span class="hl">$1</span>');
    h = h.replace(/\.(<\/span>)?$/, '<span class="dot">.</span>$1');
    return h;
  }).join('<br>');
}
const texte = (s) => esc(typo(s)).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');

// ============================================================
// 1. LECTURE ET PRÉPARATION DE LA FICHE
// ============================================================
const args = process.argv.slice(2);
const fichierFiche = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(ICI, 'posts.json'));
const SANS_IMAGES = args.includes('--sans-images');
const d = JSON.parse(fs.readFileSync(fichierFiche, 'utf8'));
const R = d.reglages;
const SORTIE = path.join(ICI, 'sortie');

const avertissements = [];
const erreurs = [];
const warn = (m) => avertissements.push(m);
const err = (m) => erreurs.push(m);

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
function datePost(jour) {
  const t = new Date(R.lancement + 'T12:00:00Z');
  t.setUTCDate(t.getUTCDate() + jour);
  return { iso: t.toISOString().slice(0, 10), texte: `${JOURS[t.getUTCDay()]} ${t.getUTCDate()} ${MOIS[t.getUTCMonth()]}` };
}

// Légende : jetons {lien} {finOffre} {zone}, puis hashtags
function legende(p, reseau) {
  const lien = reseau === 'instagram' ? 'lien en bio' : d.profil.lien;
  const val = {
    lien,
    zone: R.zone,
    finOffre: R.finOffre ? `, jusqu'au ${R.finOffre}` : '',
  };
  const corps = p.legende.join('\n').replace(/\{(\w+)\}/g, (m, k) => {
    if (!(k in val)) { err(`Post « ${p.id} » : jeton inconnu ${m} dans la légende (jetons possibles : ${Object.keys(val).map((x) => `{${x}}`).join(' ')})`); return m; }
    return val[k];
  });
  const tags = reseau === 'instagram' ? p.hashtags : p.hashtags.slice(0, R.hashtagsFacebook);
  return typo(corps) + (tags.length ? '\n\n' + tags.map((h) => '#' + h).join(' ') : '');
}

const posts = d.posts.map((p, i) => {
  const numero = i + 1;
  const couleur = R.couleurs[i % R.couleurs.length];
  return {
    ...p, numero, couleur, theme: THEME[couleur],
    statut: p.statut || 'pret',
    fichier: `haveo-${pad2(numero)}-${p.id}.png`,
    date: datePost(p.jour ?? 0),
  };
});
for (const p of posts) {
  p.instagram = legende(p, 'instagram');
  p.facebook = legende(p, 'facebook');
}

// ============================================================
// 2. CONTRÔLES (avant de dessiner quoi que ce soit)
// ============================================================
const ids = new Set();
for (const p of posts) {
  const nom = `Post ${p.numero} (${p.id})`;
  if (ids.has(p.id)) err(`${nom} : l'identifiant « ${p.id} » est déjà utilisé`);
  ids.add(p.id);
  if (!/^[a-z0-9-]+$/.test(p.id)) err(`${nom} : identifiant à écrire en minuscules, chiffres et tirets`);
  if (p.hashtags.length > R.hashtagsMax) err(`${nom} : ${p.hashtags.length} hashtags, ${R.hashtagsMax} au maximum`);
  for (const h of p.hashtags) if (!/^[a-z0-9]+$/.test(h)) err(`${nom} : hashtag « ${h} » à écrire sans #, sans accent ni espace`);
  if (p.instagram.length > 2200) err(`${nom} : légende de ${p.instagram.length} caractères, Instagram en accepte 2 200`);
  const accroche = p.legende[0] || '';
  if (accroche.length > 125) warn(`${nom} : la première ligne fait ${accroche.length} caractères ; au-delà de 125, elle est coupée par « … plus »`);
  if (!p.alt) warn(`${nom} : pas de texte alternatif`);
  else if (p.alt.length > 400) warn(`${nom} : texte alternatif long (${p.alt.length} caractères), vise moins de 400`);
  const tout = JSON.stringify(p.contenu) + '\n' + p.instagram;
  for (const mot of R.motsInterdits) {
    const re = new RegExp(`(^|[^\\p{L}])${mot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'iu');
    if (re.test(tout)) err(`${nom} : « ${mot} » est dans la liste des mots à ne pas utiliser (reglages.motsInterdits)`);
  }
  const textes = [];
  (function lire(v) { if (typeof v === 'string') textes.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(lire); })(p.contenu);
  if (p.statut !== 'exemple' && /\[[^\]]+\]/.test(textes.join(' ') + p.legende.join(' ') + p.alt)) warn(`${nom} : il reste un texte entre crochets à compléter`);
}
if (/\[.*\]/.test(d.profil.lien)) warn(`profil.lien est vide (« ${d.profil.lien} ») : les légendes Facebook l'affichent tel quel`);
const bio = d.profil.bio.join('\n');
if ([...bio].length > 150) err(`La bio fait ${[...bio].length} caractères, Instagram en accepte 150`);
if (d.profil.nom.length > 64) err(`Le nom affiché fait ${d.profil.nom.length} caractères, Instagram en accepte 64`);

if (erreurs.length) {
  console.error('\n✗ La fiche contient des erreurs :\n' + erreurs.map((e) => '  - ' + e).join('\n') + '\n');
  process.exit(1);
}

// ============================================================
// 3. LES MODÈLES DE VISUELS
// ============================================================
const ZONE = R.zone;
const WM = '<svg class="wm" viewBox="-46 -46 426 562" fill="none" stroke-width="92" stroke-linecap="round" stroke-linejoin="round"><path d="M0 0V470M0 270L144 126L288 270V470" stroke="currentColor"/></svg>';
const LOGO_PIED = { coral: 'haveo-logo-sur-corail.svg', sand: 'haveo-logo-vert.svg', green: 'haveo-logo-creme.svg' };
const SYMBOLE = { coral: 'haveo-symbole-sur-corail.svg', sand: 'haveo-symbole-vert.svg', green: 'haveo-symbole-creme.svg' };
const BOUTON = { coral: 'dark', sand: 'green', green: 'coral' };
const COULEUR_BOUTON = { encre: 'dark', vert: 'green', corail: 'coral' };

function bouton(c, theme) {
  const style = c.boutonCouleur ? COULEUR_BOUTON[c.boutonCouleur] : BOUTON[theme];
  const fleche = c.fleche === false ? '' : ' ' + ic('arrow', 26);
  return `<div class="cta"><span class="btn ${style}">${esc(c.bouton)}${fleche}</span>${c.note ? `<span class="cta-note">${texte(c.note)}</span>` : ''}</div>`;
}

const MODELES = {
  presentation: (c, t) => ({ wm: true, html: `
<div class="mark">${logo(SYMBOLE[t])}</div>
<p class="label">${texte(c.label)}</p>
<h1 class="xl">${titre(c.titre)}</h1>
<p class="lead">${texte(c.texte)}</p>
<ul class="chips">${c.puces.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
${bouton(c, t)}` }),

  grille: (c) => ({ html: `
<p class="label">${texte(c.label)}</p>
<h1>${titre(c.titre)}</h1>
<div class="grid2 svc">${c.cartes.map((k, i) => `<div class="card"><div class="row"><span class="tile">${ic(k.icone)}</span><span class="num">${pad2(i + 1)}</span></div><h3>${texte(k.titre)}</h3><p>${texte(k.texte)}</p></div>`).join('')}</div>` }),

  etapes: (c) => ({ wm: true, html: `
<p class="label">${texte(c.label)}</p>
<h1>${titre(c.titre)}</h1>
<ol class="timeline">${c.etapes.map((e, i) => `<li><span class="step">${i + 1}</span><div><h3>${texte(e.titre)}</h3><p>${texte(e.texte)}</p></div></li>`).join('')}</ol>
${c.encadre ? `<p class="note">${texte(c.encadre)}</p>` : ''}` }),

  checklist: (c) => ({ wm: true, html: `
<p class="label">${texte(c.label)}</p>
<h1>${titre(c.titre)}</h1>
<div class="grid2 checks">${c.points.map((x) => `<div class="card"><span class="ck">${ic('check', 22, 2.25)}</span><span>${texte(x)}</span></div>`).join('')}</div>
${c.alerte ? `<div class="bar">${ic('bell')}<span>${texte(c.alerte[0])} <b>${texte(c.alerte[1])}</b></span></div>` : ''}` }),

  offre: (c, t) => ({ wm: true, html: `
<p class="pill">${texte(c.badge)}</p>
<h1 class="offer"><span>1<sup>er</sup> mois</span><br><span class="box">offert</span></h1>
<p class="sub">${texte(c.sousTitre)}</p>
<div class="stack">${c.points.map((x) => `<div class="card line"><span class="ck big">${ic('check', 24, 2.25)}</span><div><h3>${texte(x.titre)}</h3><p>${texte(x.texte)}</p></div></div>`).join('')}</div>
${bouton({ ...c, fleche: false }, t)}` }),

  liste: (c) => ({ html: `
<p class="label">${texte(c.label)}</p>
<h1>${titre(c.titre)}</h1>
<div class="stack">${c.cartes.map((k) => `<div class="card line"><span class="tile big">${ic(k.icone)}</span><div><h3>${texte(k.titre)}</h3><p>${texte(k.texte)}</p></div></div>`).join('')}</div>
${c.apres ? `<p class="after">${texte(c.apres)}</p>` : ''}` }),

  methode: (c, t) => ({ html: `
<p class="label">${texte(c.label)}</p>
<h1>${titre(c.titre)}</h1>
<div class="stack">${c.etapes.map((e, i) => `<div class="card line method"><span class="big-num">${pad2(i + 1)}</span><div><h3>${texte(e.titre)}</h3><p>${texte(e.texte)}</p></div><span class="tile">${ic(e.icone)}</span></div>`).join('')}</div>
${bouton(c, t)}` }),

  estimation: (c, t) => ({ html: `
<div class="toprow"><p class="pill">${texte(c.badge)}</p><div class="mark sm">${logo(SYMBOLE[t])}</div></div>
<h1 class="xl2">${titre(c.titre)}</h1>
<div class="card week"><div class="wk-head"><h3>Une semaine type</h3><span class="legend"><i class="basse"></i>Basse<i class="moyenne"></i>Moyenne<i class="forte"></i>Forte</span></div>
<div class="days">${c.semaine.map(([j, prix, niv]) => `<div class="day ${niv}"><span>${esc(j)}</span><b>${prix}${NBSP}€</b></div>`).join('')}</div>
<p class="fine">${texte(c.exemple)}</p></div>
<div class="feats">${c.outils.map((o) => `<div><span class="round">${ic(o.icone)}</span><div><h3>${texte(o.titre)}</h3><p>${texte(o.texte)}</p></div></div>`).join('')}</div>
${bouton(c, t)}` }),

  zone: (c) => ({ wm: true, html: `
<p class="label">${texte(c.label)}</p>
<h1>${titre(c.titre)}</h1>
<div class="grid2 depts">${c.departements.map(([n, nom]) => `<div class="dept"><b>${esc(n)}</b><span>${esc(nom)}</span></div>`).join('')}</div>
${c.encadre ? `<p class="note">${ic('mappin', 28)}<span>${texte(c.encadre)}</span></p>` : ''}` }),

  photo: (c, t, p) => {
    const src = path.resolve(path.dirname(fichierFiche), c.photo);
    if (!fs.existsSync(src)) err(`Post ${p.numero} (${p.id}) : photo introuvable (${c.photo})`);
    return { html: `
<div class="photo"><img src="file://${esc(src)}" alt=""></div>
<p class="label">${texte(c.label)}</p>
<h1 class="md">${titre(c.titre)}</h1>
${c.texte ? `<p class="lead sm">${texte(c.texte)}</p>` : ''}` };
  },
};

function visuel(p) {
  const m = MODELES[p.modele];
  if (!m) { err(`Post ${p.numero} (${p.id}) : modèle « ${p.modele} » inconnu (${Object.keys(MODELES).join(', ')})`); return ''; }
  const { html, wm } = m(p.contenu, p.theme, p);
  return `<section class="post ${p.theme} m-${p.modele}" id="p${p.numero}">${wm ? WM : ''}<div class="inner">${html}</div>`
    + `<footer><div class="logo">${logo(LOGO_PIED[p.theme])}</div><span class="zone">${esc(ZONE)}</span></footer></section>`;
}

function couverture(u, i) {
  const t = THEME[u.couleur];
  return `<section class="une ${t}" id="u${i}"><span class="une-ic">${ic(u.icone, 300, 1.5)}</span></section>`;
}

// ---------- Stories à la une (1080 × 1920) ----------
// Une story se compose de blocs facultatifs, dans cet ordre :
// badge, icone, label, offre, titre, texte, cartes | points | etapes | departements | contacts, alerte, bouton, note.
// Zones de sécurité : rien d'important dans les 250 px du haut (barre de progression, nom du compte)
// ni dans les 300 px du bas (barre « Envoyer un message »).
function story(u, s, i, j) {
  const t = THEME[u.couleur];
  const h = [];
  if (s.badge) h.push(`<p class="pill">${texte(s.badge)}</p>`);
  if (s.icone) h.push(`<span class="s-ic">${ic(s.icone, 52)}</span>`);
  if (s.label) h.push(`<p class="label">${texte(s.label)}</p>`);
  if (s.offre) h.push(`<h1 class="offer">1<sup>er</sup> mois<br><span class="box">offert</span></h1>`);
  if (s.titre) h.push(`<h1>${titre(s.titre)}</h1>`);
  if (s.texte) h.push(`<p class="lead">${texte(s.texte)}</p>`);
  if (s.cartes) h.push(`<div class="stack">${s.cartes.map((k) => `<div class="card line${k.texte ? '' : ' mini'}"><span class="tile big">${ic(k.icone, 34)}</span><div><h3>${texte(k.titre)}</h3>${k.texte ? `<p>${texte(k.texte)}</p>` : ''}</div></div>`).join('')}</div>`);
  if (s.points) h.push(`<div class="${s.colonne ? 'stack' : 'grid2'} checks">${s.points.map((x) => `<div class="card"><span class="ck">${ic('check', 24, 2.25)}</span><span>${texte(x)}</span></div>`).join('')}</div>`);
  if (s.etapes) h.push(`<ol class="timeline">${s.etapes.map((e, k) => `<li><span class="step">${k + 1}</span><div><h3>${texte(e.titre)}</h3><p>${texte(e.texte)}</p></div></li>`).join('')}</ol>`);
  if (s.departements) h.push(`<div class="grid2 depts">${s.departements.map(([n, nom]) => `<div class="dept"><b>${esc(n)}</b><span>${esc(nom)}</span></div>`).join('')}</div>`);
  if (s.contacts) h.push(`<div class="stack">${s.contacts.map((k) => `<div class="card line contact"><span class="tile big">${ic(k.icone, 34)}</span><div><p>${texte(k.label)}</p><h3>${texte(k.valeur)}</h3></div></div>`).join('')}</div>`);
  if (s.alerte) h.push(`<div class="bar">${ic('bell', 34)}<span>${texte(s.alerte[0])} <b>${texte(s.alerte[1])}</b></span></div>`);
  if (s.bouton) h.push(bouton({ ...s, note: null }, t).replace('class="cta"', 'class="cta s-cta"'));
  if (s.note) h.push(`<p class="s-note">${texte(s.note)}</p>`);
  return `<section class="story ${t}${s.centre ? ' centre' : ''}" id="s${i}-${j}">${WM}<div class="inner">${h.join('\n')}</div>`
    + `<footer><div class="logo">${logo(LOGO_PIED[t])}</div><span class="zone">${esc(ZONE)}</span></footer></section>`;
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Plus Jakarta Sans',sans-serif;background:#ddd}
.post{position:relative;width:1080px;height:1350px;overflow:hidden;display:flex;flex-direction:column;padding:88px 88px 0}
.inner{position:relative;flex:1;min-height:0;display:flex;flex-direction:column}
/* --- trois fonds, mêmes rôles --- */
.coral{--bg:${C.corail};--ink:${C.encre};--hl:${C.papier};--hl-dot:${C.papier};--dot:${C.papier};--label:${C.encre};--muted:rgba(11,58,58,.8);--wm:rgba(255,255,255,.10);--line:rgba(11,58,58,.18);--accent:${C.encre};--accent-ink:${C.papier};--box:${C.encre};--bar:${C.encre};--bar-ink:${C.papier};--soft:rgba(255,253,249,.16)}
.sand{--bg:${C.sable};--ink:${C.vert};--hl:${C.corail};--hl-dot:${C.vert};--dot:${C.corail};--label:${C.corailFonce};--muted:${C.sourd};--wm:rgba(15,76,76,.06);--line:rgba(15,76,76,.14);--accent:${C.corail};--accent-ink:${C.papier};--box:${C.corail};--bar:${C.vert};--bar-ink:${C.papier};--soft:rgba(15,76,76,.06)}
.green{--bg:${C.vert};--ink:${C.creme};--hl:${C.or};--hl-dot:${C.corail};--dot:${C.corail};--label:${C.or};--muted:rgba(251,246,238,.78);--wm:rgba(255,255,255,.05);--line:rgba(251,246,238,.14);--accent:${C.or};--accent-ink:${C.vert};--box:${C.corail};--bar:rgba(255,255,255,.08);--bar-ink:${C.creme};--soft:rgba(255,255,255,.07)}
.post,.une{background:var(--bg);color:var(--ink)}
.wm{position:absolute;right:-150px;top:150px;width:560px;color:var(--wm)}
.label{font-size:28px;font-weight:600;margin-bottom:20px;color:var(--label)}
h1{font-size:88px;line-height:1;font-weight:600;letter-spacing:-.04em;margin-bottom:56px;color:var(--ink)}
h1.xl{font-size:108px;margin-bottom:44px} h1.xl2{font-size:100px;margin-bottom:48px} h1.md{font-size:72px;margin-bottom:24px}
h1 .hl{color:var(--hl)} .dot{color:var(--dot)} .hl .dot{color:var(--hl-dot)}
h3{font-size:34px;font-weight:600;letter-spacing:-.02em;line-height:1.15}
p{font-size:26px;line-height:1.4}
.card{background:${C.papier};border-radius:24px;color:${C.vert}}
.card p{color:${C.sourd}}
.tile{display:inline-grid;place-items:center;width:64px;height:64px;border-radius:16px;background:${C.sable};color:${C.vert};flex:none}
.tile.big{width:80px;height:80px;border-radius:20px}
.mark svg{height:88px;width:auto;display:block}.mark{margin-bottom:76px}
.mark.sm{margin:0}.mark.sm svg{height:64px}
.lead{font-size:30px;line-height:1.45;max-width:820px;margin-bottom:44px}
.lead.sm{font-size:28px;color:var(--muted)}
.chips{list-style:none;display:flex;flex-wrap:wrap;gap:10px;margin-bottom:48px}
.chips li{background:${C.papier};color:${C.vert};font-size:25px;font-weight:500;padding:12px 20px;border-radius:28px}
.cta{display:flex;align-items:center;gap:32px;margin-top:auto;margin-bottom:56px;padding-top:32px}
.btn{display:inline-flex;align-items:center;gap:16px;font-size:30px;font-weight:600;padding:26px 36px;border-radius:44px;letter-spacing:-.01em;white-space:nowrap}
.btn.dark{background:${C.encre};color:${C.papier}} .btn.coral{background:${C.corail};color:${C.papier}} .btn.green{background:${C.vert};color:${C.papier}}
.cta-note{font-size:22px;line-height:1.45;font-weight:500;color:var(--ink)}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.svc .card{padding:32px;height:260px}.svc .row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
.svc .num{font-size:26px;font-weight:600;color:${C.corail};font-variant-numeric:tabular-nums}
.svc h3{margin-bottom:12px}.svc p{font-size:23px}
.timeline{list-style:none;position:relative}
.timeline:before{content:"";position:absolute;left:35px;top:40px;bottom:120px;width:2px;background:var(--accent);opacity:.45}
.timeline li{display:flex;gap:40px;margin-bottom:44px;position:relative}
.step{flex:none;width:72px;height:72px;border-radius:36px;background:var(--accent);color:var(--accent-ink);font-size:30px;font-weight:600;display:grid;place-items:center}
.timeline h3{margin:12px 0 10px}.timeline p{color:var(--muted)}
.note{margin-top:auto;margin-bottom:64px;background:var(--soft);border-left:4px solid var(--accent);border-radius:4px 16px 16px 4px;padding:24px 32px;font-size:24px;color:var(--ink);display:flex;gap:18px;align-items:center}
.note .ic{color:var(--accent);flex:none}
.checks .card{display:flex;align-items:center;gap:20px;padding:0 28px;height:116px;font-size:27px;font-weight:500;line-height:1.25}
.ck{flex:none;width:44px;height:44px;border-radius:22px;background:${C.vert};color:${C.papier};display:grid;place-items:center}
.ck.big{width:52px;height:52px;border-radius:26px}.ck.big .ic{color:${C.or}}
.bar{margin-top:32px;display:flex;align-items:center;gap:20px;background:var(--bar);color:var(--bar-ink);border-radius:20px;padding:26px 32px;font-size:27px;font-weight:500}
.bar .ic{color:${C.or}} .bar b{color:${C.or};font-weight:600}
.pill{display:inline-block;align-self:flex-start;background:var(--box);color:${C.papier};font-size:26px;font-weight:600;padding:12px 28px;border-radius:28px;margin-bottom:40px}
h1.offer{font-size:150px;letter-spacing:-.05em;line-height:.95;margin-bottom:24px}
h1.offer sup{font-size:.42em;vertical-align:.95em;letter-spacing:-.02em;margin-left:4px}
.offer .box{display:inline-block;background:var(--box);color:${C.papier};border-radius:24px;padding:0 32px 18px;margin-top:16px;line-height:1}
.sub{font-size:32px;font-weight:600;letter-spacing:-.02em;margin-bottom:28px}
.stack{display:flex;flex-direction:column;gap:16px}
.card.line{display:flex;align-items:center;gap:28px;padding:24px 32px}
.card.line h3{margin-bottom:6px}.card.line p{font-size:24px}
.m-offre .cta-note{max-width:440px}
.after{margin-top:28px;font-size:26px;color:var(--muted)}
.card.method{gap:32px;padding:20px 32px}.method p{font-size:23px}.method>div{flex:1}
.big-num{font-size:64px;font-weight:600;color:${C.corail};letter-spacing:-.04em;width:96px;flex:none;font-variant-numeric:tabular-nums}
.toprow{display:flex;justify-content:space-between;align-items:flex-start}
.week{padding:28px 28px 22px;margin-bottom:44px}
.wk-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}.wk-head h3{font-size:26px}
.legend{font-size:22px;display:flex;align-items:center;gap:8px;color:${C.sourd}}.legend i{width:14px;height:14px;border-radius:4px;display:inline-block;margin-left:14px}
i.basse{background:${C.vert}} i.moyenne{background:${C.or}} i.forte{background:${C.corail}}
.days{display:grid;grid-template-columns:repeat(7,1fr);gap:10px}
.day{border-radius:14px;padding:16px 0;text-align:center;display:flex;flex-direction:column;gap:6px}
.day span{font-size:22px;font-weight:500}.day b{font-size:28px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.day.basse{background:#E5EEEC;color:${C.vert}} .day.moyenne{background:#FAEBCB;color:#8A5E10} .day.forte{background:#FDE2DE;color:#C8402F}
.fine{font-size:22px;color:#5F8483;text-align:center;margin-top:16px}
.feats>div{display:flex;gap:24px;align-items:center;margin-bottom:24px}
.round{flex:none;width:72px;height:72px;border-radius:36px;background:var(--accent);color:var(--accent-ink);display:grid;place-items:center}
.feats h3{margin-bottom:4px}.feats p{font-size:25px;color:var(--muted)}
.depts{gap:16px}
.dept{display:flex;align-items:center;gap:24px;background:var(--soft);border:1px solid var(--line);border-radius:20px;padding:40px 32px}
.dept b{font-size:52px;font-weight:600;letter-spacing:-.03em;color:var(--hl);width:76px;font-variant-numeric:tabular-nums}
.dept span{font-size:28px;font-weight:500;line-height:1.2}
.photo{height:720px;border-radius:28px;overflow:hidden;margin-bottom:40px;flex:none}
.photo img{width:100%;height:100%;object-fit:cover;display:block}
footer{position:relative;height:132px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;flex:none}
footer .logo svg{height:42px;width:auto;display:block}
.zone{font-size:22px;font-weight:500;color:var(--ink)}
.green .zone{color:var(--muted)}
.une{width:1080px;height:1920px;display:grid;place-items:center}
.une-ic{width:520px;height:520px;border-radius:50%;display:grid;place-items:center;background:var(--soft)}
.une.coral .une-ic{color:${C.papier}} .une.sand .une-ic{color:${C.vert}} .une.green .une-ic{color:${C.or}}
/* --- stories --- */
.story{position:relative;width:1080px;height:1920px;overflow:hidden;display:flex;flex-direction:column;padding:260px 88px 0;background:var(--bg);color:var(--ink)}
.story .wm{top:auto;bottom:260px;right:-200px;width:760px}
.story .inner{justify-content:center}
.story footer{height:300px;border-top:0;align-items:flex-start;padding-top:44px}
.story .label{font-size:36px;margin-bottom:24px}
.story h1{font-size:92px;margin-bottom:52px}
.story h1.offer{font-size:200px;margin-bottom:48px}
.story .pill{font-size:34px;padding:14px 34px;border-radius:40px;margin-bottom:56px}
.story .lead{font-size:40px;line-height:1.4;margin-bottom:48px;max-width:none}
.story h3{font-size:40px}
.story p{font-size:32px}
.story .card.line{padding:30px 36px;gap:32px}
.story .card.line p{font-size:30px;margin-top:6px}
.story .card.mini{padding:24px 32px}.story .card.mini h3{font-size:42px}
.story .stack{gap:20px}
.story .checks .card{height:auto;min-height:132px;padding:26px 30px;font-size:32px;gap:24px}
.story .stack.checks .card{min-height:0;padding:30px 36px;font-size:36px}
.story .ck{width:56px;height:56px;border-radius:28px}
.story .timeline li{margin-bottom:56px;gap:44px}
.story .timeline:before{left:43px;top:48px;bottom:140px}
.story .step{width:88px;height:88px;border-radius:44px;font-size:36px}
.story .timeline h3{margin:16px 0 12px}
.story .depts{gap:20px}.story .dept{padding:52px 32px}.story .dept span{font-size:32px}
.story .contact h3{font-size:38px;margin:4px 0 0}.story .contact p{font-size:28px;margin:0;color:${C.sourd}}
.story .bar{font-size:32px;padding:32px 36px;margin-top:40px}
.story .s-cta{margin:40px 0 0;padding:0}
.story .btn{font-size:38px;padding:34px 48px;border-radius:60px;gap:20px}
.story .s-note{font-size:30px;font-weight:500;margin-top:32px;color:var(--ink);line-height:1.45}
.s-ic{display:inline-grid;place-items:center;width:112px;height:112px;border-radius:30px;background:var(--soft);color:var(--ink);margin-bottom:48px;align-self:flex-start}
.green .s-ic{color:${C.or}}
`;

const pageVisuels = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Visuels Haveo</title>
<link rel="stylesheet" href="${POLICE}"><style>${CSS}</style></head><body>
${posts.map(visuel).join('\n')}
${(d.aLaUne || []).map(couverture).join('\n')}
${(d.aLaUne || []).map((u, i) => (u.stories || []).map((s, j) => story(u, s, i, j)).join('\n')).join('\n')}
</body></html>`;

if (erreurs.length) {
  console.error('\n✗ La fiche contient des erreurs :\n' + erreurs.map((e) => '  - ' + e).join('\n') + '\n');
  process.exit(1);
}

fs.mkdirSync(path.join(SORTIE, 'visuels'), { recursive: true });
fs.mkdirSync(path.join(SORTIE, 'a-la-une'), { recursive: true });
fs.writeFileSync(path.join(SORTIE, 'visuels.html'), pageVisuels);

// ============================================================
// 4. RENDU DES IMAGES + CONTRÔLE DE MISE EN PAGE
// ============================================================
const unes = (d.aLaUne || []).map((u, i) => {
  const slug = u.titre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    ...u, slug, fichier: `haveo-une-${pad2(i + 1)}-${slug}.png`,
    stories: (u.stories || []).map((s, j) => ({ ...s, fichier: `haveo-story-${pad2(i + 1)}-${slug}-${pad2(j + 1)}.png` })),
  };
});
for (const u of unes) {
  const tout = JSON.stringify(u.stories);
  for (const mot of R.motsInterdits) {
    const re = new RegExp(`(^|[^\\p{L}])${mot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'iu');
    if (re.test(tout)) { console.error(`\n✗ Story « ${u.titre} » : « ${mot} » est dans la liste des mots à ne pas utiliser\n`); process.exit(1); }
  }
  if (!u.stories.length) warn(`À la une « ${u.titre} » : aucune story`);
}
fs.mkdirSync(path.join(SORTIE, 'stories'), { recursive: true });

async function rendre() {
  let pw;
  try { pw = await import('playwright'); } catch {
    try { pw = createRequire(import.meta.url)('playwright'); } catch { console.log('  (images ignorées : Playwright n’est pas installé)'); return; }
  }
  const chromium = pw.chromium || pw.default.chromium;
  const nav = await chromium.launch();
  const page = await nav.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(SORTIE, 'visuels.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const police = await page.evaluate(() => document.fonts.check('600 40px "Plus Jakarta Sans"'));
  if (!police) warn('La police Plus Jakarta Sans ne s’est pas chargée (pas de réseau ?) : les images utilisent une police de secours');

  // Débordements : texte qui sort du cadre, ou trop près des bords
  // (la grille Instagram recadre chaque post en 3:4, soit ~34 px en moins de chaque côté)
  const pb = await page.evaluate(() => {
    const out = [];
    for (const s of document.querySelectorAll('.post, .story')) {
      const box = s.getBoundingClientRect();
      const inner = s.querySelector('.inner');
      if (inner.scrollHeight > inner.clientHeight + 1) out.push([s.id, `le contenu dépasse de ${inner.scrollHeight - inner.clientHeight} px en bas`]);
      for (const el of s.querySelectorAll('.inner *, footer *')) {
        if (el.closest('svg') && el.tagName !== 'svg') continue;
        const r = el.getBoundingClientRect();
        if (!r.width) continue;
        if (r.left - box.left < 48 || box.right - r.right < 48) { out.push([s.id, `« ${(el.textContent || el.tagName).trim().slice(0, 40)} » trop près du bord`]); break; }
      }
      for (const el of s.querySelectorAll('h1,h3,p,span,li,b')) {
        if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible') out.push([s.id, `texte coupé : « ${el.textContent.trim().slice(0, 40)} »`]);
      }
    }
    return out;
  });
  for (const [id, m] of pb) {
    if (id.startsWith('p')) warn(`Post ${id.slice(1)} : ${m}`);
    else { const [i, j] = id.slice(1).split('-').map(Number); warn(`Story « ${unes[i].titre} » n° ${j + 1} : ${m}`); }
  }

  if (!SANS_IMAGES) {
    for (const p of posts) await page.locator('#p' + p.numero).screenshot({ path: path.join(SORTIE, 'visuels', p.fichier) });
    await page.setViewportSize({ width: 1080, height: 1920 });
    for (const [i, u] of unes.entries()) {
      await page.locator('#u' + i).screenshot({ path: path.join(SORTIE, 'a-la-une', u.fichier) });
      for (const [j, s] of u.stories.entries()) await page.locator(`#s${i}-${j}`).screenshot({ path: path.join(SORTIE, 'stories', s.fichier) });
    }
  }
  await nav.close();
}

// ============================================================
// 5. LÉGENDES (fichier texte à copier-coller)
// ============================================================
function ecrireLegendes() {
  const publies = posts.filter((p) => p.statut !== 'exemple');
  const L = [];
  L.push('# Haveo – posts Instagram et Facebook', '');
  L.push('Fichier produit par `node generer.mjs`. Ne pas modifier à la main : changer `posts.json` puis relancer.', '');
  L.push('## Calendrier', '', `Publication vers ${R.heure}. Couleurs dans l'ordre : ${R.couleurs.map((c) => NOM_COULEUR[c].toLowerCase()).join(', ')}, et on recommence.`, '');
  L.push('| # | Date | Fond | Fichier | Statut |', '|---|---|---|---|---|');
  for (const p of publies) L.push(`| ${p.numero} | ${p.date.texte} | ${NOM_COULEUR[p.couleur]} | ${p.fichier} | ${p.statut === 'proposition' ? 'proposition' : 'prêt'} |`);
  L.push('', '## Profil Instagram', '', `**Nom affiché** (64 caractères max, compte dans la recherche) : ${d.profil.nom}`, '', '**Bio** :', '```', bio, '```', `**Lien** : ${d.profil.lien}`, '');
  L.push(`**Bouton Contacter** (Modifier le profil › Options de contact) : ${d.profil.email} · WhatsApp ${d.profil.whatsapp} (${d.profil.whatsappLien})`, '');
  if (unes.length) {
    L.push('## Stories à la une', '', 'Publier chaque story (format 1080 × 1920), puis l’ajouter à la une correspondante avec sa couverture (`a-la-une/`).', '');
    for (const u of unes) {
      L.push(`### ${u.titre} – ${NOM_COULEUR[u.couleur].toLowerCase()} – couverture \`a-la-une/${u.fichier}\``, '');
      for (const [j, s] of u.stories.entries()) L.push(`${j + 1}. \`stories/${s.fichier}\`${s.conseil ? ` – ${s.conseil}` : ''}`);
      L.push('');
    }
  }
  for (const p of publies) {
    L.push('---', `## Post ${p.numero} – ${NOM_COULEUR[p.couleur]} – ${p.date.texte}`, '', `Visuel : \`visuels/${p.fichier}\``, '');
    L.push('### Instagram', '```', p.instagram, '```', '### Facebook', '```', p.facebook, '```');
    L.push(`**Texte alternatif** : ${p.alt}`, '');
    if (p.contrat) L.push(`*Contrat : ${p.contrat} (ne pas publier)*`, '');
  }
  fs.writeFileSync(path.join(SORTIE, 'legendes.md'), L.join('\n'));
}

// ============================================================
// 6. APERÇU (profil, grille qui défile, légendes à copier)
// ============================================================
function ecrireApercu() {
  fs.copyFileSync(path.resolve(path.dirname(fichierFiche), d.profil.avatar), path.join(SORTIE, 'avatar.png'));
  const donnees = {
    profil: { pseudo: d.profil.pseudo, nom: d.profil.nom, bio, lien: d.profil.lien, email: d.profil.email, whatsapp: d.profil.whatsapp, whatsappLien: d.profil.whatsappLien },
    couleurs: R.couleurs.map((c) => ({ id: c, nom: NOM_COULEUR[c], hex: HEX_COULEUR[c] })),
    heure: R.heure,
    unes: unes.map((u) => ({ titre: u.titre, couleur: u.couleur, fichier: u.fichier, stories: u.stories.map((s) => ({ fichier: s.fichier, conseil: s.conseil || '' })) })),
    posts: posts.map((p) => ({
      numero: p.numero, id: p.id, couleur: p.couleur, statut: p.statut, fichier: p.fichier,
      date: p.date.texte, instagram: p.instagram, facebook: p.facebook, alt: p.alt, contrat: p.contrat,
    })),
  };
  const modele = fs.readFileSync(path.join(ICI, 'apercu.html'), 'utf8');
  const json = JSON.stringify(donnees).replace(/</g, '\\u003c');
  fs.writeFileSync(path.join(SORTIE, 'index.html'), modele.replace('/*DONNEES*/null', json));
}

await rendre();
ecrireLegendes();
ecrireApercu();

console.log(`\n✓ ${posts.length} posts, ${unes.length} stories à la une (${unes.map((u) => `${u.titre} : ${u.stories.length}`).join(', ')})`);
console.log(posts.map((p) => `  ${pad2(p.numero)}  ${NOM_COULEUR[p.couleur].padEnd(6)}  ${p.date.texte.padEnd(22)} ${p.fichier}${p.statut !== 'pret' ? '  (' + p.statut + ')' : ''}`).join('\n'));
if (avertissements.length) console.log('\n⚠ À vérifier :\n' + avertissements.map((a) => '  - ' + a).join('\n'));
console.log(`\nSortie : ${path.relative(process.cwd(), SORTIE) || '.'}/  (index.html, legendes.md, visuels/, a-la-une/)\n`);
