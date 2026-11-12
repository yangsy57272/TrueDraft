#!/usr/bin/env python3
"""Audit public institutional CDS sources; only collect facts from fetched primary documents.

Maintainer tool (not an app runtime dependency): pip install lxml pypdf.
Candidates are discovery hints, not verification. A failed request is never evidence of no CDS.
No third-party numbers, guessed fields, or AI extraction are used.
"""
import argparse, concurrent.futures, hashlib, json, re, threading, time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from lxml import html

AGENT = 'TrueDraft/0.1 CDS public-source audit (https://github.com/yangsy57272/TrueDraft)'
CDS = re.compile(r'common[\s_+%20-]*data[\s_+%20-]*set|\bCDS\b|[/_-]cds[/_.-]', re.I)
BLOCKED = re.compile(r'just a moment|access denied|verify you are human|captcha|request rejected', re.I)
LIMIT = 16 * 1024 * 1024
locks = {}; mutex = threading.Lock()
def domain(url):
    h = urlparse(url).hostname or ''
    return '.'.join(h.lower().split('.')[-2:])
def stamp(): return datetime.now(timezone.utc).isoformat(timespec='seconds')
def year_hint(text):
    years=[]
    for m in re.finditer(r'20(2[0-6])\s*[-–_/ ]\s*(?:20)?(2[0-7])',text):
        a,b=map(int,m.groups())
        if b==a+1:years.append(2000+a)
    return max(years,default=0) or max([int(x) for x in re.findall(r'(?<!\d)(202[0-6])(?!\d)',text)],default=0)
def fetch(url,cache):
    if urlparse(url).scheme not in ('https','http'):raise ValueError('Unsupported URL scheme')
    key=hashlib.sha256(url.encode()).hexdigest(); meta=cache/(key+'.json'); file=cache/(key+'.bin')
    if meta.exists():
        saved=json.loads(meta.read_text())
        if saved.get('error'):raise ValueError(saved['error'])
        return saved,file.read_bytes()
    with mutex: sem=locks.setdefault(domain(url),threading.Semaphore(2))
    with sem:
        try:
            req=Request(url,headers={'User-Agent':AGENT,'Accept':'text/html,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;q=0.9,*/*;q=0.5'})
            started=time.monotonic()
            with urlopen(req,timeout=12) as response:
                pieces=[];length=0
                while True:
                    if time.monotonic()-started>45:raise ValueError('Download exceeded bounded audit time; status remains unknown')
                    chunk=response.read1(65536)
                    if not chunk:break
                    pieces.append(chunk);length+=len(chunk)
                    if length>LIMIT:raise ValueError('Document exceeds audit download limit')
                body=b''.join(pieces)
                saved={'requestedUrl':url,'url':response.url,'contentType':response.headers.get('Content-Type',''),'checkedAt':stamp(),'sha256':hashlib.sha256(body).hexdigest(),'bytes':len(body)}
            file.write_bytes(body);meta.write_text(json.dumps(saved));return saved,body
        except Exception as e:
            message=f'HTTP {e.code}' if isinstance(e,HTTPError) else type(e).__name__+': '+str(e)[:150]
            meta.write_text(json.dumps({'requestedUrl':url,'checkedAt':stamp(),'error':message}))
            raise ValueError(message)
def links(body,base):
    doc=html.fromstring(body)
    for n in doc.xpath('//script|//style|//noscript'):n.drop_tree()
    title=' '.join(doc.xpath('//title/text()'))
    text=' '.join(doc.text_content().split())
    found=[]
    for a in doc.xpath('//a[@href]'):
        href=urljoin(base,a.get('href')); label=' '.join(a.text_content().split())
        if urlparse(href).scheme not in ('https','http'):continue
        research=bool(re.search(r'institutional[- /]*(?:research|effectiveness)|consumer[- /]*information|facts[- /]*(?:and[- /]*)?figures|student[- /]*consumer',label+' '+href,re.I))
        # Dedicated CDS paths or year-labelled files linked by an actual CDS page.
        ext=bool(re.search(r'\.(?:pdf|xlsx?|docx?)(?:\?|$)',href,re.I))
        if CDS.search(label+' '+href) or research or (CDS.search(title+' '+text[:3500]) and ext and year_hint(label+' '+href)):
            score=(0 if research and not CDS.search(label+' '+href) else (year_hint(label) or year_hint(href))*10) + (25 if re.search(r'(?:^|[/_-])(?:c|c1|c_admission|c_first)(?:[_.-]|$)',href,re.I) else 0) + (8 if ext else 0) + (4 if CDS.search(label+' '+href) else 0)
            found.append((score,href,label))
    return title,text,sorted(found,reverse=True)
