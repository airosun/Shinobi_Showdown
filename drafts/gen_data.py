# Generates public/data/shinobi.js and public/data/jutsu.js from the approved
# kit drafts (drafts/konoha.py) plus the existing data.
#   python3 drafts/gen_data.py
import json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import konoha as K
import batch2 as B2
import batch3 as B3
import batch4 as B4
import batch5 as B5
import batch6 as B6

ROOT = os.path.join(os.path.dirname(__file__), '..')
existing_j = json.load(open(os.path.join(os.path.dirname(__file__), 'base_jutsu.json')))
existing_s = {s['id']: s for s in json.load(open(os.path.join(os.path.dirname(__file__), 'base_shinobi.json')))}

# ---- approved sheet overrides (revision 9) ----
STAT_OVERRIDES = {
    'naruto_war': (125, 110, 125, 100, 120, 160),
    'sasuke_war': (115, 110, 135, 100, 120, 130),
    'hashirama': (120, 100, 130, 110, 100, 170),  # balance pass 4: HP 130 -> 120
}

# ---- balance pass 1 (CPU sim, cost-adjusted win rates) ----
COST_OVERRIDES = {'kurenai': 5, 'sakura_war': 9, 'tenten_ship': 7, 'kakashi_p1': 7, 'naruto_sage': 8, 'sai': 5, 'ino_ship': 5, 'shikamaru_p1': 5, 'kakashi_ship': 7, 'shino_p1': 4,
                  'sasuke_p1': 6, 'choji_p1': 6, 'choji_ship': 8,
                  # balance pass 2 (batch 2)
                  'kimimaro': 9, 'gaara_ship': 10, 'orochimaru_ship': 10, 'jirobo': 6, 'temari_p1': 6, 'kankuro_ship': 6,
                  'kakashi_dms': 9, 'sasuke_ship': 7,
                  # balance pass 3 (batch 3)
                  'nagato_reanimated': 10, 'kakuzu': 9, 'deidara': 8, 'sasori': 8, 'konan': 7, 'itachi': 8,
                  'chiyo': 5, 'naruto_ship': 6, 'sasuke_ms': 8, 'guy': 8, 'obito_masked': 10, 'zetsu_white': 4,
                  # balance pass 4 (batch 4)
                  'darui': 8, 'chojuro': 6, 'mei': 9, 'kurotsuchi': 7, 'yagura': 9, 'itachi': 7, 'gaara_p1': 7, 'kakashi_p1': 6, 'akatsuchi': 6, 'orochimaru_p1': 8, 'minato': 7, 'sasuke_war': 9, 'ao': 6,
                  # balance pass 5 (batch 5)
                  'roshi': 9, 'yugito': 7, 'utakata': 8, 'hiruzen': 7, 'kiba_ship': 6, 'onoki': 8, 'madara_reanimated': 12, 'han': 8, 'sasuke_ms': 7, 'kakashi_dms': 8,
                  # balance pass 6 (batch 6)
                  'shisui': 8, 'shizune': 5, 'iruka': 4, 'choji_ship': 7, 'naruto_p1': 5, 'naruto_sage': 7, 'sakura_war': 8}
