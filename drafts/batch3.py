# Batch 3 drafts: Akatsuki, Zetsu and Taka.
# Same format as batch2.py. NEW=True / new=True / a True third trait element flag mechanics the engine doesn't have yet.
# Obito (Ten Tails Jinchuriki) is held for the Fourth War batch with Madara and Kaguya.
from konoha import J, burn, para, bind, gen, flinch, drain, intel, heal, buff, debuff, recoil, pierce, decoy, cleanse, reveal, vsBound, chakraGive
from batch2 import poison, revive

selfKO = {'type': 'selfKO'}                         # NEW: the user is knocked out after the jutsu resolves
curseLink = lambda t=3: {'type': 'curseLink', 'turns': t}   # NEW: damage Hidan takes is also dealt to the linked target
selfStab = lambda v: {'type': 'selfStab', 'value': v}        # NEW: the user hurts himself (mirrored through the curse)
crowDecoy = {'type': 'decoy', 'genjutsu': 1}                 # NEW: whoever pops the decoy is caught in genjutsu
steal = lambda v: {'type': 'drainChakra', 'value': v, 'steal': True}  # drained Chakra goes to the user

NEW_JUTSU = {
  # Obito
  'kamui_phase': J('Kamui: Phase', 'support', 'yin', 0, 20, 2, 'self', [decoy], 'Slip partly into Kamui: gain a Decoy that takes the next hit.'),
  'kamui_warp_strike': J('Kamui Warp Strike', 'taijutsu', None, 75, 15, 1, 'enemy', [], 'Appears behind the target out of a swirl.'),
  'tobi_antics': J('Tobi Is a Good Boy!', 'support', None, 0, 10, 1, 'enemy', [debuff('nin', 0.8, 2), intel(4)], 'Goofing around throws the target off: −20% NIN for 2 turns and +4 Intel.'),
  'kamui_absorb': J('Kamui: Absorption', 'ninjutsu', 'yin', 115, 65, -1, 'enemy', [], 'Warps part of the target into another dimension. Ignores Substitution.', ignoresSub=True),
  'fire_annihilation': J('Fire Release: Great Fire Annihilation', 'ninjutsu', 'fire', 95, 55, 0, 'allEnemies', [burn(0.2)], 'A sea of flame over the field. 20% Burn.'),
  'gedo_chains': J('Demonic Statue Chains', 'ninjutsu', 'yin', 0, 40, 0, 'enemy', [bind(0.75, 2), drain(0.2)], '75% Bind for 2 turns and drain 20% Chakra.'),
  # Zetsu
  'spore_clone': J('Spore Clone', 'support', 'wood', 0, 20, 1, 'self', [decoy, intel(4)], 'A spore copy takes the next hit and spies: Decoy and +4 Intel.'),
  'wood_spikes': J('Wood Release: Spikes', 'ninjutsu', 'wood', 60, 20, 1, 'enemy', [], 'Spikes burst from the ground.'),
  'spore_grab': J('Spore Absorption', 'taijutsu', 'wood', 55, 20, 0, 'enemy', [bind(0.3), drain(0.15)], 'Clings to the target: 30% Bind and drain 15% Chakra.'),
  'mayfly': J('Mayfly', 'support', 'earth', 0, 30, 0, 'self', [intel(10)], 'Sinks into the ground to scout: +10 Intel.'),
  'body_hijack': J('Body Hijack', 'genjutsu', 'yin', 0, 40, 0, 'enemy', [bind(0.8, 2)], 'Seizes the target\'s body: 80% Bind for 2 turns.'),
  'black_spear': J('Black Spike', 'ninjutsu', 'earth', 70, 25, 1, 'enemy', [pierce(0.2)], 'A spear of black matter. Ignores 20% DEF.'),
  # Kisame
  'samehada_shred': J('Samehada Shred', 'taijutsu', None, 95, 20, 0, 'enemy', [drain(0.15)], 'Samehada shaves chakra away: drain 15% Chakra.'),
  'shark_bomb': J('Water Release: Shark Bomb', 'ninjutsu', 'water', 100, 45, 0, 'enemy', [], 'A shark of water slams the target.'),
  'thousand_sharks': J('Water Release: Thousand Feeding Sharks', 'ninjutsu', 'water', 85, 60, -1, 'allEnemies', [], 'A swarm of sharks hits every enemy.'),
  'shark_dance': J('Water Prison Shark Dance', 'ninjutsu', 'water', 50, 55, 0, 'enemy', [bind(0.7, 2), drain(0.2)], 'A sphere of water full of sharks: 70% Bind for 2 turns, drain 20% Chakra.'),
  # Itachi
  'tsukuyomi': J('Tsukuyomi', 'genjutsu', 'yin', 60, 60, 1, 'enemy', [gen(2)], 'Seventy-two hours in an instant: damage and genjutsu for 2 turns.'),
  'crow_clone': J('Crow Clone', 'support', 'yin', 0, 20, 2, 'self', [crowDecoy], 'Bursts into crows: gain a Decoy; whoever hits it is caught in genjutsu for 1 turn.'),
  'totsuka_blade': J('Totsuka Blade', 'ninjutsu', 'fire', 150, 60, 0, 'enemy', [], 'Only while transformed. Seals the target away. Ignores Substitution.', requiresTransform=True, ignoresSub=True),
  # Deidara
  'c1_spiders': J('C1: Clay Spiders', 'ninjutsu', 'explosion', 60, 25, 1, 'allEnemies', [], 'Little clay spiders scatter and explode.'),
  'c2_dragon': J('C2: Clay Dragon', 'ninjutsu', 'explosion', 100, 50, 0, 'allEnemies', [], 'A clay dragon spits bombs over the field.'),
  'c3_bomb': J('C3: Giant Clay Bomb', 'ninjutsu', 'explosion', 140, 80, -1, 'allEnemies', [], 'Charged. A colossal bomb levels the field.', charged=True),
  'c4_karura': J('C4: Karura', 'ninjutsu', 'explosion', 70, 60, 0, 'allEnemies', [poison(0.5)], 'Microscopic bombs inside every enemy. Ignores Substitution. 50% Poison.', ignoresSub=True),
  'c0': J('C0: Ultimate Art', 'ninjutsu', 'explosion', 260, 0, -1, 'allEnemies', [selfKO], 'Deidara becomes the bomb. Massive damage to all enemies; Deidara is knocked out.', NEW=True),
  'clay_bird': J('Clay Bird Flight', 'support', 'explosion', 0, 20, 2, 'self', [buff('spd', 1.3, 3)], 'Takes to the sky: +30% SPD for 3 turns.'),
  # Hidan
  'triple_scythe': J('Triple-Bladed Scythe', 'taijutsu', None, 95, 20, 0, 'enemy', [], 'A wide swing of the three-bladed scythe.'),
  'scythe_throw': J('Scythe Throw', 'taijutsu', None, 70, 15, 1, 'enemy', [], 'Hurls the scythe on its cable.'),
  'jashin_spike': J('Jashin Spike', 'taijutsu', None, 80, 20, 0, 'enemy', [pierce(0.3)], 'A retractable spear. Ignores 30% DEF.'),
  'curse_ritual': J('Curse Ritual: Death Possession Blood', 'ninjutsu', 'yin', 0, 40, 0, 'enemy', [curseLink(3)], 'Links Hidan to the target for 3 turns: damage Hidan takes is also dealt to the target. Ignores Substitution.', ignoresSub=True, NEW=True),
  'ritual_stab': J('Sacrificial Stab', 'taijutsu', None, 0, 20, 0, 'self', [selfStab(0.2)], 'Only while transformed. Hidan stabs himself for 20% max HP; a linked enemy takes the same through the curse.', requiresTransform=True, NEW=True),
  # Kakuzu
  'earth_spear': J('Earth Release: Earth Spear', 'support', 'earth', 0, 30, 2, 'self', [buff('def', 1.5, 2)], 'Hardens his skin: +50% DEF for 2 turns.'),
  'false_darkness': J('Lightning Release: False Darkness', 'ninjutsu', 'lightning', 110, 45, 0, 'enemy', [pierce(0.2)], 'A piercing spear of lightning. Ignores 20% DEF.'),
  'searing_migraine': J('Fire Release: Searing Migraine', 'ninjutsu', 'fire', 85, 50, -1, 'allEnemies', [burn(0.2)], 'A blast of fire from the mask. 20% Burn.'),
  'pressure_damage': J('Wind Release: Pressure Damage', 'ninjutsu', 'wind', 140, 65, -1, 'allEnemies', [], 'Only while transformed. A crushing gale.', requiresTransform=True),
  'earth_grudge_threads': J('Earth Grudge Fear Threads', 'taijutsu', None, 65, 25, 1, 'enemy', [bind(0.5)], 'Black threads lash the target: 50% Bind.'),
  # Sasori
  'hiruko_tail': J('Hiruko: Poison Tail', 'taijutsu', None, 80, 20, 1, 'enemy', [poison(0.5)], 'A whip of the puppet\'s tail. 50% Poison.'),
  'iron_sand_drizzle': J('Iron Sand: Drizzle', 'ninjutsu', 'magnet', 85, 45, 0, 'allEnemies', [poison(0.3)], 'Poisoned iron needles rain down. 30% Poison.'),
  'iron_sand_world_order': J('Iron Sand: World Order', 'ninjutsu', 'magnet', 0, 45, 0, 'allEnemies', [bind(0.45)], 'A lattice of iron spikes: 45% Bind on all enemies.'),
  'hundred_puppets': J('Red Secret Technique: Performance of a Hundred Puppets', 'taijutsu', None, 125, 60, 0, 'allEnemies', [poison(0.4)], 'Only while transformed. A hundred puppets attack. 40% Poison.', requiresTransform=True),
  # Konan
  'paper_shuriken': J('Paper Shuriken', 'ninjutsu', 'wind', 70, 20, 1, 'enemy', [], 'Razor-edged paper.'),
  'paper_spear': J('Paper Spear', 'ninjutsu', 'wind', 100, 40, 0, 'enemy', [pierce(0.2)], 'Folded into a lance. Ignores 20% DEF.'),
  'paper_butterflies': J('Dance of the Shikigami', 'ninjutsu', 'wind', 65, 35, 0, 'allEnemies', [flinch(0.15)], 'A storm of paper butterflies. 15% Flinch.'),
  'paper_clone': J('Paper Clone', 'support', 'wind', 0, 20, 2, 'self', [decoy], 'A paper double takes the next hit.'),
  'paper_ocean': J('Six Hundred Billion Exploding Tags', 'ninjutsu', 'wind', 190, 95, -1, 'allEnemies', [], 'Only while transformed. A sea of exploding tags.', requiresTransform=True),
  # Nagato
  'shinra_tensei': J('Shinra Tensei', 'ninjutsu', 'yang', 110, 65, -1, 'allEnemies', [flinch(0.25)], 'Repels everything around him. 25% Flinch.'),
  'almighty_push': J('Almighty Push', 'ninjutsu', 'yang', 90, 35, 1, 'enemy', [], 'A focused repulsion.'),
  'universal_pull': J('Universal Pull', 'ninjutsu', 'yin', 40, 30, 1, 'enemy', [bind(0.6), vsBound(1.0)], 'Drags the target in: 60% Bind.'),
  'chibaku_tensei': J('Chibaku Tensei', 'ninjutsu', 'yin', 165, 100, -1, 'allEnemies', [bind(0.5, 2)], 'Charged. A planetary prison: 50% Bind for 2 turns.', charged=True),
  'preta_absorb': J('Preta Path: Absorb', 'ninjutsu', 'yin', 0, 10, 2, 'enemy', [steal(0.3)], 'Absorbs chakra: drain 30% Chakra from the target and take it for himself.'),
  'asura_missiles': J('Asura Path: Missiles', 'ninjutsu', None, 90, 50, 0, 'allEnemies', [], 'Mechanical arms fire a volley of missiles.'),
  'samsara_revival': J('Outer Path: Samsara of Heavenly Life', 'medical', 'yang', 0, 80, -1, 'ally', [revive], 'Once per battle: bring a knocked-out ally back with 40% HP. Nagato loses half his current HP.'),
  # Suigetsu
  'water_gun': J('Water Release: Water Gun', 'ninjutsu', 'water', 70, 15, 1, 'enemy', [], 'A bullet of water from his fingertip.'),
  'great_water_arm': J('Great Water Arm', 'taijutsu', 'water', 100, 25, 0, 'enemy', [], 'A swollen, hydrified arm.'),
  'hydrification': J('Hydrification Technique', 'support', 'water', 0, 25, 2, 'self', [buff('def', 1.4, 2)], 'Turns his body to water: +40% DEF for 2 turns.'),
  # Karin
  'healing_bite': J('Healing Bite', 'medical', 'yang', 0, 20, 1, 'ally', [heal(0.35), recoil(0.1)], 'An ally bites Karin to heal 35%; Karin loses 10% max HP.'),
  'adamantine_chains': J('Adamantine Sealing Chains', 'ninjutsu', 'yang', 0, 45, 0, 'enemy', [bind(0.75, 2), drain(0.1)], 'Uzumaki chakra chains: 75% Bind for 2 turns, drain 10% Chakra.'),
  'karin_punch': J('Karin Punch', 'taijutsu', None, 60, 5, 1, 'enemy', [], 'An angry punch.'),
  'mind_eye_sensing': J("Mind's Eye of the Kagura", 'support', 'yang', 0, 20, 0, 'enemy', [reveal, intel(6)], "Senses the target's chakra: reveal its loadout and +6 Intel."),
  # Jugo
  'sage_arm_cannon': J('Sage Art: Arm Cannon', 'taijutsu', None, 125, 40, -1, 'enemy', [], 'His arm becomes a chakra cannon.'),
  'axe_arm': J('Axe Arm', 'taijutsu', None, 95, 20, 0, 'enemy', [], 'An arm shaped like an axe.'),
  'jet_punch': J('Jet Punch', 'taijutsu', None, 75, 15, 1, 'enemy', [], 'Chakra jets on his elbow drive the punch.'),
  'cell_share': J('Natural Energy Transfer', 'medical', 'yang', 0, 30, 1, 'ally', [heal(0.35), recoil(0.15)], 'Gives his own cells to an ally: heal 35%; Jugo loses 15% max HP.'),
}

