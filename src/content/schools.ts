/**
 * Starter school directory.
 *
 * Each `cdsPageUrl` is the institution's OWN Common Data Set page, located via web search on
 * 2026-11-05 restricted to the university's domain. Links were not fetched from this environment,
 * so `linkCheckedAt` stays empty until an administrator confirms them.
 *
 * Deliberately NO admissions numbers here: CDS values are only shown after an administrator
 * imports them from the official document and marks them verified.
 */
export type SeedSchool = {
  slug: string;
  name: string;
  nameZh: string;
  city: string;
  state: string;
  control: "public" | "private";
  website: string;
  /** IPEDS UNITID, for matching U.S. Department of Education data. */
  unitid: string;
  cdsPageUrl: string;
  latestCdsYearListed: string | null;
};

export const SEED_SCHOOLS: SeedSchool[] = [
  { slug: "harvard-university", name: "Harvard University", nameZh: "哈佛大学", city: "Cambridge", state: "MA", control: "private", website: "https://www.harvard.edu", unitid: "166027", cdsPageUrl: "https://oira.harvard.edu/common-data-set/", latestCdsYearListed: "2025-2026" },
  { slug: "stanford-university", name: "Stanford University", nameZh: "斯坦福大学", city: "Stanford", state: "CA", control: "private", website: "https://www.stanford.edu", unitid: "243744", cdsPageUrl: "https://irds.stanford.edu/data-findings/cds", latestCdsYearListed: "2025-2026" },
  { slug: "massachusetts-institute-of-technology", name: "Massachusetts Institute of Technology", nameZh: "麻省理工学院", city: "Cambridge", state: "MA", control: "private", website: "https://www.mit.edu", unitid: "166683", cdsPageUrl: "https://ir.mit.edu/project-topic/common-data-set/", latestCdsYearListed: "2025-2026" },
  { slug: "yale-university", name: "Yale University", nameZh: "耶鲁大学", city: "New Haven", state: "CT", control: "private", website: "https://www.yale.edu", unitid: "130794", cdsPageUrl: "https://oir.yale.edu/common-data-set", latestCdsYearListed: "2025-2026" },
  { slug: "princeton-university", name: "Princeton University", nameZh: "普林斯顿大学", city: "Princeton", state: "NJ", control: "private", website: "https://www.princeton.edu", unitid: "186131", cdsPageUrl: "https://ir.princeton.edu/other-university-data/common-data-set", latestCdsYearListed: "2025-2026" },
  { slug: "columbia-university", name: "Columbia University", nameZh: "哥伦比亚大学", city: "New York", state: "NY", control: "private", website: "https://www.columbia.edu", unitid: "190150", cdsPageUrl: "https://opir.columbia.edu/cds", latestCdsYearListed: "2025-2026" },
  { slug: "university-of-pennsylvania", name: "University of Pennsylvania", nameZh: "宾夕法尼亚大学", city: "Philadelphia", state: "PA", control: "private", website: "https://www.upenn.edu", unitid: "215062", cdsPageUrl: "https://ira.upenn.edu/penn-numbers/common-data-set", latestCdsYearListed: "2025-2026" },
  { slug: "brown-university", name: "Brown University", nameZh: "布朗大学", city: "Providence", state: "RI", control: "private", website: "https://www.brown.edu", unitid: "217156", cdsPageUrl: "https://oir.brown.edu/institutional-data/common-data-set", latestCdsYearListed: null },
  { slug: "dartmouth-college", name: "Dartmouth College", nameZh: "达特茅斯学院", city: "Hanover", state: "NH", control: "private", website: "https://home.dartmouth.edu", unitid: "182670", cdsPageUrl: "https://www.dartmouth.edu/oir/data-reporting/cds/index.html", latestCdsYearListed: "2025-2026" },
  { slug: "cornell-university", name: "Cornell University", nameZh: "康奈尔大学", city: "Ithaca", state: "NY", control: "private", website: "https://www.cornell.edu", unitid: "190415", cdsPageUrl: "https://irp.cornell.edu/common-data-set", latestCdsYearListed: "2025-2026" },
  { slug: "duke-university", name: "Duke University", nameZh: "杜克大学", city: "Durham", state: "NC", control: "private", website: "https://duke.edu", unitid: "198419", cdsPageUrl: "https://ir.provost.duke.edu/duke-numbers/common-data-sets/", latestCdsYearListed: "2025-2026" },
  { slug: "university-of-chicago", name: "University of Chicago", nameZh: "芝加哥大学", city: "Chicago", state: "IL", control: "private", website: "https://www.uchicago.edu", unitid: "144050", cdsPageUrl: "https://data.uchicago.edu/common-data-set/", latestCdsYearListed: "2025-2026" },
  { slug: "northwestern-university", name: "Northwestern University", nameZh: "西北大学", city: "Evanston", state: "IL", control: "private", website: "https://www.northwestern.edu", unitid: "147767", cdsPageUrl: "https://enrollment.northwestern.edu/data/common-data-set.html", latestCdsYearListed: null },
  { slug: "johns-hopkins-university", name: "Johns Hopkins University", nameZh: "约翰斯·霍普金斯大学", city: "Baltimore", state: "MD", control: "private", website: "https://www.jhu.edu", unitid: "162928", cdsPageUrl: "https://oira.jhu.edu/reports-2/", latestCdsYearListed: "2025-2026" },
  { slug: "carnegie-mellon-university", name: "Carnegie Mellon University", nameZh: "卡内基梅隆大学", city: "Pittsburgh", state: "PA", control: "private", website: "https://www.cmu.edu", unitid: "211440", cdsPageUrl: "https://www.cmu.edu/ira/CDS/index.html", latestCdsYearListed: null },
  { slug: "new-york-university", name: "New York University", nameZh: "纽约大学", city: "New York", state: "NY", control: "private", website: "https://www.nyu.edu", unitid: "193900", cdsPageUrl: "https://www.nyu.edu/employees/resources-and-services/administrative-services/institutional-research/self-service-reporting-resources/factbook.html", latestCdsYearListed: "2025-2026" },
  { slug: "rice-university", name: "Rice University", nameZh: "莱斯大学", city: "Houston", state: "TX", control: "private", website: "https://www.rice.edu", unitid: "227757", cdsPageUrl: "https://ideas.rice.edu/reporting-analytics/common-data-set/", latestCdsYearListed: "2025-2026" },
  { slug: "vanderbilt-university", name: "Vanderbilt University", nameZh: "范德堡大学", city: "Nashville", state: "TN", control: "private", website: "https://www.vanderbilt.edu", unitid: "221999", cdsPageUrl: "https://www.vanderbilt.edu/data/public-data/common-data-sets/", latestCdsYearListed: "2025-2026" },
  { slug: "washington-university-in-st-louis", name: "Washington University in St. Louis", nameZh: "圣路易斯华盛顿大学", city: "St. Louis", state: "MO", control: "private", website: "https://wustl.edu", unitid: "179867", cdsPageUrl: "https://wustl.edu/about/compliance-policies/registrar/student-consumer-information/", latestCdsYearListed: null },
  { slug: "emory-university", name: "Emory University", nameZh: "埃默里大学", city: "Atlanta", state: "GA", control: "private", website: "https://www.emory.edu", unitid: "139658", cdsPageUrl: "https://provost.emory.edu/planning-administration/data/common-data-set.html", latestCdsYearListed: "2025-2026" },
  { slug: "university-of-california-berkeley", name: "University of California, Berkeley", nameZh: "加州大学伯克利分校", city: "Berkeley", state: "CA", control: "public", website: "https://www.berkeley.edu", unitid: "110635", cdsPageUrl: "https://opa.berkeley.edu/campus-data/common-data-set", latestCdsYearListed: "2025-2026" },
  { slug: "university-of-michigan-ann-arbor", name: "University of Michigan–Ann Arbor", nameZh: "密歇根大学安娜堡分校", city: "Ann Arbor", state: "MI", control: "public", website: "https://umich.edu", unitid: "170976", cdsPageUrl: "https://obp.umich.edu/campus-statistics/common-data-set/", latestCdsYearListed: "2025-2026" },
  { slug: "university-of-southern-california", name: "University of Southern California", nameZh: "南加州大学", city: "Los Angeles", state: "CA", control: "private", website: "https://www.usc.edu", unitid: "123961", cdsPageUrl: "https://oir.usc.edu/statistics-data-visualization/common-data-set/", latestCdsYearListed: "2025-2026" },
  { slug: "california-institute-of-technology", name: "California Institute of Technology", nameZh: "加州理工学院", city: "Pasadena", state: "CA", control: "private", website: "https://www.caltech.edu", unitid: "110404", cdsPageUrl: "https://iro.caltech.edu/data", latestCdsYearListed: "2025-2026" },
];
