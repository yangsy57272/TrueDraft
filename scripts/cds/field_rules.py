"""Pure conservative CDS field rules, independent of PDF/network libraries."""
def numeric(value):
 import re
 text=str(value).strip().replace(',','')
 return int(text) if re.fullmatch(r'\d+',text) else None

def primary_form_c1(fields):
 """Sum only four explicitly populated MAIN C1 sex categories, including unknown.
 AP_RECD_1ST_N/AP_ADMT_1ST_N/EN_TOT_1ST_N can be residency-subtable totals and
 must not be assumed to be overall first-year counts. Blank is not zero.
 """
 out={}
 for key,prefix in [('applicants','AP_RECD_1ST_'),('admitted','AP_ADMT_1ST_'),('enrolled','EN_TOT_1ST_')]:
  names=[prefix+suffix+'_N' for suffix in ['MEN','WMN','NON_BINARY','UNK']]
  values=[numeric(fields.get(name,{}).get('/V')) for name in names]
  if all(v is not None for v in values) and sum(values)>0:
   out[key]={'value':sum(values),'fields':names,'evidence':'Sum of complete C1 sex categories: '+' + '.join(f'{n}={v}' for n,v in zip(names,values))}
 return out
