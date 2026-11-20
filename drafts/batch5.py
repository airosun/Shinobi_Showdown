# Batch 5 drafts: the Fourth Great Ninja War (Great War Obito, Madara, Kaguya) and the remaining Jinchuriki.
# Same format as batch4.py. NEW=True / new=True / a True third trait element flag mechanics the engine doesn't have yet.
# Costs above 10 are new: Madara (Ten Tails Jinchuriki) and Kaguya are "god tier" at 12, so a 30-point team must go cheap elsewhere.
from konoha import J, burn, para, bind, gen, flinch, drain, intel, heal, buff, debuff, recoil, pierce, decoy, cleanse, reveal, vsBound, chakraGive, rotation
from batch2 import poison
from batch3 import steal

NEW_JUTSU = {
  # Great War Obito
  'uchiha_gunbai': J('Uchiha Gunbai: Uchiwa', 'support', 'yang', 0, 35, 4, 'self', [rotation], 'The war fan absorbs every incoming attack this turn (except genjutsu).'),
  'truth_seeking_balls': J('Truth-Seeking Balls', 'ninjutsu', 'yin', 140, 60, 0, 'allEnemies', [], 'Only while transformed. Orbs of Yin-Yang Release that nullify ninjutsu. Ignores Substitution.', requiresTransform=True, ignoresSub=True),
  'ten_tails_bomb': J('Ten-Tails: Tailed Beast Bomb', 'ninjutsu', None, 190, 90, -1, 'allEnemies', [], 'Only while transformed. A bomb that can level a mountain range.', requiresTransform=True),
  # Madara (Full Reanimation)
  'majestic_flame': J('Fire Release: Majestic Destroyer Flame', 'ninjutsu', 'fire', 105, 55, 0, 'allEnemies', [burn(0.3)], 'A wall of fire over the whole field. 30% Burn.'),
  'tengai_shinsei': J('Tengai Shinsei', 'ninjutsu', 'earth', 190, 95, -1, 'allEnemies', [], 'Charged. He drops a meteor. Then a second one.', charged=True),
  'susanoo_sword': J("Perfect Susano'o: Sword Slash", 'ninjutsu', 'fire', 170, 75, 0, 'allEnemies', [], "Only while transformed. One swing of Perfect Susano'o splits the land.", requiresTransform=True),
  'madara_taijutsu': J('Uchiha Taijutsu', 'taijutsu', None, 95, 15, 1, 'enemy', [], 'Effortless hand-to-hand against a whole army.'),
  # Madara (Ten Tails Jinchuriki)
  'limbo_strike': J('Limbo: Border Jail', 'taijutsu', 'yin', 110, 30, 1, 'enemy', [], 'Invisible shadows strike from the other world. Ignores Substitution.', ignoresSub=True),
  'madara_tsb': J('Truth-Seeking Ball Staff', 'taijutsu', 'yin', 125, 35, 0, 'enemy', [pierce(0.3)], 'A staff of Yin-Yang Release. Ignores 30% DEF.'),
  'six_paths_chibaku': J('Six Paths: Chibaku Tensei', 'ninjutsu', 'yin', 200, 110, -1, 'allEnemies', [bind(0.5, 2)], 'Charged. A moon-sized prison: 50% Bind for 2 turns.', charged=True),
  'infinite_tsukuyomi': J('Infinite Tsukuyomi', 'genjutsu', 'yin', 60, 100, -1, 'allEnemies', [gen(3)], 'The moon lights up the world: damage and genjutsu for 3 turns on every enemy.'),
  # Kaguya
  'ash_bones': J('All-Killing Ash Bones', 'taijutsu', 'yang', 120, 35, 0, 'enemy', [pierce(0.3)], 'Bones that crumble the target to ash. Ignores 30% DEF.'),
  'expansive_tsb': J('Expansive Truth-Seeking Ball', 'ninjutsu', 'yin', 140, 80, -1, 'allEnemies', [steal(0.2)], 'Absorbs the chakra of everyone it touches: steals 20% Chakra from every enemy.'),
  'yomotsu_hirasaka': J('Yomotsu Hirasaka', 'ninjutsu', 'yin', 90, 35, 2, 'enemy', [], 'Opens a portal and strikes from behind.'),
  'eighty_gods': J('Eighty Gods Vacuum Attack', 'taijutsu', 'yang', 85, 35, 1, 'allEnemies', [], 'A barrage of air-shattering palms on everyone.'),
  'hair_needles': J('Hair Needle Senbon', 'ninjutsu', 'yang', 40, 30, 1, 'enemy', [bind(0.6)], 'Living hair wraps the target. 60% Bind.'),
  'dimension_shift': J('Amenominaka', 'support', 'yin', 0, 50, 4, 'self', [rotation], 'Shifts everyone to another dimension: every attack on her this turn misses (except genjutsu).'),
  # Fu (Seven-Tails)
  'scale_powder': J('Secret Technique: Scale Powder', 'ninjutsu', 'wind', 60, 35, 0, 'allEnemies', [flinch(0.25)], 'Blinding scale powder over the field. 25% Flinch.'),
  'insect_tackle': J('Rinpun Tackle', 'taijutsu', 'wind', 85, 15, 1, 'enemy', [], 'A diving charge on glowing wings.'),
  'chomei_flight': J('Chomei Wings', 'support', 'wind', 0, 20, 2, 'self', [buff('spd', 1.3, 3)], 'Takes to the air: +30% SPD for 3 turns.'),
  'chomei_bomb': J('Chomei: Tailed Beast Bomb', 'ninjutsu', 'wind', 150, 75, -1, 'allEnemies', [], 'Only while transformed. The Seven-Tails fires a Tailed Beast Bomb.', requiresTransform=True),
  # Utakata (Six-Tails)
  'bubble_burst': J('Bubble Release: Exploding Bubbles', 'ninjutsu', 'water', 70, 35, 0, 'allEnemies', [], 'A cloud of bubbles that explode on contact.'),
  'acid_bubbles': J('Bubble Release: Acid Bubbles', 'ninjutsu', 'boil', 90, 40, 0, 'enemy', [debuff('def', 0.85, 2)], 'Corrosive bubbles: −15% DEF for 2 turns.'),
  'bubble_prison': J('Bubble Release: Bubble Prison', 'ninjutsu', 'water', 0, 35, 1, 'enemy', [bind(0.65)], 'Traps the target in a bubble. 65% Bind.'),
  'bubble_clone': J('Bubble Clone', 'support', 'water', 0, 20, 2, 'self', [decoy], 'A bubble double takes the next hit.'),
  'saiken_bomb': J('Saiken: Tailed Beast Bomb', 'ninjutsu', 'boil', 150, 75, -1, 'allEnemies', [poison(0.3)], 'Only while transformed. The Six-Tails fires an acid Tailed Beast Bomb. 30% Poison.', requiresTransform=True),
  # Han (Five-Tails)
  'steam_punch': J('Boil Release: Steam Punch', 'taijutsu', 'boil', 105, 25, 0, 'enemy', [burn(0.2)], 'A steam-jet powered punch. 20% Burn.'),
  'steam_kick': J('Boil Release: Steam Kick', 'taijutsu', 'boil', 80, 15, 1, 'enemy', [], 'A fast kick riding a jet of steam.'),
  'steam_armor': J('Boil Release: Steam Armor', 'support', 'boil', 0, 25, 2, 'self', [buff('def', 1.4, 2)], 'Vents steam from his armor: +40% DEF for 2 turns.'),
  'kokuo_bomb': J('Kokuo: Tailed Beast Bomb', 'ninjutsu', 'boil', 150, 75, -1, 'allEnemies', [], 'Only while transformed. The Five-Tails fires a Tailed Beast Bomb.', requiresTransform=True),
  # Roshi (Four-Tails)
  'lava_fist': J('Lava Release: Lava Fist', 'taijutsu', 'lava', 100, 25, 0, 'enemy', [burn(0.25)], 'A fist coated in magma. 25% Burn.'),
  'lava_shuriken': J('Lava Release: Rubber Ball Shuriken', 'ninjutsu', 'lava', 75, 40, 1, 'allEnemies', [], 'Molten shuriken over the field.'),
  'magma_wall': J('Lava Release: Magma Wall', 'support', 'lava', 0, 35, 2, 'allAllies', [buff('def', 1.25, 2)], 'A cooling wall of magma: +25% DEF for 2 turns.'),
  'son_goku_bomb': J('Son Goku: Tailed Beast Bomb', 'ninjutsu', 'lava', 160, 80, -1, 'allEnemies', [burn(0.3)], 'Only while transformed. The Four-Tails fires a Tailed Beast Bomb. 30% Burn.', requiresTransform=True),
  # Yugito (Two-Tails)
  'blue_fire_claw': J('Cat Claw of Blue Fire', 'taijutsu', 'fire', 95, 20, 1, 'enemy', [burn(0.3)], 'Claws wreathed in Matatabi\'s blue flames. 30% Burn.'),
  'cat_fireballs': J('Fire Release: Mouse Fireballs', 'ninjutsu', 'fire', 70, 35, 0, 'allEnemies', [burn(0.2)], 'A spread of blue fireballs. 20% Burn.'),
  'cat_pounce': J('Cat Pounce', 'taijutsu', None, 70, 10, 2, 'enemy', [], 'Pounces before anyone can react.'),
  'matatabi_bomb': J('Matatabi: Tailed Beast Bomb', 'ninjutsu', 'fire', 150, 75, -1, 'allEnemies', [burn(0.4)], 'Only while transformed. The Two-Tails fires a Tailed Beast Bomb. 40% Burn.', requiresTransform=True),
}

