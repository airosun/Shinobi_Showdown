import json, re
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
import konoha as K

existing = json.load(open('/tmp/existing_jutsu.json'))
J = {}
for jid, j in existing.items():
    J[jid] = dict(j, status='Existing')
for jid, j in K.NEW_JUTSU.items():
    J[jid] = dict(j, id=jid, status='New')

NAT = {None: '—', 'fire': 'Fire', 'wind': 'Wind', 'lightning': 'Lightning', 'earth': 'Earth', 'water': 'Water', 'yin': 'Yin', 'yang': 'Yang', 'wood': 'Wood (Earth+Water)', 'magnet': 'Magnet (Wind+Earth)'}
SUBS = {'log': 'Log', 'shadowClone': 'Shadow Clone', 'explosiveTag': 'Explosive Tag', 'waterClone': 'Water Clone'}
PRI = lambda p: f'+{p}' if p > 0 else str(p)
TGT = {'enemy': '1 enemy', 'allEnemies': 'All enemies', 'self': 'Self', 'ally': '1 ally', 'allAllies': 'All allies'}

users = {}
for s in K.S:
    for jid in s['catalogue']:
        users.setdefault(jid, []).append(f"{s['character'].split(' (')[0].split(' ')[0]} ({s['form']})" if s['form'] != '—' else s['character'].split(' (')[0])

wb = Workbook()
ws = wb.active
ws.title = 'Shinobi'
hdr = ['Character', 'Form', 'Cost', 'Status', 'Era', 'Primary nature', 'Secondary nature', 'Roles', 'HP', 'TAI', 'NIN', 'DEF', 'SPD', 'CHK',
       'Trait', 'Trait effect', 'Transformation', 'Resolve', 'Transformation effect', 'Support passive', 'Support effect', 'Stage values (3 / 2 / 1 standing)',
       'Substitutions', 'Jutsu catalogue (pick 4)', 'Notes', 'Requested change', 'id']
ws.append(hdr)
for s in K.S:
    t = s['trait']; tf = s['transformation']; a = s['support']
    notes = []
    if len(t) > 2 and t[2]: notes.append('Trait needs new engine code')
    if a.get('new'): notes.append('Support passive needs new engine code')
    newj = [J[j]['name'] for j in s['catalogue'] if J[j].get('NEW')]
    if newj: notes.append('New jutsu mechanic: ' + ', '.join(newj))
    if s['notes']: notes.insert(0, s['notes'])
    desc = a['desc'].replace('{v1}', 'X').replace('{v2}', 'Y').replace('{v}', 'X')
    hp, tai, nin, df, spd, chk = s['stats']
    ws.append([s['character'], s['form'], s['cost'], 'Changed' if s['notes'].startswith('CHANGED') else s['status'], s['era'],
               NAT[s['primary']] if s['primary'] else 'None (non-elemental)', NAT[s['secondary']] if s['secondary'] else '—', ', '.join(s['roles']),
               hp, tai, nin, df, spd, chk, t[0], t[1], tf['name'] if tf else '—', tf['resolve'] if tf else None, (f"{tf['turns']} turns. " + tf['desc']) if tf else '—',
               a['name'], desc, a['values'], ', '.join(SUBS[x] for x in s['subs']),
               ', '.join(J[j]['name'] for j in s['catalogue']), '. '.join(notes), None, s['id']])

wj = wb.create_sheet('Jutsu')
wj.append(['Jutsu', 'Used by', 'Category', 'Nature', 'Power', 'Chakra', 'Priority', 'Target', 'Effect', 'Flags', 'Status', 'Requested change', 'id'])
order = []
for s in K.S:
    for jid in s['catalogue']:
        if jid not in order: order.append(jid)
for jid in order:
    j = J[jid]
    flags = []
    if j.get('charged'): flags.append('Charged (2 turns)')
    if j.get('requiresTransform'): flags.append('Transformed only')
    if j.get('ignoresSub'): flags.append('Ignores Substitution')
    if j.get('NEW'): flags.append('Needs new engine code')
    wj.append([j['name'], ', '.join(users[jid]), j['category'].capitalize(), NAT.get(j['nature'], j['nature'] or '—'), j['power'] or None, j['cost'], PRI(j['priority']),
               TGT[j['target']], j['desc'], ', '.join(flags), j['status'], None, jid])

wl = wb.create_sheet('Read me')
rows = [
  ['How to use this sheet'],
  ['Mark anything you want changed in the "Requested change" column (Shinobi or Jutsu tab) and hand it back. Leave it blank to accept the draft.'],
  ['Status: Existing = already in the game; New = drafted for this batch; Changed = existing entry I propose to change.'],
  ['Cost: team cap is 30 for 3 actives + 1 support. Part I genin ~3-6, Shippuden ~6-8, top forms 9-10.'],
  ['Stats: base values (HP ×3 in battle, Chakra = CHK ×2). ~60 low, ~90 average, ~110 high, 130+ elite.'],
  ['Support passive: the support never fights. X/Y in the effect are the stage values: stage 1 with 3 allies standing, stage 2 with 2, stage 3 with 1.'],
  ['Natures: Hyuga, Tenten, Kiba, Shino, Lee and Guy are drafted as non-elemental (their kits are clan / weapon / taijutsu based). Change if you want natures for them.'],
  ['"Needs new engine code" notes mark mechanics the current engine doesn\'t have yet (e.g. Palm Rotation, new support passive types). I add those when building the batch.'],
  ['Kakashi\'s Shippuden form and Kakashi Part I keep Copy Ninja; Sakura\'s Strength of a Hundred Seal moves to her Great War form.'],
]
for r in rows: wl.append(r)

head_fill = PatternFill('solid', fgColor='F3F3F3')
for w in (ws, wj):
    for c in w[1]:
        c.fill = head_fill
    w.freeze_panes = 'C2' if w is ws else 'B2'
widths = {'Shinobi': [22, 22, 7, 10, 10, 16, 16, 24, 6, 6, 6, 6, 6, 6, 22, 44, 28, 8, 50, 26, 44, 26, 26, 60, 44, 30, 16],
          'Jutsu': [34, 34, 12, 18, 8, 8, 8, 12, 60, 34, 10, 30, 22]}
for name, ws_ in (('Shinobi', ws), ('Jutsu', wj)):
    for i, wdt in enumerate(widths[name], 1):
        ws_.column_dimensions[get_column_letter(i)].width = wdt
    for row in ws_.iter_rows(min_row=2):
        for c in row:
            c.alignment = Alignment(wrap_text=True, vertical='top')
wl.column_dimensions['A'].width = 140
wl['A1'].font = Font(bold=True, size=13)
wb.save('/home/claude/work/shinobi_kits_konoha.xlsx')
print(ws.max_row - 1, 'shinobi,', wj.max_row - 1, 'jutsu')
