# Common Data Set (CDS) data: sources, import, and verification

TrueDraft shows students figures from each college's own **Common Data Set**: the standard questionnaire defined by the Common Data Set Initiative (template and definitions at commondataset.org). Colleges publish their completed CDS on their own websites.

## Integrity rules (enforced in code)

1. **Official source only.** Every dataset stores the `https` URL of the college's own CDS document.
2. **Drafts by default.** CSV imports and AI pre-fills create unpublished drafts.
3. **Verify before publish.** A dataset can be published only after an admin marks it *verified against the official document*. The verifying admin and the date are recorded.
4. **Nothing estimated.** Missing values are shown as "Not reported". Admission rate, yield, and ED admission rate are computed from the reported counts at display time, never stored or guessed.
5. **Validation.** Values are type- and range-checked. For example, admitted can't exceed applicants, and a 25th percentile can't be above the 75th. Unknown fields are rejected.
6. **No predictions.** The UI never turns CDS figures into admission chances. "Your scores in context" only says whether a student's self-reported score is below, within, or above the reported middle 50%, and is labelled "not a prediction".

## What ships in this repository

`src/content/schools.ts` seeds **24 schools**: name, Chinese name, city, state, public or private, website, and a link to each school's **own CDS page**. Those links were found by web search on 2026-11-05, with each search restricted to the university's own domain. The build environment couldn't fetch the pages directly, so the links haven't been opened and checked yet (`linkCheckedAt` is empty).

**No admissions numbers are seeded.** Until an admin imports a verified dataset, each school page says "No CDS data imported yet" and links to the official document.

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
