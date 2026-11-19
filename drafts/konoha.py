# Draft kits for the Konoha batch (Konoha 11 + senseis + Sai/Yamato).
# Jutsu: id -> (name, category, nature, power, cost, priority, target, effects, desc, flags)
# effects are engine effect dicts; flags: charged / requiresTransform / ignoresSub / NEW (needs new engine code)

def J(name, cat, nat, pw, ck, pri, tgt, eff=None, desc='', **flags):
    return dict(name=name, category=cat, nature=nat, power=pw, cost=ck, priority=pri, target=tgt, effects=eff or [], desc=desc, **flags)

burn = lambda c, t=3: {'type': 'burn', 'chance': c, 'turns': t}
para = lambda c, t=2: {'type': 'paralyze', 'chance': c, 'turns': t}
bind = lambda c, t=1: {'type': 'bind', 'chance': c, 'turns': t}
gen = lambda t=2: {'type': 'genjutsu', 'turns': t}
flinch = lambda c: {'type': 'flinch', 'chance': c}
drain = lambda v: {'type': 'drainChakra', 'value': v}
intel = lambda v: {'type': 'intel', 'value': v}
heal = lambda v: {'type': 'heal', 'value': v}
buff = lambda st, m, t=2: {'type': 'buff', 'stat': st, 'mult': m, 'turns': t}
debuff = lambda st, m, t=2, c=None: dict({'type': 'debuff', 'stat': st, 'mult': m, 'turns': t}, **({'chance': c} if c else {}))
recoil = lambda v: {'type': 'recoil', 'value': v}
pierce = lambda v: {'type': 'pierce', 'value': v}
decoy = {'type': 'decoy'}
cleanse = {'type': 'cleanse'}
reveal = {'type': 'revealLoadout'}
vsBound = lambda v: {'type': 'bonusVsBound', 'value': v}
chakraGive = lambda v: {'type': 'restoreChakra', 'value': v}   # NEW
rotation = {'type': 'rotation'}                                   # NEW: blocks every hit this turn

