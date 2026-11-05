import sys, os
FONT, LOGODIR, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
def svg(name): return open(os.path.join(LOGODIR, name)).read()

I = {  # lucide paths, one stroke
 'camera':'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
 'key':'<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>',
 'bed':'<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/>',
 'message':'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 8H7"/><path d="M17 12H7"/>',
 'chart':'<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
 'filecheck':'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/>',
 'user':'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
 'euro':'<path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/>',
 'sliders':'<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
 'calendar':'<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
 'search':'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
 'filetext':'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
 'house':'<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 'bell':'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
 'check':'<path d="M20 6 9 17l-5-5"/>',
 'arrow':'<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
}
def ic(n, s=30): return f'<svg class="ic" width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">{I[n]}</svg>'
DOT = '<span class="dot">.</span>'
ZONE = 'Paris · Île-de-France'
WM = ('<svg class="wm" viewBox="-46 -46 426 562" fill="none" stroke-width="92" stroke-linecap="round" stroke-linejoin="round">'
      '<path d="M0 0V470M0 270L144 126L288 270V470" stroke="currentColor"/></svg>')

def foot(theme):
    logo = {'coral': 'haveo-logo-sur-corail.svg', 'sand': 'haveo-logo-vert.svg', 'green': 'haveo-logo-creme.svg'}[theme]
    if theme == 'coral':  # on coral the wordmark is cream with a green dot? keep rule: dot cream, ink cream for contrast w/ footer
        logo = 'haveo-logo-sur-corail.svg'
    return f'<footer><div class="logo">{svg(logo)}</div><span class="zone">{ZONE}</span></footer>'

def post(n, theme, body, wm=False):
    return f'<section class="post {theme}" id="p{n}">{WM if wm else ""}<div class="inner">{body}</div>{foot(theme)}</section>'

P = []
# 1 — présentation (corail)
P.append(post(1, 'coral', f'''
<div class="mark">{svg("haveo-symbole-sur-corail.svg")}</div>
<p class="label">Conciergerie · location courte durée</p>
<h1 class="xl"><span class="hl">Vous louez{DOT}</span><br>Haveo s'occupe du reste{DOT}</h1>
<p class="lead">On prend en charge le quotidien de votre location courte durée, à Paris et dans toute l'Île-de-France. Vous gardez la main sur votre logement, vos prix et vos revenus.</p>
<ul class="chips">{''.join(f'<li>{c}</li>' for c in ['Accueil','Ménage','Linge','Annonce','Voyageurs','Suivi'])}</ul>
<div class="cta"><span class="btn dark">Demander un audit gratuit {ic('arrow',26)}</span><span class="cta-note">Lien en bio</span></div>
''', wm=True))
# 2 — services (sable)
svc = [('camera','Annonce et photos','Photos et annonce préparées, publiées après votre accord.'),
       ('key','Accueil et clés','Accueil en personne ou arrivée autonome.'),
       ('bed','Ménage et linge','Ménage contrôlé et linge changé à chaque départ.'),
       ('message','Relation voyageurs','Questions et imprévus, avant et pendant le séjour.'),
       ('chart','Prix conseillés','Selon la saison et les événements. Vous validez.'),
       ('filecheck','Suivi et incidents','Relevé mensuel et coordination des interventions.')]
P.append(post(2, 'sand', f'''
<p class="label">Nos services</p>
<h1><span>Un seul interlocuteur,</span><br><span class="hl">tout est pris en charge{DOT}</span></h1>
<div class="grid2 svc">{''.join(f'<div class="card"><div class="row"><span class="tile">{ic(i)}</span><span class="num">0{k+1}</span></div><h3>{t}</h3><p>{d}</p></div>' for k,(i,t,d) in enumerate(svc))}</div>
'''))
# 3 — accueil (vert)
steps = [('Avant l\'arrivée','Instructions d\'accès et livret d\'accueil envoyés au voyageur.'),
         ('Le jour J','Accueil en personne, ou arrivée autonome par boîte à clés ou serrure connectée.'),
         ('Pendant le séjour','Réponses par téléphone ou message, et petits imprévus réglés.'),
         ('Au départ','Clés récupérées, ménage, logement contrôlé. Tout incident vous est signalé sous 24 h.')]
P.append(post(3, 'green', f'''
<p class="label">Accueil et clés</p>
<h1><span>L'arrivée de vos</span><br><span class="hl">voyageurs, de A à Z{DOT}</span></h1>
<ol class="timeline">{''.join(f'<li><span class="step">{k+1}</span><div><h3>{t}</h3><p>{d}</p></div></li>' for k,(t,d) in enumerate(steps))}</ol>
<p class="note">Chaque logement est différent : le mode d'accès est choisi avec vous.</p>
''', wm=True))
# 4 — check-list (corail)
pts = ['Sols et surfaces nettoyés','Salle de bain impeccable','Cuisine et vaisselle propres','Lit fait, draps changés','Serviettes propres',
       "Produits d'accueil en place",'Poubelles vidées','Logement aéré','Wi-Fi et équipements testés','Clés et accès vérifiés']
