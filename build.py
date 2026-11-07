from pathlib import Path
import base64,json,re
root=Path(__file__).resolve().parent
repo=root.parents[1]
# Preserve the repository's six static articles in full, outside the homepage.
locale=json.loads((repo/'web-app/i18n/pl.json').read_text())
def find_key(tree,key):
 if isinstance(tree,dict):
  if key in tree:return tree[key]
  for value in tree.values():
   found=find_key(value,key)
   if found is not None:return found
 return None
articles=[find_key(locale,k) for k in ('BusinessTips','CourtDesign','BusinessTips2','BusinessTips3','CourtBuildingCosts','CourtSpaceRequirements')]
source=(repo/'web-app/component/redesign/projectsData.ts').read_text()
projects=[]
for block in re.split(r'\n  \{\n    slug:',source)[1:]:
 p={}
 for key in ('name','city','model','shortDesc','about'):
  p[key]=re.search(r'\b'+key+r': "((?:[^"\\]|\\.)*)"',block).group(1)
 p['courts']=int(re.search(r'courts: (\d+)',block).group(1))
 projects.append(p)
source=(repo/'web-app/component/redesign/pages/Testimonials.tsx').read_text().split('const FILTERS')[0]
opinions=[]
for block in re.split(r'\n  \{\n    id:',source)[1:]:
 opinions.append({k:re.search(r'\b'+k+r': "((?:[^"\\]|\\.)*)"',block).group(1) for k in ('quote','role','company')})
data='\n'.join('const '+k+' = '+json.dumps(v,ensure_ascii=False).replace('</','<\\/')+';' for k,v in [('ARTICLES',articles),('PROJECTS',projects),('OPINIONS',opinions)])
(root/'content.js').write_text(data)
css=(root/'styles.css').read_text()
js=(root/'app.js').read_text()
shell=(root/'shell.html').read_text()
# three.js r128 (from Olek's concept) and the court configurator are inlined like the rest.
three=(root/'vendor'/'three.min.js').read_text(); court3d=(root/'court3d.js').read_text()
html=shell.replace('/* STYLES */',css).replace('/* THREE */',three).replace('/* COURT3D */',court3d).replace('/* DATA */',data).replace('/* APP */',js)
# A single portable file. The images are embedded so it works from file:// offline.
mimes={'.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp4':'video/mp4'}
for name,mime in [('logo-mark.png','image/png'),('logo-text.png','image/png'),('logo.png','image/png'),('hero-background.jpg','image/jpeg'),('courts.webp','image/webp')]:
 uri='data:'+mime+';base64,'+base64.b64encode((root/'assets'/name).read_bytes()).decode()
 html=html.replace('assets/'+name,uri)
# Material from the promo film (app screens, 3D glass icons, short muted loops) goes in as a map read by asset() in app.js.
film={'film/'+p.name:'data:'+mimes[p.suffix]+';base64,'+base64.b64encode(p.read_bytes()).decode() for p in sorted((root/'assets'/'film').iterdir()) if p.suffix in mimes}
# Real panel screens (read-only local preview, sample data), shown small in the Panel klubu section.
film.update({'panel/'+p.name:'data:'+mimes[p.suffix]+';base64,'+base64.b64encode(p.read_bytes()).decode() for p in sorted((root/'assets'/'panel').iterdir()) if p.name.startswith('ekran-')})
film.update({'zespol/'+p.name:'data:'+mimes[p.suffix]+';base64,'+base64.b64encode(p.read_bytes()).decode() for p in sorted((root/'assets'/'zespol').iterdir()) if p.suffix in mimes})
film.update({'korty/'+p.name:'data:'+mimes[p.suffix]+';base64,'+base64.b64encode(p.read_bytes()).decode() for p in sorted((root/'assets'/'korty').iterdir()) if p.suffix in mimes})
html=html.replace('<script>'+data,'<script>'+data+'\nconst ASSETS = '+json.dumps(film)+';',1)
(root/'index.html').write_text(html)
print(f'Built {root / "index.html"}: {len(html):,} characters; {len(articles)} full articles, {len(projects)} projects, {len(opinions)} source testimonials, {len(film)} film assets.')
