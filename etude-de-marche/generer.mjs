#!/usr/bin/env node
// ============================================================
// HAVEO — Générateur d'étude de marché
// ------------------------------------------------------------
// Une fiche JSON par bien (dossier biens/) → tous les calculs
// sont faits ici, une seule fois, puis réutilisés sur chaque
// slide. Sortie :
//   sortie/<slug>/deck/project/...   fichiers du deck Slides (claude.ai)
//   sortie/<slug>/apercu.html        aperçu local, toutes les slides
//   sortie/<slug>/<slug>.pdf         avec --pdf (Playwright requis)
//
// Usage : node generer.mjs biens/boulogne-exemple.json [--pdf]
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ICI = path.dirname(fileURLToPath(import.meta.url));

// ---------- Palette Haveo (identique au site) ----------
const C = {
  vert: '#0F4C4C', vertCarte: '#155757', sable: '#F4EBDD', sableFonce: '#EBE0CE',
  creme: '#FBF7F0', corail: '#F26B5B', or: '#E8B04A', menthe: '#BFD8D5',
  mentheSourd: '#8FB3AE', vertSourd: '#3D7272',
};
const POLICE = { family: 'Plus Jakarta Sans', href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap' };

// ---------- Formats français ----------
const NBSP = ' ';
const nb = (n, d = 0) => n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/[   ]/g, NBSP);
const eur = (n) => nb(Math.round(n)) + NBSP + '€';
const eur2 = (n) => nb(n, 2) + NBSP + '€';
const pct = (n) => nb(n, Number.isInteger(n) ? 0 : 1) + NBSP + '%';
const ratio = (n) => nb(n, 1);
const arrondi = (n, pas) => Math.round(n / pas) * pas;

// ============================================================
// 1. CALCULS
// ============================================================
function calculer(d) {
  const h = d.hypotheses;
  const sc = {};
  for (const s of d.scenarios) {
    const ca = s.prix * s.nuits;
    const commission = ca * h.commissionHaveo / 100;
    const plateforme = ca * h.fraisPlateforme / 100;
    const linge = s.nuits * h.lingeParNuit;
    const net = ca - commission - plateforme - linge;
    sc[s.id] = {
      ...s, ca, commission, plateforme, linge, net,
      netAn: net * 12,
      occupation: Math.round(s.nuits / h.joursParMois * 100),
    };
  }
  const ref = d.scenarios.find((s) => s.reference) || d.scenarios[Math.floor(d.scenarios.length / 2)];
  const loyerLD = d.bien.surface * d.marche.loyerM2;
  for (const s of Object.values(sc)) s.ratio = s.net / loyerLD;
  const r = sc[ref.id];
  return {
    sc, ref: r, loyerLD,
    nuitsEquivalent: Math.ceil(r.ca / d.marche.prixMoyenTous),
    parts: {
      net: r.net / r.ca * 100,
      commission: h.commissionHaveo,
      plateforme: h.fraisPlateforme,
      linge: r.linge / r.ca * 100,
    },
  };
}

// ---------- Jetons {…} utilisables dans les textes ----------
function jetons(d, k) {
  const t = {
    ville: d.bien.ville, codePostal: d.bien.codePostal, quartier: d.bien.quartier,
    type: d.bien.type, gamme: d.bien.gamme,
    surface: nb(d.bien.surface), voyageurs: nb(d.bien.voyageurs),
    libelleSegment: d.marche.libelleSegment, source: d.marche.source,
    sourceLoyer: d.marche.sourceLoyer, moisLoyer: d.marche.moisLoyer, moisPic: d.marche.moisPic,
    prixMoyenSegment: eur(d.marche.prixMoyenSegment), prixMoyenTous: eur(d.marche.prixMoyenTous),
    occupationSegment: pct(d.marche.occupationSegment), occupationTous: pct(d.marche.occupationTous),
    occupationPic: pct(d.marche.occupationPic),
    loyerM2: eur2(d.marche.loyerM2), loyerLD: eur(arrondi(k.loyerLD, 10)),
    commission: pct(d.hypotheses.commissionHaveo), plateforme: pct(d.hypotheses.fraisPlateforme),
    linge: eur(d.hypotheses.lingeParNuit),
    nuitsEquivalent: nb(k.nuitsEquivalent),
  };
  for (const [id, s] of Object.entries(k.sc)) {
    Object.assign(t, {
      [`prix.${id}`]: eur(s.prix), [`nuits.${id}`]: nb(s.nuits), [`occ.${id}`]: pct(s.occupation),
      [`ca.${id}`]: eur(s.ca), [`net.${id}`]: eur(s.net), [`netAn.${id}`]: eur(s.netAn),
      [`netEnviron.${id}`]: eur(arrondi(s.net, 100)), [`ratio.${id}`]: ratio(s.ratio),
    });
  }
  return t;
}

