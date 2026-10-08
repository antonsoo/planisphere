"""Write the study figure as two SVGs (light, dark) from results.json.

usage: python3 -I plot.py <results.json> <output-dir>
"""

import json
import math
import sys
from pathlib import Path

R = json.load(open(sys.argv[1]))
OUT = Path(sys.argv[2])
W, H = 960, 470
THEMES = {
    "light": dict(bg="#fbf8f1", fg="#2b2b2b", mute="#6b665c", grid="#ddd6c6", a="#1f6fb2", b="#c2570a"),
    "dark": dict(bg="#14161c", fg="#e6e3dc", mute="#9a968c", grid="#2d313b", a="#6cb2f0", b="#f0a050"),
}


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;")


def build(t):
    c = THEMES[t]
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
         f'font-family="Spectral, Georgia, serif" role="img" aria-labelledby="ttl dsc">',
         '<title id="ttl">Planisphere against four historical star catalogues</title>',
         '<desc id="dsc">Left: recorded against modelled stellar motion for Ptolemy and Hevelius. '
         'Right: scatter of longitude and latitude residuals for the four catalogues on a log scale.</desc>',
         f'<rect width="{W}" height="{H}" fill="{c["bg"]}"/>']

    def text(x, y, s, size=13, fill=None, anchor="start", weight="400"):
        o.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill or c["fg"]}" text-anchor="{anchor}" '
                 f'font-weight="{weight}">{esc(s)}</text>')

    # Panel A: recorded vs modelled motion shift.
    ax0, ay0, aw = 70, 96, 300  # square plot area
    lim = 40.0
    sx = lambda v: ax0 + (v + lim) / (2 * lim) * aw
    sy = lambda v: ay0 + aw - (v + lim) / (2 * lim) * aw
    text(30, 30, "Stellar motion seen in the old observations", 16, weight="600")
    text(30, 50, "Per star: shift recorded vs shift modelled by planisphere (arcmin, both axes)", 12, c["mute"])
    for v in (-40, -20, 0, 20, 40):
        o.append(f'<line x1="{sx(v)}" y1="{ay0}" x2="{sx(v)}" y2="{ay0 + aw}" stroke="{c["grid"]}" stroke-width="1"/>')
        o.append(f'<line x1="{ax0}" y1="{sy(v)}" x2="{ax0 + aw}" y2="{sy(v)}" stroke="{c["grid"]}" stroke-width="1"/>')
        text(sx(v), ay0 + aw + 16, str(v), 11, c["mute"], "middle")
        text(ax0 - 8, sy(v) + 4, str(v), 11, c["mute"], "end")
    o.append(f'<line x1="{sx(-lim)}" y1="{sy(-lim)}" x2="{sx(lim)}" y2="{sy(lim)}" stroke="{c["mute"]}" '
             f'stroke-dasharray="4 3" stroke-width="1.2"/>')
    text(ax0 + aw / 2, ay0 + aw + 34, "modelled shift from space motion", 12, c["mute"], "middle")
    o.append(f'<text transform="translate(26 {ay0 + aw / 2}) rotate(-90)" font-size="12" fill="{c["mute"]}" '
             f'text-anchor="middle">recorded shift (offset removed)</text>')
    clipped = {}
    for key, col, r in (("ptolemy_128", c["a"], 2.6), ("hevelius", c["b"], 3.2)):
        sc = R[key]["motion_scatter_ge_5arcmin"]
        n_out = 0
        for (mx, my), (rx, ry) in zip(sc["modelled_arcmin"], sc["recorded_arcmin"]):
            for m_, r_ in ((mx, rx), (my, ry)):
                if abs(m_) > lim or abs(r_) > lim:
                    n_out += 1
                    continue
                o.append(f'<circle cx="{sx(m_):.1f}" cy="{sy(r_):.1f}" r="{r}" fill="{col}" fill-opacity="0.55"/>')
        clipped[key] = n_out
    lx = ax0 + 6
    o.append(f'<circle cx="{lx}" cy="{ay0 - 14}" r="4" fill="{c["a"]}"/>')
    pm = R["ptolemy_128"]["motion_disp_ge_5arcmin"]
    hv = R["hevelius"]["motion_disp_ge_5arcmin"]
    text(lx + 10, ay0 - 10, f"Ptolemy: {pm['n']} stars, slope {pm['slope_recorded_vs_modelled']:.2f}", 12)
    o.append(f'<circle cx="{lx + 170}" cy="{ay0 - 14}" r="4" fill="{c["b"]}"/>')
    text(lx + 180, ay0 - 10, f"Hevelius: {hv['n']} stars, slope {hv['slope_recorded_vs_modelled']:.2f}", 12)
    text(ax0, ay0 + aw + 54, f"Dashed line: recorded = modelled. {sum(clipped.values())} points beyond +/-40 not drawn.", 11, c["mute"])

    # Panel B: scatter vs catalogue epoch, log scale.
    bx0, by0, bw, bh = 520, 96, 400, 300
    ys = lambda v: by0 + bh - (math.log10(v) - math.log10(0.03)) / (math.log10(60) - math.log10(0.03)) * bh
    ep = {"ptolemy_128": -128, "ulugh_beg": 1437, "tycho": 1601, "hevelius": 1661}
    names = {"ptolemy_128": "Ptolemy", "ulugh_beg": "Ulugh Beg", "tycho": "Tycho", "hevelius": "Hevelius"}
    xs = {"ptolemy_128": bx0 + 40, "ulugh_beg": bx0 + 150, "tycho": bx0 + 255, "hevelius": bx0 + 355}
    text(bx0 - 40, 30, "Scatter of the residuals, by catalogue", 16, weight="600")
    text(bx0 - 40, 50, "Robust sigma of planisphere minus recorded (arcmin, log scale)", 12, c["mute"])
    for v in (0.1, 1, 10):
        o.append(f'<line x1="{bx0}" y1="{ys(v)}" x2="{bx0 + bw}" y2="{ys(v)}" stroke="{c["grid"]}" stroke-width="1"/>')
        text(bx0 - 8, ys(v) + 4, str(v), 11, c["mute"], "end")
    ed = R["tycho"]["vs_editors_reduction"]["lon_mad_sigma"]
    o.append(f'<line x1="{bx0}" y1="{ys(ed)}" x2="{bx0 + bw}" y2="{ys(ed)}" stroke="{c["mute"]}" stroke-dasharray="4 3"/>')
    text(bx0 + bw, ys(ed) - 5, f"planisphere vs the editors' own reduction: {ed:.2f}", 11, c["mute"], "end")
    for k, x in xs.items():
        u = R[k]["untrimmed"]
        for comp, col, dx in (("lon", c["a"], -12), ("lat", c["b"], 12)):
            v = u[comp]["mad_sigma"]
            o.append(f'<circle cx="{x + dx}" cy="{ys(v):.1f}" r="6" fill="{col}"/>')
            text(x + dx, ys(v) - 10, f"{v:.1f}", 11, col, "middle", "600")
        text(x, by0 + bh + 18, names[k], 12, anchor="middle")
        text(x, by0 + bh + 33, f"{ep[k]}" if ep[k] > 0 else f"{ep[k]} (129 BCE)", 11, c["mute"], "middle")
    o.append(f'<circle cx="{bx0 + 270}" cy="{by0 + 14}" r="5" fill="{c["a"]}"/>')
    text(bx0 + 280, by0 + 18, "longitude", 12)
    o.append(f'<circle cx="{bx0 + 270}" cy="{by0 + 34}" r="5" fill="{c["b"]}"/>')
    text(bx0 + 280, by0 + 38, "latitude", 12)
    o.append("</svg>")
    return "\n".join(o)


for t in THEMES:
    (OUT / f"historical-catalogues-{t}.svg").write_text(build(t), encoding="utf-8")
print("wrote", [f"historical-catalogues-{t}.svg" for t in THEMES])
