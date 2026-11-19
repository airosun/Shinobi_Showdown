# Builds battle sprites + menu portraits from the art in public/sprites/*.png
#   python3 scripts/build_sprites.py
# Add new art to public/sprites, add its file name to MAP below, run this, commit.
import json, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public', 'sprites')
OUT = os.path.join(ROOT, 'battle')
# file -> (shinobi id, 'front' | 'transform'); one file can serve several ids
MAP = {
    'naruto-part-1': [('naruto_p1', 'front')], 'naruto-part-1-nine-tails-cloak': [('naruto_p1', 'transform')],
    'naruto-shippuden': [('naruto_ship', 'front')], 'naruto-sage-mode': [('naruto_sage', 'front')],
    'naruto-kurama-link-mode': [('naruto_war', 'front')], 'naruto-sage-of-six-paths': [('naruto_war', 'transform')],
    'sasuke-part-1': [('sasuke_p1', 'front')], 'sasuke-part-1-curse-mark': [('sasuke_p1', 'transform')],
    'sasuke-shippuden': [('sasuke_ship', 'front')], 'sasuke-mangekyo': [('sasuke_ms', 'front')],
    'sasuke-eternal-mangekyo': [('sasuke_war', 'front')], 'sasuke-rinne-sharingan': [('sasuke_war', 'transform')],
    'sakura-part-1': [('sakura_p1', 'front')], 'sakura-shippuden': [('sakura_shippuden', 'front')], 'sakura-great-war': [('sakura_war', 'front')],
    'kakashi': [('kakashi_p1', 'front'), ('kakashi_ship', 'front')], 'kakashi-double-mangekyo': [('kakashi_dms', 'front')],
    'sai': [('sai', 'front')], 'yamato': [('yamato', 'front')],
    'hinata-part-1': [('hinata_p1', 'front')], 'hinata-shippuden': [('hinata_ship', 'front')],
    'neji-part-1': [('neji_p1', 'front')], 'neji-shippuden': [('neji_ship', 'front')],
    'rock-lee-part-1': [('lee_p1', 'front')], 'rock-lee-shippuden': [('lee_ship', 'front')],
    'tenten-part-1': [('tenten_p1', 'front')], 'tenten-shippuden': [('tenten_ship', 'front')], 'might-guy': [('guy', 'front')],
    'shino-part-1': [('shino_p1', 'front')], 'shino-shippuden': [('shino_ship', 'front')],
    'shikamaru-part-1': [('shikamaru_p1', 'front')], 'shikamaru-shippuden': [('shikamaru_ship', 'front')],
    'choji-part-1': [('choji_p1', 'front')], 'choji-shippuden': [('choji_ship', 'front')],
    'ino-part-1': [('ino_p1', 'front')], 'ino-shippuden': [('ino_ship', 'front')],
    'kurenai': [('kurenai', 'front')], 'asuma': [('asuma', 'front')],
    # transformation art for batch 1
    'naruto-four-tails-cloak': [('naruto_ship', 'transform')], 'sasuke-shippuden-curse-mark': [('sasuke_ship', 'transform')],
    'sasuke-susanoo': [('sasuke_ms', 'transform')], 'sakura-strength-of-a-hundred': [('sakura_war', 'transform')],
    'kakashi-mangekyo': [('kakashi_ship', 'transform')], 'kakashi-perfect-susanoo': [('kakashi_dms', 'transform')],
    'hinata-twin-lion-fist': [('hinata_ship', 'transform')], 'rock-lee-gates': [('lee_p1', 'transform')],
    'rock-lee-shippuden-gates': [('lee_ship', 'transform')], 'might-guy-gates': [('guy', 'transform')],
    'kiba-part-1': [('kiba_p1', 'front')], 'kiba-shippuden': [('kiba_ship', 'front')], 'kiba-two-headed-wolf': [('kiba_ship', 'transform')],
    'choji-butterfly': [('choji_p1', 'transform')], 'choji-shippuden-butterfly': [('choji_ship', 'transform')],
    # batch 2
    'gaara-part-1': [('gaara_p1', 'front')], 'gaara-partial-shukaku': [('gaara_p1', 'transform')], 'gaara-shippuden': [('gaara_ship', 'front')],
    'temari-part-1': [('temari_p1', 'front')], 'temari-shippuden': [('temari_ship', 'front')],
    'kankuro': [('kankuro_p1', 'front')], 'kankuro-shippuden': [('kankuro_ship', 'front')], 'chiyo': [('chiyo', 'front')],
    'orochimaru': [('orochimaru_p1', 'front'), ('orochimaru_ship', 'front')],
    'orochimaru-snake-form': [('orochimaru_p1', 'transform')], 'orochimaru-eight-branches': [('orochimaru_ship', 'transform')],
    'kabuto-part-1': [('kabuto_p1', 'front')], 'kabuto-sage-mode': [('kabuto_sage', 'front')], 'kabuto-dragon-sage-mode': [('kabuto_sage', 'transform')],
    'jirobo': [('jirobo', 'front')], 'jirobo-curse-mark': [('jirobo', 'transform')],
    'kidomaru': [('kidomaru', 'front')], 'kidomaru-curse-mark': [('kidomaru', 'transform')],
    'sakon-ukon': [('sakon_ukon', 'front')], 'sakon-ukon-curse-mark': [('sakon_ukon', 'transform')],
    'tayuya': [('tayuya', 'front')], 'tayuya-curse-mark': [('tayuya', 'transform')],
    'kimimaro': [('kimimaro', 'front')], 'kimimaro-curse-mark': [('kimimaro', 'transform')],
    'zabuza': [('zabuza', 'front')], 'haku': [('haku', 'front')], 'anko': [('anko', 'front')], 'danzo': [('danzo', 'front')],
    # batch 3
    'tobi': [('obito_tobi', 'front')], 'masked-man': [('obito_masked', 'front')],
    'white-zetsu': [('zetsu_white', 'front')], 'black-zetsu': [('zetsu_black', 'front')],
    'kisame': [('kisame', 'front')], 'kisame-fused': [('kisame', 'transform')], 'itachi': [('itachi', 'front')], 'itachi-susanoo': [('itachi', 'transform')],
    'deidara': [('deidara', 'front')], 'hidan': [('hidan', 'front')], 'hidan-death-possession-blood': [('hidan', 'transform')],
    'kakuzu': [('kakuzu', 'front')], 'kakuzu-earth-grudge': [('kakuzu', 'transform')], 'sasori': [('sasori', 'front')], 'sasori-puppet-form': [('sasori', 'transform')],
    'konan': [('konan', 'front')], 'konan-paper-angel': [('konan', 'transform')], 'pain': [('nagato_pain', 'front')], 'nagato': [('nagato_reanimated', 'front')],
    'suigetsu': [('suigetsu', 'front')], 'karin': [('karin', 'front')], 'jugo': [('jugo', 'front')], 'jugo-sage-mode': [('jugo', 'transform')],
}
# manual portrait boxes for poses the automatic crop gets wrong: (centre x, centre y, size) as fractions of the trimmed image width/height/width
FACE = {
    'kakashi-double-mangekyo': (0.40, 0.27, 0.42), 'rock-lee-part-1': (0.62, 0.10, 0.35),
    'sasuke-part-1-curse-mark': (0.38, 0.37, 0.32), 'naruto-part-1-nine-tails-cloak': (0.66, 0.28, 0.38),
    'choji-butterfly': (0.485, 0.55, 0.14), 'choji-shippuden-butterfly': (0.39, 0.51, 0.2), 'gaara-part-1': (0.16, 0.23, 0.3),
    'gaara-partial-shukaku': (0.45, 0.36, 0.18), 'kankuro-shippuden': (0.36, 0.36, 0.26), 'kiba-part-1': (0.12, 0.17, 0.3),
    'kiba-two-headed-wolf': (0.16, 0.55, 0.3), 'kidomaru-curse-mark': (0.6, 0.38, 0.22), 'kidomaru': (0.5, 0.3, 0.22),
    'kimimaro-curse-mark': (0.6, 0.46, 0.22), 'naruto-four-tails-cloak': (0.22, 0.52, 0.22), 'orochimaru-eight-branches': (0.55, 0.41, 0.3),
    'rock-lee-shippuden-gates': (0.25, 0.25, 0.55), 'sakon-ukon-curse-mark': (0.15, 0.43, 0.3), 'sasuke-shippuden-curse-mark': (0.6, 0.29, 0.13),
    'sasuke-susanoo': (0.47, 0.29, 0.3),
    'white-zetsu': (0.5, 0.36, 0.55), 'black-zetsu': (0.51, 0.32, 0.45), 'kisame-fused': (0.24, 0.43, 0.25), 'itachi-susanoo': (0.55, 0.4, 0.4),
    'kakuzu-earth-grudge': (0.42, 0.45, 0.3), 'konan-paper-angel': (0.48, 0.28, 0.17), 'jugo-sage-mode': (0.6, 0.22, 0.25), 'zabuza': (0.6, 0.37, 0.22), 'kakashi-perfect-susanoo': (0.56, 0.1, 0.3),
}
BATTLE_H = 440   # battle sprite height (px)
AVATAR = 128     # menu portrait size (px)

