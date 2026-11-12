#!/usr/bin/env python3
"""Merge independent source-audit passes, retaining all fetched-document evidence."""
import argparse,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('files',nargs='+');p.add_argument('--output',default='tmp/pdfs/cds-merged-audit.json');args=p.parse_args()
merged={}
for name in args.files:
 if not Path(name).exists():continue
 for r in json.loads(Path(name).read_text())['schools']:
  if r['unitid'] not in merged:merged[r['unitid']]=r;continue
  old=merged[r['unitid']];docs={d['url']:d for d in old['documents']};docs.update({d['url']:d for d in r['documents']})
  attempts={a.get('requestedUrl',a.get('url')):a for a in old['attempts']};attempts.update({a.get('requestedUrl',a.get('url')):a for a in r['attempts']})
  old.update({k:v for k,v in r.items() if k not in ['documents','attempts','status']})
  old['documents']=list(docs.values());old['attempts']=list(attempts.values())
  old['status']='document_downloaded' if docs else 'page_available' if old.get('pageUrl') else r['status']
Path(args.output).write_text(json.dumps({'checkedOn':'2026-11-12','schools':sorted(merged.values(),key=lambda r:r['name'])},indent=2)+'\n')
print('Merged institutions:',len(merged))
