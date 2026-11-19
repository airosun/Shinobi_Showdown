import json
from openpyxl import Workbook
from openpyxl.styles import PatternFill, Alignment
from openpyxl.utils import get_column_letter
import batch2 as B

g = json.load(open('/tmp/gen.json'))
J = {k: dict(v, status='Existing') for k, v in g['J'].items()}
for jid, j in B.NEW_JUTSU.items():
    J[jid] = dict(j, id=jid, status='New')
NAT = {None: '—', 'fire': 'Fire', 'wind': 'Wind', 'lightning': 'Lightning', 'earth': 'Earth', 'water': 'Water', 'yin': 'Yin', 'yang': 'Yang',
       'wood': 'Wood (Earth+Water)', 'magnet': 'Magnet (Wind+Earth)', 'ice': 'Ice (Wind+Water)'}
SUBS = {'log': 'Log', 'shadowClone': 'Shadow Clone', 'explosiveTag': 'Explosive Tag', 'waterClone': 'Water Clone'}
PRI = lambda p: f'+{p}' if p > 0 else str(p)
TGT = {'enemy': '1 enemy', 'allEnemies': 'All enemies', 'self': 'Self', 'ally': '1 ally', 'allAllies': 'All allies'}
def short(s): return s['character'] if s['form'] == '—' else f"{s['character'].split(' ')[0]} ({s['form']})"
users = {}
for s in B.S:
    for jid in s['catalogue']: users.setdefault(jid, []).append(short(s))

wb = Workbook(); ws = wb.active; ws.title = 'B2 Shinobi'
ws.append(['Character', 'Form', 'Cost', 'Status', 'Era', 'Primary nature', 'Secondary nature', 'Roles', 'HP', 'TAI', 'NIN', 'DEF', 'SPD', 'CHK', 'BST', 'BST (no CHK)',
           'Trait', 'Trait effect', 'Transformation', 'Resolve', 'Transformation effect', 'Support passive', 'Support effect', 'Stage values (3 / 2 / 1 standing)',
           'Substitutions', 'Jutsu catalogue (pick 4)', 'Notes', 'Requested change', 'id'])
for i, s in enumerate(B.S, start=2):
    t = s['trait']; tf = s['transformation']; a = s['support']
    notes = []
    if len(t) > 2 and t[2]: notes.append('Trait needs new engine code')
    if a.get('new'): notes.append('Support passive needs new engine code')
    newj = [J[j]['name'] for j in s['catalogue'] if J[j].get('NEW')]
    if newj: notes.append('New jutsu mechanic: ' + ', '.join(newj))
    if any(any(e['type'] == 'poison' for e in J[j]['effects']) for j in s['catalogue']): notes.append('Uses the new Poison status (6% max HP per turn)')
    hp, tai, nin, df, spd, chk = s['stats']
    ws.append([s['character'], s['form'], s['cost'], s['status'], s['era'], NAT[s['primary']] if s['primary'] else 'None (non-elemental)', NAT[s['secondary']],
               ', '.join(s['roles']), hp, tai, nin, df, spd, chk, f'=SUM(I{i}:N{i})', f'=SUM(I{i}:M{i})', t[0], t[1],
               tf['name'] if tf else '—', tf['resolve'] if tf else None, f"{tf['turns']} turns. {tf['desc']}" if tf else '—',
               a['name'], a['desc'].replace('{v1}', 'X').replace('{v2}', 'Y').replace('{v}', 'X'), a['values'],
               ', '.join(SUBS[x] for x in s['subs']), ', '.join(J[j]['name'] for j in s['catalogue']), '. '.join(notes) or None, None, s['id']])
wj = wb.create_sheet('B2 Jutsu')
wj.append(['Jutsu', 'Used by', 'Category', 'Nature', 'Power', 'Chakra', 'Priority', 'Target', 'Effect', 'Flags', 'Status', 'Requested change', 'id'])
order = []
for s in B.S:
    for jid in s['catalogue']:
        if jid not in order: order.append(jid)
for jid in order:
    j = J[jid]; f = []
    if j.get('charged'): f.append('Charged (2 turns)')
    if j.get('requiresTransform'): f.append('Transformed only')
    if j.get('ignoresSub'): f.append('Ignores Substitution')
    if j.get('NEW'): f.append('Needs new engine code')
    wj.append([j['name'], ', '.join(users[jid]), j['category'].capitalize(), NAT.get(j['nature'], j['nature']), j['power'] or None, j['cost'], PRI(j['priority']),
               TGT[j['target']], j['desc'], ', '.join(f) or None, j['status'], None, jid])
fill = PatternFill('solid', fgColor='F3F3F3')
W = {'B2 Shinobi': [22, 18, 7, 10, 10, 18, 16, 24, 6, 6, 6, 6, 6, 6, 7, 12, 22, 44, 28, 8, 50, 26, 44, 26, 26, 60, 44, 30, 16],
     'B2 Jutsu': [34, 34, 12, 18, 8, 8, 8, 12, 60, 34, 10, 30, 22]}
for w in (ws, wj):
    for c in w[1]: c.fill = fill
    w.freeze_panes = 'C2' if w is ws else 'B2'
    for k, wd in enumerate(W[w.title], 1): w.column_dimensions[get_column_letter(k)].width = wd
    for row in w.iter_rows(min_row=2):
        for c in row: c.alignment = Alignment(wrap_text=True, vertical='top')
wb.save('/home/claude/work/shinobi_kits_batch2.xlsx')
print(ws.max_row - 1, 'shinobi', wj.max_row - 1, 'jutsu')