def portrait(im):
    """Square crop around the head: top of the figure, centred on the opaque pixels near the top."""
    w, h = im.size
    size = int(min(w, h * 0.34))
    a = im.getchannel('A')
    band = a.crop((0, 0, w, max(1, int(h * 0.18))))
    cols = [x for x in range(w) if band.crop((x, 0, x + 1, band.height)).getbbox()]
    cx = (cols[0] + cols[-1]) // 2 if cols else w // 2
    if len(cols) > 0 and cols[-1] - cols[0] > size:  # wide pose: centre on the densest column range
        hist = [sum(1 for y in range(0, band.height, 4) if band.getpixel((x, y)) > 0) for x in range(w)]
        cx = max(range(w), key=lambda x: sum(hist[max(0, x - size // 4):x + size // 4]))
    left = max(0, min(w - size, cx - size // 2))
    return im.crop((left, 0, left + size, size)).resize((AVATAR, AVATAR), Image.LANCZOS)

os.makedirs(OUT, exist_ok=True)
manifest = {}
for name, uses in MAP.items():
    src = os.path.join(ROOT, name + '.png')
    if not os.path.exists(src):
        print('missing', src); continue
    im = Image.open(src).convert('RGBA')
    im = im.crop(im.getchannel('A').getbbox())
    b = im.copy()
    if b.height > BATTLE_H:
        b = b.resize((round(b.width * BATTLE_H / b.height), BATTLE_H), Image.LANCZOS)
    b.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=88, method=6)
    if name in FACE:
        cx, cy, sz = FACE[name]; w, h = im.size; size = int(sz * w)
        left = max(0, min(w - size, int(cx * w - size / 2))); top = max(0, min(h - size, int(cy * h - size / 2)))
        face = im.crop((left, top, left + size, top + size)).resize((AVATAR, AVATAR), Image.LANCZOS)
    else:
        face = portrait(im)
    face.save(os.path.join(OUT, name + '-face.webp'), 'WEBP', quality=88, method=6)
    for sid, kind in uses:
        e = manifest.setdefault(sid, {})
        e[kind] = f'battle/{name}.webp'
        if kind == 'front': e['face'] = f'battle/{name}-face.webp'
        if kind == 'transform': e['transformFace'] = f'battle/{name}-face.webp'
json.dump({'note': 'Generated by scripts/build_sprites.py from the art in public/sprites.', 'sprites': manifest},
          open(os.path.join(ROOT, 'manifest.json'), 'w'), indent=1)
print(len(manifest), 'shinobi with art')
