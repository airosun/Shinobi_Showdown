# Batch 2 drafts: Sand, Sound, Zabuza/Haku, Anko, Danzo.
# Same format as konoha.py. NEW=True / new=True flag mechanics the engine doesn't have yet.
from konoha import J, burn, para, bind, gen, flinch, drain, intel, heal, buff, debuff, recoil, pierce, decoy, cleanse, reveal, vsBound

poison = lambda c, t=3: {'type': 'poison', 'chance': c, 'turns': t}   # NEW status: 6% max HP per turn
revive = {'type': 'revive', 'value': 0.4}                            # NEW: bring back a KO'd ally
bodyguard = {'type': 'bodyguard'}                                     # NEW: take the next single-target hit for an ally

NEW_JUTSU = {
  # Gaara (Shippuden)
  'sand_waterfall_funeral': J('Sand Waterfall Imperial Funeral', 'ninjutsu', 'magnet', 105, 60, -1, 'allEnemies', [], 'A crushing wave of sand on all enemies.'),
  'kazekage_shield': J("Kazekage's Sand Shield", 'support', 'magnet', 0, 40, 2, 'allAllies', [buff('def', 1.25, 2)], 'Sand walls rise in front of every ally: +25% DEF for 2 turns.'),
  # Temari
  'cutting_whirlwind': J('Wind Release: Cutting Whirlwind', 'ninjutsu', 'wind', 60, 30, 0, 'allEnemies', [], 'A sweep of the giant fan hits all enemies.'),
  'great_sickle_weasel': J('Wind Release: Great Sickle Weasel', 'ninjutsu', 'wind', 80, 45, -1, 'allEnemies', [], 'A huge blade of wind over the whole field.'),
  'fan_strike': J('Giant Fan Strike', 'taijutsu', 'wind', 65, 10, 1, 'enemy', [], 'A heavy swing of the closed fan.'),
  'wind_barrier': J('Wind Release: Wind Barrier', 'support', 'wind', 0, 25, 2, 'self', [buff('def', 1.35, 2)], '+35% DEF for 2 turns.'),
  'summon_kamatari': J('Summoning: Kamatari', 'ninjutsu', 'wind', 115, 70, -1, 'allEnemies', [], 'Charged. The one-eyed weasel cuts through everything.', charged=True),
  'dust_wind': J('Wind Release: Great Breakthrough', 'ninjutsu', 'wind', 100, 40, 0, 'enemy', [flinch(0.2)], 'A focused blast of wind. 20% Flinch.'),
  # Kankuro / Chiyo
  'crow_blades': J('Crow: Hidden Blades', 'taijutsu', None, 70, 15, 1, 'enemy', [poison(0.4)], 'Poisoned blades spring from the puppet. 40% Poison.'),
  'crow_embrace': J('Black Secret Technique: Machine of Forbidden Embraces', 'taijutsu', None, 60, 30, 0, 'enemy', [bind(0.6)], 'The puppet locks the target in its arms. 60% Bind.'),
  'puppet_switch': J('Puppet Body Switch', 'support', None, 0, 15, 1, 'self', [decoy], 'Gain a Decoy (a puppet takes the next hit).'),
  'poison_bomb': J('Poison Smoke Bomb', 'ninjutsu', None, 0, 30, 1, 'allEnemies', [poison(0.5)], '50% Poison on all enemies.'),
  'salamander_shield': J('Salamander Shield', 'support', None, 0, 35, 2, 'allAllies', [buff('def', 1.3, 2)], 'The giant puppet shields everyone: +30% DEF for 2 turns.'),
  'iron_maiden': J('Black Ant: Iron Maiden', 'taijutsu', None, 90, 40, 0, 'enemy', [poison(0.5), vsBound(1.5)], '50% Poison; 50% more damage to a Bound target.'),
  'ten_puppets': J('Ten Puppets of Chikamatsu', 'taijutsu', None, 70, 35, 0, 'allEnemies', [poison(0.25)], 'Ten legendary puppets attack together. 25% Poison.'),
  'mother_father': J('White Secret Technique: Mother and Father', 'taijutsu', None, 90, 30, 0, 'enemy', [bind(0.3)], 'Chiyo\'s parent puppets crush the target. 30% Bind.'),
  'antidote': J('Antidote', 'medical', 'yang', 0, 20, 1, 'ally', [cleanse, heal(0.15)], 'Cleanse an ally and heal 15%.'),
  'reincarnation': J("One's Own Life Reincarnation", 'medical', 'yang', 0, 60, -1, 'ally', [revive], 'Once per battle: bring a knocked-out ally back with 40% HP. Chiyo loses half her current HP.', NEW=True),
  'chakra_threads': J('Chakra Threads', 'ninjutsu', None, 40, 25, 1, 'enemy', [bind(0.5)], '50% Bind.'),
  # Orochimaru / Anko
  'shadow_snakes': J('Striking Shadow Snakes', 'ninjutsu', None, 75, 30, 1, 'enemy', [poison(0.3)], 'Snakes shoot from the sleeves. 30% Poison.'),
  'great_breakthrough': J('Wind Release: Great Breakthrough Wave', 'ninjutsu', 'wind', 70, 40, 0, 'allEnemies', [], 'A gale over the whole field.'),
  'five_pronged_seal': J('Five Pronged Seal', 'ninjutsu', 'yin', 0, 35, 0, 'enemy', [drain(0.4), debuff('nin', 0.7, 3)], 'Seals the target\'s chakra: drain 40% Chakra and −30% NIN for 3 turns. Ignores Substitution.', ignoresSub=True),
  'summon_manda': J('Summoning: Manda', 'ninjutsu', None, 150, 75, -1, 'enemy', [poison(0.4)], 'Charged. The giant snake strikes. 40% Poison.', charged=True),
  'kusanagi': J('Sword of Kusanagi', 'taijutsu', None, 100, 25, 1, 'enemy', [pierce(0.25)], 'The blade extends from his mouth. Ignores 25% DEF.'),
  'eight_branches': J('Eight Branches Technique', 'ninjutsu', None, 160, 60, 0, 'allEnemies', [poison(0.4)], 'Only while transformed. The eight-headed serpent.', requiresTransform=True),
  'hidden_snake_hands': J('Hidden Shadow Snake Hands', 'ninjutsu', None, 60, 30, 1, 'allEnemies', [poison(0.25)], 'A hail of snakes on all enemies. 25% Poison.'),
  'twin_snakes': J('Twin Snakes Mutual Death', 'ninjutsu', None, 170, 50, 0, 'enemy', [recoil(0.35)], 'Forbidden. Ignores Substitution. The user takes 35% max HP recoil.', ignoresSub=True),
  'dragon_fire': J('Fire Release: Dragon Fire', 'ninjutsu', 'fire', 80, 35, 0, 'enemy', [burn(0.3)], 'Flame runs along a wire. 30% Burn.'),
  # Kabuto
  'chakra_scalpel': J('Chakra Scalpel', 'taijutsu', 'yang', 75, 20, 1, 'enemy', [debuff('tai', 0.85, 2)], 'Cuts muscles from the inside: −15% TAI for 2 turns.'),
  'temple_of_nirvana': J('Temple of Nirvana', 'genjutsu', 'yin', 0, 45, 0, 'allEnemies', [gen(1)], 'Falling feathers put everyone to sleep: genjutsu on all enemies for 1 turn.'),
  'dead_soul': J('Dead Soul Technique', 'support', 'yin', 0, 25, 0, 'self', [decoy, intel(6)], 'Leave a corpse double: gain a Decoy and +6 Intel.'),
  'white_rage': J('Sage Art: White Rage', 'ninjutsu', None, 80, 45, 0, 'allEnemies', [para(0.4)], 'A crushing sound wave. 40% Paralyze.'),
  'inorganic_animation': J('Sage Art: Inorganic Animation', 'ninjutsu', 'earth', 100, 50, -1, 'allEnemies', [], 'The ground itself rises against all enemies.'),
  'snake_dragon': J('Sage Art: Snake Dragon', 'ninjutsu', None, 120, 55, 0, 'enemy', [poison(0.3)], 'Only while transformed. 30% Poison.', requiresTransform=True),
  # Sound Four
  'earth_dome': J('Earth Release: Barrier Earth Prison Dome', 'ninjutsu', 'earth', 0, 40, 0, 'enemy', [bind(0.7), drain(0.15)], '70% Bind and drain 15% Chakra.'),
  'arhat_fist': J('Arhat Fist', 'taijutsu', None, 105, 30, 0, 'enemy', [], 'A brutal sumo-style blow.'),
  'earth_shore_return': J('Earth Release: Earth Shore Return', 'ninjutsu', 'earth', 70, 35, 0, 'allEnemies', [], 'Throws up a slab of earth over everyone.'),
  'spider_web_area': J('Spider Sticky Gold: Spider Web Area', 'ninjutsu', None, 0, 35, 1, 'allEnemies', [bind(0.3)], '30% Bind on all enemies.'),
  'spider_bow': J('Spider Bow: Fierce Rip', 'taijutsu', None, 150, 60, -1, 'enemy', [pierce(0.3)], 'Charged. A golden arrow that ignores 30% DEF.', charged=True),
  'spider_armor': J('Spider Sticky Gold Armor', 'support', None, 0, 25, 1, 'self', [buff('def', 1.4, 2)], '+40% DEF for 2 turns.'),
  'summon_spider': J('Summoning: Kyodaigumo', 'ninjutsu', None, 60, 35, 0, 'allEnemies', [bind(0.15)], 'A giant spider and its brood. 15% Bind.'),
  'connected_fist': J('Multiple Connected Fist', 'taijutsu', None, 85, 20, 1, 'enemy', [], 'Ukon\'s arms burst out mid-combo.'),
  'parasitic_demon': J('Parasitic Demon Destruction', 'ninjutsu', None, 70, 40, 0, 'enemy', [poison(0.6)], 'Merges into the target\'s body. Ignores Substitution. 60% Poison.', ignoresSub=True),
  'rashomon': J('Summoning: Rashomon', 'support', None, 0, 45, 2, 'allAllies', [buff('def', 1.35, 2)], 'A demon gate blocks the field: +35% DEF to all allies for 2 turns.'),
  'phantom_sound_chains': J('Demonic Flute: Phantom Sound Chains', 'genjutsu', 'yin', 0, 45, 0, 'allEnemies', [gen(1)], 'Genjutsu on all enemies for 1 turn.'),
  'summon_doki': J('Summoning: Doki', 'ninjutsu', None, 75, 40, 0, 'allEnemies', [], 'Three demons on the field.'),
  'spirit_eaters': J('Doki: Spirit Eaters', 'ninjutsu', 'yin', 40, 40, 0, 'allEnemies', [drain(0.15)], 'Chakra-eating spirits drain 15% Chakra from all enemies.'),
  'flute_strike': J('Flute Strike', 'taijutsu', None, 50, 5, 1, 'enemy', [], 'A quick blow.'),
  # Kimimaro
  'willow_dance': J('Dance of the Willow', 'taijutsu', None, 90, 20, 1, 'enemy', [], 'Bones jut from every joint.'),
  'camellia_dance': J('Dance of the Camellia', 'taijutsu', None, 70, 15, 2, 'enemy', [pierce(0.2)], 'A lightning-fast bone sword thrust.'),
  'larch_dance': J('Dance of the Larch', 'taijutsu', None, 65, 30, 0, 'allEnemies', [], 'A spinning field of bone spikes.'),
  'finger_bullets': J('Ten-Finger Drilling Bullets', 'taijutsu', None, 60, 10, 2, 'enemy', [pierce(0.3)], 'Fingertip bones fired as bullets.'),
  'bracken_dance': J('Dance of the Seedling Fern', 'taijutsu', None, 140, 50, 0, 'allEnemies', [], 'Only with the Curse Mark. A forest of bone.', requiresTransform=True),
  # Zabuza / Haku
  'hidden_mist': J('Hidden Mist Technique', 'support', 'water', 0, 25, 2, 'allEnemies', [debuff('spd', 0.8, 2)], 'Thick mist: all enemies −20% SPD for 2 turns.'),
  'water_prison': J('Water Release: Water Prison', 'ninjutsu', 'water', 0, 40, 0, 'enemy', [bind(0.75, 2)], '75% Bind for 2 turns.'),
  'executioner_blade': J("Executioner's Blade", 'taijutsu', None, 110, 30, 0, 'enemy', [], 'The giant cleaver.'),
  'great_waterfall': J('Water Release: Great Waterfall', 'ninjutsu', 'water', 85, 50, -1, 'allEnemies', [], 'A torrent over the whole field.'),
  'ice_mirrors': J('Demonic Mirroring Ice Crystals', 'ninjutsu', 'ice', 95, 50, 0, 'enemy', [para(0.3)], 'Senbon from every mirror at once. Ignores Substitution. 30% Paralyze.', ignoresSub=True),
  'thousand_needles': J('Thousand Needles of Death', 'ninjutsu', 'ice', 60, 35, 0, 'allEnemies', [], 'Water turned to ice needles around everyone.'),
  'ice_prison': J('Ice Release: Ice Prison', 'ninjutsu', 'ice', 40, 35, 0, 'enemy', [bind(0.5)], '50% Bind.'),
  'haku_shield': J('Selfless Shield', 'support', None, 0, 20, 3, 'ally', [bodyguard], 'Leap in front of an ally: the next single-target hit on them this turn hits Haku instead.', NEW=True),
  # Danzo
  'vacuum_blade': J('Wind Release: Vacuum Blade', 'ninjutsu', 'wind', 85, 30, 1, 'enemy', [], 'Wind chakra shaped into a blade.'),
  'vacuum_sphere': J('Wind Release: Vacuum Great Sphere', 'ninjutsu', 'wind', 70, 40, 0, 'allEnemies', [], 'A volley of air bullets.'),
  'reverse_tetragram': J('Reverse Four Symbols Sealing', 'ninjutsu', 'yin', 210, 40, 0, 'enemy', [recoil(0.5)], 'A last resort. Ignores Substitution. The user takes 50% max HP recoil.', ignoresSub=True),
  'summon_baku': J('Summoning: Baku', 'ninjutsu', None, 50, 45, 0, 'allEnemies', [drain(0.15)], 'The dream-eater inhales: drains 15% Chakra from all enemies.'),
  'kotoamatsukami': J('Kotoamatsukami', 'genjutsu', 'yin', 0, 70, 0, 'enemy', [gen(3)], 'Shisui\'s eye: genjutsu for 3 turns.'),
}

