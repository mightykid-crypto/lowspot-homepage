# site.src.html → site.html : 사진 토큰 치환 + 브랜드 글꼴 서브셋 내장
import re, glob, base64, io, os, json
from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter

src = open('site.src.html', encoding='utf-8').read()
shots = json.load(open('shots.json'))
thumbs = json.load(open(r'C:\오레브사용자\프로젝트\홈페이지\화면사진\_thumbs.json'))

miss = []
def sub(pat, table):
    def f(m):
        k = m.group(1)
        if k not in table: miss.append(k); return ''
        return 'data:image/jpeg;base64,' + table[k]
    return f

s = re.sub(r'\{\{shot:([^}]+)\}\}', sub(None, shots), src)
s = re.sub(r'\{\{th:([^}]+)\}\}',   sub(None, thumbs), s)
if miss: raise SystemExit('사진 없음: ' + ', '.join(sorted(set(miss))))
assert '{{' not in s, '치환 안 된 토큰 남음'

body = re.sub(r'<script[\s\S]*?</script>', '', s.split('</style>', 1)[1])
text = re.sub(r'<[^>]+>', ' ', body)
# 스크립트 안의 한글 문구도 화면에 뜨므로 글자 집합에 포함한다
script = ''.join(re.findall(r'<script[\s\S]*?</script>', s))
chars = sorted({c for c in (text + script) if ord(c) > 0x20})

FD = 'C:/오레브사용자/프로젝트/앱/10초게임/public/fonts'
css = []; tot = 0
for fam, wt, pat in [('GowunBatang',700,'GowunBatang-700-*.woff2'),
                     ('PretendardKR',400,'PretendardKR-400-*.woff2'),
                     ('PretendardKR',700,'PretendardKR-700-*.woff2')]:
    for p in sorted(glob.glob(os.path.join(FD, pat))):
        f = TTFont(p); cm = set(f.getBestCmap().keys())
        need = sorted(ord(c) for c in chars if ord(c) in cm)
        if not need: f.close(); continue
        ss = Subsetter(); ss.populate(unicodes=need); ss.subset(f)
        b = io.BytesIO(); f.flavor = 'woff2'; f.save(b); d = b.getvalue(); f.close()
        tot += len(d)
        css.append("@font-face{font-family:'%s';font-style:normal;font-weight:%d;font-display:swap;"
                   "src:url(data:font/woff2;base64,%s) format('woff2');unicode-range:%s}"
                   % (fam, wt, base64.b64encode(d).decode(),
                      ','.join('U+%04X' % u for u in need)))

out = s.replace('<style>',
    '<style>\n/* 브랜드 글꼴 내장 · 원본은 site.src.html (사진은 {{th:}}·{{shot:}} 토큰) */\n'
    + '\n'.join(css) + '\n', 1)
# ★파일을 직접 열 때 한글이 깨지지 않도록 문자셋 선언을 맨 앞에 둔다.
# (아티팩트는 자체 <head>가 있지만, 목사님이 html 을 더블클릭해 여실 때는 이게 없으면
#  브라우저가 인코딩을 잘못 짚어 전부 깨진다 — 2026-08-03 실제로 겪음.
#  meta charset 은 **문서 첫 1024바이트 안**에 있어야 효력이 있으므로 반드시 맨 앞이다.)
out = '<meta charset="utf-8">\n' + out
open('site.html', 'w', encoding='utf-8').write(out)
print('글자 %d종 · 글꼴 %.0fKB · 최종 %.0fKB' % (len(chars), tot/1024, len(out.encode('utf-8'))/1024))