// ============================================================
// 2. OUTILS DE MISE EN PAGE
// ============================================================
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let T = {}; // jetons du bien en cours
// Texte libre → HTML : échappement, jetons {…}, **mise en avant**
function tx(s) {
  if (s == null) return '';
  let out = esc(s).replace(/\{([\w.]+)\}/g, (m, cle) => {
    if (!(cle in T)) throw new Error(`Jeton inconnu {${cle}} dans : « ${s} »`);
    return esc(T[cle]);
  });
  return out.replace(/\*\*(.+?)\*\*/g, '<span class="hl">$1</span>');
}
// Texte brut (notes de l'orateur) : jetons remplacés, sans mise en forme
const brut = (s) => (s == null ? '' : String(s).replace(/\{([\w.]+)\}/g, (m, cle) => {
  if (!(cle in T)) throw new Error(`Jeton inconnu {${cle}} dans : « ${s} »`);
  return T[cle];
}).replace(/\*\*/g, ''));

const logo = (couleur, l = 35, h = 40) =>
  `<svg aria-label="Logo Haveo" width="${l}" height="${h}" viewBox="356 259 320 367"><path d="M390 293 V592 M390 453 L483 363 L576 451 V592" fill="none" stroke="${couleur}" stroke-width="56" stroke-linecap="round" stroke-linejoin="round"/><circle cx="646" cy="586" r="24" fill="${C.corail}"/></svg>`;

const anim = (i) => `anim" style="--i:${i}`;

function entete(surtitre, titre, i = 0) {
  return `<div class="entete ${anim(i)}">
<div class="surtitre"><div class="pastille"></div><p class="surtitre-txt t2">${surtitre}</p></div>
<h2 class="titre t1">${titre}</h2>
</div>`;
}
const intro = (texte, i = 1, cls = '') => `<p class="intro t2 ${cls} ${anim(i)}">${texte}</p>`;

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

function photo(d, cle, style) {
  const p = d.photos[cle];
  if (!p) throw new Error(`Photo « ${cle} » absente de la fiche`);
  const src = MODE === 'deck' ? p.blob : p.apercu;
  if (!src) return `<img alt="${esc(p.alt)}" style="${style};background:${C.sableFonce}">`;
  return `<img src="${esc(src)}" alt="${esc(p.alt)}" style="${style};object-fit:cover">`;
}

function section(id, theme, contenu, notes, extraCls = '') {
  const aside = notes ? `\n<aside>${esc(notes)}</aside>` : '';
  return `<section id="${id}" class="${theme} ${extraCls}" data-transition="fade">\n${contenu}${aside}\n</section>\n`;
}

// Barre horizontale (graphiques)
const barre = (largeurPct, cls) => `<div class="piste"><div class="barre ${cls}" style="width:${largeurPct.toFixed(1)}%"></div></div>`;

let MODE = 'deck';