def T(name, resolve, turns, desc): return dict(name=name, resolve=resolve, turns=turns, desc=desc)
def A(name, kind, values, desc, **k): return dict(name=name, kind=kind, values=values, desc=desc, **k)

S = []
def add(id, char, form, era, cost, p, s, roles, st, trait, tf, aura, subs, cat, notes='', status='New'):
    S.append(dict(id=id, character=char, form=form, era=era, cost=cost, primary=p, secondary=s, roles=roles, stats=st, trait=trait,
                  transformation=tf, support=aura, subs=subs, catalogue=cat, notes=notes, status=status))

# ---- Sand
add('gaara_p1', 'Gaara', 'Part I', 'Part 1', 8, 'magnet', 'wind', ['Tank', 'Striker'], (100, 45, 105, 125, 60, 120),
    ('Shield of Sand', 'The first damaging single-target hit he takes each turn is halved.'),
    T('Partial Shukaku', 60, 3, '+35% NIN, +20% DEF. 30% chance each turn that his attack hits a random enemy.'),
    A('Sand Barrier', 'stat:def', '10% / 15% / 25%', 'Allies gain +{v} DEF.'),
    ['log', 'shadowClone'], ['sand_coffin', 'sand_burial', 'sand_shuriken', 'sand_tsunami', 'sand_armor'], status='Existing')
