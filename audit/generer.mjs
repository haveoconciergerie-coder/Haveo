#!/usr/bin/env node
// ============================================================
// HAVEO — Générateur d'audit du logement
// ------------------------------------------------------------
// Une fiche JSON par bien (dossier biens/) → toutes les notes,
// tous les totaux et tous les revenus sont calculés ici, une
// seule fois, puis réutilisés sur chaque slide. Sortie :
//   sortie/<slug>/deck/project/...   fichiers du deck Slides (claude.ai)
//   sortie/<slug>/apercu.html        aperçu local, toutes les slides
//   sortie/<slug>/<slug>.pdf         avec --pdf (Playwright requis)
//
// Usage : node generer.mjs biens/<bien>.json [--pdf] [--verifier]
//   --verifier  contrôle la mise en page de l'aperçu (débordements)
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ICI = path.dirname(fileURLToPath(import.meta.url));

// ---------- Palette Haveo (identique au site et à l'étude de marché) ----------
const C = {
  vert: '#0F4C4C', vertCarte: '#155757', sable: '#F4EBDD', sableFonce: '#EBE0CE',
  creme: '#FBF7F0', corail: '#F26B5B', corailFonce: '#C8483A', or: '#E8B04A', orFonce: '#B8862A',
  menthe: '#BFD8D5', mentheSourd: '#8FB3AE', vertSourd: '#3D7272',
};
const POLICE = { family: 'Plus Jakarta Sans', href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap' };

// ---------- Formats français ----------
const NBSP = ' ';
const nb = (n, d = 0) => n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/[   ]/g, NBSP);
const eur = (n) => nb(Math.round(n)) + NBSP + '€';
const eur2 = (n) => nb(n, 2) + NBSP + '€';
const pct = (n) => nb(n, Number.isInteger(n) ? 0 : 1) + NBSP + '%';
const arrondi = (n, pas) => Math.round(n / pas) * pas;
const MOTS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze'];
const mot = (n) => MOTS[n] || String(n);
const Maj = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fourchette = ([a, b]) => (a === 0 && b === 0 ? 'Inclus' : a === b ? eur(a) : `${nb(a)} à ${eur(b)}`);

const AVERTISSEMENTS = [];
const avertir = (m) => AVERTISSEMENTS.push(m);

// ============================================================
// 1. CALCULS
// ============================================================
function calculer(d) {
  const h = d.hypotheses;

  // --- Notes : « pieces » = moyenne des pièces × 10 ---
  const moyPieces = d.pieces.reduce((s, p) => s + p.note, 0) / d.pieces.length;
  const criteres = d.criteres.map((c) => ({
    ...c, note: c.note === 'pieces' ? Math.round(moyPieces * 10) : c.note,
  }));
  const noteGlobale = Math.round(criteres.reduce((s, c) => s + c.note, 0) / criteres.length);

  // --- Équipements manquants ---
  const equip = d.equipements.manquants.map((e) => ({ ...e, budget: Array.isArray(e.budget) ? e.budget : [e.budget, e.budget] }));
  const somme = (liste) => liste.reduce((s, e) => [s[0] + e.budget[0], s[1] + e.budget[1]], [0, 0]);
  const totalEquip = somme(equip);

  // --- Plan d'action : coûts à la charge du propriétaire ---
  const citesAilleurs = new Set(d.plan.flatMap((a) => (Array.isArray(a.cout?.equipements) ? a.cout.equipements : [])));
  const plan = d.plan.map((a) => {
    let cout;
    if (a.cout === 'inclus' || a.cout === 0 || a.cout == null) cout = [0, 0];
    else if (typeof a.cout === 'number') cout = [a.cout, a.cout];
    else if (Array.isArray(a.cout)) cout = a.cout;
    else if (a.cout.equipements === 'reste') cout = somme(equip.filter((e) => !citesAilleurs.has(e.id)));
    else if (Array.isArray(a.cout.equipements)) {
      for (const id of a.cout.equipements) if (!equip.some((e) => e.id === id)) throw new Error(`Plan d'action : équipement « ${id} » inconnu`);
      cout = somme(equip.filter((e) => a.cout.equipements.includes(e.id)));
    } else throw new Error(`Plan d'action : coût illisible pour « ${a.action} »`);
    return { ...a, cout };
  });
  const totalPlan = plan.reduce((s, a) => [s[0] + a.cout[0], s[1] + a.cout[1]], [0, 0]);
  if (!d.plan.some((a) => a.cout?.equipements === 'reste') && equip.some((e) => !citesAilleurs.has(e.id))) {
    avertir('Des équipements manquants ne sont repris par aucune action du plan (ajoute une action avec "cout": {"equipements": "reste"}).');
  }

  // --- Revenus ---
  const net = (prix, nuits, commission) => {
    const ca = prix * nuits;
    const c = ca * commission / 100, p = ca * h.fraisPlateforme / 100, l = nuits * h.lingeParNuit;
    return { ca, commission: c, plateforme: p, linge: l, net: ca - c - p - l };
  };
  const sc = {};
  for (const s of d.scenarios) {
    const r = net(s.prix, s.nuits, h.commissionHaveo);
    sc[s.id] = { ...s, ...r, netAn: r.net * 12, occupation: Math.round(s.nuits / h.joursParMois * 100) };
  }
  const ref = sc[(d.scenarios.find((s) => s.reference) || d.scenarios[Math.floor(d.scenarios.length / 2)]).id];

  let actuel = null;
  if (d.situation) {
    const s = d.situation;
    const r = net(s.prix, s.nuits, 0);
    actuel = { ...s, ...r, netAn: r.net * 12, occupation: Math.round(s.nuits / h.joursParMois * 100),
      ecartPrix: Math.round((s.prix - d.marche.prixMoyenSegment) / d.marche.prixMoyenSegment * 100) };
  }
  const gain = actuel ? ref.net - actuel.net : ref.net;
  if (actuel && gain <= 0) avertir(`Le scénario ${ref.nom} ne rapporte pas plus que la situation actuelle (gain ${eur(gain)}).`);
  const mois = gain > 0 ? totalPlan[1] / gain : Infinity;
  const remboursement = !isFinite(mois) ? 'à recalculer' : mois < 1 ? 'en moins d’un mois' : `en moins de ${mot(Math.ceil(mois))} mois`;

  // --- Contrôles de cohérence ---
  if (d.textes.synthese.priorites.length !== 3) avertir('La synthèse doit présenter exactement 3 priorités.');
  if (d.annonce.titrePropose.length > 50) avertir(`Titre proposé trop long pour Airbnb (${d.annonce.titrePropose.length} caractères, 50 maximum).`);
  for (const c of criteres) if (c.note < 0 || c.note > 100) avertir(`Note hors échelle : ${c.nom} = ${c.note}`);
  for (const p of d.pieces) if (p.note < 0 || p.note > 10) avertir(`Note de pièce hors échelle : ${p.nom} = ${p.note}`);

  return { criteres, noteGlobale, moyPieces, equip, totalEquip, plan, totalPlan, sc, ref, actuel, gain, mois, remboursement };
}

