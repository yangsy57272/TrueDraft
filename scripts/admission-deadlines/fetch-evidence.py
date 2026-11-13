"""Fetch primary publications twice, retain hashes and readable evidence for review.
URL discovery and candidate dates are not verification; each assertion is reviewed separately.
"""
import concurrent.futures, datetime, hashlib, json, pathlib, re, urllib.request
from lxml import html
ROOT=pathlib.Path(__file__).resolve().parents[2]
CACHE=ROOT/'tmp'/'admission-deadlines'; CACHE.mkdir(parents=True,exist_ok=True)
def read(item):
 key,url=item
 result={'id':key,'url':url,'passes':[]}
 for number in range(2):
  try:
   request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (TrueDraft institutional deadline verification)','Accept':'text/html'})
   with urllib.request.urlopen(request,timeout=24) as response:
    body=response.read(2500000); final=response.url
   digest=hashlib.sha256(body).hexdigest()
   doc=html.fromstring(body)
   for e in doc.xpath('//script|//style|//nav|//footer|//header'):e.drop_tree()
   text=re.sub(r'\s+',' ',' '.join(doc.itertext())).strip()
   (CACHE/(key+f'-{number+1}.txt')).write_text(text)
   result['passes'].append({'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z'),'sha256':digest,'finalUrl':final,'length':len(body),'textFile':key+f'-{number+1}.txt'})
  except Exception as error: result['passes'].append({'error':str(error)})
 return result
if __name__=='__main__':
 manifest=json.loads((ROOT/'tmp'/'admission-deadline-sources.json').read_text())
 with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool: result=list(pool.map(read,manifest.items()))
 (CACHE/'audit.json').write_text(json.dumps(result,indent=2))
 for r in result:
  ok=[p for p in r['passes'] if 'sha256'in p]
  if len(ok)==2:
   text=(CACHE/ok[-1]['textFile']).read_text()
   matches=re.findall(r'.{0,75}(?:November|January|December)\s+\d{1,2}.{0,95}',text,re.I)
   print(r['id'], 'OK', ' | '.join(matches[:12]))
  else: print(r['id'],'UNAVAILABLE', [p.get('error') for p in r['passes'] if 'error'in p])