def audit(s,cache):
    result={**({'sharedDomain':True,'identityTokens':s.get('identityTokens',[])} if s.get('sharedDomain') else {}),'unitid':s['unitid'],'slug':s['slug'],'name':s['name'],'website':s['website'],'checkedAt':stamp(),'status':'unavailable','attempts':[],'documents':[]}
    queue=[(u['url'],None,u['discoveredVia']) for u in s['urls'][:3]]; visited=set();failed=0;pages=0
    # At most three failed fetches per institution; a new run reuses cached outcomes.
    while queue and len(visited)<5 and failed<3:
        url,referrer,via=queue.pop(0)
        if url in visited:continue
        visited.add(url)
        if not referrer and domain(url)!=domain(s['website']):continue
        try:
            meta,body=fetch(url,cache)
            result['attempts'].append({**meta,'discoveredVia':via,**({'linkedFrom':referrer} if referrer else {})})
            ispdf=body.lstrip().startswith(b'%PDF-')
            isxlsx=body.startswith(b'PK\x03\x04') and ('sheet' in meta['contentType'] or '.xlsx' in url.lower())
            if ispdf or isxlsx:
                # Still needs identity/year/value verification in the extraction stage.
                result['documents'].append({**meta,'format':'pdf' if ispdf else 'xlsx','cacheFile':hashlib.sha256(url.encode()).hexdigest()+'.bin',**({'linkedFrom':referrer} if referrer else {})})
                if len(result['documents'])>=1:break
                continue
            if 'html' not in meta['contentType'].lower() and b'<html' not in body[:1000].lower():continue
            title,text,found=links(body,meta['url'])
            if BLOCKED.search(title+' '+text[:600]):raise ValueError('Access challenge; no bypass attempted')
            primary=domain(meta['url'])==domain(s['website'])
            signal=CDS.search(title+' '+text)
            if primary and signal:
                result['status']='page_available';result.setdefault('pageUrl',meta['url']);result.setdefault('pageTitle',title)
            if primary:
                pages+=1
                # Prioritize newest file; general institutional pages must link to a dedicated CDS page.
                eligible=[(u,meta['url'],via) for _,u,label in found if u not in visited and (domain(u)==domain(s['website']) or signal) and not re.search(r'\.(?:jpg|png|css|js)(?:\?|$)',u,re.I)]
                queue=eligible[:3]+queue
        except Exception as e:
            failed+=1
            result['attempts'].append({'requestedUrl':url,'checkedAt':stamp(),'error':str(e)[:180]})
    if result['documents']:result['status']='document_downloaded'
    if result['status']=='unavailable' and result['attempts'] and all('error' in a for a in result['attempts']):result['status']='fetch_failed'
    return result

def main():
    p=argparse.ArgumentParser();p.add_argument('--candidates',default='data/cds/research/candidates.json');p.add_argument('--cache',default='tmp/pdfs/cds-audit');p.add_argument('--output',default='tmp/pdfs/cds-audit-results.json');p.add_argument('--workers',type=int,default=16);args=p.parse_args()
    cache=Path(args.cache);cache.mkdir(parents=True,exist_ok=True);dest=Path(args.output);dest.parent.mkdir(parents=True,exist_ok=True)
    schools=json.loads(Path(args.candidates).read_text());previous={}
    if dest.exists():previous={x['unitid']:x for x in json.loads(dest.read_text()).get('schools',[])}
    priority={s.get('unitid') for s in json.loads(Path('data/supplements/2026-2027.json').read_text())['schools']}
    schools.sort(key=lambda s:(s['unitid'] not in priority,s['name']))
    results=list(previous.values()); todo=[s for s in schools if s['unitid'] not in previous]
    def save():dest.write_text(json.dumps({'checkedOn':stamp()[:10],'method':'Primary-source HTTP audit; discovery hints are not verification. Failed/blocked/unlocated is unknown, not absence. Numeric extraction is a separate stage.','schools':sorted(results,key=lambda x:x['name'])},indent=2)+'\n')
    with concurrent.futures.ThreadPoolExecutor(args.workers) as pool:
        futures={pool.submit(audit,s,cache):s for s in todo}
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())
            if len(results)%10==0 or len(results)==len(schools):
                save();counts={k:sum(r['status']==k for r in results) for k in set(r['status'] for r in results)}
                print(json.dumps({'done':len(results),'total':len(schools),'statuses':counts}),flush=True)
    save()
if __name__=='__main__':main()
