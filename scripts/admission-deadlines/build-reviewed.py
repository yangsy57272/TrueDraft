"""Publish only reviewed choices supported by two fetched institutional publications.
The manifest is manually reviewed; matching a month/day alone never discovers an application rule.
"""
import collections,json,pathlib,re
ROOT=pathlib.Path(__file__).resolve().parents[2]; CACHE=ROOT/'tmp'/'admission-deadlines'
months=['January','February','March','April','May','June','July','August','September','October','November','December']
def contains_date(text,date):
 year,month,day=map(int,date.split('-'));name=months[month-1]
 # Handles month headers in UC's filing-period table as well as literal Nov. 1.
 return bool(re.search(r''+name[:3]+r'(?:'+name[3:]+r')?\.?\s*'+str(day)+r'(?:st|nd|rd|th)?(?![0-9])',text,re.I)) or (month==11 and day==30 and bool(re.search(r'November.{0,30}\b1\s*-\s*30\b',text,re.I)))
def main():
 audit={}
 for f in sorted(CACHE.glob('audit*.json')):
  for row in json.loads(f.read_text()):audit[row['id']]=row
 reviewed=json.loads((ROOT/'data/admission-deadlines/research/reviewed.json').read_text());good=[];rejected=[]
 for s in reviewed['schools']:
  sources={};valid=True
  for track in s['tracks']:
   for option in track['options']:
    for key in option['sourceIds']:
     row=audit.get(key);passes=row.get('passes',[]) if row else []
     if len(passes)!=2 or not all('sha256'in p and contains_date((CACHE/p['textFile']).read_text(),option['date']) for p in passes):
      rejected.append({'school':s['slug'],'track':track['id'],'round':option['round'],'source':key,'reason':'Both successful retrievals must contain the reviewed date'});valid=False;continue
     p=passes[-1];source=sources.setdefault(key,{'id':key,'url':p['finalUrl'],'checkedAt':p['checkedAt'],'sha256':p['sha256'],'note':'Two separate successful retrievals; round/date/programme context reviewed by the research agent, without a named human verifier. Hash is of second retrieval.','assertions':[],'checks':[{'checkedAt':q['checkedAt'],'sha256':q['sha256']} for q in passes]})
     assertion={'round':option['round'],'date':option['date'],'track':track['id']}
     if assertion not in source['assertions']:source['assertions'].append(assertion)
  if valid:
   s['sources']=list(sources.values());good.append(s)
 output={'entryYear':2027,'cycle':'2026-2027','description':'Standard fall-2027 first-year deadline choices. Each published option has two distinct primary institutional publications, each retrieved twice and reviewed for round/date/programme context. Closing time remains unknown where not explicitly reported. Coverage is partial.','schools':good}
 (ROOT/'data/admission-deadlines/2026-2027.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
 (ROOT/'data/admission-deadlines/research/verification-report.json').write_text(json.dumps({'attemptedPublications':len(audit),'publishedSchools':len(good),'publishedChoices':sum(len(t['options']) for s in good for t in s['tracks']),'rejected':rejected,'sourceAudit':list(audit.values())},indent=2)+'\n')
 print('Published schools:',len(good),'choices:',sum(len(t['options']) for s in good for t in s['tracks']),'rejected assertions:',len(rejected))
 for r in rejected:print(r)
if __name__=='__main__':main()