// ============================================================
// 3. LES SLIDES
// ============================================================
function slides(d, k) {
  const X = d.textes, b = d.bien, m = d.marche, r = k.ref, S = k.sc;
  const ids = d.scenarios.map((s) => s.id);
  const L = [];
  const add = (id, theme, fn, notes, cls = '') => L.push({ id, theme, fn, notes: brut(notes), cls });

  // ---------- 1. Couverture ----------
  add('cover', 'sombre', () => `
${photo(d, 'couverture', 'position:absolute;left:1040px;top:0px;width:880px;height:1080px')}
<div class="voile-couverture"></div>
<div class="logo-couverture">
${logo(C.sable, 77, 88)}
<div class="logo-texte"><p class="logo-nom">haveo<span class="corail">.</span></p><p class="logo-sous">conciergerie</p></div>
</div>
<div class="surtitre ${anim(0)}"><div class="pastille"></div><p class="couv-surtitre">Analyse de rentabilité · ${tx(b.gamme)}</p></div>
<h1 class="couv-titre ${anim(1)}">${tx(b.type)} à ${tx(b.ville)}</h1>
<p class="couv-intro ${anim(2)}">${tx(X.couverture.intro)}</p>
<p class="couv-meta ${anim(3)}"><span class="couv-fort">Préparé pour ${tx(d.proprietaire)}</span> · ${tx('{surface}')} m² · ${tx('{voyageurs}')} voyageurs</p>
<p class="couv-date">${tx(d.date)} · Étude réalisée par Haveo Conciergerie</p>`,
    X.couverture.notes);

  // ---------- 2. Synthèse (nouveau) ----------
  add('synthese', 'clair', (p, n) => {
    const max = Math.max(...Object.values(S).map((s) => s.net), k.loyerLD);
    const lignes = [
      ...ids.map((id) => ({ nom: S[id].nom, val: S[id].net, cls: id === r.id ? 'barre-or' : 'barre-vert', fort: id === r.id })),
      { nom: 'Location classique', val: k.loyerLD, cls: 'barre-corail', fort: false },
    ];
    return `${entete('En bref', tx(X.synthese.titre))}
${intro(tx(X.synthese.intro))}
<div class="rangee ${anim(2)}">
<div class="carte fond-creme flex1"><p class="label t2">Prix recommandé</p><p class="chiffre-m t1">${eur(r.prix)}</p><p class="corps t2">par nuit, ajusté chaque semaine</p></div>
<div class="carte fond-creme flex1"><p class="label t2">Occupation visée</p><p class="chiffre-m t1">${pct(r.occupation)}</p><p class="corps t2">soit ${nb(r.nuits)} nuits par mois</p></div>
<div class="carte fond-vert flex1"><p class="label t2">Revenu net mensuel</p><p class="chiffre-m or">${eur(r.net)}</p><p class="corps t2">soit ${eur(r.netAn)} par an</p></div>
<div class="carte fond-creme flex1"><p class="label t2">Face à la location classique</p><p class="chiffre-m t1">× ${ratio(r.ratio)}</p><p class="corps t2">loyer estimé ${eur(arrondi(k.loyerLD, 10))}</p></div>
</div>
<div class="graphe ${anim(3)}">
<p class="label t2">Revenu net mensuel selon le scénario</p>
${lignes.map((l) => `<div class="graphe-ligne">
<p class="graphe-nom ${l.fort ? 't1' : 't2'}">${l.nom}</p>
${barre(l.val / max * 100, l.cls)}
<p class="graphe-val ${l.fort ? 't1' : 't2'}">${eur(l.val)}</p>
</div>`).join('\n')}
</div>
${pied('clair', 'Net = après commission Haveo, plateforme et linge', p, n)}`;
  }, brut(X.synthese.notes));

  // ---------- 3. Localisation ----------
  add('localisation', 'clair', (p, n) => `
<div class="colonne flex1">
${entete('Localisation', tx(X.localisation.titre))}
${intro(tx(X.localisation.intro), 1, 'intro-libre')}
<div class="liste ${anim(2)}">
${X.localisation.points.map((pt) => `<div class="ligne-def filet"><h3 class="h3 t1 def-titre">${tx(pt.titre)}</h3><p class="corps t2 flex1">${tx(pt.texte)}</p></div>`).join('\n')}
</div>
</div>
<div class="${anim(1)}">${photo(d, 'localisation', 'width:480px;height:800px;border-radius:16px')}</div>
${pied('clair', '', p, n)}`, X.localisation.notes, 'rangee-slide');

  // ---------- 4. Le bien ----------
  add('bien', 'sombre', (p, n) => `${entete('Type de bien', tx(X.bien.titre))}
${intro(tx(X.bien.intro))}
<div class="grille-2 ${anim(2)}">
${X.bien.caracteristiques.map((c) => `<div class="ligne-def filet"><h3 class="h3 t1 def-titre-court">${tx(c.titre)}</h3><p class="corps t2 flex1">${tx(c.texte)}</p></div>`).join('\n')}
</div>
<div class="rangee ${anim(3)}">
${X.bien.cartes.map((c) => `<div class="carte fond-vert-2 flex1 carte-compacte"><p class="label t2">${tx(c.label)}</p><p class="h3 t1">${tx(c.texte)}</p></div>`).join('\n')}
</div>
${pied('sombre', '', p, n)}`, X.bien.notes);

  // ---------- 5. Atouts ----------
  add('atouts', 'clair', (p, n) => `${entete('Caractéristiques principales', tx(X.atouts.titre))}
${intro(tx(X.atouts.intro))}
<div class="rangee">
${X.atouts.colonnes.map((c, i) => `<div class="colonne flex1 ${anim(2 + i)}">
${photo(d, c.photo, 'width:533px;height:320px;border-radius:16px')}
<h3 class="h3 t1">${tx(c.titre)}</h3>
<p class="corps t2">${tx(c.texte)}</p>
</div>`).join('\n')}
</div>
${pied('clair', '', p, n)}`, X.atouts.notes);

  // ---------- 6. Prix ----------
  add('prix', 'clair', (p, n) => {
    // Échelle de prix : repères marché au-dessus, scénarios en dessous
    const vals = [m.prixMoyenTous, m.prixMoyenSegment, ...ids.map((id) => S[id].prix)];
    const min = Math.min(...vals) * 0.85, max = Math.max(...vals) * 1.06, W = 1664;
    const x = (v) => Math.round((v - min) / (max - min) * W);
    const repere = (v, texte, haut, cls) => {
      const cx = x(v);
      const left = Math.max(0, Math.min(W - 240, cx - 120));
      return `<div class="echelle-point ${cls}" style="left:${cx - 9}px"></div>
<p class="echelle-label ${haut ? 'echelle-haut' : 'echelle-bas'} ${cls === 'point-ref' ? 't1' : 't2'}" style="left:${left}px">${texte}</p>`;
    };
    return `${entete('Prix par nuit', tx(X.prix.titre))}
${intro(tx(X.prix.intro))}
<div class="echelle ${anim(2)}">
<div class="echelle-ligne"></div>
${repere(m.prixMoyenTous, `Tous logements · ${eur(m.prixMoyenTous)}`, true, 'point-marche')}
${repere(m.prixMoyenSegment, `Moyenne ${esc(m.libelleSegment)} · ${eur(m.prixMoyenSegment)}`, true, 'point-marche')}
${ids.map((id) => repere(S[id].prix, `${S[id].nom} · ${eur(S[id].prix)}`, false, id === r.id ? 'point-ref' : 'point-scen')).join('\n')}
</div>
<div class="rangee aligne-haut ${anim(3)}">
<div class="tableau flex1">
<div class="tab-ligne tab-entete grille-prix"><p class="t2">Scénario</p><p class="t2 droite">Prix moyen</p><p class="t2">Positionnement</p></div>
${ids.map((id) => `<div class="tab-ligne grille-prix ${id === r.id ? 'tab-ref' : ''}"><p class="t1">${S[id].nom}</p><p class="t1 droite">${eur(S[id].prix)}</p><p class="t1">${tx(S[id].positionnement)}</p></div>`).join('\n')}
</div>
<div class="carte fond-vert encadre-prix">
<p class="label t2">Prix recommandé</p>
<p class="chiffre-l or">${eur(r.prix)} <span class="menthe">/ nuit</span></p>
<p class="corps t2">${tx(X.prix.encadre)}</p>
</div>
</div>
${pied('clair', `Source : ${esc(m.source)}`, p, n)}`;
  }, brut(X.prix.notes));

  // ---------- 7. Occupation ----------
  add('occupation', 'sombre', (p, n) => {
    const col = (v, label, accent) => `<div class="colonne flex1 ${accent ? 'filet-or' : 'filet'} pad-haut">
<p class="chiffre-xl ${accent ? 'or' : 't1'}">${pct(v)}</p>
${barre(v, accent ? 'barre-or' : 'barre-claire')}
<p class="corps t2">${label}</p>
</div>`;
    return `${entete('Taux d’occupation', tx(X.occupation.titre))}
${intro(tx(X.occupation.intro))}
<div class="rangee ${anim(2)}">
${col(m.occupationSegment, `Moyenne des ${esc(m.libelleSegment)} du secteur`, false)}
${col(r.occupation, `Objectif Haveo, soit ${nb(r.nuits)} nuits par mois`, true)}
${col(m.occupationPic, `Occupation en ${esc(m.moisPic)}, le pic`, false)}
</div>
<div class="rangee ${anim(3)}">
${X.occupation.blocs.map((bl) => `<div class="colonne-serree flex1"><h3 class="h3 t1">${tx(bl.titre)}</h3><p class="corps t2">${tx(bl.texte)}</p></div>`).join('\n')}
</div>
${pied('sombre', `Source : ${esc(m.source)}`, p, n)}`;
  }, brut(X.occupation.notes) + ` ${nb(r.nuits)} × ${eur(r.prix)} = ${eur(r.ca)} ; ${eur(r.ca)} / ${eur(m.prixMoyenTous)} = ${nb(r.ca / m.prixMoyenTous, 1)} nuits.`);

  // ---------- 8. Estimation mensuelle ----------
  add('estimation', 'clair', (p, n) => {
    const P = k.parts, h = d.hypotheses;
    const frais = r.commission + r.plateforme + r.linge;
    const seg = (v, cls, texte) => `<div class="segment ${cls}" style="width:${v.toFixed(2)}%">${texte ? `<p class="segment-txt">${texte}</p>` : ''}</div>`;
    return `${entete(`Estimation mensuelle · scénario ${r.nom.toLowerCase()}`, tx(X.estimation.titre))}
${intro(tx(X.estimation.intro))}
<div class="rangee ${anim(2)}">
<div class="carte fond-creme flex1"><p class="label t2">Chiffre d’affaires brut</p><p class="chiffre-l t1">${eur(r.ca)}</p><p class="corps t2">${eur(r.prix)} × ${nb(r.nuits)} nuits, hors frais de ménage payés par les voyageurs</p></div>
<div class="carte fond-creme flex1"><p class="label t2">Frais d’exploitation</p><p class="chiffre-l t1">−${NBSP}${eur(frais)}</p><p class="corps t2">Commission Haveo ${pct(h.commissionHaveo)} : ${eur(r.commission)}<br>Plateforme ~${pct(h.fraisPlateforme)} : ${eur(r.plateforme)}<br>Linge et consommables : ${eur(r.linge)}</p></div>
<div class="carte fond-vert flex1"><p class="label t2">Revenu net mensuel</p><p class="chiffre-l or">${eur(r.net)}</p><p class="corps t2">Après tous les frais, soit ${eur(r.netAn)} par an</p></div>
</div>
<div class="colonne-serree ${anim(3)}">
<p class="label t2">Sur 100 € encaissés, <span class="hl">${nb(P.net)} € reviennent au propriétaire</span></p>
<div class="empile">
${seg(P.net, 'seg-net', `Propriétaire ${pct(Math.round(P.net))}`)}
${seg(P.commission, 'seg-haveo', `Haveo ${pct(P.commission)}`)}
${seg(P.linge, 'seg-linge', '')}
${seg(P.plateforme, 'seg-plateforme', '')}
</div>
<p class="corps t2">Linge ${pct(Math.round(P.linge))} et plateforme ${pct(P.plateforme)} complètent la barre. ${tx(X.estimation.piedDePage)}</p>
</div>
${pied('clair', '', p, n)}`;
  }, `${eur(r.ca)} − ${eur2(r.commission)} (Haveo ${pct(d.hypotheses.commissionHaveo)}) − ${eur2(r.plateforme)} (plateforme) − ${eur2(r.linge)} (linge ${nb(r.nuits)} × ${eur(d.hypotheses.lingeParNuit)}) = ${eur2(r.net)}. × 12 = ${eur(r.netAn)}.`);

  // ---------- 9. Scénarios ----------
  add('scenarios', 'clair', (p, n) => `${entete('Projection financière complète', tx(X.scenarios.titre))}
${intro(tx(X.scenarios.intro))}
<div class="tableau ${anim(2)}">
<div class="tab-ligne tab-entete grille-scen"><p class="t2">Scénario</p><p class="t2 droite">Prix/nuit</p><p class="t2 droite">Nuits/mois</p><p class="t2 droite">Occupation</p><p class="t2 droite">CA/mois</p><p class="t2 droite">Net/mois</p><p class="t2 droite">Net/an</p></div>
${ids.map((id) => { const s = S[id]; return `<div class="tab-ligne grille-scen ${id === r.id ? 'tab-ref' : ''}"><p class="t1">${s.nom}</p><p class="t1 droite">${eur(s.prix)}</p><p class="t1 droite">${nb(s.nuits)}</p><p class="t1 droite">${pct(s.occupation)}</p><p class="t1 droite">${eur(s.ca)}</p><p class="t1 droite fort">${eur(s.net)}</p><p class="t1 droite">${eur(s.netAn)}</p></div>`; }).join('\n')}
</div>
<div class="rangee ${anim(3)}">
${X.scenarios.blocs.map((bl) => `<div class="colonne-serree flex1"><h3 class="h3 t1">${tx(bl.titre)}</h3><p class="corps t2">${tx(bl.texte)}</p></div>`).join('\n')}
</div>
${pied('clair', `Net = CA − Haveo ${pct(d.hypotheses.commissionHaveo)} − plateforme ${pct(d.hypotheses.fraisPlateforme)} − linge ${eur(d.hypotheses.lingeParNuit)}/nuit`, p, n)}`,
  ids.map((id) => { const s = S[id]; return `${s.nom} : ${eur(s.prix)} × ${s.nuits} = ${eur(s.ca)} ; net ${eur2(s.net)} ; an ${eur(s.netAn)}.`; }).join(' '));

  // ---------- 10. Longue durée ----------
  add('longue', 'sombre', (p, n) => {
    const max = Math.max(k.loyerLD, ...Object.values(S).map((s) => s.net));
    const nonRef = ids.filter((id) => id !== r.id);
    const opt = S[nonRef[nonRef.length - 1]];
    const col = (label, v, sous, accent, cls) => `<div class="colonne flex1 ${accent ? 'filet-or' : 'filet'} pad-haut">
<p class="label t2">${label}</p>
<p class="chiffre-l ${accent ? 'or' : 't1'}">${eur(v)}</p>
${barre(v / max * 100, cls)}
<p class="corps t2">${sous}</p>
</div>`;
    return `${entete('Comparaison et cadre légal', tx(X.longue.titre))}
${intro(tx(X.longue.intro))}
<div class="rangee ${anim(2)}">
${col('Longue durée', arrondi(k.loyerLD, 10), 'Loyer brut mensuel estimé', false, 'barre-corail')}
${col(`Courte durée · ${r.nom.toLowerCase()}`, r.net, `${ratio(r.ratio)} fois la longue durée`, true, 'barre-or')}
${col(`Courte durée · ${opt.nom.toLowerCase()}`, opt.net, `${ratio(opt.ratio)} fois la longue durée`, false, 'barre-claire')}
</div>
<div class="carte fond-vert-2 carte-compacte ${anim(3)}">
<h3 class="h3 t1">${tx(X.longue.legalTitre)}</h3>
<p class="corps t2">${tx(X.longue.legal)}</p>
</div>
${pied('sombre', tx(X.longue.sources), p, n)}`;
  }, `${m.sourceLoyer} : ${eur2(m.loyerM2)}/m². ${d.bien.surface} × ${nb(m.loyerM2, 2)} = ${eur2(k.loyerLD)}. Ratios : ` + ids.map((id) => `${S[id].nom.toLowerCase()} ${nb(S[id].ratio, 2)}`).join(', ') + '. ' + brut(X.longue.notes));

  // ---------- 11. Accompagnement (nouveau) ----------
  add('accompagnement', 'clair', (p, n) => `${entete('L’accompagnement Haveo', tx(X.accompagnement.titre))}
${intro(tx(X.accompagnement.intro))}
<div class="grille-3 ${anim(2)}">
${X.accompagnement.etapes.map((e, i) => `<div class="colonne-serree filet pad-haut">
<p class="etape-num">${String(i + 1).padStart(2, '0')}</p>
<h3 class="h3 t1">${tx(e.titre)}</h3>
<p class="corps t2">${tx(e.texte)}</p>
</div>`).join('\n')}
</div>
<div class="bandeau fond-vert ${anim(3)}">
${X.accompagnement.offre.map((o) => `<div class="colonne-serree flex1"><p class="label t2">${tx(o.label)}</p><p class="h3 t1">${tx(o.texte)}</p></div>`).join('\n')}
</div>
${pied('clair', '', p, n)}`, X.accompagnement.notes);

  // ---------- 12. Conclusion ----------
  add('conclusion', 'sombre', (p, n) => {
    const nonRef = ids.filter((id) => id !== r.id);
    const opt = S[nonRef[nonRef.length - 1]];
    return `${entete('Conclusion', tx(X.conclusion.titre))}
${intro(tx(X.conclusion.intro))}
<div class="rangee rangee-large aligne-haut">
<div class="colonne flex1 ${anim(2)}">
${X.conclusion.points.map((pt) => `<div class="puce-ligne filet pad-haut"><div class="pastille"></div><p class="corps t2 flex1"><span class="hl">${tx(pt.titre)}</span> ${tx(pt.texte)}</p></div>`).join('\n')}
</div>
<div class="carte fond-sable encadre-fin ${anim(3)}">
<div class="colonne-serree">
<p class="label t2">Potentiel net pour le propriétaire</p>
<p class="chiffre-l t1">${nb(arrondi(r.net, 50))} à ${eur(arrondi(opt.net, 50))}</p>
<p class="corps t2">par mois, scénarios ${r.nom.toLowerCase()} à ${opt.nom.toLowerCase()}</p>
</div>
<div class="colonne-serree filet pad-haut">
<p class="label t2">Prochaine étape</p>
<p class="h3 t1">${tx(X.conclusion.prochaineEtape)}</p>
</div>
</div>
</div>
${pied('sombre', tx(d.contact), p, n)}`;
  }, `Fourchette : scénarios ${r.nom.toLowerCase()} (${eur(r.net)}) à ${opt0(S, ids, r).nom.toLowerCase()} (${eur(opt0(S, ids, r).net)}), arrondis à 50 €. Le prudent (${eur(S[ids[0]].net)}) figure page 9.`);

  return L;
}
function opt0(S, ids, r) { const nr = ids.filter((id) => id !== r.id); return S[nr[nr.length - 1]]; }