def T(name, resolve, turns, desc): return dict(name=name, resolve=resolve, turns=turns, desc=desc)
def A(name, kind, values, desc, **k): return dict(name=name, kind=kind, values=values, desc=desc, **k)

S = []
def add(id, char, form, era, cost, p, s, roles, st, trait, tf, aura, subs, cat, notes='', status='New'):
    S.append(dict(id=id, character=char, form=form, era=era, cost=cost, primary=p, secondary=s, roles=roles, stats=st, trait=trait,
                  transformation=tf, support=aura, subs=subs, catalogue=cat, notes=notes, status=status))

# stats: (HP, TAI, NIN, DEF, SPD, CHK)
# ---- Fourth Great Ninja War
add('obito_war', 'Obito Uchiha', 'Great War', 'Shippuden', 10, 'wood', 'fire', ['Striker', 'Controller'], (120, 105, 125, 105, 115, 160),
    ('Kamui Intangibility', 'Single-target attacks have a 20% chance to pass straight through him.'),
    T('Ten Tails Jinchuriki', 80, 3, '+40% NIN, +30% DEF, regenerates 8% HP per turn and unlocks Truth-Seeking Balls and Ten-Tails: Tailed Beast Bomb. Exhausted afterwards.'),
    A('Six Paths Power', 'stat:nin', '10% / 15% / 25%', 'Allies gain +{v} NIN.'),
    ['log', 'shadowClone'], ['kamui_absorb', 'fire_annihilation', 'gedo_chains', 'uchiha_gunbai', 'truth_seeking_balls', 'ten_tails_bomb'])
