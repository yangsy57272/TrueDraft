# CDS coverage — audited 2026-11-12

TrueDraft now bundles **245 school-year datasets for 234 institutions**, up from 18 institutions. All original 18 datasets remain. The new files add 227 school-years across 218 institutions; some institutions now have more than one edition.

| Coverage measure | Result |
| --- | ---: |
| U.S. institutions whose institutional sources were attempted | 1,573 |
| Entire directory including the separately added St Andrews entry | 1,574 |
| Checked institutional CDS pages/documents | 561 |
| Confirmed CDS documents, including historical editions | 389 |
| Checked CDS index pages without a numerically verified document | 172 |
| Institutions with imported recent detailed figures | 234 |
| Imported school-year datasets | 245 |
| 2024–25 / 2025–26 / 2026–27 datasets | 59 / 184 / 2 |
| Captured top-level field values (C7 counts as one group) | 3,222 |
| School-years with captured admission-factor groups (C7) | 88 |
| Supplemental-catalog U.S. schools with a checked CDS source | 107 / 133 |
| Supplemental-catalog U.S. schools with imported detailed figures | 66 / 133 |

These are different measures. **Finding a source is not importing a complete report.** Coverage is still partial across the full directory; this update does not claim every school or every CDS field is loaded. Checked historical documents are not represented as the latest available edition. Reports that were inaccessible, scanned, ambiguous, too old for the recent-data import, or in an unsupported layout remain unknown. A failed lookup never establishes that a school does not publish a CDS.

## Primary sources and evidence

- `data/cds/catalog.json`: one row per directory institution, with status and actual source-request outcomes. Checked links are imported into school pages.
- `data/cds/2025-2026.json`: the original 18 datasets, preserved.
- `data/cds/*-researched.json`: added primary-source numeric records with `sourceSha256`, `sourceLines`, `sourcePages` and `yearEvidence`.
- `data/cds/research/README.md`: discovery resources, attribution, limitations and reproducible research commands. External indexes supply URL hints only; their numeric data is not imported.

The audit fetched the institutions’ own websites and files. Examples of official institutional reporting pages include [Cornell](https://irp.cornell.edu/common-data-set), [Bowdoin](https://www.bowdoin.edu/ir/pdf/bowdoin-cds_2025-2026.pdf) and [RPI](https://provost.rpi.edu/institutional-research-and-assessment). For any specific value, follow the actual URL and PDF page/field stored in its record rather than relying on an index-page summary.

## Data rules

- Verify institutional identity and reporting edition before extracting values. Do not merge campuses or treat admission to a major as the university-wide C1 rate.
- Use exact recognized PDF form fields or unambiguous primary table rows. All primary sex categories, including unknown, must be explicitly populated before using their sum. Residency-subtable totals are excluded because they can omit applicants with unknown residence.
- Blanks and unfilled calculated zeros are not guessed into meaningful totals. Inconsistent or ambiguous figures are omitted. Field bounds and cross-field relationships are validated again on import.
- Keep edition and cohort/cost-year distinctions. A CDS edition can contain graduation cohorts from earlier years and costs for a later academic year.
- Every automated record remains labeled **Automated check**, with no named human verifier. It is available for later administrator review; automated extraction is not claimed to be complete or infallible.
- Keep College Scorecard facts separately labeled. CDS values are not invented from federal data, and missing CDS fields can still use explicitly sourced federal fallback facts.
- Refresh automatically imported public data while preserving administrator-maintained, personally reviewed, draft and unpublished records. A reachable older report does not downgrade a known newer source edition.

## Update and verify

```sh
npm run cds:import
npm run typecheck
npm run lint
npm test
python3 scripts/cds/test_field_rules.py
```

The desktop package includes the JSON reference data and refreshes it at startup; Python and live web research are not needed by applicants. The isolated desktop upgrade check deletes automatically imported CDS rows and verifies that startup restores the new Bowdoin report while retaining the applicant draft and AI connection settings.