def T(name, resolve, turns, desc): return dict(name=name, resolve=resolve, turns=turns, desc=desc)
def A(name, kind, values, desc, **k): return dict(name=name, kind=kind, values=values, desc=desc, **k)

S = []
def add(id, char, form, era, cost, p, s, roles, st, trait, tf, aura, subs, cat, notes='', status='New'):
    S.append(dict(id=id, character=char, form=form, era=era, cost=cost, primary=p, secondary=s, roles=roles, stats=st, trait=trait,
                  transformation=tf, support=aura, subs=subs, catalogue=cat, notes=notes, status=status))

# stats: (HP, TAI, NIN, DEF, SPD, CHK)
# ---- Akatsuki
add('obito_tobi', 'Obito Uchiha', 'Tobi', 'Shippuden', 6, 'fire', 'wood', ['Infiltrator', 'Controller'], (90, 80, 90, 85, 105, 120),
    ('Kamui Intangibility', 'Single-target attacks have a 25% chance to pass straight through him.', True),
    None,
    A('Akatsuki Recruiter', 'subDiscount', '5% / 10% / 15%', 'Allies\' substitutions cost {v} less Chakra.'),
    ['log', 'shadowClone'], ['kamui_warp_strike', 'great_fireball', 'kamui_phase', 'tobi_antics', 'wood_spikes'])