P.append(post(4, 'coral', f'''
<p class="label">Ménage et contrôle</p>
<h1><span class="hl">Avant chaque arrivée,</span><br>10 points contrôlés{DOT}</h1>
<div class="grid2 checks">{''.join(f'<div class="card"><span class="ck">{ic("check",22)}</span><span>{p}</span></div>' for p in pts)}</div>
<div class="bar">{ic('bell')}<span>Une anomalie ? <b>Vous êtes prévenu sous 24 h</b></span></div>
''', wm=True))
# 5 — offre (sable)
offer = [('Vous testez sans risque','Aucun honoraire de conciergerie le premier mois de location.'),
         ('Résiliable à tout moment','Sans pénalité, avec un simple préavis de 7 jours.'),
         ('Audit gratuit avant de démarrer','On visite et on étudie votre logement avec vous.')]
P.append(post(5, 'sand', f'''
<p class="pill">Offre de lancement</p>
<h1 class="offer"><span>1<sup>er</sup> mois</span><br><span class="box">offert</span></h1>
<p class="sub">sur nos honoraires de conciergerie</p>
<div class="stack">{''.join(f'<div class="card line"><span class="ck">{ic("check",22)}</span><div><h3>{t}</h3><p>{d}</p></div></div>' for t,d in offer)}</div>
<div class="cta"><span class="btn coral">Profiter du mois offert</span><span class="cta-note small">Pour un premier logement. Ensuite : 20 % du montant des nuitées. Ménage, linge et consommables facturés à part.</span></div>
''', wm=True))
# 6 — vos règles (vert)
rules = [('user','Vos comptes',"L'annonce reste sur votre compte Airbnb ou Booking. Haveo y intervient en co-hôte."),
         ('euro','Vos revenus','Les voyageurs vous paient directement. Haveo ne touche jamais à vos loyers.'),
         ('sliders','Vos prix','Vous fixez la grille de prix. Notre outil ajuste dans ces limites.'),
         ('calendar','Votre calendrier','Besoin du logement ? Prévenez-nous 7 jours avant, on bloque les dates.')]
P.append(post(6, 'green', f'''
<p class="label">Transparence</p>
<h1><span>Votre logement,</span><br><span class="hl">vos règles{DOT}</span></h1>
<div class="stack">{''.join(f'<div class="card line"><span class="tile big">{ic(i,30)}</span><div><h3>{t}</h3><p>{d}</p></div></div>' for i,t,d in rules)}</div>
<p class="after">Chaque mois, une facture détaillée de chaque séjour.</p>
'''))
# 7 — démarrer (corail)
st = [('search','Audit gratuit','Visite du logement, potentiel de location et premières recommandations.'),
      ('filetext','Offre et contrat','Les services dont vous avez besoin, un contrat clair, résiliable à tout moment.'),
      ('camera','Mise en valeur',"Photos, annonce, livret d'accueil et inventaire, validés par vous."),
      ('house','Premiers voyageurs','Accueil, ménage et suivi. Une facture claire chaque mois.')]
P.append(post(7, 'coral', f'''
<p class="label">Notre méthode</p>
<h1><span class="hl">Démarrer avec Haveo,</span><br>en 4 étapes{DOT}</h1>
<div class="stack">{''.join(f'<div class="card line method"><span class="big-num">0{k+1}</span><div><h3>{t}</h3><p>{d}</p></div><span class="tile">{ic(i)}</span></div>' for k,(i,t,d) in enumerate(st))}</div>
<div class="cta"><span class="btn dark">Demander un audit gratuit {ic('arrow',26)}</span><span class="cta-note">Lien en bio</span></div>
'''))
# 8 — estimation (sable)
days = [('Lun','95','low'),('Mar','98','low'),('Mer','105','low'),('Jeu','110','mid'),('Ven','145','mid'),('Sam','180','high'),('Dim','140','mid')]
P.append(post(8, 'sand', f'''
<div class="toprow"><p class="pill">Estimation gratuite</p><div class="mark sm">{svg("haveo-symbole-vert.svg")}</div></div>
<h1 class="xl2"><span>Combien pourrait rapporter votre</span> <span class="hl">logement ?</span></h1>
<div class="card week"><div class="wk-head"><h3>Une semaine type</h3><span class="legend"><i class="low"></i>Basse<i class="mid"></i>Moyenne<i class="high"></i>Forte</span></div>
<div class="days">{''.join(f'<div class="day {c}"><span>{d}</span><b>{p} €</b></div>' for d,p,c in days)}</div>
<p class="fine">Exemple illustratif : les prix varient selon le logement et la période.</p></div>
<div class="feats"><div><span class="round">{ic('chart')}</span><div><h3>Simulateur en ligne</h3><p>Quelques infos sur votre logement, une estimation mensuelle.</p></div></div>
<div><span class="round">{ic('search')}</span><div><h3>Audit gratuit</h3><p>Potentiel, prix, décoration et annonce : on regarde tout.</p></div></div></div>
<div class="cta"><span class="btn green">Estimer mes revenus {ic('arrow',26)}</span><span class="cta-note small">Lien en bio. Gratuit, sans engagement.<br>Estimation indicative, non contractuelle.</span></div>
'''))

