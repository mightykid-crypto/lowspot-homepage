import re, glob, base64, io, os
from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter

HTML='site.html'
src=open(HTML,encoding='utf-8').read()
body=src.split('</style>',1)[1]
text=re.sub(r'<script[\s\S]*?</script>','',body)
text=re.sub(r'<[^>]+>',' ',text)
chars=sorted({c for c in text if ord(c)>0x20})
print('본문 고유 글자:',len(chars))

FD='C:/오레브사용자/프로젝트/앱/10초게임/public/fonts'
fams=[('GowunBatang',700,'GowunBatang-700-*.woff2'),
      ('PretendardKR',400,'PretendardKR-400-*.woff2'),
      ('PretendardKR',700,'PretendardKR-700-*.woff2')]
css=[]; total=0
for fam,wt,pat in fams:
    used=0
    for p in sorted(glob.glob(os.path.join(FD,pat))):
        f=TTFont(p); cm=set(f.getBestCmap().keys())
        need=sorted(ord(c) for c in chars if ord(c) in cm)
        if not need: f.close(); continue
        ss=Subsetter(); ss.populate(unicodes=need); ss.subset(f)
        buf=io.BytesIO(); f.flavor='woff2'; f.save(buf); d=buf.getvalue(); f.close()
        total+=len(d); used+=1
        rng=','.join('U+%04X'%u for u in need)
        css.append("@font-face{font-family:'%s';font-style:normal;font-weight:%d;font-display:swap;"
                   "src:url(data:font/woff2;base64,%s) format('woff2');unicode-range:%s}"
                   % (fam,wt,base64.b64encode(d).decode(),rng))
    print(f'  {fam} {wt}: 조각 {used}개')
print('서브셋 총 %.1f KB → base64 약 %.1f KB' % (total/1024, total*4/3/1024))
out=src.replace('<style>','<style>\n/* 브랜드 글꼴 내장 — 쓰인 글자만 추림(fonttools subset).\n   내장하지 않으면 이 기계에 안 깔린 글꼴이라 시스템 기본으로 떨어져 느낌 판단이 무의미해진다. */\n'+'\n'.join(css)+'\n',1)
open(HTML,'w',encoding='utf-8').write(out)
print('완료 · 파일 %.1f KB' % (len(out.encode('utf-8'))/1024))