JUTSU_OVERRIDES = {
    'amaterasu': {'effects': [{'type': 'burn', 'chance': 1, 'turns': 3}], 'cost': 55, 'desc': 'Black flames wherever he looks. Always Burns (3 turns). Ignores Substitution.'},
    'katsuyu': {'effects': [{'type': 'heal', 'value': 0.15}, {'type': 'buff', 'stat': 'def', 'mult': 1.2, 'turns': 2}], 'desc': "Katsuyu's clones heal all allies 15% and give +20% DEF for 2 turns."},
    'healing_transfer': {'effects': [{'type': 'heal', 'value': 0.3}, {'type': 'cleanse'}], 'desc': 'Heal an ally 30% and cleanse them.'},
    'massive_rasengan': {'power': 120},
    'super_beast_scroll': {'power': 95},
    'chidori_spear': {'power': 105},
    'blaze_kagutsuchi': {'power': 55, 'cost': 60, 'effects': [{'type': 'burn', 'chance': 0.25, 'turns': 3}], 'desc': "Shapes Amaterasu's flames into spikes. 25% Burn."},
    'susanoo_arrow': {'power': 140},
    'kurama_rasengan': {'power': 135},
    'tailed_beast_bomb': {'power': 185},
    'chidori_nagashi': {'power': 65},
    'rising_dragons_explosion': {'power': 60},
    'twin_rising_dragons': {'power': 50},
    # chakra rework: Chakra is scarcer, so drains hit harder
    'gentle_fist': {'effects': [{'type': 'pierce', 'value': 0.3}, {'type': 'drainChakra', 'value': 0.08}], 'desc': 'Strikes the chakra network. Ignores 30% DEF, drains 8% Chakra.'},
    'palms_32': {'effects': [{'type': 'pierce', 'value': 0.3}, {'type': 'drainChakra', 'value': 0.12}], 'desc': 'Ignores 30% DEF, drains 12% Chakra.'},
    'palms_64': {'effects': [{'type': 'pierce', 'value': 0.3}, {'type': 'drainChakra', 'value': 0.15}], 'desc': 'Ignores 30% DEF, drains 15% Chakra.'},
    'palms_128': {'effects': [{'type': 'pierce', 'value': 0.3}, {'type': 'drainChakra', 'value': 0.2}], 'desc': 'Ignores 30% DEF, drains 20% Chakra.'},
    'twin_lion_fists': {'effects': [{'type': 'pierce', 'value': 0.3}, {'type': 'drainChakra', 'value': 0.25}], 'desc': 'Only while transformed. Drains 25% Chakra.'},
    'lightning_blade': {'cost': 50},
    # balance pass 2 (batch 2)
    'bracken_dance': {'power': 120},
    'sand_waterfall_funeral': {'power': 90},
    'eight_branches': {'power': 140},
    # balance pass 3 (batch 3)
    'false_darkness': {'power': 100},
    'c4_karura': {'power': 55, 'effects': [{'type': 'poison', 'chance': 0.4, 'turns': 3}], 'desc': 'Microscopic bombs inside every enemy. Ignores Substitution. 40% Poison.'},
    'kamui_absorb': {'power': 100},
    'tsukuyomi': {'power': 80},
    # balance pass 4 (batch 4)
    'deep_forest': {'power': 75},
    'laser_circus': {'power': 75},
    'guillotine_drop': {'power': 125},
    'ftg_rasengan': {'power': 125},
    'ftg_strike': {'power': 100},
    'wood_golem': {'power': 100},
    'thousand_hands': {'power': 150},
    # balance pass 5 (batch 5)
    'majestic_flame': {'power': 90},
    'tengai_shinsei': {'power': 160},
    'lava_shuriken': {'power': 60},
    'son_goku_bomb': {'power': 140},
    'infinite_tsukuyomi': {'power': 40},
    'expansive_tsb': {'power': 115},
    'ash_bones': {'power': 110},
    'lava_fist': {'power': 90},
    # balance pass 6 (batch 6)
    'flicker_strike': {'power': 100},
    'six_paths_chibaku': {'power': 180},
    'madara_tsb': {'power': 115},
    'poison_mist': {'power': 40, 'effects': [{'type': 'poison', 'chance': 0.4, 'turns': 3}], 'desc': 'Breathes a cloud of poison. 40% Poison.'},
}
VITALITY = 'Regenerates 8% max HP each turn. +30% max Chakra.'
TRAIT_DESC_OVERRIDES = {'Endless Chakra': 'Reanimated with the Rinnegan: regenerates 4% HP and 5% Chakra per turn and is immune to Poison.', 'Rinne-Sharingan': 'Sees through Log Substitution and Decoys, immune to genjutsu. His taijutsu strike a second time for 25% damage (Limbo shadows).', 'Akimichi Appetite': 'Charge Chakra also heals 10% max HP.', 'Kikaichu Host': 'His attacks that hit drain 6% Chakra. Immune to Chakra drain.','Weapon Mistress': 'Her Kunai & Shuriken hit all enemies.', 'Gale Mastery': 'Her area Wind jutsu deal +15% damage.', 'Hashirama Cells': 'Regenerates 4% HP per turn.', 'Lightning Release Armor': 'Takes 10% less damage, and his taijutsu ignore 15% DEF.', 'Flying Thunder God': 'His single-target jutsu gain +1 priority, and he dodges single-target attacks 15% more often.', 'Kamui Intangibility': 'Single-target attacks have a 20% chance to pass straight through him.', 'Reanimated Body': 'Regenerates 6% HP per turn and is immune to Poison. Rinnegan: sees through Log Substitution and Decoys.',
                        'Mangekyō Sharingan': 'Sees through Log Substitution. 25% genjutsu reflect. His Burns last 1 extra turn.',
                        'Eternal Mangekyō Sharingan': 'Sees through Log Substitution. Immune to genjutsu. His Burns last 1 extra turn.'}
LOADOUT_OVERRIDES = {'naruto_war': ['kurama_rasengan', 'thrown_rasenshuriken', 'chakra_arm', 'tailed_beast_bomb'],
                     # batch 2: put each signature mechanic in the default loadout
                     'chiyo': ['ten_puppets', 'mother_father', 'antidote', 'reincarnation'],
                     'haku': ['ice_mirrors', 'thousand_needles', 'ice_prison', 'haku_shield'],
                     'kabuto_sage': ['white_rage', 'inorganic_animation', 'mystical_palm', 'snake_dragon'],
                     'orochimaru_p1': ['shadow_snakes', 'five_pronged_seal', 'kusanagi', 'eight_branches'],
                     'orochimaru_ship': ['shadow_snakes', 'hidden_snake_hands', 'kusanagi', 'eight_branches'],
                     'kimimaro': ['willow_dance', 'camellia_dance', 'larch_dance', 'bracken_dance'],
                     'gaara_ship': ['sand_coffin', 'sand_waterfall_funeral', 'sand_shuriken', 'kazekage_shield'],
                     'temari_ship': ['cutting_whirlwind', 'great_sickle_weasel', 'dust_wind', 'wind_barrier'],
                     'kankuro_ship': ['crow_blades', 'crow_embrace', 'iron_maiden', 'poison_bomb'],
                     # batch 3
                     'obito_masked': ['kamui_absorb', 'fire_annihilation', 'gedo_chains', 'kamui_phase'],
                     'kisame': ['samehada_shred', 'shark_bomb', 'thousand_sharks', 'shark_dance'],
                     'itachi': ['tsukuyomi', 'amaterasu', 'crow_clone', 'totsuka_blade'],
                     'deidara': ['c1_spiders', 'c2_dragon', 'c4_karura', 'c0'],
                     'hidan': ['triple_scythe', 'jashin_spike', 'curse_ritual', 'ritual_stab'],
                     'kakuzu': ['false_darkness', 'searing_migraine', 'earth_grudge_threads', 'pressure_damage'],
                     'sasori': ['hiruko_tail', 'iron_sand_drizzle', 'puppet_switch', 'hundred_puppets'],
                     'konan': ['paper_shuriken', 'paper_spear', 'paper_butterflies', 'paper_ocean'],
                     'nagato_pain': ['shinra_tensei', 'almighty_push', 'universal_pull', 'preta_absorb'],
                     'nagato_reanimated': ['shinra_tensei', 'universal_pull', 'preta_absorb', 'samsara_revival'],
                     # batch 4
                     'hashirama': ['wood_dragon', 'deep_forest', 'wood_golem', 'thousand_hands'],
                     'hiruzen': ['fire_dragon_flame', 'shuriken_shadow_clone', 'adamantine_staff', 'reaper_death_seal'],
                     'minato': ['ftg_strike', 'ftg_rasengan', 'ftg_barrier', 'kurama_bomb_minato'],
                     'tsunade': ['tsunade_punch', 'heavenly_kick', 'katsuyu', 'creation_rebirth'],
                     'jiraiya': ['rasengan', 'toad_oil_flame', 'toad_mouth_trap', 'frog_song'],
                     'killer_bee': ['seven_swords', 'lariat', 'ink_creation', 'gyuki_bomb'],
                     'yagura': ['coral_palm', 'hook_staff', 'raging_waves', 'isobu_bomb'],
                     'onoki': ['particle_detachment', 'weighted_boulder', 'golem', 'dust_cone'],
                     # batch 5
                     'obito_war': ['kamui_absorb', 'fire_annihilation', 'gedo_chains', 'truth_seeking_balls'],
                     'madara_reanimated': ['majestic_flame', 'madara_taijutsu', 'tengai_shinsei', 'susanoo_sword'],
                     'kaguya': ['ash_bones', 'expansive_tsb', 'yomotsu_hirasaka', 'eighty_gods'],
                     'utakata': ['bubble_burst', 'acid_bubbles', 'bubble_prison', 'saiken_bomb'],
                     'roshi': ['lava_fist', 'lava_shuriken', 'magma_wall', 'son_goku_bomb'],
                     # batch 6
                     'shisui': ['flicker_strike', 'flicker_slashes', 'kotoamatsukami', 'shisui_arrows']}