add('gaara_ship', 'Gaara', 'Shippuden', 'Shippuden', 9, 'magnet', 'wind', ['Tank', 'Striker', 'Support'], (110, 50, 120, 135, 70, 135),
    ('Shield of Sand', 'The first damaging single-target hit he takes each turn is halved.'),
    None,
    A("Kazekage's Protection", 'dr+stat:def', '5%+0% / 8%+10% / 12%+20%', 'Allies take {v1} less damage and gain +{v2} DEF.', new=True),
    ['log', 'shadowClone'], ['sand_coffin', 'sand_burial', 'sand_waterfall_funeral', 'sand_shuriken', 'kazekage_shield', 'sand_armor'])
add('temari_p1', 'Temari', 'Part I', 'Part 1', 5, 'wind', None, ['Striker'], (85, 70, 100, 70, 95, 105),
    ('Gale Mastery', 'Her area Wind jutsu deal +20% damage.', True),
    None,
    A('Wind Strategy', 'aoeBoost', '5% / 10% / 20%', 'Allies\' area attacks deal +{v} damage.', new=True),
    ['log'], ['cutting_whirlwind', 'great_sickle_weasel', 'fan_strike', 'wind_barrier', 'summon_kamatari'])
add('temari_ship', 'Temari', 'Shippuden', 'Shippuden', 7, 'wind', None, ['Striker', 'Controller'], (95, 75, 115, 80, 100, 120),
    ('Gale Mastery', 'Her area Wind jutsu deal +20% damage.', True),
    None,
    A('Sand Envoy', 'natureBoost:wind', '10% / 15% / 25%', 'Allies\' Wind jutsu deal +{v} damage.'),
    ['log'], ['cutting_whirlwind', 'great_sickle_weasel', 'dust_wind', 'fan_strike', 'wind_barrier', 'summon_kamatari'])
