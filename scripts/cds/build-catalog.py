#!/usr/bin/env python3
"""Build checked source coverage and conservative numeric imports from retained audit evidence."""
import argparse, json, re, sqlite3, hashlib
from lxml import html
from pathlib import Path
from urllib.parse import urlparse
p=argparse.ArgumentParser();p.add_argument('--audit',default='tmp/pdfs/cds-merged-audit.json');p.add_argument('--extracted',default='tmp/pdfs/cds-extracted.json');args=p.parse_args()
audit=json.loads(Path(args.audit).read_text());extracted=json.loads(Path(args.extracted).read_text())
existing={}
for file in Path('data/cds').glob('20??-20??.json'):
 for r in json.loads(file.read_text())['records']:existing[(r['slug'],r['academicYear'])]=r
bydoc={(r['unitid'],r['url']):r for r in extracted['documents']}
def verified_page(s,url):
 if not url:return False
 attempt=next((a for a in s['attempts'] if a.get('url')==url and not a.get('error')),None)
 if not attempt:return False
 raw=Path('tmp/pdfs/cds-audit')/(hashlib.sha256(attempt['requestedUrl'].encode()).hexdigest()+'.bin')
 try:
  document=html.fromstring(raw.read_bytes())
  heading=' '.join(document.xpath('//title//text()|//h1//text()|//h2//text()|//h3//text()'))
  full=r'common[\s_-]*data[\s_-]*set'
  return bool(re.search(full,heading,re.I) or (re.search(full,document.text_content(),re.I) and re.search('common.?data|/cds',url,re.I)))
 except Exception:return False
records={};catalog=[]
for s in audit['schools']:
 docs=[bydoc[(s['unitid'],d['url'])] for d in s['documents'] if (s['unitid'],d['url']) in bydoc]
 good=[d for d in docs if d['status']=='extracted']
 for d in good:
  r=d['record'];key=(r['slug'],r['academicYear'])
  if key in existing:continue
  score=lambda r:len(r['data'])+len(r['data'].get('c7',{}))/3+10*all(k in r['data'] for k in ['applicants','admitted','enrolled'])
  if key not in records or score(r)>score(records[key]):records[key]=r
 confirmed=[d for d in docs if d['status']=='extracted' or d.get('reason') in ['Recent reporting year not established','Fewer than three unambiguous supported fields']]
 confirmed.sort(key=lambda d:(d.get('year') or 0,d['status']=='extracted'),reverse=True)
 entry={k:s[k] for k in ['unitid','slug','name']};entry['checkedAt']=s['checkedAt']
 if confirmed:
  best=confirmed[0];entry.update(status='document_verified',documentUrl=best['url'])
  if verified_page(s,s.get('pageUrl')):entry['pageUrl']=s['pageUrl']
  else:
   original=next((d.get('requestedUrl') for d in s['documents'] if d['url']==best['url']),None)
   if original and '.'.join((urlparse(original).hostname or '').split('.')[-2:])=='.'.join((urlparse(s['website']).hostname or '').split('.')[-2:]):entry['pageUrl']=original
  if best.get('year'):entry['academicYear']=f"{best['year']}-{best['year']+1}"
 elif verified_page(s,s.get('pageUrl')) and not s.get('sharedDomain'):
  entry.update(status='page_verified',pageUrl=s['pageUrl'])
 else:entry['status']='needs_review' if s['documents'] or s.get('pageUrl') else 'fetch_failed' if s['status']=='fetch_failed' else 'not_located'
 entry['attempts']=[{k:a[k] for k in ['requestedUrl','url','checkedAt','sha256','contentType','error','linkedFrom','discoveredVia'] if k in a} for a in s['attempts']]
 catalog.append(entry)
# Include every directory institution so unresearched is visible, never represented as "no CDS".
con=sqlite3.connect('dist/desktop-payload/starter.sqlite');con.row_factory=sqlite3.Row
present={s['slug'] for s in catalog}
for s in con.execute('select unitid,slug,name from school order by name'):
 if s['slug'] not in present:catalog.append({**dict(s),'status':'not_located','attempts':[]})
catalog.sort(key=lambda s:s['name'])
for year in ['2024-2025','2025-2026','2026-2027']:
 rs=sorted([r for (slug,y),r in records.items() if y==year],key=lambda r:r['slug'])
 out=Path(f'data/cds/{year}-researched.json')
 if rs:out.write_text(json.dumps({'description':'Conservative field-level extraction from fetched institutional Common Data Set reports. Missing/ambiguous values omitted. Original imported records are preserved; this adds independently sourced school-years.','extractedOn':audit['checkedOn'],'method':'Automated primary-PDF AcroForm/labeled-row extraction with institution identity, reporting-year, field-range and cross-field checks. Not personally reviewed.','records':rs},indent=2)+'\n')
 elif out.exists():out.unlink()
Path('data/cds/catalog.json').write_text(json.dumps({'checkedOn':audit['checkedOn'],'description':'Checked official CDS entry points and documents. Discovery indexes only supply hints; numeric data comes from the institution-published document. not_located/fetch_failed/needs_review means unknown, never that a school has no CDS. A checked historical report is not a claim that a newer edition does not exist.','schools':catalog},indent=2)+'\n')
summary={'directoryInstitutions':len(catalog),'attemptedInstitutions':sum(bool(s['attempts']) for s in catalog),'checkedSources':sum(s['status'] in ['document_verified','page_verified'] for s in catalog),'checkedDocuments':sum(s['status']=='document_verified' for s in catalog),'addedSchoolYears':len(records),'addedInstitutions':len({r['slug'] for r in records.values()}),'totalStructuredInstitutions':len({r['slug'] for r in list(records.values())+list(existing.values())}),'totalSchoolYears':len(records)+len(existing),'statuses':{k:sum(s['status']==k for s in catalog) for k in sorted({s['status'] for s in catalog})}}
Path('tmp/pdfs/cds-coverage-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