add('madara_reanimated', 'Madara Uchiha', 'Full Reanimation', 'Shippuden', 10, 'fire', 'wood', ['Striker', 'Frontliner'], (120, 115, 125, 105, 115, 170),
    ('Endless Chakra', 'Reanimated with the Rinnegan: regenerates 8% HP and 8% Chakra per turn and is immune to Poison.', True),
    T("Perfect Susano'o", 80, 3, "+40% DEF, +30% NIN and unlocks Perfect Susano'o: Sword Slash. Exhausted afterwards."),
    A('Ghost of the Uchiha', 'pierce', '5% / 10% / 15%', "Allies' attacks ignore {v} DEF."),
    ['log', 'shadowClone'], ['majestic_flame', 'deep_forest', 'madara_taijutsu', 'uchiha_gunbai', 'tengai_shinsei', 'susanoo_sword'])
add('madara_jinchuriki', 'Madara Uchiha', 'Ten Tails Jinchuriki', 'Shippuden', 12, 'yin', 'yang', ['Striker', 'Controller'], (135, 130, 140, 115, 125, 180),
    ('Rinne-Sharingan', 'Sees through Log Substitution and Decoys, immune to genjutsu. His taijutsu strike a second time for 40% damage (Limbo shadows).', True),
    None,
    A("Moon's Eye", 'enemyDrain', '2% / 4% / 6%', 'Fielded enemies lose {v} max Chakra per turn.'),
    ['log'], ['limbo_strike', 'madara_tsb', 'six_paths_chibaku', 'infinite_tsukuyomi', 'majestic_flame'],
    notes='Cost 12: above the usual 10 cap.')