add('kankuro_p1', 'Kankuro', 'Part I', 'Part 1', 5, None, None, ['Controller', 'Striker'], (90, 75, 95, 80, 80, 100),
    ('Puppet Master', 'When his Decoy or Substitution takes a hit, the attacker is Poisoned.', True),
    None,
    A('Poison Supply', 'poisonChance', '5% / 10% / 15%', 'Allies\' attacks have a {v} chance to Poison.', new=True),
    ['log', 'shadowClone'], ['crow_blades', 'crow_embrace', 'puppet_switch', 'poison_bomb'])
add('kankuro_ship', 'Kankuro', 'Shippuden', 'Shippuden', 7, None, None, ['Controller', 'Tank'], (100, 80, 110, 90, 85, 115),
    ('Puppet Master', 'When his Decoy or Substitution takes a hit, the attacker is Poisoned.', True),
    None,
    A('Puppet Bulwark', 'aoeDR', '10% / 20% / 30%', 'Allies take {v} less damage from area attacks.'),
    ['log', 'shadowClone'], ['crow_blades', 'crow_embrace', 'iron_maiden', 'salamander_shield', 'puppet_switch', 'poison_bomb'])
add('chiyo', 'Chiyo', '—', 'Shippuden', 6, None, None, ['Controller', 'Medic'], (80, 70, 110, 75, 80, 125),
    ('Puppet Master', 'When her Decoy or Substitution takes a hit, the attacker is Poisoned.', True),
    None,
    A("Elder's Antidotes", 'cleanseChance', '10% / 20% / 35%', 'Each turn, every ally has a {v} chance to be cleansed of negative statuses.', new=True),
    ['log', 'shadowClone'], ['ten_puppets', 'mother_father', 'chakra_threads', 'antidote', 'reincarnation', 'puppet_switch'])