add('obito_masked', 'Obito Uchiha', 'Masked Man', 'Shippuden', 9, 'fire', 'wood', ['Striker', 'Controller'], (115, 100, 120, 100, 110, 145),
    ('Kamui Intangibility', 'Single-target attacks have a 25% chance to pass straight through him.', True),
    None,
    A("Moon's Eye Plan", 'resolve', '+3 / +5 / +8', 'Allies gain {v} Resolve per turn.'),
    ['log', 'shadowClone'], ['kamui_absorb', 'fire_annihilation', 'gedo_chains', 'kamui_warp_strike', 'wood_dragon', 'kamui_phase'])
add('zetsu_white', 'Zetsu', 'White', 'Shippuden', 3, 'wood', None, ['Infiltrator'], (80, 60, 65, 70, 95, 95),
    ('Spore Spy', 'Starts the battle with a Decoy, and his Gather Intel gains +6.', True),
    None,
    A('Zetsu Network', 'intel', '1 / 2 / 3', 'Team gains {v} Secured Intel per turn.'),
    ['log'], ['spore_clone', 'wood_spikes', 'spore_grab', 'mayfly'])
add('zetsu_black', 'Zetsu', 'Black', 'Shippuden', 4, 'yin', 'earth', ['Infiltrator', 'Controller'], (75, 55, 95, 75, 100, 110),
    ('Ground Merge', 'The first single-target hit of the battle passes through him.', True),
    None,
    A("Mother's Will", 'enemyIntel', '10% / 15% / 25%', 'Enemy Intel gains are reduced by {v}.'),
    ['log'], ['body_hijack', 'black_spear', 'mayfly', 'spore_clone'])
