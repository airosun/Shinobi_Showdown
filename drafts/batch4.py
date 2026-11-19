# Batch 4 drafts: Hokage, Sannin and the Kage villages (Cloud, Mist, Stone).
# Same format as batch3.py. NEW=True / new=True / a True third trait element flag mechanics the engine doesn't have yet.
# Next batch (5): Fourth Great Ninja War (Great War Obito with Ten Tails Jinchuriki, Madara, Kaguya) and the remaining Jinchuriki.
from konoha import J, burn, para, bind, gen, flinch, drain, intel, heal, buff, debuff, recoil, pierce, decoy, cleanse, reveal, vsBound, chakraGive, rotation
from batch2 import poison
from batch3 import selfKO

NEW_JUTSU = {
  # Hashirama
  'deep_forest': J('Wood Release: Deep Forest Emergence', 'ninjutsu', 'wood', 85, 50, 0, 'allEnemies', [bind(0.25)], 'A forest erupts under the enemy. 25% Bind.'),
  'wood_golem': J('Wood Release: Wood Golem', 'taijutsu', 'wood', 115, 45, -1, 'enemy', [], 'A giant wooden warrior strikes.'),
  'hashirama_regen': J('Seal-less Healing', 'medical', 'yang', 0, 25, 1, 'self', [heal(0.3)], 'Heals himself without hand seals: 30% max HP.'),
  'thousand_hands': J('Sage Art: True Several Thousand Hands', 'ninjutsu', 'wood', 170, 85, -1, 'allEnemies', [], 'Only while transformed. A colossal Buddha of a thousand hands.', requiresTransform=True),
  # Tobirama
  'water_shockwave': J('Water Release: Exploding Water Shockwave', 'ninjutsu', 'water', 85, 50, 0, 'allEnemies', [], 'A wall of water floods the field.'),
  'ftg_slash': J('Flying Thunder God Slash', 'taijutsu', None, 95, 25, 2, 'enemy', [], 'Teleports to his marker and cuts before anyone moves.'),
  'water_formation_wall': J('Water Release: Water Formation Wall', 'support', 'water', 0, 40, 2, 'allAllies', [buff('def', 1.25, 2)], 'A wall of water shields the team: +25% DEF for 2 turns.'),
  'shadow_clone_ambush': J('Shadow Clone Ambush', 'taijutsu', None, 70, 25, 1, 'allEnemies', [], 'The inventor of the Shadow Clone hits everyone at once.'),
  # Hiruzen
  'fire_dragon_flame': J('Fire Release: Fire Dragon Flame Bullet', 'ninjutsu', 'fire', 105, 45, 0, 'enemy', [burn(0.25)], 'A dragon of flame. 25% Burn.'),
  'shuriken_shadow_clone': J('Shuriken Shadow Clone', 'taijutsu', None, 65, 25, 1, 'allEnemies', [], 'One shuriken becomes a thousand.'),
  'adamantine_staff': J('Enma: Adamantine Staff', 'taijutsu', None, 105, 30, 0, 'enemy', [pierce(0.2)], 'The Monkey King as an unbreakable staff. Ignores 20% DEF.'),
  'reaper_death_seal': J('Reaper Death Seal', 'ninjutsu', 'yin', 230, 60, -1, 'enemy', [selfKO], 'Seals the target\'s soul. Ignores Substitution. Hiruzen is knocked out.', ignoresSub=True),
  # Minato
  'ftg_strike': J('Flying Thunder God Strike', 'taijutsu', None, 90, 20, 2, 'enemy', [], 'A three-pronged kunai, then he is already there.'),
  'ftg_barrier': J('Space-Time Barrier', 'support', 'yang', 0, 35, 4, 'self', [rotation], 'Teleports every incoming attack away this turn (except genjutsu).'),
  'ftg_rasengan': J('Flying Thunder God: Rasengan', 'ninjutsu', 'wind', 115, 45, 1, 'enemy', [], 'Warps in with a Rasengan already in hand.'),
  'kurama_bomb_minato': J('Yang Kurama: Tailed Beast Bomb', 'ninjutsu', 'yang', 170, 80, -1, 'allEnemies', [], 'Only while transformed. Yang Kurama fires a Tailed Beast Bomb.', requiresTransform=True),
  # Tsunade
  'tsunade_punch': J('Chakra Enhanced Strength', 'taijutsu', 'earth', 115, 25, 0, 'enemy', [flinch(0.2)], 'A punch that splits the ground. 20% Flinch.'),
  'creation_rebirth': J('Creation Rebirth', 'medical', 'yang', 0, 50, 3, 'self', [heal(0.5), cleanse], 'Only while transformed. Rebuilds her body: heal 50% and cleanse.', requiresTransform=True),
  # Jiraiya
  'toad_oil_flame': J('Fire Release: Toad Oil Flame Bullet', 'ninjutsu', 'fire', 95, 50, 0, 'allEnemies', [burn(0.3)], 'Gamabunta\'s oil set alight. 30% Burn.'),
  'needle_jizo': J('Wild Lion\'s Mane: Needle Jizo', 'support', None, 0, 25, 2, 'self', [buff('def', 1.5, 2)], 'Hardened hair wraps him: +50% DEF for 2 turns.'),
  'frog_song': J('Demonic Illusion: Gamarinsho', 'genjutsu', 'yin', 50, 60, 0, 'allEnemies', [gen(2)], 'Only while transformed. The Two Great Sage Toads sing every enemy into genjutsu for 2 turns.', requiresTransform=True),
  'toad_mouth_trap': J('Toad Mouth Bind', 'ninjutsu', 'earth', 40, 40, 0, 'enemy', [bind(0.7, 2)], 'Swallows the target in a toad\'s gullet: 70% Bind for 2 turns.'),
  # Cloud
  'liger_bomb': J('Lightning Release: Liger Bomb', 'taijutsu', 'lightning', 125, 40, 0, 'enemy', [], 'A lightning-charged piledriver.'),
  'lariat': J('Lightning Release: Lariat', 'taijutsu', 'lightning', 100, 25, 1, 'enemy', [], 'A charging, lightning-clad arm.'),
  'guillotine_drop': J('Lightning Release: Guillotine Drop', 'taijutsu', 'lightning', 140, 45, -1, 'enemy', [flinch(0.3)], 'A heel drop from above. 30% Flinch.'),
  'lightning_armor': J('Lightning Release Armor', 'support', 'lightning', 0, 30, 2, 'self', [buff('spd', 1.3, 3), buff('def', 1.2, 3)], 'Coats himself in lightning: +30% SPD and +20% DEF for 3 turns.'),
  'seven_swords': J('Seven Swords Dance', 'taijutsu', None, 100, 25, 0, 'enemy', [], 'Seven blades held in elbows, knees and mouth.'),
  'ink_creation': J('Ink Creation', 'ninjutsu', 'yin', 40, 30, 1, 'enemy', [bind(0.5)], 'Sticky octopus ink. 50% Bind.'),
  'octopus_clone': J('Octopus Leg Substitute', 'support', None, 0, 20, 2, 'self', [decoy], 'A severed tentacle takes the next hit.'),
  'gyuki_bomb': J('Gyuki: Tailed Beast Bomb', 'ninjutsu', None, 175, 80, -1, 'allEnemies', [], 'Only while transformed. The Eight-Tails fires a Tailed Beast Bomb.', requiresTransform=True),
  'black_panther': J('Black Lightning: Black Panther', 'ninjutsu', 'lightning', 110, 45, 0, 'enemy', [para(0.3)], 'A panther of black lightning. 30% Paralyze.'),
  'laser_circus': J('Storm Release: Laser Circus', 'ninjutsu', 'storm', 85, 50, 0, 'allEnemies', [], 'Bending beams of light hit every enemy.'),
  'cleaver_sword': J('Cleaver Sword Slash', 'taijutsu', None, 90, 20, 0, 'enemy', [], 'A swing of the heavy cleaver.'),
  'karui_combo': J('Cloud-Style Front Beheading', 'taijutsu', None, 95, 20, 0, 'enemy', [], 'A downward cut with full body weight.'),
  'karui_flurry': J('Cloud-Style Flurry', 'taijutsu', None, 65, 10, 1, 'enemy', [flinch(0.15)], 'A fast flurry of punches. 15% Flinch.'),
  'karui_lightning_blade': J('Lightning Release: Lightning Blade Edge', 'taijutsu', 'lightning', 85, 25, 0, 'enemy', [pierce(0.15)], 'A lightning-charged sword. Ignores 15% DEF.'),
  # Mist
  'lava_monster': J('Lava Release: Lava Monster', 'ninjutsu', 'lava', 105, 50, 0, 'enemy', [burn(0.3)], 'Spits molten lava. 30% Burn.'),
  'solid_fog': J('Boil Release: Solid Fog', 'ninjutsu', 'boil', 70, 45, 0, 'allEnemies', [debuff('def', 0.85, 2)], 'Corrosive acid mist: −15% DEF for 2 turns on all enemies.'),
  'water_dragon_mist': J('Water Release: Water Dragon Bullet', 'ninjutsu', 'water', 100, 50, 0, 'enemy', [], 'A dragon of water.'),
  'hiramekarei_slash': J('Hiramekarei Slash', 'taijutsu', 'water', 90, 20, 0, 'enemy', [], 'The twin sword releases stored chakra.'),
  'hiramekarei_unleashed': J('Hiramekarei Unleashing', 'taijutsu', 'water', 125, 40, -1, 'enemy', [pierce(0.2)], 'A giant chakra blade. Ignores 20% DEF.'),
  'hiramekarei_guard': J('Hiramekarei Guard', 'support', 'water', 0, 20, 2, 'self', [buff('def', 1.4, 2)], 'Shapes the stored chakra into a shield: +40% DEF for 2 turns.'),
  'raging_waves': J('Water Release: Raging Waves', 'ninjutsu', 'water', 80, 45, 0, 'allEnemies', [], 'A torrent from his mouth.'),
  'ao_sensing': J('Byakugan Sensing', 'support', 'yang', 0, 20, 0, 'enemy', [reveal, intel(6)], 'His stolen Byakugan reads the target: reveal its loadout and +6 Intel.'),
  'steaming_tyrant': J('Water Release: Steaming Danger Tyrant', 'ninjutsu', 'boil', 95, 45, 0, 'enemy', [burn(0.2)], 'Boiling water doubles that explode. 20% Burn.'),
  'clam_mirage': J('Clam Mirage', 'genjutsu', 'yin', 0, 40, 0, 'allEnemies', [gen(1)], 'A giant clam\'s mirage: genjutsu on all enemies for 1 turn.'),
  'coral_palm': J('Water Release: Coral Palm', 'ninjutsu', 'water', 75, 35, 0, 'enemy', [bind(0.4)], 'Coral grows over the target. 40% Bind.'),
  'hook_staff': J('Hook Staff', 'taijutsu', None, 85, 15, 1, 'enemy', [], 'A strike with his flower-hooked staff.'),
  'water_mirror': J('Water Mirror Technique', 'support', 'water', 0, 25, 2, 'self', [decoy], 'A reflection steps in front of him: gain a Decoy.'),
  'isobu_bomb': J('Isobu: Tailed Beast Bomb', 'ninjutsu', 'water', 160, 75, -1, 'allEnemies', [], 'Only while transformed. The Three-Tails fires a Tailed Beast Bomb.', requiresTransform=True),
  # Stone
  'particle_detachment': J('Dust Release: Detachment of the Primitive World', 'ninjutsu', 'dust', 170, 90, -1, 'enemy', [], 'A cube of light disintegrates the target. Ignores Substitution.', ignoresSub=True),
  'weighted_boulder': J('Earth Release: Added Weight Rock', 'ninjutsu', 'earth', 0, 30, 1, 'enemy', [debuff('spd', 0.6, 2)], 'Makes the target heavy: −40% SPD for 2 turns.'),
  'lightened_boulder': J('Earth Release: Light Weight Rock', 'support', 'earth', 0, 20, 2, 'allAllies', [buff('spd', 1.25, 2)], 'Lightens the team: +25% SPD for 2 turns.'),
  'golem': J('Earth Release: Golem', 'taijutsu', 'earth', 100, 35, 0, 'enemy', [], 'A stone golem pounds the target.'),
  'quicklime': J('Lava Release: Quicklime Congealing', 'ninjutsu', 'lava', 0, 40, 0, 'enemy', [bind(0.7, 2)], 'Quick-setting lime: 70% Bind for 2 turns.'),
  'lava_globs': J('Lava Release: Lava Globs', 'ninjutsu', 'lava', 75, 40, 0, 'allEnemies', [burn(0.15)], 'Blobs of lava rain down. 15% Burn.'),
  'rock_fist': J('Earth Release: Rock Fist', 'taijutsu', 'earth', 85, 15, 1, 'enemy', [], 'A fist encased in stone.'),
  'stone_wall': J('Earth Release: Earth Dome', 'support', 'earth', 0, 35, 2, 'allAllies', [buff('def', 1.3, 2)], 'A dome of stone over the team: +30% DEF for 2 turns.'),
  'mu_split': J('Splitting Technique', 'support', 'dust', 0, 25, 2, 'self', [decoy], 'Splits his body in two: gain a Decoy.'),
  'mu_invisibility': J('Invisibility Technique', 'support', None, 0, 25, 0, 'self', [intel(10)], 'Vanishes to scout: +10 Intel.'),
  'dust_cone': J('Dust Release: Cone of Light', 'ninjutsu', 'dust', 110, 55, 0, 'enemy', [], 'A smaller detachment cone.'),
}

