# 배포 폴더 만들기 — `python _배포만들기.py` (홈페이지 폴더에서)
#
# 원본 페이지를 고친 뒤 이것을 돌리면 `배포/` 가 새로 만들어진다. 배포/ 안의 파일은 직접 고치지 않는다.
# - PAGES 에 적힌 페이지만 복사한다(md·py·시안·리서치·dist·live_chat 은 넣지 않는다)
# - 페이지가 쓰는 그림만 복사하고, 큰 그림은 줄여서 .webp 로 바꾼다(원본은 그대로)
# - BLUR 에 적힌 그림은 개인 정보 자리를 흐리게 가린다
# - 검색 차단: robots.txt · _headers · 각 페이지 noindex 확인
# - 마지막에 모든 내부 링크가 배포/ 안에 있는지 검사한다
# 필요: pip install pillow
import os, re, shutil, sys
from urllib.parse import unquote
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '배포')

PAGES = [
    'index.html',
    '강의상세_커리큘럼.html',
    '도구상세_통합.html',
    '오레브.html',
    '목회시스템.html',
    '설교플로우.html',
    '에듀플로우.html',
    '제자훈련플로우.html',
    '약관.html',
    '개인정보.html',
    'live.html',         # 라이브톡 (서버는 라이브톡/worker — 따로 wrangler deploy)
    '404.html',          # Cloudflare Pages 가 없는 주소에 자동으로 보여 줌
]
EXTRA = ['favicon.svg', '공통.css', 'live.js', 'og/lowspot.png', 'og/orev.png']   # og/ = 카톡 링크 미리보기 그림
ASSET_DIRS = ('화면사진', '오레브사진', '에듀사진', '제자사진')

MAX_W = 1600          # 이보다 넓은 그림은 줄인다
MAX_KB = 250          # 이보다 큰 그림은 webp 로 바꾼다

# 개인 정보 가림: 파일 → 원본 좌표 (왼, 위, 오른, 아래) 목록
BLUR = {
    # 말씀 받은 사람 이름(가족 이름으로 보임)
    '화면사진/말씀뽑기 설정.png': [(515, 660, 720, 1085), (720, 165, 860, 228)],
    '화면사진/말씀뽑기 뽑기화면.png': [(1200, 340, 1350, 418)],
}

# 검색 로봇은 막고, 링크 미리보기 로봇(카카오톡·페이스북·X)만 허용한다 — 미리보기는 색인을 만들지 않음
ROBOTS = ('User-agent: kakaotalk-scrap\nAllow: /\n\n'
          'User-agent: facebookexternalhit\nAllow: /\n\n'
          'User-agent: Twitterbot\nAllow: /\n\n'
          'User-agent: *\nDisallow: /\n')
HEADERS = '/*\n  X-Robots-Tag: noindex, nofollow\n'

ASSET_RE = re.compile(r'(?:%s)/[^"\'`)<>]+?\.(?:png|jpe?g|webp|svg|gif)' % '|'.join(ASSET_DIRS))


def convert(src_rel):
    """그림 하나를 배포/ 로 옮긴다. 배포에서 쓸 상대 경로를 돌려준다."""
    src = os.path.join(HERE, src_rel)
    blur = BLUR.get(src_rel)
    big = os.path.getsize(src) > MAX_KB * 1024
    if src_rel.endswith('.svg') or not (big or blur):
        dst_rel = src_rel
        os.makedirs(os.path.dirname(os.path.join(OUT, dst_rel)), exist_ok=True)
        shutil.copy2(src, os.path.join(OUT, dst_rel))
        return dst_rel
    im = Image.open(src)
    im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
    for box in blur or []:
        region = im.crop(box).filter(ImageFilter.GaussianBlur(24))
        im.paste(region, box)
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    dst_rel = os.path.splitext(src_rel)[0] + '.webp'
    os.makedirs(os.path.dirname(os.path.join(OUT, dst_rel)), exist_ok=True)
    im.save(os.path.join(OUT, dst_rel), 'WEBP', quality=82, method=6)
    return dst_rel


def main():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    problems = []
    done = {}
    pages = [p for p in PAGES if os.path.exists(os.path.join(HERE, p))]
    missing = [p for p in PAGES if p not in pages]
    for page in pages:
        s = open(os.path.join(HERE, page), encoding='utf-8').read()
        if 'name="robots" content="noindex' not in s:
            problems.append(f'{page}: noindex 메타 없음')
        for ref in sorted(set(ASSET_RE.findall(s)), key=len, reverse=True):
            rel = unquote(ref)
            if not os.path.exists(os.path.join(HERE, rel)):
                problems.append(f'{page}: 그림 없음 {rel}')
                continue
            if rel not in done:
                done[rel] = convert(rel)
            if done[rel] != rel:
                s = s.replace(ref, done[rel])
        open(os.path.join(OUT, page), 'w', encoding='utf-8').write(s)
    for f in EXTRA:
        os.makedirs(os.path.dirname(os.path.join(OUT, f)), exist_ok=True)
        shutil.copy2(os.path.join(HERE, f), os.path.join(OUT, f))
    open(os.path.join(OUT, 'robots.txt'), 'w').write(ROBOTS)
    open(os.path.join(OUT, '_headers'), 'w').write(HEADERS)

    # 내부 링크 검사 (href·src)
    for page in pages:
        s = open(os.path.join(OUT, page), encoding='utf-8').read()
        for m in re.finditer(r'(?:href|src)="([^"]+)"', s):
            u = m.group(1)
            if re.match(r'(https?:|mailto:|tel:|#|javascript:|data:|\$\{)', u):
                continue
            path = unquote(u.split('#')[0].split('?')[0])
            if u.startswith('/'):
                path = path.lstrip('/') or 'index.html'
            if path and not os.path.exists(os.path.join(OUT, path)):
                problems.append(f'{page}: 링크 대상 없음 {u}')
        if re.search(r'lowspot\.kr|문의@|live_chat', s):
            problems.append(f'{page}: 옛 주소/라이브톡 흔적')

    total = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(OUT) for f in fs)
    print(f'페이지 {len(pages)}개 · 그림 {len(done)}개 · 전체 {total / 1024 / 1024:.1f}MB → {OUT}')
    if missing:
        print('아직 없는 페이지(건너뜀):', ', '.join(missing))
    for p in problems:
        print('⚠', p)
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