NEW_JUTSU = {
  # Naruto
  'giant_rasengan': J('Big Ball Rasengan', 'ninjutsu', None, 110, 55, 0, 'enemy', [], 'An oversized Rasengan made with a clone\'s help.'),
  'kurama_rasengan': J('Tailed Beast Rasengan', 'ninjutsu', None, 125, 55, 0, 'enemy', [pierce(0.2)], 'Kurama-powered Rasengan. Ignores 20% DEF.'),
  'chakra_arm': J('Chakra Arm Grab', 'taijutsu', None, 80, 25, 1, 'enemy', [bind(0.35)], 'A long chakra arm snatches the target. 35% Bind.'),
  'kurama_transfer': J('Kurama Chakra Transfer', 'support', 'yang', 0, 40, 1, 'ally', [chakraGive(0.4), heal(0.1)], 'Share Kurama\'s chakra: an ally restores 40% Chakra and heals 10%.', NEW=True),
  'tailed_beast_bomb': J('Tailed Beast Bomb', 'ninjutsu', None, 175, 80, -1, 'enemy', [], 'Only while transformed.', requiresTransform=True),
  # Sasuke
  'chidori_nagashi': J('Chidori Current', 'ninjutsu', 'lightning', 55, 35, 1, 'allEnemies', [para(0.25)], 'Lightning flows from his body into all enemies. 25% Paralyze.'),
  'chidori_spear': J('Chidori Sharp Spear', 'ninjutsu', 'lightning', 95, 40, 0, 'enemy', [pierce(0.25)], 'A long lightning blade. Ignores 25% DEF.'),
  'kirin': J('Kirin', 'ninjutsu', 'lightning', 175, 90, -1, 'enemy', [], 'Charged. Calls down natural lightning shaped like a dragon.', charged=True),
  'amaterasu': J('Amaterasu', 'ninjutsu', 'fire', 70, 50, 0, 'enemy', [burn(1, 4)], 'Black flames wherever he looks. Always Burns (4 turns). Ignores Substitution.', ignoresSub=True),
  'blaze_kagutsuchi': J('Blaze Release: Kagutsuchi', 'ninjutsu', 'fire', 75, 55, 0, 'allEnemies', [burn(0.4)], 'Shapes Amaterasu\'s flames into spikes. 40% Burn.'),
  'susanoo_arrow': J('Susanoo: Flame Arrow', 'ninjutsu', 'fire', 150, 60, 0, 'enemy', [burn(0.5)], 'Only while transformed (Susanoo / Rinne-Sharingan).', requiresTransform=True),
  'sharingan_genjutsu': J('Sharingan Genjutsu', 'genjutsu', 'yin', 0, 30, 1, 'enemy', [gen(2)], 'A glance is enough. Genjutsu for 2 turns.'),
  # Sakura
  'shuriken_volley': J('Shuriken Volley', 'taijutsu', None, 45, 0, 2, 'enemy', [], 'Basic thrown weapons.'),
  'clone_feint': J('Clone Jutsu Feint', 'support', None, 0, 15, 1, 'self', [decoy], 'Gain a Decoy.'),
  'genjutsu_dispel': J('Genjutsu Dispel', 'support', 'yin', 0, 15, 2, 'ally', [cleanse], 'Remove all negative statuses from an ally.'),
  'inner_sakura': J('Inner Sakura', 'support', None, 0, 20, 1, 'self', [buff('tai', 1.5, 2)], '+50% TAI for 2 turns.'),
  'shannaro_punch': J('SHANNARO!', 'taijutsu', None, 70, 15, 0, 'enemy', [], 'A furious punch.'),
  'katsuyu': J('Summoning: Katsuyu', 'medical', 'yang', 0, 60, 0, 'allAllies', [heal(0.2), buff('def', 1.2, 2)], 'Katsuyu\'s clones heal all allies 20% and give +20% DEF for 2 turns.'),
  'healing_transfer': J('Hundred Healings Transfer', 'medical', 'yang', 0, 45, 1, 'ally', [heal(0.4), cleanse], 'Heal an ally 40% and cleanse them.'),
  # Kakashi
  'lightning_hound': J('Lightning Beast Running', 'ninjutsu', 'lightning', 105, 45, 1, 'enemy', [para(0.2)], 'A hound of lightning. 20% Paralyze.'),
  'kamui': J('Kamui', 'ninjutsu', None, 150, 70, -1, 'enemy', [], 'Warps part of the target away. Ignores Substitution. Only with the Mangekyō active.', requiresTransform=True, ignoresSub=True),
  'kamui_raikiri': J('Kamui Raikiri', 'ninjutsu', 'lightning', 130, 60, 1, 'enemy', [para(0.2)], 'A Lightning Blade that warps through space. Ignores Substitution.', ignoresSub=True),
  'kamui_shuriken': J('Susanoo: Kamui Shuriken', 'ninjutsu', None, 165, 70, 0, 'enemy', [], 'Only while Susanoo is active. Ignores Substitution.', requiresTransform=True, ignoresSub=True),
  # Sai
  'super_beast_scroll': J('Super Beast Imitating Drawing', 'ninjutsu', 'yin', 85, 35, 0, 'enemy', [], 'Ink beasts leap off the scroll.'),
  'ink_snakes': J('Ink Snake Bind', 'ninjutsu', 'yin', 40, 30, 0, 'enemy', [bind(0.6)], '60% Bind.'),
  'ink_bird_recon': J('Ink Bird Recon', 'support', 'yin', 0, 25, 0, 'self', [intel(9)], '+9 Intel.'),
  'ink_clone': J('Ink Clone', 'support', 'yin', 0, 20, 1, 'self', [decoy], 'Gain a Decoy.'),
  'tanto_strike': J('Tantō Strike', 'taijutsu', None, 70, 10, 1, 'enemy', [], 'Root swordsmanship.'),
  # Yamato
  'wood_prison': J('Wood Release: Four-Pillar Prison', 'ninjutsu', 'wood', 50, 40, 0, 'enemy', [bind(0.7)], '70% Bind.'),
  'wood_dragon': J('Wood Release: Wood Dragon', 'ninjutsu', 'wood', 100, 50, -1, 'enemy', [drain(0.1)], 'A wooden dragon that saps chakra (10%).'),
  'wood_clone': J('Wood Clone', 'support', 'wood', 0, 20, 1, 'self', [decoy], 'Gain a Decoy.'),
  'wood_wall': J('Wood Release: Wood Wall', 'support', 'wood', 0, 40, 1, 'allAllies', [buff('def', 1.3, 2)], 'All allies +30% DEF for 2 turns.'),
  'wood_stakes': J('Cutting Wood Stakes', 'ninjutsu', 'wood', 55, 35, 0, 'allEnemies', [], 'Stakes burst from the ground under all enemies.'),
  # Hyuga
  'gentle_fist': J('Gentle Fist', 'taijutsu', None, 65, 10, 1, 'enemy', [pierce(0.3), drain(0.1)], 'Strikes the chakra network. Ignores 30% DEF, drains 10% Chakra.'),
  'palms_32': J('Eight Trigrams 32 Palms', 'taijutsu', None, 85, 25, 0, 'enemy', [pierce(0.3), drain(0.15)], 'Ignores 30% DEF, drains 15% Chakra.'),
  'palms_64': J('Eight Trigrams 64 Palms', 'taijutsu', None, 110, 35, 0, 'enemy', [pierce(0.3), drain(0.2)], 'Ignores 30% DEF, drains 20% Chakra.'),
  'palms_128': J('Eight Trigrams 128 Palms', 'taijutsu', None, 130, 45, 0, 'enemy', [pierce(0.3), drain(0.25)], 'Ignores 30% DEF, drains 25% Chakra.'),
  'vacuum_palm': J('Eight Trigrams Vacuum Palm', 'taijutsu', None, 75, 20, 1, 'enemy', [flinch(0.2)], 'A palm of compressed air. 20% Flinch.'),
  'vacuum_wall': J('Eight Trigrams Vacuum Wall Palm', 'taijutsu', None, 70, 35, 0, 'allEnemies', [], 'A wall of air hits all enemies.'),
  'rotation': J('Eight Trigrams Palm Rotation', 'support', None, 0, 35, 3, 'self', [rotation], 'Blocks every attack aimed at the user this turn, area attacks included. Same reliability rules as Substitution.', NEW=True),
  'protection_64': J('Eight Trigrams 64 Palms Protection', 'taijutsu', None, 45, 30, 1, 'allEnemies', [drain(0.08)], 'A dome of palms hits all enemies and drains 8% Chakra.'),
  'byakugan_scan': J('Byakugan Scan', 'support', None, 0, 15, 2, 'enemy', [reveal, intel(6)], 'Reveal the target\'s full loadout and gain +6 Intel.'),
  'twin_lion_fists': J('Gentle Step Twin Lion Fists', 'taijutsu', None, 150, 45, 0, 'enemy', [pierce(0.3), drain(0.3)], 'Only while transformed. Drains 30% Chakra.', requiresTransform=True),
  # Lee / Guy
  'morning_peacock': J('Morning Peacock', 'taijutsu', None, 180, 40, 0, 'enemy', [burn(0.5), recoil(0.1)], 'Only with the Gates open. Punches so fast they ignite. 10% recoil.', requiresTransform=True),
  'drunken_fist': J('Drunken Fist', 'taijutsu', None, 80, 15, 1, 'enemy', [flinch(0.25)], 'Unpredictable. 25% Flinch.'),
  'leaf_whirlwind': J('Leaf Great Whirlwind', 'taijutsu', None, 85, 15, 1, 'enemy', [], 'A sweeping spinning kick.'),
  'daytime_tiger': J('Daytime Tiger', 'taijutsu', None, 200, 45, 0, 'allEnemies', [recoil(0.15)], 'Only with the Gates open. A tiger of compressed air. 15% recoil.', requiresTransform=True),
  'night_guy': J('Night Guy', 'taijutsu', None, 260, 50, 0, 'enemy', [recoil(0.3)], 'Only with the Gate of Death open. Ignores Substitution. 30% recoil.', requiresTransform=True, ignoresSub=True),
  # Tenten
  'twin_rising_dragons': J('Twin Rising Dragons', 'taijutsu', None, 60, 25, 1, 'allEnemies', [], 'A storm of weapons from two scrolls.'),
  'chain_bind': J('Manipulated Tools: Heavenly Chains', 'taijutsu', None, 50, 20, 1, 'enemy', [bind(0.45)], '45% Bind.'),
  'giant_shuriken': J('Giant Shuriken', 'taijutsu', None, 85, 15, 0, 'enemy', [], 'One very big shuriken.'),
  'smoke_bomb': J('Smoke Bomb', 'support', None, 0, 15, 2, 'allEnemies', [debuff('spd', 0.8, 2)], 'All enemies −20% SPD for 2 turns.'),
  'rising_dragons_explosion': J('Twin Rising Dragons: Explosion', 'taijutsu', None, 75, 35, 0, 'allEnemies', [burn(0.2)], 'Every weapon carries a tag. 20% Burn.'),
  # Kiba
  'fang_over_fang': J('Fang Over Fang', 'taijutsu', None, 90, 20, 0, 'enemy', [], 'Kiba and Akamaru drill into the target.'),
  'passing_fang': J('Passing Fang', 'taijutsu', None, 70, 15, 1, 'enemy', [], 'A quick spinning tackle.'),
  'four_legs': J('Four Legs Technique', 'support', None, 0, 20, 1, 'self', [buff('spd', 1.3, 3), buff('tai', 1.2, 3)], '+30% SPD and +20% TAI for 3 turns.'),
  'dynamic_marking': J('Dynamic Marking', 'support', None, 0, 10, 2, 'enemy', [debuff('def', 0.85, 2), intel(4)], 'Mark the target: −15% DEF for 2 turns, +4 Intel.'),
  'fang_wolf_fang': J('Fang Wolf Fang', 'taijutsu', None, 110, 45, 0, 'allEnemies', [], 'Only as the Two-Headed Wolf.', requiresTransform=True),
  # Shino
  'insect_swarm': J('Parasitic Insect Swarm', 'ninjutsu', None, 70, 25, 0, 'enemy', [drain(0.15)], 'Chakra-eating insects. Drain 15% Chakra.'),
  'insect_clone': J('Insect Clone', 'support', None, 0, 20, 1, 'self', [decoy], 'Gain a Decoy.'),
  'insect_sphere': J('Insect Sphere', 'ninjutsu', None, 40, 30, 0, 'enemy', [bind(0.6), drain(0.1)], '60% Bind and drain 10% Chakra.'),
  'female_bug': J('Female Insect Tracking', 'support', None, 0, 15, 1, 'enemy', [reveal, intel(8)], 'Ignores Substitution. Reveal the target\'s loadout and gain +8 Intel.', ignoresSub=True),
  'insect_wall': J('Insect Wall', 'support', None, 0, 25, 1, 'self', [buff('def', 1.4, 2)], '+40% DEF for 2 turns.'),
  'insect_tornado': J('Insect Tornado', 'ninjutsu', None, 65, 40, 0, 'allEnemies', [drain(0.1)], 'Drains 10% Chakra from all enemies.'),
  'insect_jar': J('Insect Jar Technique', 'ninjutsu', None, 60, 45, -1, 'enemy', [bind(0.75, 2)], '75% Bind for 2 turns.'),
  # Shikamaru (Shippuden)
  'shadow_stitching': J('Shadow Stitching', 'ninjutsu', 'yin', 55, 40, 0, 'allEnemies', [bind(0.3)], 'Shadow needles pierce all enemies. 30% Bind.', ignoresSub=True),
  'shadow_gathering': J('Shadow Gathering', 'ninjutsu', 'yin', 0, 45, 0, 'allEnemies', [bind(0.45)], '45% Bind on all enemies.', ignoresSub=True),
  # Choji
  'human_boulder': J('Human Boulder', 'taijutsu', None, 85, 20, 0, 'enemy', [], 'Expand and roll over the target.'),
  'spiked_boulder': J('Spiked Human Boulder', 'taijutsu', None, 100, 30, 0, 'enemy', [pierce(0.2)], 'Ignores 20% DEF.'),
  'partial_expansion': J('Partial Expansion: Arms', 'taijutsu', None, 60, 25, 0, 'allEnemies', [], 'Giant arms sweep all enemies.'),
  'super_expansion': J('Super Expansion', 'taijutsu', 'yang', 120, 45, -1, 'enemy', [], 'Grow huge and crush the target.'),
  'butterfly_bullet': J('Butterfly Bullet Bombing', 'taijutsu', 'yang', 190, 50, 0, 'enemy', [recoil(0.08)], 'Only in Butterfly Mode.', requiresTransform=True),
  # Ino (Shippuden)
  'flower_bomb': J('Flower Bomb', 'taijutsu', None, 45, 15, 1, 'allEnemies', [para(0.15)], 'Exploding flower kunai. 15% Paralyze.'),
  'mind_destruction': J('Mind Destruction', 'genjutsu', 'yin', 0, 40, 0, 'enemy', [gen(2), drain(0.2)], 'Genjutsu for 2 turns and drains 20% Chakra.'),
  # Kurenai
  'tree_binding': J('Demonic Illusion: Tree Binding Death', 'genjutsu', 'yin', 60, 40, 0, 'enemy', [bind(1, 1), gen(2)], 'If it lands: Bind for 1 turn, genjutsu for 2, and 60-power damage.', NEW=True),
  'petal_escape': J('Flower Petal Escape', 'support', 'yin', 0, 20, 2, 'self', [decoy, cleanse], 'Gain a Decoy and cleanse yourself.'),
  'mist_hiding': J('Demonic Illusion: Mist Hiding', 'genjutsu', 'yin', 0, 50, 0, 'allEnemies', [gen(1)], 'Genjutsu on all enemies for 1 turn.'),
  'sly_mind_affect': J('Sly Mind Affect', 'genjutsu', 'yin', 0, 30, 1, 'enemy', [gen(2), intel(4)], 'Genjutsu for 2 turns, +4 Intel.'),
  # Asuma
  'flying_swallow': J('Flying Swallow', 'taijutsu', 'wind', 85, 20, 1, 'enemy', [pierce(0.15)], 'Wind-flowed chakra blades. Ignores 15% DEF.'),
  'chakra_blade_combo': J('Chakra Blade Combo', 'taijutsu', 'wind', 105, 30, 0, 'enemy', [], 'A flurry of wind-sharpened slashes.'),
  'burning_ash': J('Fire Release: Burning Ash', 'ninjutsu', 'fire', 55, 35, 0, 'allEnemies', [burn(0.3)], 'A cloud of ash, then a spark. 30% Burn.'),
  'ash_pile': J('Fire Release: Ash Pile Burning', 'ninjutsu', 'fire', 120, 60, -1, 'enemy', [burn(0.5)], 'The ash ignites around one target. 50% Burn.'),
  'wind_blade_dust': J('Wind Release: Dust Cloud', 'support', 'wind', 0, 20, 2, 'allEnemies', [debuff('spd', 0.85, 2)], 'All enemies −15% SPD for 2 turns.'),
}