// ---------- Jetons {…} utilisables dans les textes ----------
function jetons(d, k) {
  const b = d.bien, m = d.marche, a = k.actuel;
  const reg = d.reglementation.length, manq = k.equip.length, act = k.plan.length;
  const t = {
    ville: b.ville, codePostal: b.codePostal, type: b.type, gamme: b.gamme,
    surface: nb(b.surface), voyageurs: nb(b.voyageurs), chambres: nb(b.chambres), sallesDeBain: nb(b.sallesDeBain),
    proprietaire: d.proprietaire, dateVisite: d.dateVisite,
    libelleSegment: m.libelleSegment, source: m.source,
    prixMoyenSegment: eur(m.prixMoyenSegment), occupationSegment: pct(m.occupationSegment),
    commission: pct(d.hypotheses.commissionHaveo), plateforme: pct(d.hypotheses.fraisPlateforme),
    noteGlobale: nb(k.noteGlobale), noteCibleAudit: nb(d.noteCibleAudit),
    nbManquants: nb(manq), nbManquantsMot: mot(manq), NbManquantsMot: Maj(mot(manq)),
    nbActions: nb(act), nbActionsMot: mot(act), NbActionsMot: Maj(mot(act)),
    nbPointsRegle: nb(reg), nbPointsRegleMot: mot(reg), NbPointsRegleMot: Maj(mot(reg)),
    totalEquip: fourchette(k.totalEquip), totalPlan: fourchette(k.totalPlan),
    totalEnviron: eur(arrondi((k.totalPlan[0] + k.totalPlan[1]) / 2, 100)),
    gain: eur(k.gain), gainEnviron: eur(arrondi(k.gain, 10)), gainAn: eur(arrondi(k.gain * 12, 100)),
    remboursement: k.remboursement,
  };
  for (const [id, s] of Object.entries(k.sc)) {
    Object.assign(t, {
      [`prix.${id}`]: eur(s.prix), [`nuits.${id}`]: nb(s.nuits), [`occ.${id}`]: pct(s.occupation),
      [`ca.${id}`]: eur(s.ca), [`net.${id}`]: eur(s.net), [`netAn.${id}`]: eur(arrondi(s.netAn, 100)),
    });
  }
  if (a) {
    Object.assign(t, {
      depuis: a.depuis, prixActuel: eur(a.prix), nuitsActuelles: nb(a.nuits), occActuelle: pct(a.occupation),
      caActuel: eur(a.ca), netActuel: eur(a.net), note: nb(a.note, 2), noteCible: nb(a.noteCible, 2),
      nbAvis: nb(a.avis), ecartPrix: pct(Math.abs(a.ecartPrix)),
      hausseParNuit: eur(k.ref.prix - a.prix),
    });
  }
  return t;
}