CATALOGUE_SWAPS = {'naruto_war': ('rasenshuriken', 'thrown_rasenshuriken')}
EXTRA_JUTSU = {
    'thrown_rasenshuriken': dict(name='Rasenshuriken (Thrown)', category='ninjutsu', nature='wind', power=95, cost=75, priority=-1,
                                 target='allEnemies', effects=[], desc='Kurama-powered and thrown: no wind-up, and the blast hits all enemies.'),
}

# ---- structured transformations (descriptions come from the sheet) ----
def TF(resolve, turns, mods, **k):
    return dict(resolve=resolve, cost=0, turns=turns, mods=mods, **k)
TRANSFORMS = {
    'naruto_ship': TF(70, 3, {'tai': 1.4, 'nin': 1.3, 'def': 1.2}, upkeepHpPct=0.05, berserk=0.15, drawback='exhausted'),
    'naruto_war': TF(60, 3, {'tai': 1.35, 'nin': 1.35, 'spd': 1.2, 'def': 1.2}, drawback='exhausted'),
    'sasuke_ship': TF(60, 3, {'nin': 1.4, 'tai': 1.3, 'spd': 1.2}, upkeepHpPct=0.04, drawback='exhausted'),
    'sasuke_ms': TF(60, 3, {'def': 1.5, 'nin': 1.2}, drawback='exhausted'),
    'sasuke_war': TF(70, 3, {'nin': 1.4, 'def': 1.35}, drawback='exhausted'),
    'sakura_war': TF(60, 3, {'tai': 1.3, 'def': 1.2}, regenHpPct=0.08),
    'kakashi_ship': TF(50, 3, {'nin': 1.3}, upkeepHpPct=0.05, drawback='exhausted'),
    'kakashi_dms': TF(60, 3, {'nin': 1.4, 'def': 1.4}, drawback='exhausted'),
    'hinata_ship': TF(50, 3, {'tai': 1.35}),
    'lee_ship': TF(50, 3, {'tai': 1.5, 'spd': 1.4}, upkeepHpPct=0.09, drawback='exhausted'),
    'guy': TF(80, 2, {'tai': 1.7, 'spd': 1.5}, upkeepHpPct=0.15, drawback='exhausted'),
    'kiba_ship': TF(60, 3, {'tai': 1.4, 'def': 1.2}),
    'choji_p1': TF(50, 3, {'tai': 1.5, 'def': 1.3}, upkeepHpPct=0.08, drawback='exhausted'),
    'choji_ship': TF(60, 3, {'tai': 1.7, 'spd': 1.3}, upkeepHpPct=0.10, drawback='exhausted'),
    # batch 2
    'orochimaru_p1': TF(70, 3, {'nin': 1.3, 'def': 1.3}, drawback='exhausted'),
    'orochimaru_ship': TF(60, 3, {'nin': 1.3, 'def': 1.3}, drawback='exhausted'),
    'kabuto_sage': TF(60, 3, {'nin': 1.35, 'def': 1.2}, drawback='exhausted'),
    'jirobo': TF(50, 3, {'tai': 1.4, 'def': 1.3}, upkeepHpPct=0.05, drawback='exhausted'),
    'kidomaru': TF(50, 3, {'tai': 1.3, 'spd': 1.3}, upkeepHpPct=0.05, drawback='exhausted'),
    'sakon_ukon': TF(50, 3, {'tai': 1.4, 'spd': 1.2}, upkeepHpPct=0.05, drawback='exhausted'),
    'tayuya': TF(50, 3, {'nin': 1.3, 'spd': 1.2}, upkeepHpPct=0.05, drawback='exhausted'),
    'kimimaro': TF(60, 3, {'tai': 1.4, 'spd': 1.2}, upkeepHpPct=0.06, drawback='exhausted'),
    'anko': TF(50, 3, {'nin': 1.3, 'tai': 1.2}, upkeepHpPct=0.05, drawback='exhausted'),
    # batch 3
    'kisame': TF(50, 3, {'tai': 1.3, 'spd': 1.3}, regenHpPct=0.06, drawback='exhausted'),
    'itachi': TF(70, 3, {'def': 1.4, 'nin': 1.2}, drawback='exhausted'),
    'hidan': TF(50, 3, {'tai': 1.3}, drawback='exhausted'),
    'kakuzu': TF(60, 3, {'nin': 1.3, 'def': 1.2}, drawback='exhausted'),
    'sasori': TF(50, 3, {'nin': 1.3, 'spd': 1.3}, drawback='exhausted'),
    'konan': TF(60, 3, {'nin': 1.3, 'spd': 1.2}, drawback='exhausted'),
    'jugo': TF(50, 3, {'tai': 1.4, 'def': 1.3}, upkeepHpPct=0.05, drawback='exhausted'),
    # batch 4
    'hashirama': TF(60, 3, {'nin': 1.3, 'def': 1.3}, drawback='exhausted'),
    'minato': TF(60, 3, {'nin': 1.3, 'spd': 1.3}, drawback='exhausted'),
    'tsunade': TF(60, 3, {'tai': 1.3, 'def': 1.2}, regenHpPct=0.10, drawback='exhausted'),
    'jiraiya': TF(60, 3, {'nin': 1.3, 'tai': 1.2}, drawback='exhausted'),
    'killer_bee': TF(60, 3, {'tai': 1.4, 'def': 1.3}, drawback='exhausted'),
    'yagura': TF(60, 3, {'def': 1.3, 'nin': 1.3}, drawback='exhausted'),
    # batch 5
    'obito_war': TF(80, 3, {'nin': 1.4, 'def': 1.3}, regenHpPct=0.08, drawback='exhausted'),
    'madara_reanimated': TF(80, 3, {'def': 1.4, 'nin': 1.3}, drawback='exhausted'),
    'fu': TF(60, 3, {'nin': 1.3, 'spd': 1.3}, drawback='exhausted'),
    'utakata': TF(60, 3, {'nin': 1.3, 'def': 1.3}, drawback='exhausted'),
    'han': TF(60, 3, {'tai': 1.4, 'def': 1.3}, drawback='exhausted'),
    'roshi': TF(60, 3, {'nin': 1.3, 'def': 1.3}, drawback='exhausted'),
    'yugito': TF(60, 3, {'nin': 1.3, 'spd': 1.3}, drawback='exhausted'),
    # batch 6
    'shisui': TF(60, 3, {'def': 1.4, 'nin': 1.3}, drawback='exhausted'),
}