add('kisame', 'Kisame Hoshigaki', '—', 'Shippuden', 8, 'water', None, ['Tank', 'Frontliner'], (135, 105, 100, 105, 80, 160),
    ('Samehada', 'His taijutsu steal Chakra: what they drain is added to his own.', True),
    T('Samehada Fusion', 50, 3, '+30% TAI, +30% SPD. Regenerates 6% HP per turn. Exhausted afterwards.'),
    A('Tailless Tailed Beast', 'chakra', '3% / 5% / 8%', 'Allies regenerate {v} max Chakra per turn.'),
    ['log', 'waterClone'], ['samehada_shred', 'shark_bomb', 'thousand_sharks', 'shark_dance', 'hidden_mist'])
add('itachi', 'Itachi Uchiha', '—', 'Shippuden', 9, 'fire', 'yin', ['Controller', 'Striker'], (95, 90, 125, 85, 120, 135),
    ("Itachi's Genius", 'Sharingan (sees through Log Substitution) and his genjutsu last 1 turn longer.', True),
    T("Susano'o", 70, 3, '+40% DEF, +20% NIN and unlocks Totsuka Blade. Exhausted afterwards.'),
    A('Crow Genjutsu', 'controlChance', '+5% / +10% / +15%', 'Allies\' Bind, Paralyze and Flinch chances are {v} higher.'),
    ['log', 'shadowClone'], ['tsukuyomi', 'amaterasu', 'crow_clone', 'phoenix_flower', 'great_fireball', 'totsuka_blade'])
