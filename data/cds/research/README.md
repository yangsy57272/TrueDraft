# CDS discovery provenance

The candidate files contain **unverified hints**, not verified school data. The application and desktop package do not load or ship these files. Only primary institutional responses passing the audit feed `../catalog.json`; numeric imports retain the actual institution-published report URL, checksum, field identifier/source line and page.

Discovery resources consulted on 2026-11-12:

- https://github.com/bolewood/collegedata-fyi/blob/main/tools/finder/schools.yaml — institution IDs and initial source pointers. MIT license retained in `UPSTREAM-LICENSE.txt`.
- https://www.collegedata.fyi/snapshots/latest/sources.jsonl — recent report URL hints only. The bulk download was partial; it is not treated as a complete source list, nor as validation. No numerical values from this service are imported.
- https://admit-ai.com/resources/cds — official index-page pointers.
- https://www.collegefactcheck.com/cds-sources — report pointers.
- https://admitfacts.com/sources — report pointers.
- Existing TrueDraft institutional links and institutional-domain web search.
- `homepage-candidates.json`: remaining institutional homepages from the official College Scorecard directory; bounded follow-up of institutional-research, consumer-information and CDS links.

These resources can be stale, misidentify a report, or link to blank templates. Every imported numeric record is independently extracted from a fetched primary document, with institution/edition checks. A primary report linked by the institution or reached through its verified redirect can reside on a third-party file host; the institutional provenance is recorded explicitly.

## Reproduce

Maintainer tools need Python 3.10+, `lxml`, `pypdf` and `pdfplumber` (the latter is a fallback for PDF font problems). They are **not** dependencies of the normal TrueDraft application.

```sh
python3 scripts/cds/discover.py --candidates data/cds/research/candidates.json --output tmp/pdfs/cds-audit-results.json
python3 scripts/cds/discover.py --candidates data/cds/research/homepage-candidates.json --output tmp/pdfs/cds-homepage-audit.json
python3 scripts/cds/merge-audits.py tmp/pdfs/cds-audit-results.json tmp/pdfs/cds-homepage-audit.json
python3 scripts/cds/extract.py --audit tmp/pdfs/cds-merged-audit.json
python3 scripts/cds/build-catalog.py
python3 scripts/cds/test_field_rules.py
npm run test:unit
npm run cds:import
```

The cache is deliberately excluded from Git and desktop packages. It records successful responses, checksums and failures, so reruns do not repeatedly hit inaccessible URLs. Each institution audit stops after three failed fetches. Sources that are blocked, not located, scanned, ambiguous, or too old for the recent-data import remain unknown; they are not recorded as non-participating.

Important parser boundary: C1 residency totals can exclude applicants of unknown residency. They are never substituted for overall counts. Only explicit primary totals or complete primary sex-category sums (including unknown) are used. Blanks are not zero. Old and new editions are not blended. C7 is imported from recognized fillable-template fields only when at least 17 factors are unambiguous. Original TrueDraft CDS records and operator-managed database records are preserved.
