# Shinobi Showdown — Design Reference (v0.1)

All numbers live in `BALANCE` in `public/engine/battle.js` or in the data files.

## Teams
- 3 active shinobi + 1 support. Cost cap **30**. Only one version of each character per team (e.g. Naruto Part 1 *or* Naruto Sage).
- Each active shinobi brings **4 jutsu** from their catalogue and picks one Substitution type.
- Universal actions everyone has: Kunai & Shuriken, Substitution, Charge Chakra, Gather Intel, Guard, Release (when in genjutsu), Transform (if available).
- **Support** never enters the battle (it's a 3v3). It gives the team a unique passive that grows as the cell falls: stage 1 with 3 allies standing, stage 2 with 2, stage 3 with 1 (`supportAura.values` in the data).

## Stats
| Stat | Use |
|---|---|
| HP | max HP = base × 3 |
| TAI | taijutsu damage |
| NIN | ninjutsu damage, genjutsu accuracy |
| DEF | reduces all damage |
| SPD | order within a priority tier, small dodge chance (max 12%) |
| CHK | max Chakra = base × 1.25, genjutsu resistance |

## Chakra
Chakra is meant to run low a few times per battle.
- Pools are small (CHK × 1.25) and only **4%** regenerates per turn.
- **Charge Chakra** restores **50%** of the pool (resolves last; +25% damage taken that turn).
- **Overexert**: a jutsu you can't afford can still be used — Chakra drops to 0, the shortfall is paid in HP (1.2 HP per missing point) and you're **Exhausted** (−15% stats) for 2 turns. Not allowed if it would KO you.
- Ending a turn at 0 Chakra costs 6% max HP (Lee/Guy are immune).
- Sim targets (CPU vs CPU): ~18% of shinobi-turns start below 25% Chakra, ~4–5 Charges and ~2 overexerts per battle.

## Turn order
Both sides choose in secret, then actions resolve by priority, then SPD:

| Priority | Actions |
|---|---|
| Stance (+4) | Substitution, Guard, Swap, Transform, Release, starting a charged jutsu |
| +3 | Dynamic Entry |
| +2 | Kunai, Sexy Jutsu, Explosive Tag Kunai, Senbon |
| +1 | most taijutsu, Chidori/Lightning Blade |
| 0 | standard jutsu |
| −1 | big jutsu (Great Fireball, Water Dragon), Gather Intel |
| −2 | Charge Chakra |

**Charged jutsu** (Rasenshuriken, Gamabunta, Sand Tsunami): cost is paid on turn 1, and the jutsu fires on turn 2 at its priority. The user takes +25% damage while weaving. A Bind, Flinch, Paralysis or genjutsu fail cancels it.

## Damage
```
power × (TAI or NIN ÷ DEF) × 0.42 × affinity × advantage × modifiers × random(0.85–1)
affinity: primary nature ×1.25, secondary ×1.1
advantage: ×1.5 strong / ×0.75 weak vs the target's PRIMARY nature
crit 1/16 → ×1.5
```

## Natures
Fire › Wind › Lightning › Earth › Water › Fire. Yin, Yang and non-elemental jutsu are always neutral. Kekkei genkai (Wood, Ice, Lava, Storm, Magnet, Scorch, Boil, Explosion) check both parent natures and multiply.

- **Jutsu Clash:** two single-target damaging ninjutsu aimed at each other collide. The nature with the advantage wins; if neither has it, the higher power × NIN wins. The winner hits at 70%, and on a full tie both cancel.
- **Collaboration:** Wind then Fire, or Water then Lightning, from allies on the same target in the same turn gives ×1.3.

## Substitution
- A stance that negates the first single-target hit (including status-only jutsu and kunai).
- Success on consecutive turns: 100% / 50% / 25%.
- AoE: halved instead of negated. Genjutsu and Shadow Possession ignore it.
- Sharingan users see through **Log** Substitution.
- Types: Log (15% Chakra), Shadow Clone (22%, leaves a Decoy), Explosive Tag (25%, 10% max HP to the attacker), Water Clone (20%, −25% SPD to the attacker).

## Intel (win condition 2)
| Source | Intel |
|---|---|
| Gather Intel | 12 (Sensor/Infiltrator 22). Fails if hit first. |
| Genjutsu lands | 4 (+ jutsu bonus) |
| Revealing an enemy jutsu | 1 |
| KO (interrogation) | 15 |

- New Intel is **unsecured** on the carrier. It secures at the end of the *next* turn. If the carrier is KO'd first, it's lost.
- **Guard** halves enemy Intel gains that turn (a Sensor on guard quarters them) and takes 25% less damage.
- Milestones: **25** reveals one enemy loadout, **50** reveals another and makes enemy Chakra visible, **75** means you choose second and see one enemy order.

## Win conditions
1. All 3 enemy active shinobi KO'd (the support doesn't count).
2. 100 Secured Intel.
3. After turn 20, or if both win on the same turn: highest **Mission Score** (25 per KO + Secured Intel).

## Resolve & transformations
Resolve (0–100) builds from damage taken (0.7 per 1% max HP), ally KOs (+25) and super-effective hits (+8). Transforming spends the threshold, uses the turn (Stance), and can only be done once per battle.

## Statuses
Burn (5%/turn), Poison (6%/turn, stacks with Burn), Paralyze (25% fail), Bind (no action), Genjutsu (50% fail, Release clears), Exhausted (−15% stats), Flinch (loses this turn's action if it hasn't moved yet), Decoy (absorbs the next single-target hit).

Special jutsu: **Reincarnation** (Chiyo, once per battle) brings a knocked-out ally back with 40% HP and costs Chiyo half her current HP. **Selfless Shield** (Haku, +3 priority) redirects the next single-target hit on an ally to Haku this turn. **Body Shedding** / **Izanagi** survive one / two knockouts at 25% / 20% HP.

## Planned next
- Cell Bonds (Team 7, Ino-Shika-Cho, Team Guy, Sand Siblings) and combo jutsu
- More of the roster, more Shippuden forms (Naruto KCM, Sasuke Mangekyō, Itachi, Kisame, Akatsuki)
- Staged transformations (each of the Eight Gates)
- Online play (Socket.IO rooms, like the other projects) and Render deploy