add('deidara', 'Deidara', '—', 'Shippuden', 7, 'explosion', None, ['Striker'], (90, 65, 120, 75, 110, 125),
    ('Art Is an Explosion', 'His area attacks deal +10% damage. Takes 20% less damage from taijutsu (he fights from the air).', True),
    None,
    A('Explosive Expertise', 'aoeBoost', '5% / 10% / 15%', 'Allies\' area attacks deal +{v} damage.'),
    ['log', 'explosiveTag'], ['c1_spiders', 'c2_dragon', 'c3_bomb', 'c4_karura', 'clay_bird', 'c0'])
add('hidan', 'Hidan', '—', 'Shippuden', 6, None, None, ['Frontliner', 'Tank'], (125, 105, 65, 90, 85, 100),
    ('Jashinist Immortality', 'Burn and Poison can\'t knock him out, and once per battle a hit that would knock him out leaves him at 30% HP.', True),
    T('Death Possession Blood', 50, 3, '+30% TAI. Unlocks Sacrificial Stab. Exhausted afterwards.'),
    A('Blood Price', 'stat:tai', '10% / 15% / 25%', 'Allies gain +{v} TAI.'),
    ['log'], ['triple_scythe', 'scythe_throw', 'jashin_spike', 'curse_ritual', 'ritual_stab'])
add('kakuzu', 'Kakuzu', '—', 'Shippuden', 8, 'earth', 'lightning', ['Tank', 'Striker'], (140, 90, 115, 110, 70, 140),
    ('Five Hearts', 'Each time he knocks out an enemy he steals its heart: heal 25% max HP.', True),
    T('Earth Grudge Fear Masks', 60, 3, '+30% NIN, +20% DEF and unlocks Pressure Damage. Exhausted afterwards.'),
    A('Bounty Ledger', 'koIntel', '4 / 6 / 10', 'Team gains {v} extra Intel whenever an enemy is knocked out.', new=True),
    ['log'], ['false_darkness', 'searing_migraine', 'earth_grudge_threads', 'earth_spear', 'pressure_damage'])