def T(name, resolve, turns, desc): return dict(name=name, resolve=resolve, turns=turns, desc=desc)
def A(name, kind, values, desc, **k): return dict(name=name, kind=kind, values=values, desc=desc, **k)

S = []
def add(id, char, form, era, cost, p, s, roles, st, trait, tf, aura, subs, cat, notes='', status='New'):
    S.append(dict(id=id, character=char, form=form, era=era, cost=cost, primary=p, secondary=s, roles=roles, stats=st, trait=trait,
                  transformation=tf, support=aura, subs=subs, catalogue=cat, notes=notes, status=status))

# stats: (HP, TAI, NIN, DEF, SPD, CHK)
# ---- Hokage
add('hashirama', 'Hashirama Senju', '—', 'Shippuden', 10, 'wood', 'earth', ['Tank', 'Striker', 'Controller'], (130, 100, 130, 110, 100, 170),
    ('Hashirama Cells', 'Regenerates 8% HP per turn.', True),
    T('Sage Mode', 60, 3, '+30% NIN, +30% DEF and unlocks True Several Thousand Hands. Exhausted afterwards.'),
    A("God of Shinobi", 'dr', '5% / 8% / 12%', 'Allies take {v} less damage.'),
    ['log', 'shadowClone'], ['wood_dragon', 'deep_forest', 'wood_golem', 'wood_prison', 'hashirama_regen', 'thousand_hands'])