def T(name, resolve, turns, desc, **k): return dict(name=name, resolve=resolve, turns=turns, desc=desc, **k)
def A(name, kind, values, desc, **k): return dict(name=name, kind=kind, values=values, desc=desc, **k)

# shinobi: id, character, form, era, cost, primary, secondary, roles, stats(hp,tai,nin,def,spd,chk), trait(name,desc,new?), transformation, support, subs, catalogue, default
S = []
def add(id, char, form, era, cost, p, s, roles, st, trait, tf, aura, subs, cat, notes='', status='Existing' ):
    S.append(dict(id=id, character=char, form=form, era=era, cost=cost, primary=p, secondary=s, roles=roles, stats=st, trait=trait, transformation=tf, support=aura, subs=subs, catalogue=cat, notes=notes, status=status))

# ---- Naruto
add('naruto_p1', 'Naruto Uzumaki', 'Part I', 'Part 1', 6, 'wind', 'yang', ['Striker', 'Tank'], (105, 85, 80, 75, 80, 140),
    ('Uzumaki Vitality', 'Regenerates 6% max HP each turn. +30% max Chakra.'),
    T('Nine-Tails Cloak (One Tail)', 60, 3, 'Restore 40% Chakra. +30% TAI, +20% NIN, +15% SPD, +10% DEF. Burns 4% HP per turn. Exhausted afterwards.'),
    A('Unbreakable Spirit', 'resolve', '5 / 10 / 20', 'Allies gain {v} Resolve per turn.'),
    ['log', 'shadowClone'], ['shadow_clone_barrage', 'rasengan', 'multi_shadow_clone', 'sexy_jutsu', 'summon_gamabunta'])