# ---- traits: id per behaviour ----
TRAIT_IDS = {
    'Uzumaki Vitality': 'uzumakiVitality', 'Kurama Link': 'kuramaLink', 'Sharingan': 'sharingan',
    'Mangekyō Sharingan': 'mangekyo', 'Eternal Mangekyō Sharingan': 'ems', 'Genjutsu Talent': 'genjutsuTalent',
    'Perfect Chakra Control': 'chakraControl', 'Copy Ninja': 'copyNinja', "Obito's Gift": 'obitoGift',
    'Root Agent': 'rootAgent', 'Tailed Beast Suppression': 'suppression', 'Byakugan': 'byakugan',
    'Splendid Taijutsu': 'noNinjutsu', 'Sensei of Youth': 'noNinjutsu', 'Weapon Mistress': 'weaponMistress',
    'Akamaru Partner': 'akamaru', 'Kikaichu Host': 'kikaichu', '200 IQ': 'strategist', 'Akimichi Appetite': 'akimichi',
    'Yamanaka Mind Clan': 'yamanaka', 'Genjutsu Mistress': 'genjutsuMistress', 'Chakra Blades': 'chakraBlades',
    # batch 2
    'Shield of Sand': 'sandShield', 'Gale Mastery': 'galeMastery', 'Puppet Master': 'puppetMaster', 'Body Shedding': 'bodyShedding',
    'Medical Spy': 'medicalSpy', 'White Snake Sage': 'whiteSnakeSage', 'Chakra Eater': 'chakraEater', 'Six Arms': 'sixArms',
    'Twin Demons': 'twinDemons', 'Demon Flute': 'demonFlute', 'Dead Bone Pulse': 'deadBone', 'Silent Killing': 'silentKilling',
    'Ice Mirrors': 'iceMirrors', 'Snake Mistress': 'snakeMistress', 'Izanagi': 'izanagi',
    # batch 3
    'Kamui Intangibility': 'kamuiPhase', 'Spore Spy': 'sporeSpy', 'Ground Merge': 'groundMerge', 'Samehada': 'samehada',
    "Itachi's Genius": 'itachiGenius', 'Art Is an Explosion': 'artExplosion', 'Jashinist Immortality': 'jashin', 'Five Hearts': 'fiveHearts',
    'Human Puppet': 'humanPuppet', 'Paper Body': 'paperBody', 'Rinnegan': 'rinnegan', 'Reanimated Body': 'reanimated',
    'Hydrification': 'hydrification', 'Kagura Sensing': 'kaguraSensing', 'Berserker': 'berserker',
    # batch 4
    'Hashirama Cells': 'hashiramaCells', 'Sensory Genius': 'sensoryGenius', 'The Professor': 'professor', 'Flying Thunder God': 'ftg',
    'Legendary Medic': 'legendaryMedic', 'Super Pervert Spy': 'pervertSpy', 'Lightning Release Armor': 'lightningArmor',
    'Perfect Jinchuriki': 'perfectJinchuriki', 'Black Lightning': 'blackLightning', 'Hot-Blooded': 'berserker', 'Two Kekkei Genkai': 'twoKekkei',
    'Twin Blades': 'twinBlades', 'Coral Shell': 'coralShell', 'Levitation': 'levitation', 'Quick-Setting Lime': 'quicklime',
    'Rock-Solid': 'rockSolid', 'Invisibility': 'invisibility',
    # batch 5
    'Endless Chakra': 'endlessChakra', 'Rinne-Sharingan': 'rinneMadara', 'Progenitor of Chakra': 'progenitor', 'Lucky Seven': 'luckySeven',
    'Corrosive Bubbles': 'corrosiveBubbles', 'Steam Armor': 'steamArmor', 'Volcanic Body': 'volcanicBody', 'Cat Reflexes': 'catReflexes',
    # batch 6
    'Poison Sac': 'poisonSac', 'Protective Instinct': 'protectiveInstinct', 'Will of Fire': 'willOfFire', 'Sealing Chains': 'suppression',
    'Iai Master': 'iaiMaster', 'Gold Dust': 'goldDust', 'Shisui of the Body Flicker': 'bodyFlicker', "Tsunade's Apprentice": 'legendaryMedic',
}