add('tobirama', 'Tobirama Senju', '—', 'Shippuden', 9, 'water', 'lightning', ['Striker', 'Sensor'], (110, 95, 120, 95, 125, 150),
    ('Sensory Genius', 'Sees through Log Substitution and Decoys, and his Gather Intel gains +4.', True),
    None,
    A("Second Hokage's Order", 'stat:spd', '10% / 15% / 25%', 'Allies gain +{v} SPD.'),
    ['log', 'shadowClone'], ['water_dragon', 'water_shockwave', 'ftg_slash', 'water_formation_wall', 'shadow_clone_ambush'])
add('hiruzen', 'Hiruzen Sarutobi', '—', 'Part 1', 8, 'fire', 'earth', ['Striker', 'Controller', 'Support'], (105, 90, 120, 95, 95, 150),
    ('The Professor', 'His jutsu cost 15% less Chakra.', True),
    None,
    A('Will of Fire', 'resolve', '+3 / +5 / +8', 'Allies gain {v} Resolve per turn.'),
    ['log', 'shadowClone'], ['fire_dragon_flame', 'shuriken_shadow_clone', 'adamantine_staff', 'mud_wall', 'reaper_death_seal'])
add('minato', 'Minato Namikaze', '—', 'Shippuden', 9, 'wind', 'yang', ['Striker', 'Infiltrator'], (105, 100, 115, 90, 140, 140),
    ('Flying Thunder God', 'His single-target jutsu gain +1 priority, and he dodges single-target attacks 10% more often.', True),
    T('Nine-Tails Chakra Mode', 60, 3, '+30% NIN, +30% SPD and unlocks Yang Kurama: Tailed Beast Bomb. Exhausted afterwards.'),
    A('Yellow Flash', 'dodge', '4% / 7% / 10%', 'Allies dodge single-target attacks {v} more often.'),
    ['log', 'shadowClone'], ['rasengan', 'ftg_strike', 'ftg_rasengan', 'ftg_barrier', 'kurama_bomb_minato'])