add('naruto_ship', 'Naruto Uzumaki', 'Shippuden', 'Shippuden', 7, 'wind', 'yang', ['Striker', 'Tank'], (110, 90, 95, 85, 90, 150),
    ('Uzumaki Vitality', 'Regenerates 6% max HP each turn. +30% max Chakra.'),
    T('Nine-Tails Cloak (Four Tails)', 70, 3, '+40% TAI, +30% NIN, +20% DEF. Burns 5% HP per turn and 15% chance each turn to hit a random enemy. Exhausted afterwards.'),
    A('Shadow Clone Reinforcements', 'decoyChance', '10% / 20% / 35%', 'Each turn, every ally has a {v} chance to start with a Decoy clone.', new=True),
    ['log', 'shadowClone'], ['rasengan', 'giant_rasengan', 'rasenshuriken', 'shadow_clone_barrage', 'multi_shadow_clone', 'sexy_jutsu'], status='New')
add('naruto_sage', 'Naruto Uzumaki', 'Sage Mode', 'Shippuden', 9, 'wind', 'yang', ['Striker', 'Sensor'], (120, 100, 115, 90, 95, 150),
    ('Uzumaki Vitality', 'Regenerates 6% max HP each turn. +30% max Chakra.'),
    T('Sage Mode', 50, 4, 'Takes a turn to gather natural energy (cancelled if hit). Then +35% TAI/NIN, +20% DEF, +10% SPD.'),
    A('Toad Sage Tutelage', 'chakra', '5% / 8% / 12%', 'Allies regenerate +{v} Chakra per turn.'),
    ['log', 'shadowClone'], ['rasenshuriken', 'massive_rasengan', 'frog_kata', 'shadow_clone_scouts', 'rasengan'])
add('naruto_war', 'Naruto Uzumaki', 'Kurama Link Mode', 'Shippuden', 10, 'wind', 'yang', ['Striker', 'Sensor', 'Support'], (125, 110, 125, 95, 110, 160),
    ('Kurama Link', 'Regenerates 6% max HP each turn. +30% max Chakra. Immune to genjutsu.', True),
    T('Sage of Six Paths Mode', 60, 3, '+35% TAI/NIN, +20% SPD, +20% DEF. Unlocks Tailed Beast Bomb. Exhausted afterwards.'),
    A('Six Paths Gift', 'heal+resolve', '3% + 5 / 5% + 10 / 8% + 15', 'Allies heal {v1} max HP and gain {v2} Resolve per turn.', new=True),
    ['log', 'shadowClone'], ['kurama_rasengan', 'rasenshuriken', 'chakra_arm', 'kurama_transfer', 'frog_kata', 'tailed_beast_bomb'], status='New')