# ---- support passives: effects with stage values [3 standing, 2, 1] ----
def E(type, values, **k): return dict(type=type, values=values, **k)
AURAS = {
    'naruto_p1': ('Allies gain {0} Resolve per turn.', [E('resolve', [5, 10, 20])]),
    'naruto_ship': ('Each turn, every ally has a {0} chance to start with a Decoy clone.', [E('decoyChance', [0.1, 0.2, 0.35])]),
    'naruto_sage': ('Allies regenerate +{0} Chakra per turn.', [E('chakra', [0.05, 0.08, 0.12])]),
    'naruto_war': ('Allies heal {0} max HP and gain {1} Resolve per turn.', [E('heal', [0.03, 0.05, 0.08]), E('resolve', [5, 10, 15])]),
    'sasuke_p1': ('Allies gain +{0} NIN.', [E('stat', [0.1, 0.15, 0.25], stat='nin')]),
    'sasuke_ship': ('Allies gain +{0} critical-hit chance.', [E('crit', [0.05, 0.1, 0.15])]),
    'sasuke_ms': ('Allies deal +{0} damage to enemies below half HP.', [E('execute', [0.1, 0.2, 0.3])]),
    'sasuke_war': ('Allies gain +{0} NIN and +{1} SPD.', [E('stat', [0.1, 0.15, 0.25], stat='nin'), E('stat', [0, 0.05, 0.1], stat='spd')]),
    'sakura_p1': ('Allies have a {0} chance to shrug off genjutsu.', [E('genjutsuResist', [0.25, 0.4, 0.6])]),
    'sakura_shippuden': ('Allies heal {0} max HP per turn.', [E('heal', [0.04, 0.06, 0.1])]),
    'sakura_war': ('Allies heal {0} max HP per turn and take {1} less damage.', [E('heal', [0.03, 0.05, 0.08]), E('dr', [0.05, 0.08, 0.12])]),
    'kakashi_p1': ('Allies gain +{0} SPD.', [E('stat', [0.1, 0.15, 0.25], stat='spd')]),
    'kakashi_ship': ('Allies gain +{0} SPD and +{1} NIN.', [E('stat', [0.1, 0.15, 0.2], stat='spd'), E('stat', [0.05, 0.1, 0.15], stat='nin')]),
    'kakashi_dms': ('Allies gain +{0} SPD and their Substitutions cost {1} less.', [E('stat', [0.1, 0.15, 0.25], stat='spd'), E('subDiscount', [0.2, 0.35, 0.5])]),
    'sai': ('Enemy Intel gains are reduced by {0}.', [E('enemyIntel', [0.1, 0.2, 0.3])]),
    'yamato': ('Allies take {0} less damage from area attacks.', [E('aoeDR', [0.1, 0.2, 0.3])]),
    'hinata_p1': ('Allies gain {0} Resolve per turn and +{1} DEF.', [E('resolve', [3, 6, 12]), E('stat', [0, 0.05, 0.1], stat='def')]),
    'hinata_ship': ('Allies dodge single-target attacks {0} more often.', [E('dodge', [0.04, 0.07, 0.1])]),
    'neji_p1': ("Allies' attacks ignore {0} of the target's DEF.", [E('pierce', [0.05, 0.1, 0.2])]),
    'neji_ship': ('Allies gain +{0} TAI and ignore {1} of DEF.', [E('stat', [0.1, 0.15, 0.25], stat='tai'), E('pierce', [0, 0.05, 0.1])]),
    'lee_p1': ('Allies gain +{0} TAI.', [E('stat', [0.1, 0.15, 0.25], stat='tai')]),
    'lee_ship': ('Allies below 25% HP take {0} less damage.', [E('lowHpDR', [0.1, 0.2, 0.3])]),
    'tenten_p1': ("Allies' Kunai & Shuriken deal +{0} damage.", [E('kunai', [0.3, 0.5, 0.8])]),
    'tenten_ship': ("Allies' taijutsu deal +{0} damage.", [E('taiDamage', [0.05, 0.1, 0.2])]),
    'guy': ('Allies gain {0} Resolve per turn and +{1} TAI.', [E('resolve', [5, 10, 20]), E('stat', [0, 0.1, 0.2], stat='tai')]),
    'kiba_p1': ('Allies deal +{0} damage to a target an ally already hit this turn.', [E('focus', [0.05, 0.1, 0.15])]),
    'kiba_ship': ('Team gains {0} Secured Intel per turn.', [E('intel', [1, 2, 3])]),
    'shino_p1': ('Enemies lose {0} max Chakra per turn.', [E('enemyDrain', [0.02, 0.04, 0.06])]),
    'shino_ship': ('Allies take {0} less damage.', [E('dr', [0.04, 0.08, 0.12])]),
    'shikamaru_p1': ("Allies' Substitutions cost {0} less Chakra.", [E('subDiscount', [0.25, 0.4, 0.6])]),
    'shikamaru_ship': ("Allies' Bind, Paralyze and genjutsu chances are {0} higher.", [E('controlChance', [0.1, 0.15, 0.25])]),
    'choji_p1': ('Allies heal {0} max HP and restore {1} Chakra per turn.', [E('heal', [0.03, 0.05, 0.08]), E('chakra', [0.03, 0.05, 0.08])]),
    'choji_ship': ('The ally with the lowest HP takes {0} less damage.', [E('protectWeakest', [0.1, 0.2, 0.3])]),
    'ino_p1': ('Team gains {0} Secured Intel per turn.', [E('intel', [2, 3, 4])]),
    'ino_ship': ('Team gains {0} Secured Intel per turn; allies shrug off genjutsu {1} of the time.', [E('intel', [1, 2, 3]), E('genjutsuResist', [0.1, 0.2, 0.3])]),
    'kurenai': ('Allies dodge {0} more often and shrug off genjutsu {1} of the time.', [E('dodge', [0.03, 0.06, 0.1]), E('genjutsuResist', [0.2, 0.3, 0.5])]),
    'asuma': ("Allies' Fire and Wind jutsu deal +{0} damage.", [E('natureBoost', [0.05, 0.1, 0.2], natures=['fire', 'wind'])]),
    'gaara_p1': ('Allies gain +{0} DEF.', [E('stat', [0.1, 0.15, 0.25], stat='def')]),
    # batch 2
    'gaara_ship': ('Allies take {0} less damage and gain +{1} DEF.', [E('dr', [0.05, 0.08, 0.12]), E('stat', [0, 0.1, 0.2], stat='def')]),
    'temari_p1': ("Allies' area attacks deal +{0} damage.", [E('aoeBoost', [0.05, 0.1, 0.2])]),
    'temari_ship': ("Allies' Wind jutsu deal +{0} damage.", [E('natureBoost', [0.1, 0.15, 0.25], natures=['wind'])]),
    'kankuro_p1': ("Allies' attacks have a {0} chance to Poison.", [E('poisonChance', [0.05, 0.1, 0.15])]),
    'kankuro_ship': ('Allies take {0} less damage from area attacks.', [E('aoeDR', [0.1, 0.2, 0.3])]),
    'chiyo': ('Each turn, every ally has a {0} chance to be cleansed of negative statuses.', [E('cleanseChance', [0.1, 0.2, 0.35])]),
    'orochimaru_p1': ("Allies' transformations need {0} less Resolve.", [E('resolveDiscount', [10, 20, 30])]),
    'orochimaru_ship': ('Allies regenerate {0} max HP per turn.', [E('heal', [0.03, 0.05, 0.08])]),
    'kabuto_p1': ('Team gains {0} Secured Intel per turn; enemy Intel gains are reduced by {1}.', [E('intel', [1, 2, 3]), E('enemyIntel', [0.05, 0.1, 0.15])]),
    'kabuto_sage': ('Allies heal {0} max HP per turn and take {1} less damage.', [E('heal', [0.03, 0.05, 0.08]), E('dr', [0.03, 0.06, 0.1])]),
    'jirobo': ('Allies take {0} less damage.', [E('dr', [0.04, 0.08, 0.12])]),
    'kidomaru': ('Allies dodge single-target attacks {0} more often.', [E('dodge', [0.04, 0.07, 0.1])]),
    'sakon_ukon': ('Allies deal +{0} damage to a target an ally already hit this turn.', [E('focus', [0.05, 0.1, 0.15])]),
    'tayuya': ('Allies shrug off genjutsu {0} of the time.', [E('genjutsuResist', [0.2, 0.3, 0.5])]),
    'kimimaro': ('Allies below 25% HP take {0} less damage.', [E('lowHpDR', [0.1, 0.2, 0.3])]),
    'zabuza': ('Allies gain +{0} critical-hit chance.', [E('crit', [0.05, 0.1, 0.15])]),
    'haku': ('The ally with the lowest HP takes {0} less damage.', [E('protectWeakest', [0.1, 0.2, 0.3])]),
    'anko': ('Enemy Intel gains are reduced by {0}.', [E('enemyIntel', [0.1, 0.2, 0.3])]),
    'danzo': ("Team gains {0} Secured Intel per turn; allies' Gather Intel gains +{1}.", [E('intel', [1, 2, 3]), E('gatherBonus', [2, 4, 6])]),
    # batch 3
    'obito_tobi': ("Allies' substitutions cost {0} less Chakra.", [E('subDiscount', [0.05, 0.1, 0.15])]),
    'obito_masked': ('Allies gain {0} Resolve per turn.', [E('resolve', [3, 5, 8])]),
    'zetsu_white': ('Team gains {0} Secured Intel per turn.', [E('intel', [1, 2, 3])]),
    'zetsu_black': ('Enemy Intel gains are reduced by {0}.', [E('enemyIntel', [0.1, 0.15, 0.25])]),
    'kisame': ('Allies regenerate {0} max Chakra per turn.', [E('chakra', [0.03, 0.05, 0.08])]),
    'itachi': ("Allies' Bind, Paralyze and Flinch chances are {0} higher.", [E('controlChance', [0.05, 0.1, 0.15])]),
    'deidara': ("Allies' area attacks deal +{0} damage.", [E('aoeBoost', [0.05, 0.1, 0.15])]),
    'hidan': ('Allies gain +{0} TAI.', [E('stat', [0.1, 0.15, 0.25], stat='tai')]),
    'kakuzu': ('Team gains {0} extra Intel whenever an enemy is knocked out.', [E('koIntel', [4, 6, 10])]),
    'sasori': ('Enemies take {0} more max HP from Poison each turn.', [E('poisonPower', [0.01, 0.02, 0.04])]),
    'konan': ("Allies' substitutions cost {0} less Chakra.", [E('subDiscount', [0.05, 0.1, 0.2])]),
    'nagato_pain': ('Allies gain +{0} NIN.', [E('stat', [0.1, 0.15, 0.25], stat='nin')]),
    'nagato_reanimated': ('Allies regenerate {0} max HP per turn.', [E('heal', [0.03, 0.05, 0.08])]),
    'suigetsu': ("Allies' Water jutsu deal +{0} damage.", [E('natureBoost', [0.1, 0.15, 0.25], natures=['water'])]),
    'karin': ('Allies regenerate {0} max HP per turn.', [E('heal', [0.03, 0.05, 0.08])]),
    'jugo': ('Allies regenerate {0} max Chakra per turn.', [E('chakra', [0.03, 0.05, 0.08])]),
    # batch 4
    'hashirama': ('Allies take {0} less damage.', [E('dr', [0.05, 0.08, 0.12])]),
    'tobirama': ('Allies gain +{0} SPD.', [E('stat', [0.1, 0.15, 0.25], stat='spd')]),
    'hiruzen': ('Allies gain {0} Resolve per turn.', [E('resolve', [3, 5, 8])]),
    'minato': ('Allies dodge single-target attacks {0} more often.', [E('dodge', [0.04, 0.07, 0.1])]),
    'tsunade': ('Allies regenerate {0} max HP per turn.', [E('heal', [0.03, 0.05, 0.08])]),
    'jiraiya': ('Team gains {0} Secured Intel per turn.', [E('intel', [1, 2, 3])]),
    'raikage_a': ('Allies gain +{0} TAI.', [E('stat', [0.1, 0.15, 0.25], stat='tai')]),
    'killer_bee': ('Allies shrug off genjutsu {0} of the time.', [E('genjutsuResist', [0.2, 0.3, 0.5])]),
    'darui': ('Allies take {0} less damage.', [E('dr', [0.04, 0.07, 0.1])]),
    'karui': ('Allies deal +{0} damage to a target an ally already hit this turn.', [E('focus', [0.05, 0.1, 0.15])]),
    'mei': ("Allies' kekkei genkai jutsu deal +{0} damage.", [E('natureBoost', [0.1, 0.15, 0.25], natures=['wood', 'ice', 'lava', 'storm', 'magnet', 'scorch', 'boil', 'explosion', 'dust'])]),
    'chojuro': ('Allies gain {0} critical-hit chance.', [E('crit', [0.05, 0.1, 0.15])]),
    'ao': ('Enemy Intel gains are reduced by {0}.', [E('enemyIntel', [0.1, 0.15, 0.25])]),
    'gengetsu': ("Allies' substitutions cost {0} less Chakra.", [E('subDiscount', [0.05, 0.1, 0.2])]),
    'yagura': ('Fielded enemies lose {0} max Chakra per turn.', [E('enemyDrain', [0.02, 0.04, 0.06])]),
    'onoki': ('Allies gain +{0} DEF.', [E('stat', [0.1, 0.15, 0.25], stat='def')]),
    'kurotsuchi': ('Allies take {0} less damage from area attacks.', [E('aoeDR', [0.1, 0.2, 0.3])]),
    'akatsuchi': ('The ally with the lowest HP takes {0} less damage.', [E('protectWeakest', [0.1, 0.2, 0.3])]),
    'mu': ('Team gains {0} Secured Intel per turn.', [E('intel', [1, 2, 3])]),
    # batch 5
    'obito_war': ('Allies gain +{0} NIN.', [E('stat', [0.1, 0.15, 0.25], stat='nin')]),
    'madara_reanimated': ("Allies' attacks ignore {0} DEF.", [E('pierce', [0.05, 0.1, 0.15])]),
    'madara_six_paths': ('Fielded enemies lose {0} max Chakra per turn.', [E('enemyDrain', [0.02, 0.04, 0.06])]),
    'kaguya': ('Allies regenerate {0} max Chakra per turn.', [E('chakra', [0.03, 0.05, 0.08])]),
    'fu': ('Allies dodge single-target attacks {0} more often.', [E('dodge', [0.04, 0.07, 0.1])]),
    'utakata': ('Allies take {0} less damage from area attacks.', [E('aoeDR', [0.1, 0.2, 0.3])]),
    'han': ('Allies below 25% HP take {0} less damage.', [E('lowHpDR', [0.1, 0.2, 0.3])]),
    'roshi': ('Allies gain {0} Resolve per turn.', [E('resolve', [3, 5, 8])]),
    'yugito': ("Allies' Fire jutsu deal +{0} damage.", [E('natureBoost', [0.1, 0.15, 0.25], natures=['fire'])]),
    # batch 6
    'hanzo': ("Allies' attacks have a {0} chance to Poison.", [E('poisonChance', [0.05, 0.1, 0.15])]),
    'iruka': ("Allies' Gather Intel gains +{0}.", [E('gatherBonus', [2, 4, 6])]),
    'konohamaru': ('Allies deal +{0} damage to a target an ally already hit this turn.', [E('focus', [0.05, 0.1, 0.15])]),
    'kushina': ('Allies gain +{0} TAI.', [E('stat', [0.1, 0.15, 0.25], stat='tai')]),
    'mifune': ('Allies gain {0} critical-hit chance.', [E('crit', [0.05, 0.1, 0.15])]),
    'rasa': ('Allies take {0} less damage.', [E('dr', [0.04, 0.07, 0.1])]),
    'shisui': ('Enemy Intel gains are reduced by {0}.', [E('enemyIntel', [0.1, 0.15, 0.25])]),
    'shizune': ('Allies regenerate {0} max HP per turn.', [E('heal', [0.03, 0.05, 0.08])]),
}