// ============================================================
// 4. CSS PARTAGÉ DU DECK
// ============================================================
const CSS = `/* Haveo · étude de marché — styles partagés (générés par generer.mjs) */
:root{--vert:${C.vert};--vert-carte:${C.vertCarte};--sable:${C.sable};--sable-fonce:${C.sableFonce};--creme:${C.creme};--corail:${C.corail};--or:${C.or};--menthe:${C.menthe};--vert-sourd:${C.vertSourd}}
section{font-family:'Plus Jakarta Sans', Arial, sans-serif;box-sizing:border-box;padding:120px 128px 160px;display:flex;flex-direction:column;gap:32px}
.sombre{background:${C.vert};color:${C.sable}}
.clair{background:${C.sable};color:${C.vert}}
.rangee-slide{flex-direction:row;gap:64px}

/* Couleurs de texte selon le fond */
.sombre .t1{color:${C.sable}}
.sombre .t2{color:${C.menthe}}
.clair .t1{color:${C.vert}}
.clair .t2{color:${C.vertSourd}}
.sombre .hl{color:${C.sable}}
.clair .hl{color:${C.vert}}
.fond-vert .t1{color:${C.sable}}
.fond-vert .t2{color:${C.menthe}}
.fond-vert .hl{color:${C.sable}}
.fond-sable .t1{color:${C.vert}}
.fond-sable .t2{color:${C.vertSourd}}
.or{color:${C.or}}
.corail{color:${C.corail}}
.menthe{color:${C.menthe}}

/* Fonds de cartes */
.fond-creme{background:${C.creme};border:1px solid rgba(15,76,76,0.1)}
.fond-vert{background:${C.vert}}
.fond-vert-2{background:${C.vertCarte};border:1px solid rgba(244,235,221,0.1)}
.fond-sable{background:${C.sable}}

/* Filets */
.sombre .filet{border-top:1px solid rgba(244,235,221,0.16)}
.clair .filet{border-top:1px solid rgba(15,76,76,0.14)}
.fond-sable .filet{border-top:1px solid rgba(15,76,76,0.14)}
.filet-or{border-top:2px solid ${C.or}}
.pad-haut{padding-top:20px}

/* En-tête de slide */
.entete{display:flex;flex-direction:column;gap:16px}
.surtitre{display:flex;flex-direction:row;align-items:center;gap:12px}
.pastille{width:12px;height:12px;background:${C.corail};border-radius:6px}
.surtitre-txt{font-size:24px;font-weight:500;line-height:1.25}
.titre{font-size:60px;font-weight:500;line-height:1.1;letter-spacing:-1.6px}
.intro{font-size:26px;line-height:1.5;width:1400px}
.intro-libre{width:auto}

/* Échelle typographique */
.h3{font-size:28px;font-weight:500;line-height:1.3}
.corps{font-size:24px;line-height:1.5}
.label{font-size:24px;line-height:1.3}
.chiffre-xl{font-size:80px;font-weight:500;line-height:1;letter-spacing:-2px;font-variant-numeric:tabular-nums}
.chiffre-l{font-size:60px;font-weight:500;line-height:1.1;letter-spacing:-1.2px;font-variant-numeric:tabular-nums}
.chiffre-m{font-size:52px;font-weight:500;line-height:1.1;letter-spacing:-1.2px;font-variant-numeric:tabular-nums}
.fort{font-weight:600}
.droite{text-align:right}

/* Mise en page */
.rangee{display:flex;flex-direction:row;gap:24px}
.rangee-large{gap:64px}
.aligne-haut{align-items:flex-start}
.colonne{display:flex;flex-direction:column;gap:16px}
.colonne-serree{display:flex;flex-direction:column;gap:8px}
.flex1{flex:1}
.liste{display:flex;flex-direction:column;gap:20px}
.grille-2{display:grid;grid-template-columns:1fr 1fr;gap:0px 64px}
.grille-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:28px 48px}
.ligne-def{display:flex;flex-direction:row;gap:24px;padding:18px 0px 0px 0px}
.grille-2 .ligne-def{padding:16px 0px}
.def-titre{width:300px}
.def-titre-court{width:260px}
.carte{display:flex;flex-direction:column;gap:12px;padding:32px;border-radius:16px}
.carte-compacte{gap:8px;padding:24px 32px}
.encadre-prix{width:520px;box-sizing:border-box}
.encadre-fin{width:600px;box-sizing:border-box;padding:40px;gap:20px}
.bandeau{display:flex;flex-direction:row;gap:48px;padding:28px 40px;border-radius:16px}
.etape-num{font-size:24px;font-weight:600;letter-spacing:2px;color:${C.corail};font-variant-numeric:tabular-nums}
.puce-ligne{display:flex;flex-direction:row;gap:20px;align-items:flex-start}
.puce-ligne .pastille{margin-top:12px}

/* Tableaux */
.tableau{display:flex;flex-direction:column;font-variant-numeric:tabular-nums}
.tab-ligne{display:grid;gap:16px;padding:14px 16px;border-bottom:1px solid rgba(15,76,76,0.14);font-size:26px;line-height:1.35}
.tab-entete{font-size:24px;font-weight:500;padding-top:0px}
.tab-ref{background:${C.sableFonce};border-radius:10px}
.grille-prix{grid-template-columns:200px 180px 1fr}
.grille-scen{grid-template-columns:1.3fr 1fr 1fr 1fr 1fr 1fr 1fr}

/* Graphiques */
.graphe{display:flex;flex-direction:column;gap:14px}
.graphe-ligne{display:grid;grid-template-columns:280px 1fr 150px;gap:24px;align-items:center}
.graphe-nom{font-size:24px;line-height:1.2}
.graphe-val{font-size:24px;line-height:1.2;text-align:right;font-variant-numeric:tabular-nums}
.piste{height:16px;border-radius:8px;overflow:hidden}
.clair .piste{background:${C.sableFonce}}
.sombre .piste{background:rgba(244,235,221,0.1)}
.graphe .piste{height:28px;border-radius:14px}
.barre{height:100%;border-radius:8px}
.barre-vert{background:${C.vert}}
.barre-or{background:${C.or}}
.barre-corail{background:${C.corail}}
.barre-claire{background:${C.menthe}}
.empile{display:flex;flex-direction:row;height:52px;border-radius:12px;overflow:hidden}
.segment{display:flex;flex-direction:row;align-items:center;padding:0px 0px 0px 20px;box-sizing:border-box}
.segment-txt{font-size:24px;font-weight:600;line-height:1;white-space:nowrap}
.seg-net{background:${C.vert};color:${C.sable}}
.seg-haveo{background:${C.or};color:${C.vert}}
.seg-linge{background:${C.corail};padding:0px}
.seg-plateforme{background:${C.vertSourd};padding:0px}

/* Échelle de prix */
.echelle{position:relative;width:1664px;height:120px}
.echelle-ligne{position:absolute;left:0px;top:59px;width:1664px;height:2px;background:rgba(15,76,76,0.25)}
.echelle-point{position:absolute;top:51px;width:18px;height:18px;border-radius:9px;box-sizing:border-box}
.point-marche{background:${C.sable};border:3px solid ${C.vertSourd}}
.point-scen{background:${C.vert}}
.point-ref{background:${C.or};border:3px solid ${C.vert}}
.echelle-label{position:absolute;width:240px;font-size:24px;line-height:1.2;text-align:center;white-space:nowrap}
.echelle-haut{top:4px}
.echelle-bas{top:86px}

/* Couverture */
.voile-couverture{position:absolute;left:1040px;top:0px;width:880px;height:1080px;background:linear-gradient(90deg, #0F4C4C 0%, rgba(15,76,76,0.4) 24%, rgba(15,76,76,0) 56%)}
.logo-couverture{position:absolute;left:128px;top:96px;width:560px;height:88px;display:flex;flex-direction:row;align-items:center;gap:24px}
.logo-texte{display:flex;flex-direction:column;gap:4px}
.logo-nom{font-size:48px;font-weight:500;line-height:1;letter-spacing:-1px;color:${C.sable}}
.logo-sous{font-size:24px;line-height:1.2;letter-spacing:8px;color:${C.menthe}}
section.couv{justify-content:center}
.couv-surtitre{font-size:26px;font-weight:500;color:${C.menthe}}
.couv-titre{font-size:80px;font-weight:500;line-height:1.06;letter-spacing:-2.4px;color:${C.sable};width:900px}
.couv-intro{font-size:28px;line-height:1.5;color:${C.menthe};width:820px}
.couv-meta{font-size:26px;line-height:1.4;color:${C.menthe};width:820px}
.couv-fort{color:${C.sable}}
.couv-date{position:absolute;left:128px;bottom:64px;width:820px;font-size:24px;color:${C.mentheSourd}}

/* Pied de page */
.pied{position:absolute;left:128px;bottom:64px;width:1664px;height:40px;display:flex;flex-direction:row;align-items:center;gap:12px}
.pied-logo{font-size:28px;font-weight:500;line-height:1}
.pied-info{font-size:24px;line-height:1;font-variant-numeric:tabular-nums}
.espace{flex:1}

/* Arrivée des éléments */
@keyframes monte{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0px)}}
.anim{animation:monte 560ms cubic-bezier(0.22,1,0.36,1) both;animation-delay:calc(var(--i) * 90ms)}
`;

