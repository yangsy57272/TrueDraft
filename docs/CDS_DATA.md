# Common Data Set (CDS) data: sources, import, and verification

TrueDraft shows students figures from each college's own **Common Data Set**: the standard questionnaire defined by the Common Data Set Initiative (template and definitions at commondataset.org). Colleges publish their completed CDS on their own websites.

## Integrity rules (enforced in code)

1. **Official source only.** Every dataset stores the `https` URL of the college's own CDS document. The URL must be on the college's own domain (compared with the school's website and CDS page). A file hosted elsewhere, such as a Google Drive link from the college's official CDS page, needs a recorded, reviewed exception and a written reason. Students see that reason. A dataset can also record where in the document the values came from (`sourcePageRef`) and how it was verified (`verificationMethod`).
2. **Drafts by default.** CSV imports and AI pre-fills create unpublished drafts.
3. **Verify before publish.** A dataset can be published only after an admin marks it *verified against the official document*. The verifying admin and the date are recorded.
4. **Nothing estimated.** Missing values are shown as "Not available". The college may not have reported a value, or we may not have captured it. Admission rate, yield, and ED admission rate are computed from the reported counts at display time, never stored or guessed.
5. **Validation.** Every field has its own allowed range: SAT composite 400–1600, SAT sections 200–800, ACT 1–36, real calendar dates (February 29 is allowed), and so on. Cross-field rules are checked too:
   - admitted ≤ applicants, and enrolled ≤ admitted
   - ED admits ≤ ED applicants
   - international students ≤ undergraduates
   - 25th ≤ 50th ≤ 75th percentile
   - waitlist admits ≤ waitlist offers
   - no ED or EA details without the plan
   - international aid can't be both "available" and "not available"
   - degree shares can't total more than 100%

   Academic years must be consecutive, for example `2025-2026`. Unknown fields are rejected.
6. **No predictions.** The UI never turns CDS figures into admission chances. "Your scores in context" only says whether a student's self-reported score is below, within, or above the reported middle 50%, and is labelled "not a prediction".

## What ships in this repository

`src/content/schools.ts` seeds **24 schools**: name, Chinese name, city, state, public or private, website, and a link to each school's **own CDS page**. Those links were found by web search on 2026-11-05, with each search restricted to the university's own domain. The build environment couldn't fetch the pages directly, so the links haven't been opened and checked yet (`linkCheckedAt` is empty).

**No admissions numbers are seeded.** Until a dataset is imported, the school page says "No CDS data imported yet" and links to the official document.

### Imported 2025-2026 data (`data/cds/2025-2026.json`)

`npm run cds:import` loads 18 datasets from that file: Caltech, Columbia, Cornell, Dartmouth, Duke, Emory, Harvard, MIT, Penn, Rice, Stanford, UC Berkeley, UChicago, Michigan, USC, Vanderbilt, WashU, and Yale. Each record includes:

- the URL of the official document;
- the source line each value was read from (`sourceLines`), so any value can be checked against the document;
- the method used (`method`).

The importer validates every record with the same rules as the admin form. Re-running it updates the datasets in place.

How the values were produced: most official PDFs were converted with `pdftotext -layout` and read by a field parser. MIT's CDS is a web page, which was converted to one line per table row. Berkeley's and Vanderbilt's are spreadsheets, which were read by cell; for Vanderbilt that's the file's Answer Sheet tab. A record-level `method` says which applies. Each value was then checked against its source line. Fields that couldn't be read unambiguously were left out rather than guessed. C7 (admission factors) is included only when at least 17 factors were read, and the school page shows only the factors that were captured. J1 (degrees by field) isn't included in this import. Caltech's PDF uses a font that garbles extraction, so its dataset is partial (no C1 or C7).

**Review status.** The datasets are marked verified with `verifiedBy` empty and `verificationMethod` set to the method above. They were checked by an automated process against the source text, **not by a named human admin**. Before relying on them publicly, an admin should spot-check each school against its PDF and re-save it from the admin page. That records their name and date.

Four reviewed source-domain exceptions are recorded:

- **Stanford:** the file is on Google Drive, linked from irds.stanford.edu's CDS page.
- **WashU:** the file is on washu.edu, the university's current domain (it was formerly wustl.edu).
- **Penn:** the file is on Penn's Box account, linked from ira.upenn.edu's CDS page.
- **UC Berkeley:** the CDS is a Google Sheet, linked from opa.berkeley.edu's CDS page.

Partial records:

- **Vanderbilt:** its spreadsheet has formula errors in some cells, so the dates, international aid, and retention rate are omitted.
- **Berkeley:** its application fee differs for domestic and international applicants, and its international aid section isn't filled in, so both are omitted.

Not imported yet (the school page shows the official link instead):

- **Princeton, Johns Hopkins, NYU:** the sites block automated downloads (a Cloudflare challenge or a 403 from the site itself). These weren't bypassed.
- **Northwestern:** its server's TLS certificate chain doesn't verify through this environment's proxy. Verification wasn't disabled.
- **Brown:** publishes its 2025-26 CDS as an interactive dashboard, not a document.
- **Carnegie Mellon:** only a partial 2026-27 edition is available.

These can be added by hand or through the CSV import.

The `/cds` guide includes a worked example for "Northfield College". Both the college and its numbers are **fictional**, and the page labels them as such.

## How to add data

All three paths below start at **Admin → Schools and Common Data Set** (`/admin/schools`).

### A. Enter values by hand
Open a school, then choose **New dataset**. Enter the academic year (e.g. `2025-2026`) and the document URL, then fill in fields by section (B, C, G, H, I, C7, J1). Each field shows its CDS item number. Check every value against the PDF, select **Verified against the official document**, and then **Publish to students**.

### B. CSV import
Download the template from `/api/admin/cds/template`.

- Required columns: `school_slug`, `academic_year`, `source_url`.
- Optional columns: any field key (see `CDS_FIELDS` in `src/lib/planning.ts`), `c7_<factor>` with a level (`Very Important`, `Important`, `Considered`, `Not Considered`), and `j1_<two-digit CIP code>` with a percentage.

Rows are imported as drafts. Review and publish each one.

### C. AI-assisted pre-fill (optional)
On the dataset form, paste text copied from the CDS PDF. The AI proposes values. The prompt forbids it from estimating, and it lists any fields it was unsure about. Proposed fields are marked "AI" so you can check each one. Nothing is saved until you click **Save**.

## Fields stored

| Section | Fields |
|---|---|
| B | B1 undergraduates; B2 international undergraduates; B11 six-year graduation rate; B22 retention |
| C | C1 applicants, admitted, enrolled; C2 waitlist; C8 test policy; C9 SAT/ACT percentiles and submit rates; C12 average GPA; C13 fee; C14 deadline; C21 early decision; C22 early action |
| G | G1 tuition, fees, food and housing |
| H | H6 institutional aid for nonresident (international) students: policy, number of recipients, average award |
| I | I2 student–faculty ratio |
| C7 | Importance of the 19 admission factors |
| J1 | Share of bachelor's degrees by two-digit CIP family |

## Keeping data current

Most colleges publish a new CDS each year. Add each new edition as its own dataset. Students see the most recent published year, and can switch to older years on the school page.
