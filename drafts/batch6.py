# Batch 6 drafts (final): Hanzo, Iruka, Konohamaru, Kushina, Mifune, Rasa, Shisui, Shizune.
# Same format as batch5.py. Only Shisui transforms (Perfect Susano'o). Hanzo's salamander Ibuse is a summoning jutsu.
from konoha import J, burn, para, bind, gen, flinch, drain, intel, heal, buff, debuff, recoil, pierce, decoy, cleanse, reveal, vsBound, chakraGive, rotation
from batch2 import poison, bodyguard

NEW_JUTSU = {
  # Hanzo
  'hanzo_kusarigama': J('Poison Kusarigama', 'taijutsu', None, 95, 20, 0, 'enemy', [poison(0.3)], 'A chain-sickle coated in salamander venom. 30% Poison.'),
  'summon_ibuse': J('Summoning: Ibuse', 'ninjutsu', None, 70, 60, -1, 'allEnemies', [poison(0.5)], 'The giant salamander breathes poison fog over every enemy. 50% Poison.'),
  'hanzo_chain_bind': J('Chain Bind', 'taijutsu', None, 50, 25, 1, 'enemy', [bind(0.5)], 'The kusarigama chain wraps the target. 50% Bind.'),
  'salamander_guard': J('Salamander Guard', 'support', None, 0, 25, 2, 'self', [buff('def', 1.4, 2)], 'Takes cover behind Ibuse: +40% DEF for 2 turns.'),
  # Iruka
  'iruka_cover': J('Teacher\'s Shield', 'support', None, 0, 15, 3, 'ally', [bodyguard], 'Throws himself in front of a student: the next single-target hit on that ally this turn hits Iruka instead.'),
  'trap_tags': J('Explosive Trap Tags', 'ninjutsu', 'fire', 50, 25, 0, 'allEnemies', [flinch(0.2)], 'Hidden tags go off under the enemy. 20% Flinch.'),
  # Konohamaru
  'fire_ash': J('Fire Release: Ash Accumulation Burning', 'ninjutsu', 'fire', 70, 35, 0, 'allEnemies', [burn(0.2)], 'A cloud of burning ash. 20% Burn.'),
  'konohamaru_combo': J('Konohamaru Combo', 'taijutsu', None, 75, 10, 1, 'enemy', [], 'A flurry of punches and kicks.'),
  'harem_jutsu': J('Sexy Jutsu: Harem', 'genjutsu', 'yin', 0, 25, 1, 'enemy', [flinch(0.6)], 'A distraction no one is ready for. 60% Flinch.'),
  # Kushina
  'chain_barrier': J('Adamantine Chain Barrier', 'support', 'yang', 0, 40, 2, 'allAllies', [buff('def', 1.3, 2)], 'A cage of chakra chains around the team: +30% DEF for 2 turns.'),
  'kushina_blade': J('Uzumaki Kenjutsu', 'taijutsu', None, 95, 20, 0, 'enemy', [], 'A swift cut from the Red-Hot Habanero.'),
  'habanero_fury': J('Red-Hot Habanero Fury', 'taijutsu', None, 110, 25, 0, 'enemy', [flinch(0.2)], 'Her temper hits as hard as her fists. 20% Flinch.'),
  'chain_lash': J('Adamantine Chain Lash', 'ninjutsu', 'yang', 75, 40, 0, 'allEnemies', [bind(0.25)], 'Chains whip across the field. 25% Bind.'),
  # Mifune
  'iai_draw': J('Iai Draw', 'taijutsu', None, 105, 20, 2, 'enemy', [], 'The blade is drawn and sheathed before the enemy moves.'),
  'iai_flash': J('Iai: Flash', 'taijutsu', None, 130, 35, -1, 'enemy', [pierce(0.2)], 'A single perfect cut. Ignores 20% DEF.'),
  'samurai_stance': J('Samurai Stance', 'support', None, 0, 20, 2, 'self', [buff('def', 1.4, 2)], 'Steadies his guard: +40% DEF for 2 turns.'),
  'chakra_blade_wave': J('Chakra Blade Wave', 'taijutsu', None, 70, 30, 0, 'allEnemies', [], 'A sweeping arc of chakra from the blade.'),
  # Rasa
  'gold_dust_wave': J('Magnet Release: Gold Dust Wave', 'ninjutsu', 'magnet', 85, 50, 0, 'allEnemies', [], 'A tide of gold dust over the field.'),
  'gold_dust_wall': J('Magnet Release: Gold Dust Wall', 'support', 'magnet', 0, 40, 2, 'allAllies', [buff('def', 1.3, 2)], 'Walls of gold rise in front of the team: +30% DEF for 2 turns.'),
  'gold_dust_coffin': J('Magnet Release: Gold Dust Coffin', 'ninjutsu', 'magnet', 0, 40, 0, 'enemy', [bind(0.7, 2)], 'Heavy gold pins the target: 70% Bind for 2 turns.'),
  'gold_avalanche': J('Magnet Release: Gold Avalanche', 'ninjutsu', 'magnet', 125, 60, -1, 'enemy', [], 'Tons of gold crash down on one target.'),
  # Shisui
  'flicker_strike': J('Body Flicker Strike', 'taijutsu', None, 90, 15, 2, 'enemy', [], 'Gone and back before anyone sees the hit.'),
  'flicker_slashes': J('Body Flicker Slashes', 'taijutsu', None, 70, 30, 1, 'allEnemies', [], 'Afterimages cut every enemy at once.'),
  'shisui_arrows': J("Susano'o: Divine Arrows", 'ninjutsu', 'fire', 165, 70, 0, 'enemy', [], "Only while transformed. Perfect Susano'o looses its arrows.", requiresTransform=True),
  # Shizune
  'poison_mist': J('Poison Mist', 'ninjutsu', 'water', 50, 35, 0, 'allEnemies', [poison(0.5)], 'Breathes a cloud of poison. 50% Poison.'),
  'poison_needles': J('Hidden Needle Shot', 'taijutsu', None, 55, 10, 2, 'enemy', [poison(0.3)], 'A spring-loaded needle from her sleeve. 30% Poison.'),
}