// ============================================================
// 2. OUTILS DE MISE EN PAGE
// ============================================================
// 07 63 88 81 36 → https://wa.me/33763888136 (ouvre la conversation WhatsApp)
const lienWhatsApp = (num) => {
  const chiffres = String(num).replace(/\D/g, '');
  return 'https://wa.me/' + (chiffres.startsWith('0') ? '33' + chiffres.slice(1) : chiffres);
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let T = {};
const remplacer = (s, f) => String(s).replace(/\{([\w.]+)\}/g, (m, cle) => {
  if (!(cle in T)) throw new Error(`Jeton inconnu {${cle}} dans : « ${s} »`);
  return f(T[cle]);
});
// Texte libre → HTML : échappement, jetons {…}, **mise en avant**
const tx = (s) => (s == null ? '' : remplacer(esc(s), esc).replace(/\*\*(.+?)\*\*/g, '<span class="hl">$1</span>'));
// Texte brut (notes de l'orateur)
const brut = (s) => (s == null ? '' : remplacer(s, (v) => v).replace(/\*\*/g, ''));

const logo = (couleur, l = 35, h = 40) =>
  `<svg aria-label="Logo Haveo" width="${l}" height="${h}" viewBox="356 259 320 367"><path d="M390 293 V592 M390 453 L483 363 L576 451 V592" fill="none" stroke="${couleur}" stroke-width="56" stroke-linecap="round" stroke-linejoin="round"/><circle cx="646" cy="586" r="24" fill="${C.corail}"/></svg>`;

const anim = (i) => `anim" style="--i:${i}`;

function entete(surtitre, titre, i = 0) {
  return `<div class="entete ${anim(i)}">
<div class="surtitre"><div class="pastille"></div><p class="surtitre-txt t2">${surtitre}</p></div>
<h2 class="titre t1">${titre}</h2>
</div>`;
}
const intro = (texte, i = 1) => `<p class="intro t2 ${anim(i)}">${texte}</p>`;

function pied(theme, info, page, total) {
  const c = theme === 'sombre' ? C.sable : C.vert;
  const droite = [info, `${page} / ${total}`].filter(Boolean).join(' · ');
  return `<div class="pied">
${logo(c)}
<p class="pied-logo t1">haveo<span class="corail">.</span></p>
<div class="espace"></div>
<p class="pied-info t2">${droite}</p>
</div>`;
}

let MODE = 'deck';
let PHOTOS = {};
function photo(cle, style) {
  const p = PHOTOS[cle];
  if (!p) throw new Error(`Photo « ${cle} » absente de la fiche`);
  const src = MODE === 'deck' ? p.blob : p.apercu;
  if (!src) return `<img alt="${esc(p.alt)}" style="${style};background:${C.sableFonce}">`;
  return `<img src="${esc(src)}" alt="${esc(p.alt)}" style="${style};object-fit:cover">`;
}

function section(id, theme, contenu, notes, cls = '') {
  const aside = notes ? `\n<aside>${esc(notes)}</aside>` : '';
  return `<section id="${id}" class="${theme}${cls ? ' ' + cls : ''}" data-transition="fade">\n${contenu}${aside}\n</section>\n`;
}

// Couleurs selon la note
const clsNote100 = (n, s) => (n < s.bas ? 'barre-corail' : n < s.haut ? 'barre-or' : 'barre-vert');
const clsNote10 = (n, s) => (n * 10 < s.bas ? 'note-ko' : n * 10 < s.haut ? 'note-moy' : 'note-ok');
const STATUTS = { ok: ['OK', 'puce-ok'], faire: ['À faire', 'puce-ko'], verifier: ['À vérifier', 'puce-verif'] };

// ============================================================
// 3. LES SLIDES
// ============================================================
function slides(d, k) {
  const X = d.textes, b = d.bien, m = d.marche, h = d.hypotheses, A = k.actuel, r = k.ref, S = k.sc;
  const seuils = h.seuils;
  const ids = d.scenarios.map((s) => s.id);
  const L = [];
  const add = (id, theme, fn, notes, cls = '') => L.push({ id, theme, fn, notes: brut(notes), cls });
  const sourceMarche = `Source : ${esc(m.source)}`;

  // ---------- Couverture ----------
  add('cover', 'sombre', () => `
<div class="couv-marque">${logo(C.vertCarte, 520, 596)}</div>
<div class="logo-couverture">
${logo(C.sable, 77, 88)}
<div class="logo-texte"><p class="logo-nom">haveo<span class="corail">.</span></p><p class="logo-sous">conciergerie</p></div>
</div>
<div class="surtitre ${anim(0)}"><div class="pastille"></div><p class="couv-surtitre">Audit personnalisé · ${tx(b.gamme)}</p></div>
<h1 class="couv-titre ${anim(1)}">Audit de votre logement à ${tx(b.ville)}</h1>
<p class="couv-intro ${anim(2)}">${tx(X.couverture.intro)}</p>
<p class="couv-intro ${anim(3)}"><span class="couv-fort">Préparé pour ${tx(d.proprietaire)}</span> · Visite du ${tx(d.dateVisite)} · ${tx('{surface}')} m² · ${tx('{chambres}')} chambres · ${tx('{voyageurs}')} voyageurs</p>
<p class="couv-date">${tx(d.date)} · Audit réalisé par Haveo Conciergerie</p>`,
  X.couverture.notes, 'couv');

  // ---------- Synthèse ----------
  add('synthese', 'clair', (p, n) => {
    const circ = 2 * Math.PI * 84;
    const arc = (k.noteGlobale / 100 * circ).toFixed(1);
    const couleurArc = k.noteGlobale < seuils.bas ? C.corail : k.noteGlobale < seuils.haut ? C.or : C.menthe;
    return `${entete('Synthèse de l’audit', tx(X.synthese.titre))}
<div class="rangee rangee-large aligne-haut">
<div class="barres ${anim(1)}">
${k.criteres.map((c) => `<div class="colonne-xs">
<div class="barre-haut"><p class="label t1">${tx(c.nom)}</p><p class="label t1 fort">${nb(c.note)}/100</p></div>
<div class="piste"><div class="barre ${clsNote100(c.note, seuils)}" style="width:${c.note}%"></div></div>
</div>`).join('\n')}
<p class="legende t2"><span class="legende-pt barre-corail"></span>sous ${seuils.bas} <span class="legende-pt barre-or"></span>${seuils.bas} à ${seuils.haut - 1} <span class="legende-pt barre-vert"></span>${seuils.haut} et plus</p>
</div>
<div class="colonne flex1 ${anim(2)}">
<div class="carte-score">
<svg aria-label="Note globale ${k.noteGlobale} sur 100" width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="84" fill="none" stroke="${C.vertCarte}" stroke-width="18"/><circle cx="100" cy="100" r="84" fill="none" stroke="${couleurArc}" stroke-width="18" stroke-linecap="round" stroke-dasharray="${arc} ${circ.toFixed(1)}" transform="rotate(-90 100 100)"/><text x="100" y="118" text-anchor="middle" font-family="Plus Jakarta Sans" font-size="60" font-weight="600" fill="${C.sable}">${k.noteGlobale}</text></svg>
<div class="colonne-serree"><p class="score-titre">Note globale</p><p class="corps menthe">Moyenne des ${mot(k.criteres.length)} critères. Objectif après nos actions : ${nb(d.noteCibleAudit)}/100 et plus.</p></div>
</div>
<p class="etiquette corail">Vos 3 actions prioritaires</p>
${X.synthese.priorites.map((pr, i) => `<div class="prio filet"><p class="prio-n">${i + 1}</p><div class="colonne-serree flex1"><h3 class="h3 t1">${tx(pr.titre)}</h3><p class="corps t2">${tx(pr.texte)}</p></div></div>`).join('\n')}
</div>
</div>
${pied('clair', '', p, n)}`;
  }, `Note globale = moyenne des ${k.criteres.length} notes : ${k.criteres.map((c) => c.note).join(' + ')} = ${k.criteres.reduce((s, c) => s + c.note, 0)} / ${k.criteres.length} = ${k.noteGlobale}. « Le logement et son état » = moyenne des pièces ${nb(k.moyPieces, 2)} × 10. Couleurs : corail sous ${seuils.bas}, doré de ${seuils.bas} à ${seuils.haut - 1}, vert à partir de ${seuils.haut}. ${X.synthese.notes || ''}`);

  // ---------- Situation actuelle (bien déjà en location) ----------
  if (A) {
    add('aujourdhui', 'sombre', (p, n) => {
      const kpi = (v, l1, l2, cls = 't1') => `<div class="kpi filet"><p class="chiffre-xl ${cls}">${v}</p><p class="corps t1">${l1}</p><p class="corps t2">${l2}</p></div>`;
      return `${entete('Votre situation actuelle', tx(X.situation.titre))}
${intro(tx(X.situation.intro))}
<div class="rangee ${anim(2)}">
${kpi(eur(A.prix), A.prixFixe ? 'Prix par nuit, fixe toute l’année' : 'Prix moyen par nuit', `Les ${esc(m.libelleSegment)} du secteur : ${eur(m.prixMoyenSegment)}`)}
${kpi(pct(A.occupation), `Taux d’occupation, soit ${nb(A.nuits)} nuits par mois`, `Moyenne du secteur : ${pct(m.occupationSegment)}`)}
${kpi(nb(A.note, 2), `Note sur ${nb(A.avis)} avis`, `Objectif : ${nb(A.noteCible, 2)} et plus`)}
${kpi(eur(A.ca), 'Revenus bruts par mois', `Potentiel ${esc(r.nom.toLowerCase())} : ${eur(r.ca)}`, 'or')}
</div>
<div class="rangee rangee-moy ${anim(3)}">
${X.situation.blocs.map((bl) => `<div class="colonne-serree flex1"><h3 class="h3 t1">${tx(bl.titre)}</h3><p class="corps t2">${tx(bl.texte)}</p></div>`).join('\n')}
</div>
${pied('sombre', sourceMarche, p, n)}`;
    }, `Chiffres du compte du propriétaire (12 derniers mois). ${eur(A.prix)} × ${A.nuits} nuits = ${eur(A.ca)}. ${A.nuits} / ${h.joursParMois} = ${pct(A.occupation)}. Écart de prix avec le marché : ${A.ecartPrix} %. Marché : ${m.source}. ${X.situation.notes || ''}`);
  }

  // ---------- Le bien et son marché ----------
  add('bien', 'clair', (p, n) => {
    const liste = (titre, cls, items) => `<div class="colonne flex1">
<p class="etiquette ${cls}">${titre}</p>
${items.map((it) => `<div class="colonne-xs filet pad-haut-s"><h3 class="h3 t1">${tx(it.titre)}</h3><p class="corps t2">${tx(it.texte)}</p></div>`).join('\n')}
</div>`;
    return `${entete('Le bien et son marché', tx(X.bien.titre))}
${intro(tx(X.bien.intro))}
<div class="rangee rangee-large ${anim(2)}">
${liste('Ce qui joue pour vous', 'etiquette-ok', X.bien.forces)}
${liste('Ce qui vous freine', 'etiquette-ko', X.bien.freins)}
</div>
${pied('clair', '', p, n)}`;
  }, X.bien.notes);

  // ---------- Visite pièce par pièce ----------
  add('pieces', 'clair', (p, n) => `${entete('Visite pièce par pièce', tx(X.pieces.titre))}
<div class="tableau ${anim(1)}">
<div class="tab-ligne tab-entete grille-pieces"><p class="t2">Pièce</p><p class="t2 droite">Note</p><p class="t2">Constat de la visite</p><p class="t2">Ce qu’on recommande</p></div>
${d.pieces.map((pc) => `<div class="tab-ligne grille-pieces"><p class="t1 fort">${tx(pc.nom)}</p><p class="droite fort ${clsNote10(pc.note, seuils)}">${nb(pc.note)}/10</p><p class="t2">${tx(pc.constat)}</p><p class="t1">${tx(pc.recommandation)}</p></div>`).join('\n')}
</div>
${pied('clair', '', p, n)}`,
  `Moyenne des pièces : ${d.pieces.map((pc) => pc.note).join(' + ')} = ${d.pieces.reduce((s, pc) => s + pc.note, 0)} / ${d.pieces.length} = ${nb(k.moyPieces, 2)}, soit ${Math.round(k.moyPieces * 10)}/100 pour « Le logement et son état ». ${X.pieces.notes || ''}`);

  // ---------- La visite en images (si des pièces ont une photo) ----------
  const avecPhoto = d.pieces.filter((pc) => pc.photo).slice(0, 3);
  if (avecPhoto.length) {
    add('photos', 'sombre', (p, n) => `${entete('La visite en images', tx(X.photos.titre))}
<div class="rangee rangee-moy">
${avecPhoto.map((pc, i) => `<div class="colonne flex1 ${anim(1 + i)}">
${photo(pc.photo, `width:${Math.floor((1664 - 32 * (avecPhoto.length - 1)) / avecPhoto.length)}px;height:470px;border-radius:16px`)}
<div class="barre-haut"><h3 class="h3 t1">${tx(pc.nom)}</h3><p class="puce-note ${clsNote10(pc.note, seuils)}-fond">${nb(pc.note)}/10</p></div>
<p class="corps t2">${tx(pc.constat)}</p>
<p class="corps t1"><span class="or">→</span> ${tx(pc.recommandation)}</p>
</div>`).join('\n')}
</div>
${pied('sombre', '', p, n)}`, X.photos.notes);
  }

  // ---------- L'annonce ----------
  const noteDe = (id) => k.criteres.find((c) => c.id === id)?.note;
  add('annonce', 'clair', (p, n) => `${entete('L’annonce : photos, titre et description', tx(X.annonce.titre))}
<div class="rangee rangee-large aligne-haut">
<div class="colonne flex1 ${anim(1)}">
<p class="etiquette ${noteDe('photos') < seuils.haut ? 'etiquette-ko' : 'etiquette-ok'}">Photos · ${nb(noteDe('photos'))}/100</p>
${d.annonce.photos.map((it) => `<div class="colonne-xs filet pad-haut-s"><h3 class="h3 t1">${tx(it.titre)}</h3><p class="corps t2">${tx(it.texte)}</p></div>`).join('\n')}
</div>
<div class="colonne flex1 ${anim(2)}">
<p class="etiquette ${noteDe('annonce') < seuils.haut ? 'etiquette-ko' : 'etiquette-ok'}">Titre et description · ${nb(noteDe('annonce'))}/100</p>
<div class="boite-titre"><p class="corps t2">Titre actuel</p><p class="titre-ancien">${tx(d.annonce.titreActuel)}</p></div>
<div class="boite-titre boite-titre-vert"><p class="corps menthe">Titre proposé · ${d.annonce.titrePropose.length} caractères sur 50</p><p class="titre-nouveau">${tx(d.annonce.titrePropose)}</p></div>
<div class="colonne-xs filet pad-haut-s"><h3 class="h3 t1">Description</h3><p class="corps t2">${tx(d.annonce.description)}</p></div>
</div>
</div>
${pied('clair', '', p, n)}`, X.annonce.notes);

  // ---------- Équipements ----------
  add('equipements', 'sombre', (p, n) => `${entete('Équipements', tx(X.equipements.titre))}
${intro(tx(X.equipements.intro))}
<div class="rangee rangee-large aligne-haut">
<div class="colonne col-600 ${anim(2)}">
<p class="etiquette corail">Déjà présents</p>
${d.equipements.presents.map((e) => `<div class="coche"><div class="coche-pt"></div><p class="corps t1">${tx(e)}</p></div>`).join('\n')}
</div>
<div class="colonne flex1 ${anim(3)}">
<p class="etiquette corail">À ajouter</p>
<div class="tableau tableau-sombre">
<div class="tab-ligne tab-entete grille-equip"><p class="t2">Équipement</p><p class="t2 droite">Budget</p></div>
${k.equip.map((e) => `<div class="tab-ligne grille-equip"><p class="t1">${tx(e.nom)}</p><p class="t1 droite fort">${fourchette(e.budget)}</p></div>`).join('\n')}
<div class="tab-ligne grille-equip tab-total-sombre"><p class="t1 fort">Total</p><p class="t1 droite fort">${fourchette(k.totalEquip)}</p></div>
</div>
</div>
</div>
${pied('sombre', '', p, n)}`,
  `Total : ${k.equip.map((e) => e.budget[0]).join(' + ')} = ${k.totalEquip[0]} ; ${k.equip.map((e) => e.budget[1]).join(' + ')} = ${k.totalEquip[1]}. ${X.equipements.notes || ''}`);

  // ---------- Expérience voyageur ----------
  add('experience', 'clair', (p, n) => `${entete('L’expérience voyageur', tx(X.experience.titre))}
${intro(tx(X.experience.intro))}
<div class="rangee rangee-large aligne-haut">
<div class="colonne col-600 ${anim(2)}">
<p class="etiquette etiquette-ok">${tx(X.experience.titrePositifs)}</p>
${X.experience.positifs.map((it) => `<div class="colonne-xs filet pad-haut-s"><h3 class="h3 t1">${tx(it.titre)}</h3><p class="corps t2">${tx(it.texte)}</p></div>`).join('\n')}
</div>
<div class="colonne flex1 ${anim(3)}">
<p class="etiquette etiquette-ko">${tx(X.experience.titreNegatifs)}</p>
${X.experience.negatifs.map((it) => `<div class="colonne-xs filet pad-haut-s"><h3 class="h3 t1">${tx(it.titre)}${it.detail ? ` <span class="t2 normal">· ${tx(it.detail)}</span>` : ''}</h3><p class="corps t2">Réponse : <span class="hl">${tx(it.reponse)}</span></p></div>`).join('\n')}
</div>
</div>
${pied('clair', '', p, n)}`, X.experience.notes);

  // ---------- Prix et calendrier ----------
  add('prix', 'clair', (p, n) => {
    // Échelle : prix actuel, moyenne du marché, prix recommandé
    const pts = [
      ...(A ? [{ v: A.prix, t: `Aujourd’hui · ${eur(A.prix)}`, cls: 'point-actuel', haut: false }] : []),
      { v: m.prixMoyenSegment, t: `Marché ${esc(m.libelleSegment)} · ${eur(m.prixMoyenSegment)}`, cls: 'point-marche', haut: true },
      { v: r.prix, t: `Recommandé · ${eur(r.prix)}`, cls: 'point-ref', haut: false },
    ];
    const vals = pts.map((x) => x.v), min = Math.min(...vals) * 0.8, max = Math.max(...vals) * 1.12, W = 1664;
    const x = (v) => Math.round((v - min) / (max - min) * W);
    const repere = (pt) => {
      const cx = x(pt.v), left = Math.max(0, Math.min(W - 320, cx - 160));
      return `<div class="echelle-point ${pt.cls}" style="left:${cx - 11}px"></div>
<p class="echelle-label ${pt.haut ? 'echelle-haut' : 'echelle-bas'} ${pt.cls === 'point-ref' ? 't1 fort' : 't2'}" style="left:${left}px">${pt.t}</p>`;
    };
    return `${entete('Prix et calendrier', tx(X.prix.titre))}
<div class="echelle ${anim(1)}">
<div class="echelle-ligne"></div>
${pts.map(repere).join('\n')}
</div>
<div class="rangee rangee-moy aligne-haut ${anim(2)}">
<div class="tableau flex1">
<div class="tab-ligne tab-entete grille-prix"><p class="t2">Réglage</p><p class="t2">Aujourd’hui</p><p class="t2">Ce qu’on recommande</p></div>
${d.prix.reglages.map((rg) => `<div class="tab-ligne grille-prix"><p class="t1 fort">${tx(rg.reglage)}</p><p class="t2">${tx(rg.actuel)}</p><p class="t1">${tx(rg.recommande)}</p></div>`).join('\n')}
</div>
<div class="carte fond-vert col-480">
<p class="corps menthe">Prix recommandé</p>
<p class="chiffre-l or">${eur(r.prix)} <span class="menthe">/ nuit</span></p>
<p class="corps menthe">${tx(X.prix.encadre)}</p>
</div>
</div>
${pied('clair', sourceMarche, p, n)}`;
  }, `Prix recommandé = scénario ${r.nom.toLowerCase()} (${eur(r.prix)}), le même que sur la page des revenus. Marché : ${m.source}, ${m.libelleSegment} à ${eur(m.prixMoyenSegment)}. ${X.prix.notes || ''}`);

  // ---------- Avis, réactivité et visibilité ----------
  add('visibilite', 'sombre', (p, n) => `${entete('Avis, réactivité et visibilité', tx(X.visibilite.titre))}
${intro(tx(X.visibilite.intro))}
<div class="rangee ${anim(2)}">
${X.visibilite.indicateurs.map((it) => `<div class="kpi filet"><p class="chiffre-l t1">${tx(it.avant)} <span class="corail">→</span> <span class="or">${tx(it.apres)}</span></p><p class="corps t2">${tx(it.label)}</p></div>`).join('\n')}
</div>
<div class="rangee rangee-moy ${anim(3)}">
${X.visibilite.actions.map((bl) => `<div class="colonne-serree flex1"><h3 class="h3 t1">${tx(bl.titre)}</h3><p class="corps t2">${tx(bl.texte)}</p></div>`).join('\n')}
</div>
${pied('sombre', '', p, n)}`, X.visibilite.notes);

  // ---------- Réglementation ----------
  add('reglementation', 'clair', (p, n) => `${entete('Réglementation', tx(X.reglementation.titre))}
<div class="grille-3 ${anim(1)}">
${d.reglementation.map((rg) => {
    const [lib, cls] = STATUTS[rg.statut] || (() => { throw new Error(`Statut inconnu « ${rg.statut} » (ok, faire, verifier)`); })();
    return `<div class="carte fond-sable-fonce carte-regle"><p class="puce ${cls}">${lib}</p><div class="colonne-xs"><h3 class="h3 t1">${tx(rg.titre)}</h3><p class="corps t2">${tx(rg.texte)}</p></div></div>`;
  }).join('\n')}
</div>
${pied('clair', 'Informations générales, ne remplacent pas un conseil juridique : à confirmer auprès de la mairie', p, n)}`, X.reglementation.notes);

  // ---------- Plan d'action ----------
  add('plan', 'clair', (p, n) => `${entete('Plan d’action', tx(X.plan.titre))}
<div class="tableau ${anim(1)}">
<div class="tab-ligne tab-entete grille-plan"><p class="t2">#</p><p class="t2">Action</p><p class="t2 droite">Coût</p><p class="t2">Effet attendu</p><p class="t2">Qui</p></div>
${k.plan.map((a, i) => `<div class="tab-ligne tab-serree grille-plan"><p class="corail fort">${i + 1}</p><p class="t1 fort">${tx(a.action)}</p><p class="t1 droite fort">${fourchette(a.cout)}</p><p class="t2">${tx(a.effet)}</p><p class="t1">${tx(a.qui)}</p></div>`).join('\n')}
<div class="tab-ligne tab-serree grille-plan tab-total"><p></p><p class="fort">Total à votre charge</p><p class="droite fort">${fourchette(k.totalPlan)}</p><p class="menthe">Remboursé ${esc(k.remboursement)}</p><p></p></div>
</div>
${pied('clair', '', p, n)}`,
  `Total : ${k.plan.map((a) => a.cout[0]).join(' + ')} = ${k.totalPlan[0]} ; ${k.plan.map((a) => a.cout[1]).join(' + ')} = ${k.totalPlan[1]}. Remboursement : ${k.totalPlan[1]} / ${nb(k.gain, 2)} € de gain mensuel = ${isFinite(k.mois) ? nb(k.mois, 1) : '—'} mois. Les 3 premières lignes portent les 3 priorités de la synthèse. ${X.plan.notes || ''}`);

  // ---------- Revenus avant / après ----------
  add('revenus', 'clair', (p, n) => {
    const lignes = [
      ...(A ? [{ nom: 'Aujourd’hui, géré seul', ...A, cls: 'tab-actuel' }] : []),
      ...ids.map((id) => ({ ...S[id], cls: id === r.id ? 'tab-ref' : '' })),
    ];
    const max = Math.max(...lignes.map((l) => l.net));
    return `${entete('Vos revenus, avant et après', tx(X.revenus.titre))}
${intro(tx(X.revenus.intro))}
<div class="tableau ${anim(2)}">
<div class="tab-ligne tab-entete grille-rev"><p class="t2">Situation</p><p class="t2 droite">Prix/nuit</p><p class="t2 droite">Nuits/mois</p><p class="t2 droite">Revenus/mois</p><p class="t2">Net/mois</p><p class="t2 droite">Net/an</p></div>
${lignes.map((l) => `<div class="tab-ligne tab-serree grille-rev ${l.cls}"><p class="${l.cls === 'tab-actuel' ? 't2' : 't1'} ${l.cls === 'tab-ref' ? 'fort' : ''}">${esc(l.nom)}</p><p class="t1 droite">${eur(l.prix)}</p><p class="t1 droite">${nb(l.nuits)}</p><p class="t1 droite">${eur(l.ca)}</p><div class="barre-net"><div class="piste flex1"><div class="barre ${l.cls === 'tab-actuel' ? 'barre-sourde' : l.cls === 'tab-ref' ? 'barre-or' : 'barre-vert'}" style="width:${(l.net / max * 100).toFixed(1)}%"></div></div><p class="t1 fort droite val-net">${eur(l.net)}</p></div><p class="t1 droite">${eur(arrondi(l.netAn, 100))}</p></div>`).join('\n')}
</div>
<div class="rangee ${anim(3)}">
<div class="gain"><p class="corps t2">Gain net, scénario ${esc(r.nom.toLowerCase())}</p><p class="chiffre-m t1">+${eur(k.gain)} <span class="t2">/ mois</span></p></div>
<div class="gain"><p class="corps t2">Sur un an</p><p class="chiffre-m t1">+${eur(arrondi(k.gain * 12, 100))}</p></div>
<div class="gain"><p class="corps t2">Investissement remboursé</p><p class="chiffre-m t1">${esc(k.remboursement)}</p></div>
</div>
${pied('clair', `Net = revenus − Haveo ${pct(h.commissionHaveo)} (TVA non applicable) − plateforme ${pct(h.fraisPlateforme)} − linge ${eur(h.lingeParNuit)}/nuit`, p, n)}`;
  }, [
    A ? `Aujourd’hui : ${eur(A.ca)} − ${eur2(A.plateforme)} (plateforme) − ${eur(A.linge)} (linge) = ${eur2(A.net)}, sans commission mais tout le travail pour le propriétaire.` : '',
    ...ids.map((id) => { const s = S[id]; return `${s.nom} : ${eur(s.prix)} × ${s.nuits} = ${eur(s.ca)} − ${eur2(s.commission)} − ${eur2(s.plateforme)} − ${eur(s.linge)} = ${eur2(s.net)}.`; }),
    `Gain : ${eur2(k.gain)} par mois. Mêmes scénarios que l’étude de marché.`, X.revenus.notes || '',
  ].filter(Boolean).join(' '));

  // ---------- Services Haveo ----------
  add('services', 'sombre', (p, n) => `${entete('Les services Haveo pour ce logement', tx(X.services.titre))}
<div class="rangee rangee-moy aligne-haut">
<div class="grille-2 flex1 ${anim(1)}">
${d.services.map((sv) => `<div class="colonne-xs filet pad-haut-s"><h3 class="h3 t1">${tx(sv.titre)}</h3><p class="corps t2">${tx(sv.texte)}</p></div>`).join('\n')}
</div>
<div class="carte fond-sable col-480 offre ${anim(2)}">
<p class="corps t2">Notre formule</p>
<p class="offre-v t1">${pct(h.commissionHaveo)}</p>
<p class="corps t2">des revenus locatifs. TVA non applicable. Aucuns frais d’entrée.</p>
<div class="sep"></div>
<p class="offre-l t1">1er mois offert</p>
<p class="offre-l t1">Sans engagement, contrat résiliable</p>
<p class="offre-l t1">Audit et visite gratuits</p>
</div>
</div>
${pied('sombre', '', p, n)}`, `Garder seulement les services utiles à ce logement (8 au maximum). Commission : ${pct(h.commissionHaveo)} des revenus locatifs, TVA non applicable (micro-entreprise, art. 293 B du CGI). Le 1er mois d’honoraires est offert après la première mise en location ; ménage, linge et consommables restent facturés.`);

  // ---------- Et après ----------
  add('apres', 'clair', (p, n) => `${entete('Et après l’audit ?', 'Vous choisissez. Aucun engagement.')}
${intro(tx(X.apres.intro))}
<div class="rangee rangee-moy aligne-haut">
<div class="carte fond-sable-fonce choix ${anim(2)}"><p class="choix-n t1">A</p><h3 class="choix-t t1">Vous appliquez nos conseils</h3><p class="corps t2">${tx(X.apres.optionA)}</p></div>
<div class="carte fond-vert choix ${anim(3)}"><p class="choix-n corail">B</p><h3 class="choix-t t1">Vous nous confiez votre logement</h3><p class="corps t2">${tx(X.apres.optionB)}</p></div>
</div>
<div class="contact filet ${anim(4)}">
<p class="contact-t t1">Une question sur cet audit ?</p>
<div class="espace"></div>
<div class="contact-item"><p class="corps t2">WhatsApp</p><p class="contact-v t1"><a class="mail" href="${lienWhatsApp(d.contact.whatsapp)}">${esc(d.contact.whatsapp)}</a></p></div>
<div class="contact-item"><p class="corps t2">E-mail</p><p class="contact-v t1"><a class="mail" href="mailto:${esc(d.contact.email)}">${esc(d.contact.email)}</a></p></div>
</div>
${pied('clair', '', p, n)}`, 'Toujours finir par les deux options : l’audit doit avoir de la valeur même sans signature.');

  return L;
}

// ============================================================
// 4. CSS PARTAGÉ DU DECK
// ============================================================
const CSS = `/* Haveo · audit du logement — styles partagés (générés par generer.mjs) */
section{font-family:'Plus Jakarta Sans', Arial, sans-serif;box-sizing:border-box;padding:120px 128px 160px;display:flex;flex-direction:column;gap:32px}
.sombre{background:${C.vert};color:${C.sable}}
.clair{background:${C.sable};color:${C.vert}}

/* Couleurs de texte selon le fond */
.sombre .t1{color:${C.sable}}
.sombre .t2{color:${C.menthe}}
.clair .t1{color:${C.vert}}
.clair .t2{color:${C.vertSourd}}
.sombre .hl{color:${C.sable}}
.clair .hl{color:${C.vert}}
.clair .fond-vert .t1{color:${C.sable}}
.clair .fond-vert .t2{color:${C.menthe}}
.sombre .fond-sable .t1{color:${C.vert}}
.sombre .fond-sable .t2{color:${C.vertSourd}}
.or{color:${C.or}}
.corail{color:${C.corail}}
.menthe{color:${C.menthe}}
.fort{font-weight:600}
.normal{font-weight:400}
.droite{text-align:right}

/* Fonds de cartes */
.fond-vert{background:${C.vert}}
.fond-sable{background:${C.sable}}
.fond-sable-fonce{background:${C.sableFonce}}

/* Filets */
.sombre .filet{border-top:1px solid rgba(244,235,221,0.16)}
.clair .filet{border-top:1px solid rgba(15,76,76,0.14)}
.pad-haut-s{padding-top:14px}

/* En-tête de slide */
.entete{display:flex;flex-direction:column;gap:16px}
.surtitre{display:flex;flex-direction:row;align-items:center;gap:12px}
.pastille{width:12px;height:12px;background:${C.corail};border-radius:6px}
.surtitre-txt{font-size:24px;font-weight:500;line-height:1.25}
.titre{font-size:60px;font-weight:500;line-height:1.1;letter-spacing:-1.6px}
.intro{font-size:26px;line-height:1.5;width:1400px}

/* Échelle typographique */
.h3{font-size:28px;font-weight:500;line-height:1.3}
.corps{font-size:24px;line-height:1.5}
.label{font-size:24px;line-height:1.3}
.etiquette{font-size:24px;font-weight:600;letter-spacing:1px;line-height:1.3}
.etiquette-ok{color:${C.vert}}
.etiquette-ko{color:${C.corailFonce}}
.chiffre-xl{font-size:72px;font-weight:500;line-height:1;letter-spacing:-2px;font-variant-numeric:tabular-nums}
.chiffre-l{font-size:60px;font-weight:500;line-height:1.1;letter-spacing:-1.2px;font-variant-numeric:tabular-nums}
.chiffre-m{font-size:44px;font-weight:500;line-height:1.1;letter-spacing:-1px;font-variant-numeric:tabular-nums}

/* Mise en page */
.rangee{display:flex;flex-direction:row;gap:32px}
.rangee-moy{gap:32px}
.rangee-large{gap:64px}
.aligne-haut{align-items:flex-start}
.colonne{display:flex;flex-direction:column;gap:16px}
.colonne-serree{display:flex;flex-direction:column;gap:8px}
.colonne-xs{display:flex;flex-direction:column;gap:4px}
.flex1{flex:1}
.col-600{width:600px}
.col-480{width:480px;box-sizing:border-box}
.grille-2{display:grid;grid-template-columns:1fr 1fr;gap:24px 32px}
.grille-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:32px}
.carte{display:flex;flex-direction:column;gap:12px;padding:32px;border-radius:16px}
.espace{flex:1}
.kpi{flex:1;display:flex;flex-direction:column;gap:8px;padding-top:20px}
.barre-haut{display:flex;flex-direction:row;justify-content:space-between;align-items:center;gap:16px}

/* Synthèse */
.barres{width:760px;display:flex;flex-direction:column;gap:18px}
.piste{height:12px;border-radius:6px;overflow:hidden}
.clair .piste{background:#E3D6C1}
.sombre .piste{background:rgba(244,235,221,0.1)}
.barre{height:100%;border-radius:6px}
.barre-vert{background:${C.vert}}
.barre-or{background:${C.or}}
.barre-corail{background:${C.corail}}
.barre-sourde{background:${C.mentheSourd}}
.legende{font-size:24px;line-height:1.3;display:flex;flex-direction:row;align-items:center;gap:10px}
.legende-pt{display:inline-block;width:14px;height:14px;border-radius:7px;margin-left:14px}
.carte-score{display:flex;flex-direction:row;align-items:center;gap:32px;background:${C.vert};padding:20px 32px;border-radius:16px}
.score-titre{font-size:32px;font-weight:500;color:${C.sable}}
.prio{display:flex;flex-direction:row;gap:20px;align-items:flex-start;padding-top:16px}
.prio-n{width:48px;height:48px;border-radius:24px;background:${C.corail};color:${C.sable};font-size:24px;font-weight:600;text-align:center;line-height:48px}

/* Notes des pièces */
.note-ok{color:${C.vert}}
.note-moy{color:${C.orFonce}}
.note-ko{color:${C.corail}}
.puce-note{font-size:24px;font-weight:600;padding:4px 16px;border-radius:20px;color:${C.vert}}
.note-ok-fond{background:${C.menthe}}
.note-moy-fond{background:${C.or}}
.note-ko-fond{background:${C.corail}}

/* Tableaux */
.tableau{display:flex;flex-direction:column;font-variant-numeric:tabular-nums}
.tab-ligne{display:grid;gap:24px;padding:13px 16px;border-bottom:1px solid rgba(15,76,76,0.14);font-size:24px;line-height:1.4;align-items:center}
.tab-ligne p{font-size:24px;line-height:1.4}
.tab-serree{padding:10px 16px}
.tab-entete{padding-top:0px;font-weight:500}
.tableau-sombre .tab-ligne{border-bottom:1px solid rgba(244,235,221,0.16)}
.tab-ref{background:${C.sableFonce};border-radius:10px}
.tab-total{background:${C.vert};color:${C.sable};border-radius:10px}
.tab-total-sombre{background:${C.vertCarte};border-radius:10px}
.grille-pieces{grid-template-columns:260px 90px 1fr 520px}
.grille-equip{grid-template-columns:1fr 200px}
.grille-prix{grid-template-columns:300px 1fr 1.3fr}
.grille-plan{grid-template-columns:40px 1.2fr 210px 1.1fr 210px}
.grille-rev{grid-template-columns:310px 140px 150px 180px 1fr 160px}
.barre-net{display:flex;flex-direction:row;align-items:center;gap:16px}
.val-net{width:130px}

/* Annonce */
.boite-titre{display:flex;flex-direction:column;gap:4px;border:1px solid rgba(15,76,76,0.2);padding:16px 24px;border-radius:12px}
.boite-titre-vert{background:${C.vert};border:1px solid ${C.vert}}
.titre-ancien{font-size:30px;font-weight:500;line-height:1.3;color:${C.vertSourd};text-decoration:line-through}
.titre-nouveau{font-size:30px;font-weight:600;line-height:1.3;color:${C.sable}}

/* Équipements */
.coche{display:flex;flex-direction:row;align-items:center;gap:16px}
.coche-pt{width:14px;height:14px;border-radius:7px;background:${C.or}}

/* Échelle de prix */
.echelle{position:relative;width:1664px;height:124px}
.echelle-ligne{position:absolute;left:0px;top:61px;width:1664px;height:2px;background:rgba(15,76,76,0.25)}
.echelle-point{position:absolute;top:51px;width:22px;height:22px;border-radius:11px;box-sizing:border-box}
.point-marche{background:${C.sable};border:3px solid ${C.vertSourd}}
.point-actuel{background:${C.corail}}
.point-ref{background:${C.or};border:3px solid ${C.vert}}
.echelle-label{position:absolute;width:320px;font-size:24px;line-height:1.2;text-align:center;white-space:nowrap}
.echelle-haut{top:4px}
.echelle-bas{top:90px}

/* Réglementation */
.carte-regle{padding:24px}
.puce{font-size:24px;font-weight:600;padding:4px 16px;border-radius:20px;width:170px;text-align:center;box-sizing:border-box}
.puce-ok{background:${C.vert};color:${C.sable}}
.puce-ko{background:${C.corailFonce};color:#FFF8F0}
.puce-verif{background:${C.or};color:${C.vert}}

/* Revenus */
.gain{flex:1;display:flex;flex-direction:column;gap:4px;border-top:2px solid ${C.or};padding-top:16px}

/* Services */
.offre{padding:36px}
.offre-v{font-size:96px;font-weight:600;line-height:1;letter-spacing:-2px}
.offre-l{font-size:26px;font-weight:500;line-height:1.4}
.sep{height:1px;background:rgba(15,76,76,0.2)}

/* Après l'audit */
.choix{flex:1;padding:36px}
.choix-n{font-size:44px;font-weight:600;line-height:1}
.choix-t{font-size:36px;font-weight:500;line-height:1.2}
.contact{display:flex;flex-direction:row;align-items:center;gap:24px;padding-top:20px}
.contact-t{font-size:26px;font-weight:600}
.contact-item{display:flex;flex-direction:column;gap:2px;padding-left:32px;border-left:1px solid rgba(15,76,76,0.2)}
.contact-v{font-size:28px;font-weight:600}
.mail{color:${C.vert};text-decoration:underline;text-decoration-color:${C.corail};text-decoration-thickness:2px;text-underline-offset:6px}

/* Couverture */
section.couv{padding:128px 128px 160px;justify-content:center}
.couv-marque{position:absolute;left:1300px;top:240px;width:520px;height:600px}
.logo-couverture{position:absolute;left:128px;top:96px;width:560px;height:88px;display:flex;flex-direction:row;align-items:center;gap:24px}
.logo-texte{display:flex;flex-direction:column;gap:4px}
.logo-nom{font-size:48px;font-weight:500;line-height:1;letter-spacing:-1px;color:${C.sable}}
.logo-sous{font-size:24px;line-height:1.2;letter-spacing:8px;color:${C.menthe}}
.couv-surtitre{font-size:24px;font-weight:500;color:${C.menthe}}
.couv-titre{font-size:80px;font-weight:500;line-height:1.06;letter-spacing:-2.4px;color:${C.sable};width:1150px}
.couv-intro{font-size:28px;line-height:1.5;color:${C.menthe};width:1050px}
.couv-fort{color:${C.sable}}
.couv-date{position:absolute;left:128px;bottom:64px;width:900px;font-size:24px;color:${C.menthe}}

/* Pied de page */
.pied{position:absolute;left:128px;bottom:64px;width:1664px;height:40px;display:flex;flex-direction:row;align-items:center;gap:12px}
.pied-logo{font-size:28px;font-weight:500;line-height:1}
.pied-info{font-size:24px;line-height:1;font-variant-numeric:tabular-nums}

/* Arrivée des éléments */
@keyframes monte{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0px)}}
.anim{animation:monte 560ms cubic-bezier(0.22,1,0.36,1) both;animation-delay:calc(var(--i) * 90ms)}
`;

// ============================================================
// 5. ÉCRITURE
// ============================================================
async function ecrire(fichierFiche, { avecPdf, verifier }) {
  const d = JSON.parse(fs.readFileSync(fichierFiche, 'utf8'));
  const dossierFiche = path.dirname(path.resolve(fichierFiche));
  const k = calculer(d);
  T = jetons(d, k);
  PHOTOS = d.photos || {};

  const sortie = path.join(ICI, 'sortie', d.slug);
  const projet = path.join(sortie, 'deck', 'project');
  fs.rmSync(path.join(projet, 'slides'), { recursive: true, force: true });
  fs.mkdirSync(path.join(projet, 'slides'), { recursive: true });
  for (const p of Object.values(PHOTOS)) {
    if (p.fichier) p.apercu = path.relative(sortie, path.resolve(dossierFiche, p.fichier)).split(path.sep).join('/');
  }

  const liste = slides(d, k);
  const n = liste.length;
  const rendu = (mode) => {
    MODE = mode;
    return liste.map((s, i) => ({ ...s, html: section(s.id, s.theme, s.fn(i + 1, n).trim(), s.notes, s.cls) }));
  };

  // --- Deck (format Slides de claude.ai) ---
  const deck = rendu('deck');
  for (const s of deck) fs.writeFileSync(path.join(projet, 'slides', `${s.id}.html`), s.html);
  fs.writeFileSync(path.join(projet, 'deck.css'), CSS);
  const ordre = deck.map((s) => s.id);
  const debut = (...c) => c.find((id) => ordre.includes(id));
  const index = {
    v: 5,
    createdOnFiles: { v: 1, at: d.deck?.creeLe || new Date().toISOString() },
    lists: 'css',
    format: { v: 1, shared: ['project/deck.css'] },
    title: d.deck?.titre || `Audit du logement – ${d.bien.ville}`,
    cover: 'cover',
    order: ordre,
    sections: {
      s1: { description: 'La synthèse et la situation actuelle', start: 'cover' },
      s2: { description: 'L’analyse détaillée du logement et de l’annonce', start: debut('bien') },
      s3: { description: 'La réglementation, le plan d’action et les revenus', start: debut('reglementation') },
      s4: { description: 'L’offre Haveo et la suite', start: debut('services') },
    },
    faces: { 'plus-jakarta-sans': POLICE },
    designSystems: [],
  };
  fs.writeFileSync(path.join(projet, 'deck.json'), JSON.stringify(index));

  // --- Aperçu local ---
  const apercu = rendu('apercu');
  const page = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(index.title)}</title>
<link rel="stylesheet" href="${POLICE.href}">
<style>
${CSS}
/* Reproduction des réglages par défaut du lecteur Slides */
html,body{margin:0;background:#1d2b2b}
body{font-family:'Plus Jakarta Sans', Arial, sans-serif}
h1,h2,h3,p{margin:0}
aside{display:none}
section{position:relative;width:1920px;height:1080px;overflow:hidden}
.cadre{width:1920px;height:1080px;margin:0 auto 24px;transform-origin:0 0}
.anim{animation:none}
@media print{@page{size:1920px 1080px;margin:0}html,body{background:none}.cadre{margin:0!important;transform:none!important;height:1080px!important;break-after:page}}
</style></head><body>
${apercu.map((s) => `<div class="cadre">\n${s.html}</div>`).join('\n')}
<script>
function ajuster(){var e=Math.min(1,(innerWidth-32)/1920);document.querySelectorAll('.cadre').forEach(function(c){c.style.transform='scale('+e+')';c.style.marginLeft=Math.max(16,(innerWidth-1920*e)/2)+'px';c.style.height=(1080*e)+'px';c.style.marginBottom='24px'});}
if(!matchMedia('print').matches&&!location.hash.includes('brut')){addEventListener('resize',ajuster);ajuster();}
</script>
</body></html>`;
  const fichierApercu = path.join(sortie, 'apercu.html');
  fs.writeFileSync(fichierApercu, page);

  // --- Résumé console ---
  console.log(`\n${index.title}`);
  console.log(`  ${n} slides → ${path.relative(process.cwd(), projet)}`);
  console.log(`  Aperçu    → ${path.relative(process.cwd(), fichierApercu)}`);
  console.log(`  Note globale ${k.noteGlobale}/100 · ` + k.criteres.map((c) => `${c.nom} ${c.note}`).join(' · '));
  console.log(`  Équipements ${fourchette(k.totalEquip)} · Plan d’action ${fourchette(k.totalPlan)} à la charge du propriétaire`);
  if (k.actuel) console.log(`  Aujourd’hui ${eur(k.actuel.prix)} × ${k.actuel.nuits} nuits → net ${eur(k.actuel.net)}/mois`);
  for (const s of Object.values(k.sc)) console.log(`  ${s.nom.padEnd(9)} ${eur(s.prix).padStart(7)} × ${String(s.nuits).padStart(2)} nuits → net ${eur(s.net)}/mois`);
  console.log(`  Gain ${eur(k.gain)}/mois · investissement remboursé ${k.remboursement}`);

  if (verifier || avecPdf) {
    const pw = await chargerPlaywright();
    if (!pw) console.log('  (Vérification et PDF ignorés : Playwright n’est pas installé)');
    else {
      if (verifier) await controler(pw, fichierApercu);
      if (avecPdf) await pdf(pw, fichierApercu, path.join(sortie, `${d.slug}.pdf`));
    }
  }
  if (AVERTISSEMENTS.length) {
    console.log('\n⚠ À vérifier :');
    for (const a of AVERTISSEMENTS) console.log(`  - ${a}`);
  } else console.log('\n✓ Aucune incohérence détectée');
}

async function chargerPlaywright() {
  try { const m = await import('playwright'); return m.chromium ? m : m.default; } catch {}
  try { return createRequire(import.meta.url)('playwright'); } catch {}
  return null;
}

// Contrôle de mise en page : rien ne doit dépasser de la slide,
// ni descendre dans la zone du pied de page (sauf le pied lui-même).
async function controler(pw, html) {
  const nav = await pw.chromium.launch();
  const page = await nav.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.resolve(html) + '#brut', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const problemes = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('section').forEach((s) => {
      const R = s.getBoundingClientRect();
      s.querySelectorAll('*').forEach((el) => {
        if (el.closest('.pied, .couv-date, svg, aside')) return;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const txt = (el.textContent || el.getAttribute('alt') || el.tagName).trim().slice(0, 50);
        if (r.right > R.right - 100 + 0.5 || r.left < R.left + 100 - 0.5) out.push(`${s.id} : déborde sur les côtés « ${txt} »`);
        else if (r.bottom > R.top + 935) out.push(`${s.id} : descend dans le pied de page (${Math.round(r.bottom - R.top)} px) « ${txt} »`);
        if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow === 'visible' && el.children.length === 0 && el.tagName === 'P') out.push(`${s.id} : texte trop long « ${txt} »`);
      });
    });
    return [...new Set(out)];
  });
  await nav.close();
  if (problemes.length) for (const p of problemes) AVERTISSEMENTS.push('Mise en page — ' + p);
  else console.log('  Mise en page vérifiée : rien ne déborde');
}

async function pdf(pw, html, sortiePdf) {
  const nav = await pw.chromium.launch();
  const page = await nav.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.resolve(html) + '#brut', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: sortiePdf, width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
  await nav.close();
  console.log(`  PDF       → ${path.relative(process.cwd(), sortiePdf)}`);
}

// ============================================================
const args = process.argv.slice(2);
const fiche = args.find((a) => !a.startsWith('--'));
if (!fiche) {
  console.error('Usage : node generer.mjs biens/<bien>.json [--pdf] [--verifier]');
  process.exit(1);
}
await ecrire(fiche, { avecPdf: args.includes('--pdf'), verifier: args.includes('--verifier') });
