"""Extrahiert eingebettete Abbildungen (Rasterbilder inkl. Beschriftung) aus einer PDF.
Aufruf: python3 figures.py <pdf> <ausgabeordner> <praefix>  ->  JSON auf stdout"""
import sys, json, pymupdf
mode = 'crop' if sys.argv[1] == '--crop' else 'images'
args = sys.argv[2:] if mode == 'crop' else sys.argv[1:]
pdf, out, prefix = args[:3]
doc = pymupdf.open(pdf)
if mode == 'crop':
    # Stdin: [{page, y0, y1}] in pt; rendert Vektorgrafiken als Ausschnitt
    jobs = json.load(sys.stdin)
    res = []
    for k, j in enumerate(jobs):
        page = doc[j['page'] - 1]
        r = pymupdf.Rect(30, j['y0'], page.rect.width - 30, j['y1'])
        name = f"{prefix}-v{j['page']}-{k}.png"
        page.get_pixmap(clip=r, dpi=170).save(f"{out}/{name}")
        res.append('assets/fig/' + name)
    print(json.dumps(res))
    sys.exit(0)
res = []
n = 0
for pno, page in enumerate(doc, 1):
    for info in page.get_image_info():
        r = pymupdf.Rect(info['bbox'])
        if r.width < 80 or r.height < 50:
            continue
        n += 1
        name = f"{prefix}-s{pno}-{n}.png"
        page.get_pixmap(clip=r, dpi=170).save(f"{out}/{name}")
        res.append({'page': pno, 'x0': r.x0, 'y0': r.y0, 'x1': r.x1, 'y1': r.y1, 'file': 'assets/fig/' + name, 'ar': round(r.width / r.height, 2)})
print(json.dumps(res))