def name_for(s):
    char = s['character'].replace(' (with Akamaru)', '')
    if s['form'] in ('—', 'Part I'):
        return char
    return f"{char} ({s['form']})"

out = []
for s in K.S + [x for x in B2.S if x['status'] != 'Existing'] + B3.S + B4.S + B5.S + B6.S:
    sid = s['id']
    ex = existing_s.get(sid)
    stats = STAT_OVERRIDES.get(sid, s['stats'])
    tname, tdesc = s['trait'][0], TRAIT_DESC_OVERRIDES.get(s['trait'][0], s['trait'][1])
    tdesc = tdesc.replace('Regenerates 6% max HP each turn.', 'Regenerates 8% max HP each turn.')
    tf = None
    if s['transformation']:
        if ex and ex.get('transformation') and sid not in TRANSFORMS:
            tf = ex['transformation']
        else:
            tf = dict(TRANSFORMS[sid], name=s['transformation']['name'], desc=s['transformation']['desc'])
    adesc, aeff = AURAS[sid]
    cat = list(s['catalogue'])
    if sid in CATALOGUE_SWAPS:
        a, b = CATALOGUE_SWAPS[sid]
        cat = [b if x == a else x for x in cat]
    entry = {
        'id': sid, 'baseId': {'rock': 'lee', 'might': 'guy'}.get(s['character'].split(' ')[0].lower(), s['character'].split(' ')[0].lower()), 'name': name_for(s), 'era': s['era'], 'cost': COST_OVERRIDES.get(sid, s['cost']),
        'natures': {'primary': s['primary'], 'secondary': s['secondary']},
        'stats': dict(zip(['hp', 'tai', 'nin', 'def', 'spd', 'chk'], stats)),
        'roles': s['roles'],
        'trait': {'id': TRAIT_IDS[tname], 'name': tname, 'desc': tdesc},
        'substitutions': s['subs'], 'catalogue': cat, 'defaultLoadout': cat[:4],
        'transformation': tf,
        'supportAura': {'name': s['support']['name'], 'desc': adesc, 'effects': aeff},
    }
    if ex:  # keep the existing default loadouts
        entry['defaultLoadout'] = ex['defaultLoadout']
    if sid in LOADOUT_OVERRIDES:
        entry['defaultLoadout'] = LOADOUT_OVERRIDES[sid]
    out.append(entry)