# ---- Sannin
add('tsunade', 'Tsunade Senju', '—', 'Part 1', 9, 'earth', 'yang', ['Frontliner', 'Medic'], (125, 130, 90, 105, 90, 150),
    ('Legendary Medic', 'Her healing is 25% stronger.', True),
    T('Strength of a Hundred Seal', 60, 3, '+30% TAI, +20% DEF, regenerates 10% HP per turn and unlocks Creation Rebirth. Exhausted afterwards.'),
    A('Slug Princess', 'heal', '3% / 5% / 8%', 'Allies regenerate {v} max HP per turn.'),
    ['log', 'shadowClone'], ['tsunade_punch', 'heavenly_kick', 'mystical_palm', 'katsuyu', 'creation_rebirth'])
add('jiraiya', 'Jiraiya', '—', 'Part 1', 9, 'fire', 'earth', ['Striker', 'Infiltrator', 'Controller'], (120, 95, 120, 95, 100, 150),
    ('Super Pervert Spy', 'His Gather Intel gains +6.', True),
    T('Sage Mode', 60, 3, '+30% NIN, +20% TAI and unlocks Demonic Illusion: Gamarinsho. Exhausted afterwards.'),
    A('Spy Network', 'intel', '1 / 2 / 3', 'Team gains {v} Secured Intel per turn.'),
    ['log', 'shadowClone'], ['rasengan', 'toad_oil_flame', 'needle_jizo', 'toad_mouth_trap', 'summon_gamabunta', 'frog_song'])