# ---- Sound
add('orochimaru_p1', 'Orochimaru', 'Part I', 'Part 1', 9, 'wind', 'yin', ['Striker', 'Controller'], (115, 85, 125, 90, 105, 140),
    ('Body Shedding', 'Once per battle, a hit that would knock him out leaves him at 25% HP instead.', True),
    T('Eight Branches Technique', 70, 3, '+30% NIN, +30% DEF and unlocks Eight Branches Technique. Exhausted afterwards.'),
    A('Forbidden Research', 'resolveDiscount', '10 / 20 / 30', 'Allies\' transformations need {v} less Resolve.', new=True),
    ['log', 'shadowClone'], ['shadow_snakes', 'great_breakthrough', 'five_pronged_seal', 'kusanagi', 'summon_manda', 'eight_branches'])
add('orochimaru_ship', 'Orochimaru', 'Shippuden', 'Shippuden', 9, 'wind', 'yin', ['Striker', 'Controller'], (120, 90, 130, 95, 105, 145),
    ('Body Shedding', 'Once per battle, a hit that would knock him out leaves him at 25% HP instead.', True),
    T('Eight Branches Technique', 60, 3, '+30% NIN, +30% DEF and unlocks Eight Branches Technique. Exhausted afterwards.'),
    A('Immortality Research', 'heal', '3% / 5% / 8%', 'Allies regenerate {v} max HP per turn.'),
    ['log', 'shadowClone'], ['shadow_snakes', 'hidden_snake_hands', 'great_breakthrough', 'kusanagi', 'summon_manda', 'eight_branches'])