add('sasori', 'Sasori', '—', 'Shippuden', 7, 'magnet', None, ['Controller', 'Striker'], (90, 85, 115, 90, 100, 125),
    ('Human Puppet', 'Immune to Poison and genjutsu. When his Decoy or Substitution takes a hit, the attacker is Poisoned.', True),
    T('Human Puppet Body', 50, 3, '+30% NIN, +30% SPD and unlocks Performance of a Hundred Puppets. Exhausted afterwards.'),
    A('Master Toxicologist', 'poisonPower', '1% / 2% / 4%', 'Enemies take {v} more max HP from Poison each turn.', new=True),
    ['log', 'shadowClone'], ['hiruko_tail', 'iron_sand_drizzle', 'iron_sand_world_order', 'puppet_switch', 'hundred_puppets'])
add('konan', 'Konan', '—', 'Shippuden', 6, 'wind', None, ['Striker', 'Support'], (90, 65, 110, 80, 110, 125),
    ('Paper Body', 'Scatters into paper: dodges single-target attacks 15% more often.', True),
    T('Paper Angel', 60, 3, '+30% NIN, +20% SPD and unlocks Six Hundred Billion Exploding Tags. Exhausted afterwards.'),
    A('Angel of Ame', 'subDiscount', '5% / 10% / 20%', 'Allies\' substitutions cost {v} less Chakra.'),
    ['log', 'explosiveTag'], ['paper_shuriken', 'paper_spear', 'paper_butterflies', 'paper_clone', 'paper_ocean'])
add('nagato_pain', 'Nagato', 'Six Paths of Pain', 'Shippuden', 10, 'yin', 'yang', ['Striker', 'Controller'], (120, 95, 130, 100, 105, 160),
    ('Rinnegan', 'Sees through Log Substitution and Decoys. Takes 20% less damage from ninjutsu (Preta Path).', True),
    None,
    A('God of Amegakure', 'stat:nin', '10% / 15% / 25%', 'Allies gain +{v} NIN.'),
    ['shadowClone'], ['shinra_tensei', 'almighty_push', 'universal_pull', 'preta_absorb', 'asura_missiles', 'chibaku_tensei'])
add('nagato_reanimated', 'Nagato', 'Reanimated', 'Shippuden', 9, 'yin', 'yang', ['Striker', 'Support'], (105, 60, 135, 95, 80, 160),
    ('Reanimated Body', 'Regenerates 10% HP per turn and is immune to Poison. Rinnegan: sees through Log Substitution and Decoys.', True),
    None,
    A('Edo Tensei', 'heal', '3% / 5% / 8%', 'Allies regenerate {v} max HP per turn.'),
    ['log'], ['shinra_tensei', 'universal_pull', 'preta_absorb', 'chibaku_tensei', 'samsara_revival'])
# ---- Taka
add('suigetsu', 'Suigetsu Hozuki', '—', 'Shippuden', 5, 'water', None, ['Frontliner'], (95, 100, 80, 75, 100, 110),
    ('Hydrification', 'Takes 20% less damage from taijutsu and Fire jutsu.', True),
    None,
    A('Hozuki Water', 'natureBoost:water', '10% / 15% / 25%', 'Allies\' Water jutsu deal +{v} damage.'),
    ['log', 'waterClone'], ['executioner_blade', 'water_gun', 'great_water_arm', 'hydrification'])
add('karin', 'Karin', '—', 'Shippuden', 4, 'yang', None, ['Medic', 'Sensor'], (85, 55, 85, 75, 90, 115),
    ('Kagura Sensing', 'Sees through Decoys, and her Gather Intel gains +4.', True),
    None,
    A('Healing Bite', 'heal', '3% / 5% / 8%', 'Allies regenerate {v} max HP per turn.'),
    ['log'], ['healing_bite', 'adamantine_chains', 'karin_punch', 'mind_eye_sensing'])
add('jugo', 'Jugo', '—', 'Shippuden', 6, None, None, ['Frontliner', 'Tank'], (130, 120, 70, 95, 80, 110),
    ('Berserker', 'Deals +25% damage while below 50% HP.', True),
    T('Sage Transformation', 50, 3, '+40% TAI, +30% DEF. Costs 5% HP per turn. Exhausted afterwards.'),
    A('Natural Energy', 'chakra', '3% / 5% / 8%', 'Allies regenerate {v} max Chakra per turn.'),
    ['log'], ['sage_arm_cannon', 'axe_arm', 'jet_punch', 'cell_share'])
