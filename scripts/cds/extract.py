#!/usr/bin/env python3
"""Conservative primary-PDF CDS extraction. Omit uncertain fields; preserve exact evidence.
Requires pypdf. Run after discover.py. No model calls or third-party numerical data.
"""
import argparse, concurrent.futures, hashlib, json, logging, re
from collections import Counter
from pathlib import Path
from pypdf import PdfReader
from field_rules import primary_form_c1
logging.getLogger('pypdf').setLevel(logging.ERROR)

# Published CDS fillable-template identifiers. Only exact identifiers are mapped.
FORM = {
 'undergradTotal':['EN_TOT_UG_N'], 'intlUndergrads':['EN_TOT_NONRES_ALIEN_TOT_N'],
 'retentionRate':['RETENTION_FRSH_P'],
 # Overall C1 totals are handled separately; identically named residency totals are excluded.
 'waitlistOffered':['AP_WAIT_N'], 'waitlistAccepted':['AP_WAIT_ACCEPT_N'], 'waitlistAdmitted':['AP_ADMT_WAIT_N'],
 'satSubmitPct':['SUBMIT_SAT1_P'], 'actSubmitPct':['SUBMIT_ACT_P'],
 'satComposite25':['SAT1_COMP_25TH_P'], 'satComposite50':['SAT1_COMP_50TH_P'], 'satComposite75':['SAT1_COMP_75TH_P'],
 'satEbrw25':['SAT1_VERB_25TH_P'], 'satEbrw75':['SAT1_VERB_75TH_P'],
 'satMath25':['SAT1_MATH_25TH_P'], 'satMath75':['SAT1_MATH_75TH_P'],
 'actComposite25':['ACT_COMP_25TH_P'], 'actComposite50':['ACT_COMP_50TH_P'], 'actComposite75':['ACT_COMP_75TH_P'],
 'edApplicants':['AP_RECD_EDEC_N'], 'edAdmitted':['AP_ADMT_EDEC_N'],
 'tuition':['TUIT_OVERALL_1ST_FT_D'], 'studentFacultyRatio':['UG_RATIO'],
}
BOUNDS={ 'undergradTotal':(1,150000),'intlUndergrads':(0,100000),'applicants':(1,500000),'admitted':(0,500000),'enrolled':(0,100000),
 'waitlistOffered':(0,100000),'waitlistAccepted':(0,100000),'waitlistAdmitted':(0,100000),'edApplicants':(0,100000),'edAdmitted':(0,100000),
 'satSubmitPct':(0,100),'actSubmitPct':(0,100),'retentionRate':(0,100),'tuition':(0,150000),'studentFacultyRatio':(1,100),
 **{k:((400,1600) if 'Composite' in k else (200,800)) for k in ['satComposite25','satComposite50','satComposite75','satMath25','satMath75','satEbrw25','satEbrw75']},
 **{k:(1,36) for k in ['actComposite25','actComposite50','actComposite75']}}
PERCENT={'satSubmitPct','actSubmitPct','retentionRate'}
DECIMAL=PERCENT|{'studentFacultyRatio'}
def number(v):
 s=str(v).strip().replace(',','').replace('$','').replace('%','')
 if not re.fullmatch(r'\d+(?:\.\d+)?',s):return None
 return float(s) if '.' in s else int(s)
def identity(text,name):
 words=[w for w in re.findall(r'[a-z]+',name.lower()) if w not in {'university','college','of','the','at','and','in','a','main','campus'}]
 hay=re.sub(r'[^a-z]+',' ',text.lower())
 # A distinct institutional name must appear, not merely "University".
 return bool(words) and sum(w in hay.split() for w in words)>=min(2,len(words))
def get_year(pages,url):
 c1=[]
 for _,text in pages:
  if re.search(r'C\s*1\b',text) and re.search(r'first.?time|first.?year',text,re.I):
   for m in re.finditer(r'enrolled[\s\S]{0,130}?in\s+Fall\s+(20\d\d)',text,re.I):c1.append(int(m.group(1)))
 if c1 and len(set(c1))==1:return c1[0],'C1 explicitly states Fall '+str(c1[0])
 headers=[]
 for _,text in pages:
  headers.extend(int(m.group(1)) for m in re.finditer(r'Common\s+Data\s+Set\s+(20\d\d)\s*[-–/]\s*(?:20)?\s*(\d\d)',text,re.I) if int(m.group(2))==(int(m.group(1))+1)%100)
 if headers:
  n=Counter(headers).most_common()
  if len(n)==1 or n[0][1]>n[1][1]:return n[0][0],'Repeated CDS document header'
 return None,None