# ---- Cloud
add('raikage_a', 'A', '—', 'Shippuden', 9, 'lightning', None, ['Frontliner', 'Striker'], (125, 130, 80, 105, 120, 130),
    ('Lightning Release Armor', 'Takes 15% less damage, and his taijutsu ignore 15% DEF.', True),
    None,
    A("Raikage's Command", 'stat:tai', '10% / 15% / 25%', 'Allies gain +{v} TAI.'),
    ['log'], ['liger_bomb', 'lariat', 'guillotine_drop', 'lightning_armor'])
add('killer_bee', 'Killer Bee', '—', 'Shippuden', 9, 'lightning', None, ['Frontliner', 'Tank'], (125, 115, 105, 100, 105, 160),
    ('Perfect Jinchuriki', 'Regenerates 6% HP per turn and Gyuki snaps him out of genjutsu (immune).', True),
    T('Eight-Tails Full Form', 60, 3, '+40% TAI, +30% DEF and unlocks Gyuki: Tailed Beast Bomb. Exhausted afterwards.'),
    A('Rap Flow', 'genjutsuResist', '20% / 30% / 50%', 'Allies shrug off genjutsu {v} of the time.'),
    ['log', 'shadowClone'], ['seven_swords', 'lariat', 'ink_creation', 'octopus_clone', 'gyuki_bomb'])
add('darui', 'Darui', '—', 'Shippuden', 7, 'storm', 'lightning', ['Striker'], (110, 95, 115, 95, 95, 130),
    ('Black Lightning', 'His Lightning and Storm jutsu that hit have a 20% chance to Paralyze.', True),
    None,
    A('Calm Head', 'dr', '4% / 7% / 10%', 'Allies take {v} less damage.'),
    ['log', 'waterClone'], ['black_panther', 'laser_circus', 'cleaver_sword', 'lightning_armor'])
add('karui', 'Karui', '—', 'Shippuden', 5, 'lightning', None, ['Frontliner'], (100, 105, 70, 85, 95, 100),
    ('Hot-Blooded', 'Deals +25% damage while below 50% HP.'),
    None,
    A('Cloud Kunoichi', 'focus', '5% / 10% / 15%', 'Allies deal +{v} damage to a target an ally already hit this turn.'),
    ['log'], ['karui_combo', 'karui_flurry', 'karui_lightning_blade', 'lariat'])
# ---- Mist
add('mei', 'Mei Terumi', '—', 'Shippuden', 8, 'lava', 'boil', ['Striker', 'Controller'], (110, 80, 125, 90, 95, 145),
    ('Two Kekkei Genkai', 'Her Lava and Boil jutsu deal +10% damage.', True),
    None,
    A('Fifth Mizukage', 'natureBoost:kekkei', '10% / 15% / 25%', 'Allies\' kekkei genkai jutsu deal +{v} damage.', new=True),
    ['log', 'waterClone'], ['lava_monster', 'solid_fog', 'water_dragon_mist', 'lava_globs'])