# ---- Sasuke
add('sasuke_p1', 'Sasuke Uchiha', 'Part I', 'Part 1', 7, 'fire', 'lightning', ['Striker'], (90, 90, 100, 70, 110, 95),
    ('Sharingan', 'Sees through Log Substitution. 25% chance to reflect genjutsu back at the caster.'),
    T('Curse Mark (Level 1)', 50, 3, '+30% NIN, +20% TAI, +20% SPD. Costs 5% HP per turn. Exhausted afterwards.'),
    A('Uchiha Pride', 'stat:nin', '10% / 15% / 25%', 'Allies gain +{v} NIN.'),
    ['log', 'explosiveTag'], ['great_fireball', 'phoenix_flower', 'chidori', 'lion_combo', 'dragon_flame'])
add('sasuke_ship', 'Sasuke Uchiha', 'Shippuden', 'Shippuden', 8, 'fire', 'lightning', ['Striker'], (100, 95, 115, 75, 120, 110),
    ('Sharingan', 'Sees through Log Substitution. 25% chance to reflect genjutsu back at the caster.'),
    T('Curse Mark (Level 2)', 60, 3, '+40% NIN, +30% TAI, +20% SPD. Costs 4% HP per turn. Exhausted afterwards.'),
    A("Avenger's Focus", 'crit', '+5% / +10% / +15%', 'Allies gain {v} critical-hit chance.', new=True),
    ['log', 'explosiveTag'], ['chidori', 'chidori_nagashi', 'chidori_spear', 'kirin', 'great_fireball', 'phoenix_flower'], status='New')
add('sasuke_ms', 'Sasuke Uchiha', 'Mangekyō', 'Shippuden', 9, 'fire', 'lightning', ['Striker', 'Controller'], (100, 95, 130, 80, 115, 115),
    ('Mangekyō Sharingan', 'Sees through Log Substitution. 25% genjutsu reflect. His Burns last 2 extra turns.', True),
    T('Susanoo', 60, 3, '+50% DEF, +20% NIN. Unlocks Susanoo: Flame Arrow. Exhausted afterwards.'),
    A("Hatred's Edge", 'execute', '10% / 20% / 30%', 'Allies deal +{v} damage to enemies below half HP.', new=True),
    ['log', 'explosiveTag'], ['amaterasu', 'chidori_spear', 'kirin', 'great_fireball', 'sharingan_genjutsu', 'susanoo_arrow'], status='New')
add('sasuke_war', 'Sasuke Uchiha', 'Eternal Mangekyō', 'Shippuden', 10, 'fire', 'lightning', ['Striker', 'Controller'], (110, 105, 135, 90, 120, 130),
    ('Eternal Mangekyō Sharingan', 'Sees through Log Substitution. Immune to genjutsu. His Burns last 2 extra turns.', True),
    T('Rinne-Sharingan', 70, 3, '+40% NIN, +35% DEF. Unlocks Susanoo: Flame Arrow. Exhausted afterwards.'),
    A('Taka Leader', 'stat:nin+spd', '10%+0% / 15%+5% / 25%+10%', 'Allies gain +{v1} NIN and +{v2} SPD.', new=True),
    ['log', 'explosiveTag'], ['amaterasu', 'blaze_kagutsuchi', 'kirin', 'chidori_spear', 'sharingan_genjutsu', 'susanoo_arrow'], status='New')
# ---- Sakura
add('sakura_p1', 'Sakura Haruno', 'Part I', 'Part 1', 3, 'earth', 'yang', ['Controller'], (80, 70, 60, 65, 75, 100),
    ('Genjutsu Talent', 'Her genjutsu-related jutsu cost 30% less. 50% chance to shrug off genjutsu.', True),
    None,
    A('Inner Sakura', 'genjutsuResist', '25% / 40% / 60%', 'Allies have a {v} chance to shrug off genjutsu.', new=True),
    ['log'], ['shuriken_volley', 'clone_feint', 'genjutsu_dispel', 'inner_sakura', 'shannaro_punch'], status='New')
add('sakura_shippuden', 'Sakura Haruno', 'Shippuden', 'Shippuden', 6, 'earth', 'yang', ['Medic', 'Frontliner'], (100, 105, 70, 80, 80, 110),
    ('Perfect Chakra Control', 'All jutsu cost 20% less Chakra. Healing is 25% stronger.'),
    None,
    A('Field Medic', 'heal', '4% / 6% / 10%', 'Allies heal {v} max HP per turn.'),
    ['log', 'explosiveTag'], ['cherry_blossom_impact', 'heavenly_kick', 'ground_splitter', 'mystical_palm', 'poison_extraction'],
    notes='CHANGED: Strength of a Hundred Seal moves to her Great War form; this form loses its transformation.')
add('sakura_war', 'Sakura Haruno', 'Great War', 'Shippuden', 8, 'earth', 'yang', ['Medic', 'Frontliner'], (120, 125, 80, 95, 90, 130),
    ('Perfect Chakra Control', 'All jutsu cost 20% less Chakra. Healing is 25% stronger.'),
    T('Strength of a Hundred Seal', 60, 3, '+30% TAI, +20% DEF and regenerate 8% HP per turn.'),
    A('Katsuyu Network', 'heal+dr', '3% + 5% / 5% + 8% / 8% + 12%', 'Allies heal {v1} max HP per turn and take {v2} less damage.', new=True),
    ['log', 'explosiveTag'], ['cherry_blossom_impact', 'heavenly_kick', 'ground_splitter', 'healing_transfer', 'katsuyu', 'mystical_palm'], status='New')
# ---- Kakashi
add('kakashi_p1', 'Kakashi Hatake', 'Part I', 'Part 1', 8, 'lightning', 'earth', ['Striker', 'Controller'], (100, 95, 105, 85, 105, 100),
    ('Copy Ninja', 'Sharingan: sees through Log Substitution. The first enemy jutsu that hits him is copied into a 5th slot.'),
    None,
    A('Jonin Leadership', 'stat:spd', '10% / 15% / 25%', 'Allies gain +{v} SPD.'),
    ['log', 'shadowClone', 'waterClone'], ['lightning_blade', 'water_dragon', 'headhunter', 'mud_wall', 'ninja_hounds', 'demonic_illusion'])