def parse_pdf(job):
 school,doc,cache=job
 result={'unitid':school['unitid'],'url':doc['url'],'status':'needs_review'}
 try:
  reader=PdfReader(Path(cache)/doc['cacheFile'])
  fields=reader.get_fields() or {}
  # Look at at most 60 pages of a published report. Very large unrelated PDFs are not CDS evidence.
  if len(reader.pages)>100:return {**result,'reason':'Document too long for this CDS parser'}
  pages=[]
  for i,page in enumerate(reader.pages[:60]):
   text=page.extract_text(extraction_mode='layout') or ''
   pages.append((i+1,text))
  formname=' '.join(str(fields[k].get('/V','')) for k in ['NAME','INST_NAME','INSTITUTION_NAME'] if k in fields)
  first=' '.join(t for _,t in (pages[:3] if school.get('sharedDomain') else pages))+' '+formname
  if not identity(first,school['name']) or (school.get('sharedDomain') and not any(w in re.findall(r'[a-z]+',first.lower()) for w in school.get('identityTokens',[]))):return {**result,'reason':'Institution identity not established from document heading/form fields'}
  if not any(re.search(r'Common\s+Data\s+Set',t,re.I) for _,t in pages):return {**result,'reason':'CDS document title not established'}
  year,year_evidence=get_year(pages,doc['url'])
  if year is None:
   # A complete academic-year pair in the institution's own filename is edition evidence,
   # not the web upload directory's year. Never override a conflicting document cohort/header.
   from urllib.parse import urlparse, unquote
   name=unquote(urlparse(doc['url']).path.rsplit('/',1)[-1])
   m=re.search(r'(20\d\d)[-_](?:20)?(\d\d)',name)
   if m and int(m.group(2))==(int(m.group(1))+1)%100:
    year=int(m.group(1));year_evidence='Academic-year pair in institutional report filename: '+name
  if year not in (2024,2025,2026):return {**result,'reason':'Recent reporting year not established','year':year}
  data={};evidence={};sourcepages={}
  # Map canonical /T names to the page carrying their widget; values come from the canonical field.
  fieldpages={}
  for i,p in enumerate(reader.pages):
   for ref in p.get('/Annots',[]):
    a=ref.get_object(); parent=a.get('/Parent'); parent=parent.get_object() if parent else {}
    name=a.get('/T') or parent.get('/T')
    if name:fieldpages[str(name)]=i+1
  def put(key,value,line,page):
   if key in data or value is None:return
   low,high=BOUNDS[key]
   if not low<=value<=high:return
   if key not in DECIMAL and value!=int(value):return
   value=round(value,2) if key in DECIMAL else int(value)
   data[key]=value;evidence[key]=line[:1000];sourcepages[key]=page
  for key,names in FORM.items():
   for name in names:
    if name in fields and fields[name].get('/V') is not None:
     raw=fields[name]['/V'];put(key,number(raw),f'PDF field {name} = {raw}',fieldpages.get(name))
  for key,item in primary_form_c1(fields).items():
   pn=fieldpages.get(item['fields'][0]);put(key,item['value'],item['evidence'],pn)
  academic=['rigor','class_rank','gpa','test_scores','essay','recommendations']
  nonacademic=['interview','extracurriculars','talent','character','first_generation','alumni_relation','geographical_residence','state_residency','religious_affiliation','racial_ethnic_status','volunteer_work','work_experience','demonstrated_interest']
  levels={'/VI':'very_important','/I':'important','/C':'considered','/NC':'not_considered'}
  c7={}; c7lines=[]; c7pages=set()
  for prefix,factors in [('Q111_',academic),('Q112_',nonacademic)]:
   for index,factor in enumerate(factors,1):
    field=prefix+str(index); value=str(fields.get(field,{}).get('/V',''))
    if value in levels:
     c7[factor]=levels[value];c7lines.append(f'{field} = {value}')
     if field in fieldpages:c7pages.add(fieldpages[field])
  if len(c7)>=17:
   data['c7']=c7;evidence['c7']='; '.join(c7lines);sourcepages['c7']=min(c7pages) if c7pages else None
  for key,field in [('earlyDecision','AD_EDEC'),('earlyAction','AD_EACT')]:
   v=str(fields.get(field,{}).get('/V',''))
   if v in ('/Y','/N'):
    data[key]=v=='/Y';evidence[key]=f'PDF field {field} = {v}';sourcepages[key]=fieldpages.get(field)
  for pn,text in pages:
   # Limit C1 text to its own section, never transfer admissions or residency sub-tables.
   if re.search(r'C\s*1\b',text) and re.search(r'FIRST.?TIME|FIRST.?YEAR',text,re.I):
    section=re.split(r'\bC\s*2\b',text)[0]
    section=re.split(r'If available, please provide residency|residency breakdown',section,flags=re.I)[0]
    totals={};gender={}
    for raw in section.splitlines():
     line=' '.join(raw.split())
     match=re.match(r'(.*?)(\d[\d,]*(?:\s+\d[\d,]*)*)\s*$',line)
     if not match:continue
     label,values=match.groups();nums=[int(x.replace(',','')) for x in values.split()]
     if len(nums)!=1:
      # Only an explicitly labelled last Total column may be read, never a residency column.
      header_total=any(re.search(r'\b(?:men|male).*\b(?:women|female).*\btotal\s*$',ln,re.I) for ln in section.splitlines())
      if header_total and len(nums) in (3,4,5):nums=[nums[-1]]
      else:continue
     key='applicants' if re.search(r'who applied|student applicants\b',label,re.I) else 'admitted' if re.search(r'who were admitted|student admits\b',label,re.I) else 'enrolled' if re.search(r'who enrolled|student enrollees\b',label,re.I) else None
     if not key or not re.search(r'first.?time|first.?year',label,re.I):continue
     if re.search(r'full.?time|part.?time|by status',label,re.I):continue
     sex='women' if re.search(r'\bwomen\b|\bfemales\b',label,re.I) else 'men' if re.search(r'\bmen\b|\bmales\b',label,re.I) else 'other' if re.search(r'another gender|non.?binary|unknown (?:gender|sex)',label,re.I) else None
     if sex:gender.setdefault(key,{})[sex]=(nums[0],raw,pn)
     elif re.search(r'\btotal\b',label,re.I):totals[key]=(nums[0],raw,pn)
    for key,(value,line,p) in totals.items():put(key,value,line.strip(),p)
    # Older two-sex reports can be summed only when no extra gender rows occur in that C1 table.
    for key,groups in gender.items():
     if key not in data and set(groups)=={'men','women'} and not re.search(r'another gender|non.?binary|unknown (?:gender|sex)',section,re.I):
      put(key,sum(v[0] for v in groups.values()),' + '.join(v[1].strip() for v in groups.values()),pn)
   for raw in text.splitlines():
    line=' '.join(raw.split())
    specs=[(r'SAT\s+Composite', ['satComposite25','satComposite50','satComposite75']),
      (r'SAT\s+Math',['satMath25',None,'satMath75']),
      (r'SAT\s+(?:Evidence[- ]Based Reading and Writing|Evidence-Based Reading|Evidence Based Reading|Critical Reading|EBRW|ERW)',['satEbrw25',None,'satEbrw75']),
      (r'ACT\s+Composite',['actComposite25','actComposite50','actComposite75'])]
    for pattern,keys in specs:
     m=re.fullmatch(r'(?:C9\s+)?'+pattern+r'\s+(\d[\d,]*)\s+(\d[\d,]*)(?:\s+(\d[\d,]*))?',line,re.I)
     if m:
      values=[number(v) for v in m.groups() if v is not None]
      use=keys if len(values)==3 else [keys[0],keys[-1]]
      if values==sorted(values):
       for key,value in zip(use,values):
        if key:put(key,value,raw.strip(),pn)
    for key,pattern in [('waitlistOffered',r'Number of qualified applicants offered a place on (?:the )?waiting list:?\s+([\d,]+)'),('waitlistAccepted',r'Number accepting a place on (?:the )?waiting list:?\s+([\d,]+)'),('waitlistAdmitted',r'Number of wait[- ]listed students admitted:?\s+([\d,]+)')]:
     m=re.fullmatch(pattern,line,re.I)
     if m:put(key,number(m.group(1)),raw.strip(),pn)
  # Some fillable reports leave calculated C1 totals at zero while reporting positive ED
  # counts. Those inconsistent totals are omitted, not treated as a 0% admit/yield rate.
  if (data.get('admitted')==0 and data.get('edAdmitted',0)>0) or (data.get('applicants',0)==0 and data.get('edApplicants',0)>0):
   for key in ['applicants','admitted','enrolled']:
    data.pop(key,None);evidence.pop(key,None);sourcepages.pop(key,None)
  # Fail closed for contradictory groups; do not silently repair or blend years.
  for low,high in [('admitted','applicants'),('enrolled','admitted'),('waitlistAdmitted','waitlistAccepted'),('waitlistAccepted','waitlistOffered'),('edAdmitted','edApplicants'),('edApplicants','applicants'),('edAdmitted','admitted'),('intlUndergrads','undergradTotal')]:
   if low in data and high in data and data[low]>data[high]:
    for key in [low,high]:data.pop(key,None);evidence.pop(key,None);sourcepages.pop(key,None)
  if len(data)<3:return {**result,'reason':'Fewer than three unambiguous supported fields','year':year}
  pages_used=sorted({p for p in sourcepages.values() if p})
  record={'slug':school['slug'],'academicYear':f'{year}-{year+1}','sourceUrl':doc['url'],
   'sourcePageRef':'PDF pages '+', '.join(map(str,pages_used))+'; field-level PDF identifiers/lines and page numbers are retained in the public data file.',
   'data':data,'sourceLines':evidence,'sourcePages':sourcepages,'sourceSha256':doc['sha256'], 'yearEvidence':year_evidence,
   'method':'Automated conservative extraction from the fetched institutional PDF; exact CDS AcroForm field identifiers or unambiguous labeled rows; bounded and cross-field validated. Not personally reviewed.'}
  if domain(doc['url'])!=domain(school['website']):
   if doc.get('linkedFrom') and domain(doc['linkedFrom'])==domain(school['website']):record['sourceExceptionReason']='Public report linked from the institution-owned CDS page: '+doc['linkedFrom']
   elif domain(doc.get('requestedUrl',''))==domain(school['website']):record['sourceExceptionReason']='The institutional report URL redirects to this public file: '+doc['requestedUrl']
  return {**result,'status':'extracted','year':year,'record':record}
 except Exception as e:return {**result,'reason':type(e).__name__+': '+str(e)[:180]}