add('kabuto_p1', 'Kabuto Yakushi', 'Part I', 'Part 1', 6, 'yang', 'earth', ['Medic', 'Infiltrator'], (95, 85, 95, 85, 95, 120),
    ('Medical Spy', 'Healing is 25% stronger and he regenerates 4% HP per turn.', True),
    None,
    A('Double Agent', 'intel+enemyIntel', '1+5% / 2+10% / 3+15%', 'Team gains {v1} Secured Intel per turn; enemy Intel gains are reduced by {v2}.'),
    ['log', 'shadowClone'], ['chakra_scalpel', 'mystical_palm', 'temple_of_nirvana', 'dead_soul', 'shadow_snakes'])
add('kabuto_sage', 'Kabuto Yakushi', 'Sage Mode', 'Shippuden', 10, 'yang', 'earth', ['Striker', 'Medic', 'Sensor'], (120, 105, 130, 100, 115, 150),
    ('White Snake Sage', 'Regenerates 6% HP per turn. Sees through Log Substitution and Decoys.', True),
    T('Dragon Sage Mode', 60, 3, '+35% NIN, +20% DEF. Unlocks Sage Art: Snake Dragon. Exhausted afterwards.'),
    A('Sage Healing', 'heal+dr', '3%+3% / 5%+6% / 8%+10%', 'Allies heal {v1} max HP per turn and take {v2} less damage.'),
    ['log', 'shadowClone'], ['white_rage', 'inorganic_animation', 'chakra_scalpel', 'mystical_palm', 'temple_of_nirvana', 'snake_dragon'])
add('jirobo', 'Jirobo', '—', 'Part 1', 5, 'earth', None, ['Tank'], (120, 105, 70, 105, 55, 110),
    ('Chakra Eater', 'Chakra he drains from enemies is added to his own.', True),
    T('Curse Mark (Level 2)', 50, 3, '+40% TAI, +30% DEF. Costs 5% HP per turn. Exhausted afterwards.'),
    A('Barrier Team', 'dr', '4% / 8% / 12%', 'Allies take {v} less damage.'),
    ['log'], ['earth_dome', 'arhat_fist', 'earth_shore_return', 'shuriken_volley'])
add('kidomaru', 'Kidomaru', '—', 'Part 1', 5, None, None, ['Controller', 'Striker'], (90, 90, 95, 80, 100, 105),
    ('Six Arms', 'His Kunai & Shuriken hit twice.', True),
    T('Curse Mark (Level 2)', 50, 3, '+30% TAI, +30% SPD. Costs 5% HP per turn. Exhausted afterwards.'),
    A('Spider Sense', 'dodge', '4% / 7% / 10%', 'Allies dodge single-target attacks {v} more often.'),
    ['log'], ['spider_web_area', 'spider_bow', 'spider_armor', 'summon_spider'])
add('sakon_ukon', 'Sakon and Ukon', '—', 'Part 1', 6, None, None, ['Frontliner'], (110, 105, 80, 85, 95, 105),
    ('Twin Demons', 'His taijutsu hit a second time for 35% damage.', True),
    T('Curse Mark (Level 2)', 50, 3, '+40% TAI, +20% SPD. Costs 5% HP per turn. Exhausted afterwards.'),
    A('Twin Coordination', 'focus', '5% / 10% / 15%', 'Allies deal +{v} damage to a target an ally already hit this turn.'),
    ['log', 'shadowClone'], ['connected_fist', 'parasitic_demon', 'rashomon', 'arhat_fist'])