def T(name, resolve, turns, desc): return dict(name=name, resolve=resolve, turns=turns, desc=desc)
def A(name, kind, values, desc, **k): return dict(name=name, kind=kind, values=values, desc=desc, **k)

S = []
def add(id, char, form, era, cost, p, s, roles, st, trait, tf, aura, subs, cat, notes='', status='New'):
    S.append(dict(id=id, character=char, form=form, era=era, cost=cost, primary=p, secondary=s, roles=roles, stats=st, trait=trait,
                  transformation=tf, support=aura, subs=subs, catalogue=cat, notes=notes, status=status))

# stats: (HP, TAI, NIN, DEF, SPD, CHK)
add('hanzo', 'Hanzo', '—', 'Shippuden', 8, 'wind', None, ['Frontliner', 'Controller'], (115, 110, 95, 105, 100, 130),
    ('Poison Sac', 'Immune to Poison, and his attacks that hit have a 20% chance to Poison.', True),
    None,
    A('Demigod of the Hidden Rain', 'poisonChance', '5% / 10% / 15%', 'Allies\' attacks have a {v} chance to Poison.'),
    ['log'], ['hanzo_kusarigama', 'summon_ibuse', 'hanzo_chain_bind', 'salamander_guard'])
add('iruka', 'Iruka Umino', '—', 'Part 1', 3, 'fire', None, ['Support', 'Tank'], (90, 70, 70, 85, 80, 95),
    ('Protective Instinct', 'Takes 20% less damage while an ally is below 50% HP.', True),
    None,
    A('Academy Lessons', 'gatherBonus', '2 / 4 / 6', 'Allies\' Gather Intel gains +{v}.'),
    ['log', 'shadowClone'], ['shuriken_volley', 'great_fireball', 'iruka_cover', 'trap_tags'])
add('konohamaru', 'Konohamaru Sarutobi', '—', 'Shippuden', 5, 'wind', 'fire', ['Striker'], (90, 85, 95, 80, 100, 110),
    ('Will of Fire', 'Gains 15 Resolve whenever an ally is knocked out.', True),
    None,
    A('Honorable Grandson', 'focus', '5% / 10% / 15%', 'Allies deal +{v} damage to a target an ally already hit this turn.'),
    ['log', 'shadowClone'], ['rasengan', 'fire_ash', 'konohamaru_combo', 'harem_jutsu'])
add('kushina', 'Kushina Uzumaki', '—', 'Shippuden', 8, 'water', 'yang', ['Controller', 'Frontliner'], (115, 100, 105, 95, 100, 170),
    ('Sealing Chains', 'Her Binds end the target\'s transformation, and she deals +30% damage to transformed enemies.'),
    None,
    A('Red-Hot Habanero', 'stat:tai', '10% / 15% / 25%', 'Allies gain +{v} TAI.'),
    ['log', 'shadowClone'], ['adamantine_chains', 'chain_lash', 'habanero_fury', 'kushina_blade', 'chain_barrier'],
    notes='Uses the existing Tailed Beast Suppression mechanic (Yamato).')
add('mifune', 'Mifune', '—', 'Shippuden', 7, None, None, ['Frontliner', 'Striker'], (105, 125, 60, 100, 115, 100),
    ('Iai Master', 'His taijutsu have +15% critical-hit chance.', True),
    None,
    A('Samurai Code', 'crit', '+5% / +10% / +15%', 'Allies gain {v} critical-hit chance.'),
    ['log'], ['iai_draw', 'iai_flash', 'chakra_blade_wave', 'samurai_stance'])
add('rasa', 'Rasa', 'Fourth Kazekage', 'Shippuden', 8, 'magnet', 'wind', ['Controller', 'Tank'], (110, 75, 115, 105, 90, 140),
    ('Gold Dust', 'His Magnet jutsu that hit lower the target\'s SPD by 15% for 2 turns.', True),
    None,
    A('Fourth Kazekage', 'dr', '4% / 7% / 10%', 'Allies take {v} less damage.'),
    ['log'], ['gold_dust_wave', 'gold_avalanche', 'gold_dust_coffin', 'gold_dust_wall'])
add('shisui', 'Shisui Uchiha', '—', 'Part 1', 9, 'fire', 'yin', ['Striker', 'Controller'], (100, 105, 120, 90, 135, 140),
    ('Shisui of the Body Flicker', 'Sharingan (sees through Log Substitution). All his jutsu gain +1 priority.', True),
    T("Perfect Susano'o", 70, 3, "+40% DEF, +30% NIN and unlocks Susano'o: Divine Arrows. Exhausted afterwards."),
    A("Shisui's Crow", 'enemyIntel', '10% / 15% / 25%', 'Enemy Intel gains are reduced by {v}.'),
    ['log', 'shadowClone'], ['flicker_strike', 'flicker_slashes', 'kotoamatsukami', 'great_fireball', 'shisui_arrows'])
add('shizune', 'Shizune', '—', 'Part 1', 4, 'water', 'yang', ['Medic', 'Controller'], (85, 60, 90, 80, 95, 120),
    ("Tsunade's Apprentice", 'Her healing is 25% stronger.'),
    None,
    A("Assistant's Care", 'heal', '3% / 5% / 8%', 'Allies regenerate {v} max HP per turn.'),
    ['log'], ['poison_mist', 'poison_needles', 'mystical_palm', 'antidote'])
