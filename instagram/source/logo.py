import sys, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
FONT, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
GREEN, CORAL, SAND, CREAM = '#0F4C4C', '#F26B5B', '#F4EBDD', '#FBF6EE'
f = TTFont(FONT); gs = f.getGlyphSet(); cmap = f.getBestCmap()

# --- wordmark: "haveo" in Plus Jakarta Sans 600, tracking -0.02em, round dot on the baseline
TRACK = -20
pen = SVGPathPen(gs)
x = 0
for ch in 'haveo':
    g = cmap[ord(ch)]
    gs[g].draw(TransformPen(pen, (1, 0, 0, -1, x, 0)))
    x += gs[g].width + TRACK
bp = BoundsPen(gs); gs[cmap[ord('o')]].draw(bp)
o_right = x - gs[cmap[ord('o')]].width - TRACK + bp.bounds[2]
D = 148                       # dot diameter = stem weight
dot_cx = o_right + 34 + D / 2  # same optical gap as between letters
dot_cy = -D / 2
WORD = pen.getCommands()
W_MIN, W_MAX = 66, dot_cx + D / 2
TOP, BOT = -757, 12

def wordmark(ink, dot, bg=None, pad=0):
    w = W_MAX - W_MIN + 2 * pad; h = BOT - TOP + 2 * pad
    vb = f'{W_MIN - pad:.0f} {TOP - pad:.0f} {w:.0f} {h:.0f}'
    rect = f'<rect x="{W_MIN-pad:.0f}" y="{TOP-pad:.0f}" width="{w:.0f}" height="{h:.0f}" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="haveo">'
            f'{rect}<path fill="{ink}" d="{WORD}"/><circle cx="{dot_cx:.1f}" cy="{dot_cy:.1f}" r="{D/2}" fill="{dot}"/></svg>')

# --- mark: the house-h, redrawn on a 45° grid with one stroke weight
S = 92  # stroke
MARK = (f'<g fill="none" stroke-width="{S}" stroke-linecap="round" stroke-linejoin="round">'
        '<path d="M0 0V470M0 270L144 126L288 270V470"/></g>')
def mark(ink, dot, bg=None, size=None, scale=1):
    # mark bbox: x -46..288+46 ; y -46..516 ; dot at right
    r = 40
    dot_svg = f'<circle cx="{288+46+30+r}" cy="{516-r}" r="{r}" fill="{dot}"/>'
    x0, y0, x1, y1 = -46, -46, 288 + 46 + 30 + 2 * r, 516
    if size:  # square tile, mark centred optically
        bw, bh = x1 - x0, y1 - y0
        side = max(bw, bh) / scale
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        vb = f'{cx-side/2:.1f} {cy-side/2:.1f} {side:.1f} {side:.1f}'
        rect = f'<rect x="{cx-side/2:.1f}" y="{cy-side/2:.1f}" width="{side:.1f}" height="{side:.1f}" fill="{bg}"/>'
    else:
        vb = f'{x0} {y0} {x1-x0} {y1-y0}'; rect = ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="haveo">'
            f'{rect}<g stroke="{ink}">{MARK}</g>{dot_svg}</svg>')

files = {
  'haveo-logo-vert.svg': wordmark(GREEN, CORAL),
  'haveo-logo-creme.svg': wordmark(CREAM, CORAL),
  'haveo-logo-sur-corail.svg': wordmark(GREEN, CREAM),
  'haveo-symbole-vert.svg': mark(GREEN, CORAL),
  'haveo-symbole-creme.svg': mark(CREAM, CORAL),
  'haveo-symbole-sur-corail.svg': mark(GREEN, CREAM),
  'haveo-avatar-corail.svg': mark(GREEN, CREAM, CORAL, size=True, scale=0.56),
  'haveo-avatar-vert.svg': mark(CREAM, CORAL, GREEN, size=True, scale=0.56),
  'haveo-avatar-sable.svg': mark(GREEN, CORAL, SAND, size=True, scale=0.56),
  'favicon.svg': mark(GREEN, CORAL, SAND, size=True, scale=0.78),
}
for n, s in files.items():
    open(os.path.join(OUT, n), 'w').write(s)
print('ok', list(files))
