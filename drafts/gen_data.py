# Generates public/data/shinobi.js and public/data/jutsu.js from the approved
# kit drafts (drafts/konoha.py) plus the existing data.
#   python3 drafts/gen_data.py
import json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import konoha as K

ROOT = os.path.join(os.path.dirname(__file__), '..')
existing_j = json.load(open(os.path.join(os.path.dirname(__file__), 'base_jutsu.json')))
existing_s = {s['id']: s for s in json.load(open(os.path.join(os.path.dirname(__file__), 'base_shinobi.json')))}

# ---- approved sheet overrides (revision 9) ----
STAT_OVERRIDES = {
    'naruto_war': (125, 110, 125, 100, 120, 160),
    'sasuke_war': (115, 110, 135, 100, 120, 130),
}

# ---- balance pass 1 (CPU sim, cost-adjusted win rates) ----
COST_OVERRIDES = {'tenten_ship': 7, 'kakashi_p1': 7, 'naruto_sage': 8, 'sai': 5, 'ino_ship': 5, 'shikamaru_p1': 5, 'kakashi_ship': 8, 'shino_p1': 4,
                  'sasuke_p1': 6, 'choji_p1': 6, 'choji_ship': 8}
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
}
VITALITY = 'Regenerates 8% max HP each turn. +30% max Chakra.'
TRAIT_DESC_OVERRIDES = {'Weapon Mistress': 'Her Kunai & Shuriken hit all enemies.',
                        'Mangekyō Sharingan': 'Sees through Log Substitution. 25% genjutsu reflect. His Burns last 1 extra turn.',
                        'Eternal Mangekyō Sharingan': 'Sees through Log Substitution. Immune to genjutsu. His Burns last 1 extra turn.'}
LOADOUT_OVERRIDES = {'naruto_war': ['kurama_rasengan', 'thrown_rasenshuriken', 'chakra_arm', 'tailed_beast_bomb']}
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
}

def name_for(s):
    char = s['character'].replace(' (with Akamaru)', '')
    if s['form'] in ('—', 'Part I'):
        return char
    return f"{char} ({s['form']})"

out = []
for s in K.S:
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
out.append(g)

jutsu = dict(existing_j)
for jid, j in K.NEW_JUTSU.items():
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