add('kakashi_ship', 'Kakashi Hatake', 'Shippuden', 'Shippuden', 9, 'lightning', 'earth', ['Striker', 'Controller'], (105, 95, 120, 85, 110, 100),
    ('Copy Ninja', 'Sharingan: sees through Log Substitution. The first enemy jutsu that hits him is copied into a 5th slot.'),
    T('Mangekyō Sharingan', 50, 3, '+30% NIN and unlocks Kamui. Costs 5% HP per turn. Exhausted afterwards.'),
    A('Sixth Hokage Candidate', 'stat:spd+nin', '10%+5% / 15%+10% / 20%+15%', 'Allies gain +{v1} SPD and +{v2} NIN.', new=True),
    ['log', 'shadowClone', 'waterClone'], ['lightning_blade', 'lightning_hound', 'water_dragon', 'headhunter', 'ninja_hounds', 'demonic_illusion', 'kamui'], status='New')
add('kakashi_dms', 'Kakashi Hatake', 'Double Eternal Mangekyō', 'Shippuden', 10, 'lightning', 'earth', ['Striker', 'Controller'], (110, 110, 135, 95, 120, 120),
    ("Obito's Gift", 'Sees through Log Substitution. Copies the first enemy jutsu that hits him. Immune to genjutsu.', True),
    T('Perfect Susanoo', 60, 3, '+40% NIN, +40% DEF. Unlocks Susanoo: Kamui Shuriken. Exhausted afterwards.'),
    A('Team Kakashi Bond', 'stat:spd+subDiscount', '10%+20% / 15%+35% / 25%+50%', 'Allies gain +{v1} SPD and their Substitutions cost {v2} less.', new=True),
    ['log', 'shadowClone', 'waterClone'], ['kamui_raikiri', 'lightning_blade', 'water_dragon', 'ninja_hounds', 'headhunter', 'kamui_shuriken'], status='New')
# ---- Sai / Yamato
add('sai', 'Sai', '—', 'Shippuden', 6, 'yin', None, ['Infiltrator', 'Controller'], (85, 80, 95, 70, 105, 105),
    ('Root Agent', 'Intel he gathers can\'t be reduced by enemy Guard.', True),
    None,
    A('Root Discipline', 'enemyIntel', '10% / 20% / 30%', 'Enemy Intel gains are reduced by {v}.', new=True),
    ['log'], ['super_beast_scroll', 'ink_snakes', 'ink_bird_recon', 'ink_clone', 'tanto_strike'], status='New')
add('yamato', 'Yamato', '—', 'Shippuden', 7, 'wood', 'water', ['Tank', 'Controller'], (115, 80, 105, 110, 80, 120),
    ('Tailed Beast Suppression', 'His Binds also end an enemy\'s transformation. +30% damage to transformed enemies.', True),
    None,
    A('Wood Shelter', 'aoeReduction', '10% / 20% / 30%', 'Allies take {v} less damage from area attacks.', new=True),
    ['log', 'shadowClone'], ['wood_prison', 'wood_dragon', 'wood_clone', 'wood_wall', 'wood_stakes'], status='New')
# ---- Hinata / Neji
add('hinata_p1', 'Hinata Hyuga', 'Part I', 'Part 1', 4, None, None, ['Sensor', 'Frontliner'], (85, 90, 70, 75, 90, 100),
    ('Byakugan', 'Sees through Log Substitution and Decoys.', True),
    None,
    A('Quiet Encouragement', 'resolve+def', '3 + 0% / 6 + 5% / 12 + 10%', 'Allies gain {v1} Resolve per turn and +{v2} DEF.', new=True),
    ['log'], ['gentle_fist', 'palms_32', 'byakugan_scan', 'shuriken_volley', 'protection_64'], status='New')
add('hinata_ship', 'Hinata Hyuga', 'Shippuden', 'Shippuden', 7, None, None, ['Sensor', 'Frontliner'], (100, 105, 85, 85, 100, 115),
    ('Byakugan', 'Sees through Log Substitution and Decoys.', True),
    T('Twin Lion Fists', 50, 3, '+35% TAI. Unlocks Gentle Step Twin Lion Fists.'),
    A('Byakugan Lookout', 'dodge', '4% / 7% / 10%', 'Allies dodge single-target attacks {v} more often.', new=True),
    ['log'], ['gentle_fist', 'palms_64', 'vacuum_palm', 'protection_64', 'byakugan_scan', 'twin_lion_fists'], status='New')
add('neji_p1', 'Neji Hyuga', 'Part I', 'Part 1', 6, None, None, ['Frontliner', 'Sensor'], (95, 110, 75, 85, 105, 100),
    ('Byakugan', 'Sees through Log Substitution and Decoys.', True),
    None,
    A('Hyuga Prodigy', 'pierce', '5% / 10% / 20%', 'Allies\' attacks ignore {v} of the target\'s DEF.', new=True),
    ['log'], ['gentle_fist', 'palms_64', 'rotation', 'vacuum_palm', 'byakugan_scan'], status='New')
add('neji_ship', 'Neji Hyuga', 'Shippuden', 'Shippuden', 8, None, None, ['Frontliner', 'Sensor'], (105, 120, 85, 95, 110, 110),
    ('Byakugan', 'Sees through Log Substitution and Decoys.', True),
    None,
    A("Caged Bird's Resolve", 'stat:tai+pierce', '10%+0% / 15%+5% / 25%+10%', 'Allies gain +{v1} TAI and ignore {v2} of DEF.', new=True),
    ['log'], ['gentle_fist', 'palms_128', 'rotation', 'vacuum_wall', 'vacuum_palm', 'byakugan_scan'], status='New')