add('chojuro', 'Chojuro', '—', 'Shippuden', 5, 'water', None, ['Frontliner', 'Tank'], (95, 100, 75, 85, 100, 105),
    ('Twin Blades', 'His taijutsu hit a second time for 25% damage.', True),
    None,
    A('Swordsmen Legacy', 'crit', '+5% / +10% / +15%', 'Allies gain {v} critical-hit chance.'),
    ['log', 'waterClone'], ['hiramekarei_slash', 'hiramekarei_unleashed', 'hiramekarei_guard', 'water_gun'])
add('ao', 'Ao', '—', 'Shippuden', 5, 'water', None, ['Sensor', 'Controller'], (100, 80, 100, 90, 85, 120),
    ('Byakugan', 'Sees through Decoys.'),
    None,
    A('Mist Sensor', 'enemyIntel', '10% / 15% / 25%', 'Enemy Intel gains are reduced by {v}.'),
    ['log', 'waterClone'], ['raging_waves', 'water_dragon', 'ao_sensing', 'hidden_mist'])
add('gengetsu', 'Gengetsu Hozuki', '—', 'Shippuden', 7, 'boil', 'water', ['Controller', 'Striker'], (105, 80, 115, 85, 100, 135),
    ('Hydrification', 'Takes 20% less damage from taijutsu and Fire jutsu.'),
    None,
    A('Second Mizukage', 'subDiscount', '5% / 10% / 20%', 'Allies\' substitutions cost {v} less Chakra.'),
    ['log', 'waterClone'], ['steaming_tyrant', 'clam_mirage', 'water_gun', 'hydrification'])
add('yagura', 'Yagura Karatachi', '—', 'Shippuden', 8, 'water', None, ['Tank', 'Controller'], (110, 95, 110, 105, 100, 140),
    ('Coral Shell', 'The first damaging single-target hit he takes each turn is reduced by 35%.', True),
    T('Three-Tails Chakra Cloak', 60, 3, '+30% DEF, +30% NIN and unlocks Isobu: Tailed Beast Bomb. Exhausted afterwards.'),
    A('Bloody Mist', 'enemyDrain', '2% / 4% / 6%', 'Fielded enemies lose {v} max Chakra per turn.'),
    ['log', 'waterClone'], ['coral_palm', 'hook_staff', 'water_mirror', 'raging_waves', 'isobu_bomb'])
# ---- Stone
add('onoki', 'Onoki', '—', 'Shippuden', 9, 'dust', 'earth', ['Striker', 'Controller'], (100, 70, 135, 95, 100, 155),
    ('Levitation', 'Takes 20% less damage from taijutsu (he fights from the air).', True),
    None,
    A('Third Tsuchikage', 'stat:def', '10% / 15% / 25%', 'Allies gain +{v} DEF.'),
    ['log'], ['particle_detachment', 'weighted_boulder', 'lightened_boulder', 'golem', 'dust_cone'],
    notes='Dust Release is a new nature (Earth + Wind + Fire).')
add('kurotsuchi', 'Kurotsuchi', '—', 'Shippuden', 6, 'lava', 'earth', ['Controller', 'Striker'], (95, 85, 105, 85, 95, 120),
    ('Quick-Setting Lime', 'Her Binds last 1 turn longer.', True),
    None,
    A('Stone Guard', 'aoeDR', '10% / 20% / 30%', 'Allies take {v} less damage from area attacks.'),
    ['log'], ['quicklime', 'lava_globs', 'rock_fist', 'stone_wall'])
add('akatsuchi', 'Akatsuchi', '—', 'Shippuden', 5, 'earth', None, ['Tank'], (125, 95, 75, 115, 70, 110),
    ('Rock-Solid', 'Takes 15% less damage from single-target attacks.', True),
    None,
    A('Bodyguard Duty', 'protectWeakest', '10% / 20% / 30%', 'The ally with the lowest HP takes {v} less damage.'),
    ['log'], ['golem', 'rock_fist', 'stone_wall', 'lightened_boulder'])
add('mu', 'Mu', '—', 'Shippuden', 7, 'dust', 'wind', ['Infiltrator', 'Striker'], (95, 65, 120, 85, 105, 140),
    ('Invisibility', 'Dodges single-target attacks 15% more often.', True),
    None,
    A('Second Tsuchikage', 'intel', '1 / 2 / 3', 'Team gains {v} Secured Intel per turn.'),
    ['log'], ['particle_detachment', 'dust_cone', 'mu_split', 'mu_invisibility'],
    notes='Dust Release is a new nature (Earth + Wind + Fire).')