add('kaguya', 'Kaguya Otsutsuki', '—', 'Shippuden', 12, 'yang', 'yin', ['Striker', 'Controller', 'Tank'], (140, 110, 145, 120, 120, 190),
    ('Progenitor of Chakra', 'Immune to genjutsu, and Chakra she drains is added to her own.', True),
    None,
    A('Mother of Chakra', 'chakra', '3% / 5% / 8%', 'Allies regenerate {v} max Chakra per turn.'),
    ['log'], ['ash_bones', 'expansive_tsb', 'yomotsu_hirasaka', 'eighty_gods', 'hair_needles', 'dimension_shift'],
    notes='Cost 12: above the usual 10 cap.')
# ---- Jinchuriki
add('fu', 'Fu', '—', 'Shippuden', 6, 'wind', None, ['Striker', 'Infiltrator'], (95, 80, 100, 80, 120, 120),
    ('Lucky Seven', 'Dodges single-target attacks 10% more often.'),
    T('Seven-Tails Chomei', 60, 3, '+30% NIN, +30% SPD and unlocks Chomei: Tailed Beast Bomb. Exhausted afterwards.'),
    A('Takigakure Spirit', 'dodge', '4% / 7% / 10%', 'Allies dodge single-target attacks {v} more often.'),
    ['log', 'shadowClone'], ['scale_powder', 'insect_tackle', 'chomei_flight', 'chomei_bomb'])
add('utakata', 'Utakata', '—', 'Shippuden', 7, 'water', 'boil', ['Controller', 'Striker'], (100, 70, 115, 90, 95, 130),
    ('Corrosive Bubbles', 'His Water and Boil jutsu that hit also lower the target\'s DEF by 10% for 2 turns.', True),
    T('Six-Tails Saiken', 60, 3, '+30% NIN, +30% DEF and unlocks Saiken: Tailed Beast Bomb. Exhausted afterwards.'),
    A('Bubble Barrier', 'aoeDR', '10% / 20% / 30%', 'Allies take {v} less damage from area attacks.'),
    ['log', 'waterClone'], ['bubble_burst', 'acid_bubbles', 'bubble_prison', 'bubble_clone', 'saiken_bomb'])
add('han', 'Han', '—', 'Shippuden', 7, 'boil', 'water', ['Frontliner', 'Tank'], (125, 115, 80, 110, 90, 120),
    ('Steam Armor', 'Enemies that hit him with taijutsu have a 30% chance to be Burned.', True),
    T('Five-Tails Kokuo', 60, 3, '+40% TAI, +30% DEF and unlocks Kokuo: Tailed Beast Bomb. Exhausted afterwards.'),
    A('Steam Vents', 'lowHpDR', '10% / 20% / 30%', 'Allies below 25% HP take {v} less damage.'),
    ['log'], ['steam_punch', 'steam_kick', 'steam_armor', 'kokuo_bomb'])
add('roshi', 'Roshi', '—', 'Shippuden', 7, 'lava', 'earth', ['Tank', 'Striker'], (115, 95, 110, 105, 85, 130),
    ('Volcanic Body', 'Immune to Burn. His Lava jutsu have +15% Burn chance.', True),
    T('Four-Tails Son Goku', 60, 3, '+30% NIN, +30% DEF and unlocks Son Goku: Tailed Beast Bomb. Exhausted afterwards.'),
    A('Old Monkey Wisdom', 'resolve', '+3 / +5 / +8', 'Allies gain {v} Resolve per turn.'),
    ['log'], ['lava_fist', 'lava_shuriken', 'magma_wall', 'lava_globs', 'son_goku_bomb'])
add('yugito', 'Yugito Nii', '—', 'Shippuden', 6, 'fire', None, ['Striker', 'Frontliner'], (95, 95, 105, 80, 115, 115),
    ('Cat Reflexes', 'Dodges single-target taijutsu 25% more often.', True),
    T('Two-Tails Matatabi', 60, 3, '+30% NIN, +30% SPD and unlocks Matatabi: Tailed Beast Bomb. Exhausted afterwards.'),
    A('Blue Flames', 'natureBoost:fire', '10% / 15% / 25%', "Allies' Fire jutsu deal +{v} damage."),
    ['log', 'shadowClone'], ['blue_fire_claw', 'cat_fireballs', 'cat_pounce', 'matatabi_bomb'])