# ---- Lee / Tenten / Guy
add('lee_p1', 'Rock Lee', 'Part I', 'Part 1', 6, None, None, ['Frontliner'], (100, 125, 0, 85, 120, 70),
    ('Splendid Taijutsu', 'Cannot use ninjutsu. +30% taijutsu damage, taijutsu gets +1 priority, immune to Chakra Exhaustion damage.'),
    T('Eight Inner Gates (Fifth Gate)', 40, 3, '+40% TAI, +30% SPD and unlocks Hidden Lotus. Costs 7% HP per turn. Exhausted afterwards.'),
    A('Power of Youth', 'stat:tai', '10% / 15% / 25%', 'Allies gain +{v} TAI.'),
    ['log'], ['leaf_hurricane', 'dynamic_entry', 'leaf_rising_wind', 'front_lotus', 'hidden_lotus'])
add('lee_ship', 'Rock Lee', 'Shippuden', 'Shippuden', 7, None, None, ['Frontliner'], (110, 135, 0, 90, 130, 80),
    ('Splendid Taijutsu', 'Cannot use ninjutsu. +30% taijutsu damage, taijutsu gets +1 priority, immune to Chakra Exhaustion damage.'),
    T('Eight Inner Gates (Sixth Gate)', 50, 3, '+50% TAI, +40% SPD and unlocks Morning Peacock. Costs 9% HP per turn. Exhausted afterwards.'),
    A('Never Give Up', 'lowHpDR', '10% / 20% / 30%', 'Allies below 25% HP take {v} less damage.', new=True),
    ['log'], ['leaf_hurricane', 'dynamic_entry', 'drunken_fist', 'front_lotus', 'hidden_lotus', 'morning_peacock'], status='New')
add('tenten_p1', 'Tenten', 'Part I', 'Part 1', 4, None, None, ['Striker'], (85, 95, 60, 70, 95, 90),
    ('Weapon Mistress', 'Her Kunai & Shuriken deal +50% damage and hit all enemies.', True),
    None,
    A('Armory', 'kunai', '30% / 50% / 80%', 'Allies\' Kunai & Shuriken deal +{v} damage.', new=True),
    ['log'], ['twin_rising_dragons', 'chain_bind', 'giant_shuriken', 'explosive_tag_kunai', 'smoke_bomb'], status='New')
add('tenten_ship', 'Tenten', 'Shippuden', 'Shippuden', 6, None, None, ['Striker', 'Controller'], (95, 110, 70, 80, 105, 100),
    ('Weapon Mistress', 'Her Kunai & Shuriken deal +50% damage and hit all enemies.', True),
    None,
    A('Weapon Supply', 'taiDamage', '5% / 10% / 20%', 'Allies\' taijutsu deal +{v} damage.', new=True),
    ['log', 'explosiveTag'], ['twin_rising_dragons', 'rising_dragons_explosion', 'chain_bind', 'giant_shuriken', 'smoke_bomb'], status='New')
add('guy', 'Might Guy', '—', 'Shippuden', 9, None, None, ['Frontliner'], (120, 140, 0, 95, 130, 90),
    ('Sensei of Youth', 'Cannot use ninjutsu. +30% taijutsu damage, taijutsu gets +1 priority, immune to Chakra Exhaustion damage.'),
    T('Eight Gates: Gate of Death', 80, 2, '+70% TAI, +50% SPD and unlocks Daytime Tiger and Night Guy. Costs 15% HP per turn. Exhausted afterwards.'),
    A('Eternal Rival', 'resolve+tai', '5 + 0% / 10 + 10% / 20 + 20%', 'Allies gain {v1} Resolve per turn and +{v2} TAI.', new=True),
    ['log'], ['leaf_whirlwind', 'dynamic_entry', 'front_lotus', 'morning_peacock', 'daytime_tiger', 'night_guy'], status='New')
# ---- Kiba / Shino
add('kiba_p1', 'Kiba Inuzuka (with Akamaru)', 'Part I', 'Part 1', 5, None, None, ['Frontliner', 'Sensor'], (95, 105, 55, 75, 110, 90),
    ('Akamaru Partner', 'His taijutsu hit a second time for 30% damage.', True),
    None,
    A('Pack Hunter', 'focus', '5% / 10% / 15%', 'Allies deal +{v} damage to a target an ally already hit this turn.', new=True),
    ['log'], ['fang_over_fang', 'passing_fang', 'four_legs', 'dynamic_marking', 'shuriken_volley'], status='New')
add('kiba_ship', 'Kiba Inuzuka (with Akamaru)', 'Shippuden', 'Shippuden', 7, None, None, ['Frontliner', 'Sensor'], (105, 120, 60, 85, 120, 100),
    ('Akamaru Partner', 'His taijutsu hit a second time for 30% damage.', True),
    T('Man Beast Clone: Two-Headed Wolf', 60, 3, '+40% TAI, +20% DEF. Unlocks Fang Wolf Fang.'),
    A('Akamaru Scouting', 'intel', '1 / 2 / 3', 'Team gains {v} Secured Intel per turn.'),
    ['log'], ['fang_over_fang', 'passing_fang', 'four_legs', 'dynamic_marking', 'fang_wolf_fang'], status='New')
add('shino_p1', 'Shino Aburame', 'Part I', 'Part 1', 5, None, None, ['Controller', 'Sensor'], (95, 70, 95, 95, 75, 110),
    ('Kikaichu Host', 'His attacks that hit drain 8% Chakra. Immune to Chakra drain.', True),
    None,
    A('Chakra Leech', 'enemyDrain', '2% / 4% / 6%', 'Enemies lose {v} max Chakra per turn.', new=True),
    ['log'], ['insect_swarm', 'insect_clone', 'insect_sphere', 'female_bug', 'insect_wall'], status='New')
