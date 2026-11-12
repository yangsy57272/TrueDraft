import unittest
from field_rules import primary_form_c1
class MainC1Tests(unittest.TestCase):
 def test_residency_total_does_not_become_overall_admission(self):
  fields={'AP_RECD_1ST_N':{'/V':'2512'}}
  self.assertEqual(primary_form_c1(fields),{})
 def test_unknown_or_unreported_gender_is_not_assumed_zero(self):
  fields={f'AP_RECD_1ST_{k}_N':{'/V':v} for k,v in [('MEN','1200'),('WMN','1500'),('NON_BINARY',''),('UNK','2')]}
  self.assertEqual(primary_form_c1(fields),{})
 def test_complete_primary_categories_can_be_summed_with_evidence(self):
  fields={f'AP_RECD_1ST_{k}_N':{'/V':v} for k,v in [('MEN','6244'),('WMN','7013'),('NON_BINARY','8'),('UNK','0')]}
  result=primary_form_c1(fields)['applicants']
  self.assertEqual(result['value'],13265)
  self.assertIn('UNK_N=0',result['evidence'])
 def test_zeros_left_in_unfilled_report_do_not_create_a_zero_admission_rate(self):
  fields={f'AP_RECD_1ST_{k}_N':{'/V':'0'} for k in ['MEN','WMN','NON_BINARY','UNK']}
  self.assertEqual(primary_form_c1(fields),{})
if __name__=='__main__':unittest.main()