def domain(url):
 from urllib.parse import urlparse
 return '.'.join((urlparse(url).hostname or '').split('.')[-2:])
def parse_cached(job):
 school,doc,cache=job
 file=Path(cache)/(school['unitid']+'-'+doc['sha256']+'-parsed-v6.json')
 if file.exists():return json.loads(file.read_text())
 previous=Path(cache)/(school['unitid']+'-'+doc['sha256']+'-parsed-v5.json')
 old=json.loads(previous.read_text()) if previous.exists() else None
 if old and old.get('status')=='extracted':
  result=old;r=result['record'];reader=PdfReader(Path(cache)/doc['cacheFile']);fields=reader.get_fields() or {}
  pages={}
  for i,p in enumerate(reader.pages):
   for ref in p.get('/Annots',[]):
    obj=ref.get_object();parent=obj.get('/Parent');parent=parent.get_object() if parent else {};name=obj.get('/T') or parent.get('/T')
    if name:pages[str(name)]=i+1
  for key in ['applicants','admitted','enrolled']:
   if str(r['sourceLines'].get(key,'')).startswith('PDF field '):
    r['data'].pop(key,None);r['sourceLines'].pop(key,None);r['sourcePages'].pop(key,None)
  for key,item in primary_form_c1(fields).items():
   r['data'][key]=item['value'];r['sourceLines'][key]=item['evidence'];r['sourcePages'][key]=pages.get(item['fields'][0])
  if len(r['data'])<3 and len(r['data'].get('c7',{}))<17:
   result={k:v for k,v in result.items() if k!='record'};result.update(status='needs_review',reason='Fewer than three unambiguous supported fields')
  else:
   r['method']+=' C1 uses only complete primary sex categories or unambiguous primary totals; residency-subtable totals are excluded.'
   used=sorted({p for p in r['sourcePages'].values() if p});r['sourcePageRef']='PDF pages '+', '.join(map(str,used))+'; field-level identifiers/lines and pages retained in the data file.'
 else:result=parse_pdf(job)
 file.write_text(json.dumps(result));return result

def main():
 p=argparse.ArgumentParser();p.add_argument('--audit',default='tmp/pdfs/cds-audit-results.json');p.add_argument('--cache',default='tmp/pdfs/cds-audit');p.add_argument('--output',default='tmp/pdfs/cds-extracted.json');p.add_argument('--workers',type=int,default=4);args=p.parse_args()
 audit=json.loads(Path(args.audit).read_text());jobs=[(s,d,args.cache) for s in audit['schools'] for d in s['documents'] if d['format']=='pdf']
 results=[]
 with concurrent.futures.ProcessPoolExecutor(args.workers) as pool:
  for i,result in enumerate(pool.map(parse_cached,jobs),1):
   results.append(result)
   if i%20==0:print(json.dumps({'parsed':i,'total':len(jobs),'extracted':sum(r['status']=='extracted' for r in results)}),flush=True)
 Path(args.output).write_text(json.dumps({'checkedOn':audit['checkedOn'],'documents':results},indent=2)+'\n')
 print(json.dumps({'done':len(results),'extracted':sum(r['status']=='extracted' for r in results)}),flush=True)
if __name__=='__main__':main()