add('shino_ship', 'Shino Aburame', 'Shippuden', 'Shippuden', 7, None, None, ['Controller', 'Sensor'], (105, 75, 110, 100, 85, 125),
    ('Kikaichu Host', 'His attacks that hit drain 8% Chakra. Immune to Chakra drain.', True),
    None,
    A('Insect Barrier', 'dr', '4% / 8% / 12%', 'Allies take {v} less damage.', new=True),
    ['log'], ['insect_swarm', 'insect_tornado', 'insect_jar', 'female_bug', 'insect_clone', 'insect_wall'], status='New')
# ---- Ino-Shika-Cho
add('shikamaru_p1', 'Shikamaru Nara', 'Part I', 'Part 1', 6, 'yin', 'fire', ['Controller', 'Infiltrator'], (85, 65, 90, 75, 85, 100),
    ('200 IQ', 'Intel he gathers is +25%. His Binds last 1 extra turn.'),
    None,
    A('Battle Plan', 'subDiscount', '25% / 40% / 60%', 'Allies\' Substitutions cost {v} less Chakra.'),
    ['log', 'explosiveTag'], ['shadow_possession', 'shadow_neck_bind', 'explosive_tag_kunai', 'battle_analysis', 'flash_bomb'])
add('shikamaru_ship', 'Shikamaru Nara', 'Shippuden', 'Shippuden', 7, 'yin', 'fire', ['Controller', 'Infiltrator'], (95, 70, 105, 85, 95, 115),
    ('200 IQ', 'Intel he gathers is +25%. His Binds last 1 extra turn.'),
    None,
    A("Asuma's Will", 'controlChance', '+10% / +15% / +25%', 'Allies\' Bind, Paralyze and genjutsu chances are {v} higher.', new=True),
    ['log', 'explosiveTag'], ['shadow_possession', 'shadow_neck_bind', 'shadow_stitching', 'shadow_gathering', 'explosive_tag_kunai', 'battle_analysis'], status='New')
add('choji_p1', 'Choji Akimichi', 'Part I', 'Part 1', 5, 'yang', 'earth', ['Tank'], (130, 100, 60, 100, 60, 100),
    ('Akimichi Appetite', 'Charge Chakra also heals 15% max HP.', True),
    T('Three Colored Pills (Curry Pill)', 50, 3, '+50% TAI, +30% DEF. Costs 8% HP per turn. Exhausted afterwards.'),
    A('Snack Break', 'heal+chakra', '3%+3% / 5%+5% / 8%+8%', 'Allies heal {v1} max HP and restore {v2} Chakra per turn.', new=True),
    ['log'], ['human_boulder', 'spiked_boulder', 'partial_expansion', 'super_expansion'], status='New')
add('choji_ship', 'Choji Akimichi', 'Shippuden', 'Shippuden', 7, 'yang', 'earth', ['Tank', 'Frontliner'], (140, 115, 65, 110, 70, 115),
    ('Akimichi Appetite', 'Charge Chakra also heals 15% max HP.', True),
    T('Butterfly Mode', 60, 3, '+70% TAI, +30% SPD. Unlocks Butterfly Bullet Bombing. Costs 10% HP per turn. Exhausted afterwards.'),
    A('Akimichi Bulwark', 'protectWeakest', '10% / 20% / 30%', 'The ally with the lowest HP takes {v} less damage.', new=True),
    ['log'], ['human_boulder', 'spiked_boulder', 'partial_expansion', 'super_expansion', 'butterfly_bullet'], status='New')
add('ino_p1', 'Ino Yamanaka', 'Part I', 'Part 1', 4, 'yin', None, ['Infiltrator', 'Controller'], (80, 65, 85, 65, 85, 95),
    ('Yamanaka Mind Clan', 'Her genjutsu that land grant +3 extra Intel and are 15% more accurate.'),
    None,
    A('Sensory Relay', 'intel', '2 / 3 / 4', 'Team gains {v} Secured Intel per turn.'),
    ['log'], ['mind_transfer', 'mind_body_disturbance', 'mind_clone_spy', 'senbon_volley'])
add('ino_ship', 'Ino Yamanaka', 'Shippuden', 'Shippuden', 6, 'yin', 'water', ['Infiltrator', 'Medic'], (90, 70, 95, 75, 95, 115),
    ('Yamanaka Mind Clan', 'Her genjutsu that land grant +3 extra Intel and are 15% more accurate.'),
    None,
    A('Mind Link', 'intel+genjutsuResist', '1+10% / 2+20% / 3+30%', 'Team gains {v1} Secured Intel per turn; allies shrug off genjutsu {v2} of the time.', new=True),
    ['log'], ['mind_transfer', 'mind_body_disturbance', 'mind_destruction', 'mystical_palm', 'flower_bomb', 'mind_clone_spy'], status='New')
# ---- Senseis
add('kurenai', 'Kurenai Yuhi', '—', 'Part 1', 6, 'yin', None, ['Controller'], (90, 70, 110, 70, 95, 120),
    ('Genjutsu Mistress', 'Her genjutsu last 1 extra turn and are 15% more accurate.', True),
    None,
    A('Illusionary Cover', 'dodge+genjutsuResist', '3%+20% / 6%+30% / 10%+50%', 'Allies dodge {v1} more often and shrug off genjutsu {v2} of the time.', new=True),
    ['log'], ['tree_binding', 'petal_escape', 'mist_hiding', 'sly_mind_affect', 'shuriken_volley'], status='New')
add('asuma', 'Asuma Sarutobi', '—', 'Part 1', 7, 'wind', 'fire', ['Frontliner', 'Striker'], (110, 105, 95, 90, 95, 105),
    ('Chakra Blades', 'His Wind taijutsu get Wind affinity; his Fire jutsu are boosted by his own earlier Wind hits (self-Collaboration).', True),
    None,
    A('Twelve Guardian Ninja', 'natureBoost', '5% / 10% / 20%', 'Allies\' Fire and Wind jutsu deal +{v} damage.', new=True),
    ['log'], ['flying_swallow', 'chakra_blade_combo', 'burning_ash', 'ash_pile', 'wind_blade_dust'], status='New')