CSS = '''
@font-face{font-family:PJS;src:url("file://%s/PJS-400.ttf");font-weight:400}
@font-face{font-family:PJS;src:url("file://%s/PJS-500.ttf");font-weight:500}
@font-face{font-family:PJS;src:url("file://%s/PJS-600.ttf");font-weight:600}
:root{--green:#0F4C4C;--ink:#0B3A3A;--coral:#F26B5B;--sand:#F4EBDD;--cream:#FBF6EE;--gold:#E8B04A;--paper:#FFFDF9}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:PJS,sans-serif;background:#ddd;font-feature-settings:"tnum" 0}
.post{position:relative;width:1080px;height:1350px;overflow:hidden;display:flex;flex-direction:column;padding:88px 88px 0}
.inner{position:relative;flex:1;min-height:0;display:flex;flex-direction:column}
.coral{background:var(--coral);color:var(--ink)} .sand{background:var(--sand);color:var(--green)} .green{background:var(--green);color:var(--cream)}
.wm{position:absolute;right:-150px;top:150px;width:560px;pointer-events:none}
.coral .wm{color:#fff;opacity:.10} .sand .wm{color:var(--green);opacity:.06} .green .wm{color:#fff;opacity:.05}
.label{font-size:28px;font-weight:600;letter-spacing:0;margin-bottom:20px}
.coral .label{color:var(--ink)} .sand .label{color:#D9503F} .green .label{color:var(--gold)}
h1{font-size:88px;line-height:1;font-weight:600;letter-spacing:-.04em;margin-bottom:56px}
h1.xl{font-size:108px;margin-bottom:44px}
h1.xl2{font-size:100px;margin-bottom:48px}
.coral h1{color:var(--ink)} .coral h1 .hl{color:var(--paper)}
.sand h1 .hl{color:var(--coral)} .green h1{color:var(--cream)} .green h1 .hl{color:var(--gold)}
.dot{color:var(--coral)} .coral .dot{color:var(--paper)} .sand .hl .dot{color:var(--green)}
h3{font-size:34px;font-weight:600;letter-spacing:-.02em;line-height:1.15}
p{font-size:26px;line-height:1.4}
.card{background:var(--paper);border-radius:24px;color:var(--green)}
.card p{color:#47706F}
.tile{display:inline-grid;place-items:center;width:64px;height:64px;border-radius:16px;background:var(--sand);color:var(--green);flex:none}
.tile.big{width:80px;height:80px;border-radius:20px}
.mark svg{height:88px;width:auto;display:block}.mark{margin-bottom:76px}
.mark.sm{margin:0}.mark.sm svg{height:64px}
.lead{font-size:30px;line-height:1.45;max-width:820px;margin-bottom:44px}
.chips{list-style:none;display:flex;flex-wrap:wrap;gap:10px;margin-bottom:48px}
.chips li{background:var(--paper);color:var(--green);font-size:25px;font-weight:500;padding:12px 20px;border-radius:28px}
.cta{display:flex;align-items:center;gap:32px;margin-top:auto;margin-bottom:56px;padding-top:32px}
.btn{display:inline-flex;align-items:center;gap:16px;font-size:30px;font-weight:600;padding:26px 36px;border-radius:44px;letter-spacing:-.01em;white-space:nowrap}
.btn.dark{background:var(--ink);color:var(--paper)} .btn.coral{background:var(--coral);color:var(--paper)} .btn.green{background:var(--green);color:var(--paper)}
.cta-note{font-size:24px;font-weight:500}.cta-note.small{font-size:20px;line-height:1.45;font-weight:400}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.svc .card{padding:32px;height:260px}.svc .row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
.svc .num{font-size:26px;font-weight:600;color:var(--coral);font-variant-numeric:tabular-nums}
.svc h3{margin-bottom:12px}.svc p{font-size:23px}
.timeline{list-style:none;position:relative}
.timeline:before{content:"";position:absolute;left:35px;top:40px;bottom:120px;width:2px;background:rgba(232,176,74,.45)}
.timeline li{display:flex;gap:40px;margin-bottom:44px;position:relative}
.step{flex:none;width:72px;height:72px;border-radius:36px;background:var(--gold);color:var(--green);font-size:30px;font-weight:600;display:grid;place-items:center}
.timeline h3{color:var(--cream);margin:12px 0 10px}.timeline p{color:rgba(251,246,238,.75);font-size:26px}
.note{margin-top:auto;margin-bottom:64px;background:rgba(255,255,255,.06);border-left:4px solid var(--gold);border-radius:4px 16px 16px 4px;padding:24px 32px;font-size:24px;color:rgba(251,246,238,.85)}
.checks .card{display:flex;align-items:center;gap:20px;padding:0 28px;height:116px;font-size:27px;font-weight:500;line-height:1.25}
.ck{flex:none;width:44px;height:44px;border-radius:22px;background:var(--green);color:var(--paper);display:grid;place-items:center}
.bar{margin-top:32px;display:flex;align-items:center;gap:20px;background:var(--ink);color:var(--paper);border-radius:20px;padding:26px 32px;font-size:27px;font-weight:500}
.bar .ic{color:var(--gold)} .bar b{color:var(--gold);font-weight:600}
.pill{display:inline-block;align-self:flex-start;background:var(--coral);color:var(--paper);font-size:26px;font-weight:600;padding:12px 28px;border-radius:28px;margin-bottom:40px}
h1.offer{font-size:150px;letter-spacing:-.05em;line-height:.95;margin-bottom:24px}
h1.offer sup{font-size:.42em;vertical-align:.95em;letter-spacing:-.02em;margin-left:4px}
.offer .box{display:inline-block;background:var(--coral);color:var(--paper);border-radius:24px;padding:0 32px 18px;margin-top:16px;line-height:1}
.sub{font-size:32px;font-weight:600;letter-spacing:-.02em;margin-bottom:28px}
.stack{display:flex;flex-direction:column;gap:16px}
.card.line{display:flex;align-items:center;gap:28px;padding:24px 32px}
.card.line h3{margin-bottom:6px}.card.line p{font-size:24px}
.sand .stack .ck{width:52px;height:52px;border-radius:26px}.sand .stack .ck .ic{color:var(--gold)}
.green .tile{background:var(--sand)}
.after{margin-top:28px;font-size:26px;color:rgba(251,246,238,.8)}
.card.method{gap:32px;padding:20px 32px}.method p{font-size:23px}.method>div{flex:1}.big-num{font-size:64px;font-weight:600;color:var(--coral);letter-spacing:-.04em;width:96px;flex:none;font-variant-numeric:tabular-nums}
.toprow{display:flex;justify-content:space-between;align-items:flex-start}
.week{padding:28px 28px 22px;margin-bottom:44px}
.wk-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}.wk-head h3{font-size:26px}
.legend{font-size:20px;display:flex;align-items:center;gap:8px;color:#47706F}.legend i{width:14px;height:14px;border-radius:4px;display:inline-block;margin-left:14px}
i.low,.day.low{background:#E5EEEC} i.low{background:var(--green)} i.mid{background:var(--gold)} i.high{background:var(--coral)}
.days{display:grid;grid-template-columns:repeat(7,1fr);gap:10px}
.day{border-radius:14px;padding:16px 0;text-align:center;display:flex;flex-direction:column;gap:6px}
.day span{font-size:20px;font-weight:500}.day b{font-size:28px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.day.low{color:var(--green)} .day.mid{background:#FAEBCB;color:#8A5E10} .day.high{background:#FDE2DE;color:#C8402F}
.fine{font-size:19px;color:#6E8F8E;text-align:center;margin-top:16px}
.feats>div{display:flex;gap:24px;align-items:center;margin-bottom:24px}
.round{flex:none;width:72px;height:72px;border-radius:36px;background:var(--coral);color:var(--paper);display:grid;place-items:center}
.feats h3{margin-bottom:4px}.feats p{font-size:25px;color:#47706F}
footer{position:relative;height:132px;border-top:1px solid currentColor;display:flex;justify-content:space-between;align-items:center;flex:none}
.coral footer{border-color:rgba(11,58,58,.18)} .sand footer{border-color:rgba(15,76,76,.14)} .green footer{border-color:rgba(251,246,238,.14)}
footer .logo svg{height:42px;width:auto;display:block}
.zone{font-size:22px;font-weight:500}
.coral .zone{color:var(--ink)} .sand .zone{color:var(--green)} .green .zone{color:rgba(251,246,238,.8)}
''' % (FONT, FONT, FONT)

html = f'<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Posts Haveo v5</title><style>{CSS}</style></head><body>{"".join(P)}</body></html>'
open(OUT, 'w').write(html)
print('ok')
