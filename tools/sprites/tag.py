import re,json,collections
p='/home/claude/shinobi_showdown/public/anim.js'
src=open(p).read()
lines=src.split('\n')
top=None; mode=None; sub=None
scopes=[]
for l in lines:
    if re.match(r'^(export const ANIMS = \{|Object\.assign\(ANIMS, \{)',l): mode='anims'; top=None; sub=None
    elif re.match(r'^const ART\d* = \{',l): mode='art'; top='art'; sub=None
    else:
        m=re.match(r'^(?:export )?(?:async )?(?:function|const|let) (\w+)',l)
        if m: mode='top'; top=m.group(1); sub=None
        elif mode=='anims':
            m=re.match(r'^  ([a-z0-9_]+): \{',l)
            if m: sub=m.group(1)
        elif mode=='art':
            m=re.match(r'^  (\w+): ',l)
            if m: sub='art-'+m.group(1)
    scopes.append(sub if mode in('anims','art') and sub else top)
# find tags
tagre=re.compile(r'<(svg|div)\b')
offs=[]; pos=0
for i,l in enumerate(lines):
    for m in tagre.finditer(l):
        tag=m.group(1)
        # opening tag text up to first '>' (template expressions may contain '>' rarely)
        rest=l[m.start():]
        head=rest[:rest.find('>')+1] if '>' in rest else rest
        if tag=='div' and not re.search(r'background|border|box-shadow|clip-path',head): continue
        offs.append((i,m.end(),scopes[i] or 'misc'))
cnt=collections.Counter(s for _,_,s in offs)
seen=collections.Counter(); names=[]
for i,col,s in offs:
    seen[s]+=1
    names.append((i,col,s if cnt[s]==1 else f'{s}-{seen[s]}'))
# apply from the end
for i,col,name in sorted(names,key=lambda x:(x[0],x[1]),reverse=True):
    lines[i]=lines[i][:col]+f' data-sp="{name}"'+lines[i][col:]
open(p,'w').write('\n'.join(lines))
print(len(names),'tagged;',len(cnt),'scopes')
json.dump(sorted(set(n for _,_,n in names)),open('/tmp/spr/names.json','w'),indent=0)
json.dump([n for _,_,n in sorted(names)],open('/tmp/spr/new_order.json','w'))
print([n for _,_,n in names][:15])
print([s for s in cnt if s in ('misc',None)])