add('tayuya', 'Tayuya', '—', 'Part 1', 5, 'yin', None, ['Controller'], (80, 65, 105, 70, 95, 115),
    ('Demon Flute', 'Her genjutsu also have a 30% chance to Paralyze.', True),
    T('Curse Mark (Level 2)', 50, 3, '+30% NIN, +20% SPD. Costs 5% HP per turn. Exhausted afterwards.'),
    A('Sound Barrier', 'genjutsuResist', '20% / 30% / 50%', 'Allies shrug off genjutsu {v} of the time.'),
    ['log'], ['phantom_sound_chains', 'summon_doki', 'spirit_eaters', 'flute_strike'])
add('kimimaro', 'Kimimaro', '—', 'Part 1', 8, None, None, ['Frontliner', 'Tank'], (115, 125, 70, 110, 105, 110),
    ('Dead Bone Pulse', 'His taijutsu ignore 20% DEF. Takes 10% less damage from taijutsu.', True),
    T('Curse Mark (Level 2)', 60, 3, '+40% TAI, +20% SPD and unlocks Dance of the Seedling Fern. Costs 6% HP per turn. Exhausted afterwards.'),
    A('Last Loyal Servant', 'lowHpDR', '10% / 20% / 30%', 'Allies below 25% HP take {v} less damage.'),
    ['log'], ['willow_dance', 'camellia_dance', 'larch_dance', 'finger_bullets', 'bracken_dance'])
# ---- Mist
add('zabuza', 'Zabuza Momochi', '—', 'Part 1', 7, 'water', None, ['Frontliner', 'Striker'], (115, 115, 95, 90, 105, 115),
    ('Silent Killing', 'His single-target attacks have +12% critical-hit chance.', True),
    None,
    A('Demon of the Mist', 'crit', '+5% / +10% / +15%', 'Allies gain {v} critical-hit chance.'),
    ['log', 'waterClone'], ['hidden_mist', 'water_prison', 'executioner_blade', 'great_waterfall', 'water_dragon'])
add('haku', 'Haku', '—', 'Part 1', 6, 'ice', 'water', ['Controller', 'Support'], (85, 85, 105, 70, 125, 110),
    ('Ice Mirrors', 'Dodges single-target attacks 10% more often.', True),
    None,
    A('Devotion', 'protectWeakest', '10% / 20% / 30%', 'The ally with the lowest HP takes {v} less damage.'),
    ['log', 'waterClone'], ['ice_mirrors', 'thousand_needles', 'ice_prison', 'senbon_volley', 'haku_shield'])
# ---- Others
add('anko', 'Anko Mitarashi', '—', 'Part 1', 5, 'fire', None, ['Striker'], (95, 90, 95, 80, 100, 100),
    ('Snake Mistress', 'Her attacks that hit have a 25% chance to Poison.', True),
    T('Curse Mark of Heaven', 50, 3, '+30% NIN, +20% TAI. Costs 5% HP per turn. Exhausted afterwards.'),
    A("Proctor's Watch", 'enemyIntel', '10% / 20% / 30%', 'Enemy Intel gains are reduced by {v}.'),
    ['log', 'shadowClone'], ['shadow_snakes', 'hidden_snake_hands', 'twin_snakes', 'dragon_fire', 'shuriken_volley'])
add('danzo', 'Danzo Shimura', '—', 'Shippuden', 9, 'wind', 'water', ['Striker', 'Controller', 'Infiltrator'], (115, 90, 120, 95, 95, 130),
    ('Izanagi', 'The first two times he would be knocked out, he survives at 20% HP instead.', True),
    None,
    A('Root Command', 'intel+gatherBonus', '1+2 / 2+4 / 3+6', 'Team gains {v1} Secured Intel per turn; allies\' Gather Intel gains +{v2}.', new=True),
    ['log', 'waterClone'], ['vacuum_blade', 'vacuum_sphere', 'summon_baku', 'kotoamatsukami', 'reverse_tetragram'])