# Gaara is not in this batch: keep him, migrating his passive
g = existing_s['gaara_p1']
g['supportAura'] = {'name': g['supportAura']['name'], 'desc': AURAS['gaara_p1'][0], 'effects': AURAS['gaara_p1'][1]}
g['cost'] = COST_OVERRIDES.get('gaara_p1', g['cost'])
out.insert(next(i for i, x in enumerate(out) if x['id'] == 'gaara_ship'), g)  # Part I before Shippuden

jutsu = dict(existing_j)
for jid, j in {**K.NEW_JUTSU, **B2.NEW_JUTSU, **B3.NEW_JUTSU, **B4.NEW_JUTSU, **B5.NEW_JUTSU, **B6.NEW_JUTSU}.items():
    j = dict(j)
    j.pop('NEW', None)
    jutsu[jid] = j
jutsu.update(EXTRA_JUTSU)
for jid, o in JUTSU_OVERRIDES.items():
    jutsu[jid] = dict(jutsu[jid], **o)

def js(o): return json.dumps(o, ensure_ascii=False, indent=2)

shinobi_js = f"""// Shinobi roster — GENERATED by drafts/gen_data.py from the approved kit sheet.
// Each alternate form is its own entry sharing a baseId (one version per team).
// stats: hp, tai, nin, def, spd, chk. trait.id is implemented in engine/battle.js (TRAITS).
// supportAura.effects: values = [3 allies standing, 2, 1]; desc fills {{0}}, {{1}}… with those values.

export const COST_CAP = 30;

export const SHINOBI = {js(out)};

export const SHINOBI_BY_ID = Object.fromEntries(SHINOBI.map((s) => [s.id, s]));

// Substitution types. cost = fraction of max Chakra.
export const SUBSTITUTIONS = {{
  log: {{ name: 'Log Substitution', cost: 0.15, desc: 'Negate the first single-target hit. Dojutsu users see through it.' }},
  shadowClone: {{ name: 'Shadow Clone Substitution', cost: 0.22, desc: 'Negate the first single-target hit and leave a Decoy that absorbs the next one.' }},
  explosiveTag: {{ name: 'Explosive Tag Substitution', cost: 0.25, desc: 'Negate the first single-target hit and blast the attacker for 10% of its max HP.' }},
  waterClone: {{ name: 'Water Clone Substitution', cost: 0.2, desc: 'Negate the first single-target hit and slow the attacker (-25% SPD, 2 turns).' }},
}};
"""
jutsu_js = f"""// Jutsu catalogue — GENERATED by drafts/gen_data.py.
// category: ninjutsu | taijutsu | genjutsu | medical | support (taijutsu scales off TAI, the rest off NIN)
// priority: +3 … -1; target: enemy | allEnemies | self | ally | allAllies
// flags: charged (2 turns), requiresTransform, ignoresSub. Effects: see applyEffect() in engine/battle.js

export const JUTSU = {js(jutsu)};

for (const [id, j] of Object.entries(JUTSU)) {{
  j.id = id;
  j.effects = j.effects || [];
}}
"""
open(os.path.join(ROOT, 'public/data/shinobi.js'), 'w').write(shinobi_js)
open(os.path.join(ROOT, 'public/data/jutsu.js'), 'w').write(jutsu_js)
print(len(out), 'shinobi,', len(jutsu), 'jutsu')
