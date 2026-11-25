"""Converte as páginas .dc.html do editor em páginas HTML normais para o site."""
import json
import re
import sys

SRC = '/mnt/user-data/outputs/artifacts/619adda7-f999-414c-b2be-2d68446844f0/project/'
OUT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/site-cynder/public/'
DOMAIN = 'https://cynderfilmes.com.br'
AMAP = json.load(open('/home/claude/export/amap.json'))
PAGES = {
    'Main.dc.html': 'index.html',
    'Trabalhos.dc.html': 'trabalhos.html',
    'Casamentos.dc.html': 'casamentos.html',
    'Sobre.dc.html': 'sobre.html',
    'Contato.dc.html': 'contato.html',
    'Privacidade.dc.html': 'privacidade.html',
}
CLEAN = {'index.html': '/', 'trabalhos.html': '/trabalhos', 'casamentos.html': '/casamentos',
         'sobre.html': '/sobre', 'contato.html': '/contato', 'privacidade.html': '/privacidade'}


def asset(mid):
    return '/' + AMAP[mid]


def convert(name, out):
    s = open(SRC + name).read()
    # imagens e vídeos
    s = re.sub(r"B \+ '([0-9a-f]{32})'", lambda m: "'" + asset(m.group(1)) + "'", s)
    s = re.sub(r"/_blob/([0-9a-f]{32})", lambda m: asset(m.group(1)), s)
    s = re.sub(r"'([0-9a-f]{32})'", lambda m: "'" + asset(m.group(1)) + "'" if m.group(1) in AMAP else m.group(0), s)
    s = s.replace("const B = '/_blob/';", "const B = '';")
    # links entre páginas
    for src, dst in PAGES.items():
        s = s.replace(src, CLEAN[dst])
    s = s.replace('/#servicos', '/#servicos')
    # imagem de compartilhamento com endereço completo
    s = re.sub(r'(<meta property="og:image" content=")(/assets/)', r'\1' + DOMAIN + r'\2', s)
    s = s.replace('<script src="./support.js"></script>\n', '').replace('<script src="./support.js"></script>', '')
    head_end = s.index('</head>')
    x0 = s.index('<x-dc>')
    x1 = s.index('</x-dc>')
    inner = s[x0 + len('<x-dc>'):x1]
    h0 = inner.find('<helmet>')
    helmet = ''
    if h0 >= 0:
        h1 = inner.index('</helmet>')
        helmet = inner[h0 + len('<helmet>'):h1]
        inner = inner[:h0] + inner[h1 + len('</helmet>'):]
    extra_head = (
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        f'<link rel="canonical" href="{DOMAIN}{CLEAN[out]}">\n'
        f'<meta property="og:url" content="{DOMAIN}{CLEAN[out]}">\n'
        + helmet + '\n')
    page = (s[:head_end] + extra_head + s[head_end:x0]
            + '<template data-dc>' + inner + '</template>' + s[x1 + len('</x-dc>'):])
    page = page.replace('</body>', '<script src="/dcl.js"></script>\n</body>')
    open(OUT + out, 'w').write(page)
    left = re.findall(r'_blob|\.dc\.html', page)
    print(out, len(page), 'sobras:', left[:5])


for k, v in PAGES.items():
    convert(k, v)