// ============================================================
// 5. ÉCRITURE DES FICHIERS
// ============================================================
function ecrire(fichierFiche, avecPdf) {
  const d = JSON.parse(fs.readFileSync(fichierFiche, 'utf8'));
  const dossierFiche = path.dirname(path.resolve(fichierFiche));
  const k = calculer(d);
  T = jetons(d, k);

  const sortie = path.join(ICI, 'sortie', d.slug);
  const projet = path.join(sortie, 'deck', 'project');
  fs.rmSync(path.join(projet, 'slides'), { recursive: true, force: true });
  fs.mkdirSync(path.join(projet, 'slides'), { recursive: true });

  // chemins des photos pour l'aperçu local (relatifs à sortie/<slug>/)
  for (const p of Object.values(d.photos)) {
    if (p.fichier) p.apercu = path.relative(sortie, path.resolve(dossierFiche, p.fichier)).split(path.sep).join('/');
  }

  const liste = slides(d, k);
  const n = liste.length;
  const rendu = (mode) => {
    MODE = mode;
    return liste.map((s, i) => {
      const contenu = typeof s.fn === 'function' ? s.fn(i + 1, n) : s.fn;
      const html = section(s.id, s.theme, contenu.trim(), s.notes, s.id === 'cover' ? 'couv' : s.cls);
      return { ...s, html };
    });
  };
  // --- Deck (format Slides de claude.ai) ---
  const deck = rendu('deck');
  for (const s of deck) {
    fs.writeFileSync(path.join(projet, 'slides', `${s.id}.html`), s.html);
  }
  fs.writeFileSync(path.join(projet, 'deck.css'), CSS);
  const index = {
    v: 5,
    createdOnFiles: { v: 1, at: d.deck?.creeLe || new Date().toISOString() },
    lists: 'css',
    format: { v: 1, shared: ['project/deck.css'] },
    title: d.deck?.titre || `Étude de marché – ${d.bien.ville}`,
    cover: 'cover',
    order: deck.map((s) => s.id),
    sections: {
      s1: { description: 'L’essentiel, puis le bien et son emplacement', start: 'cover' },
      s2: { description: 'Le marché : prix et occupation', start: 'prix' },
      s3: { description: 'Les revenus attendus, l’accompagnement et la synthèse', start: 'estimation' },
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
h1{font-size:96px;font-weight:600}h2{font-size:64px;font-weight:600}h3{font-size:44px;font-weight:600}p{font-size:32px}
section{position:relative;width:1920px;height:1080px;overflow:hidden}
.cadre{width:1920px;height:1080px;margin:0 auto 24px;transform-origin:0 0}
@media screen{.anim{animation:none}}
@media print{@page{size:1920px 1080px;margin:0}html,body{background:none}.cadre{margin:0;transform:none!important;height:1080px!important;break-after:page}.anim{animation:none}}
</style></head><body>
${apercu.map((s) => `<div class="cadre">\n${s.html}</div>`).join('\n')}
<script>
function ajuster(){var e=Math.min(1,(innerWidth-32)/1920);document.querySelectorAll('.cadre').forEach(function(c){c.style.transform='scale('+e+')';c.style.marginLeft=Math.max(16,(innerWidth-1920*e)/2)+'px';c.style.height=(1080*e)+'px';c.style.marginBottom='24px'});}
if(!matchMedia('print').matches){addEventListener('resize',ajuster);ajuster();}
</script>
</body></html>`;
  const fichierApercu = path.join(sortie, 'apercu.html');
  fs.writeFileSync(fichierApercu, page);

  // --- Résumé console ---
  console.log(`\n${index.title}`);
  console.log(`  ${n} slides → ${path.relative(process.cwd(), projet)}`);
  console.log(`  Aperçu    → ${path.relative(process.cwd(), fichierApercu)}`);
  for (const s of Object.values(k.sc)) {
    console.log(`  ${s.nom.padEnd(9)} ${eur(s.prix).padStart(7)} × ${String(s.nuits).padStart(2)} nuits = CA ${eur(s.ca).padStart(9)} → net ${eur(s.net).padStart(8)}/mois · ${eur(s.netAn)}/an · × ${ratio(s.ratio)} longue durée`);
  }
  console.log(`  Longue durée : ${eur(k.loyerLD)}/mois`);

  if (avecPdf) return pdf(fichierApercu, path.join(sortie, `${d.slug}.pdf`));
}

async function pdf(html, sortiePdf) {
  let pw;
  try { pw = await import('playwright'); } catch {
    try { pw = createRequire(import.meta.url)('playwright'); } catch { console.log('  (PDF ignoré : Playwright n’est pas installé)'); return; }
  }
  const chromium = pw.chromium || pw.default.chromium;
  const nav = await chromium.launch();
  const page = await nav.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.resolve(html), { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: sortiePdf, width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
  await nav.close();
  console.log(`  PDF       → ${path.relative(process.cwd(), sortiePdf)}`);
}

// ============================================================
const args = process.argv.slice(2);
const fiche = args.find((a) => !a.startsWith('--'));
if (!fiche) {
  console.error('Usage : node generer.mjs biens/<bien>.json [--pdf]');
  process.exit(1);
}
await ecrire(fiche, args.includes('--pdf'));
