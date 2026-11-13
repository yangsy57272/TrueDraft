# Verified application rounds and calendar links

## Student workflow

1. Add schools to My list. Open **My application plan** and use the school-specific round card, or edit the school's fields in My list.
2. Select the entry year, the exact programme route where exceptions exist, and an offered application round. The initial catalog is scoped to **fall 2027 entry**, not all future cycles.
3. Review the exact date and its two official sources. **Use this round & replan** saves the choice, creates its managed deadline and rebuilds the timetable. Missing closing times remain marked unknown; a confirmed applicant-local closing time uses the student's saved planning time zone.
4. Changing the round replaces only the managed catalog deadline. Manual entries are retained. A conflicting manual date is flagged; the selected verified catalog record takes priority until the student edits or removes that managed record. Editing its date/time/type/source manually removes the verification provenance. An extension granted personally must be reviewed manually.
5. Choose applicable supplements and set actual weekly availability/time zone. The timetable uses the selected application date and existing progress. Supporting materials, portfolios, auditions and school-specific supplemental submission dates may differ; check those source instructions separately. The catalog does not claim every programme-specific event is loaded.

## Coverage and verification

Current dataset: **21 institutions/campuses, 42 round/programme choices**, supported by **27 distinct primary institutional publications**. Each supporting publication was fetched twice, with both timestamps and SHA-256 retained, and the research agent reviewed round/date/programme context. This is not named human certification or a guarantee against later changes. Seventy candidate publications were attempted; blocked, ambiguous, incomplete and uncorroborated candidates were not promoted into automatic dates.

- CMU: ED 2026-11-02; standard RD 2027-01-04; Drama/Music RD 2026-12-01. No EA in its current first-year plans. ED exclusions for Drama/Music/BXA Design are reflected in programme choices. A conflicting official FAQ is recorded, while the explicit fall-2027 catalog and current plans page agree on the published dates.
- Santa Clara: ED I / EA 2026-11-01; ED II / RD 2027-01-07. These are fall first-year dates, not its winter-entry route. Its official page lists separate optional-essay dates; those are noted for separate review rather than mislabeled as the application deadline.
- Stanford: standard REA/RD and earlier optional-arts-portfolio application dates are separate choices.
- Bowdoin ED is 2026-11-15; Pomona ED is 2026-11-08. Liberal arts colleges are not assigned one blanket date.
- Nine UC undergraduate campuses use the corroborated system first-year filing deadline, 2026-11-30. The UI identifies this as the UC filing deadline rather than implying a distinct EA/ED plan. Campus/programme supplements may have other dates.

Other universities, entry years and unverified rounds remain explicitly unverified and retain manual entry. The app never derives a current-cycle date by rolling a historical CDS month/day forward or assigning all universities November 1 / all liberal arts colleges November 15. This is an initial verified catalog, not complete worldwide deadline coverage.

Files: `data/admission-deadlines/2026-2027.json`; review manifest, source list and failed-attempt report are in `data/admission-deadlines/research/`. Research working files stay out of desktop packages. Reproduce retrieval with the source list as the input manifest for `scripts/admission-deadlines/fetch-evidence.py`, then run `build-reviewed.py` after reviewing context; simple date-string matches alone do not establish an application rule.

## Apple Calendar and Google Calendar

- **Apple Calendar:** download the private .ics plan and open/import it. [Apple's import guide](https://support.apple.com/guide/calendar/import-or-export-calendars-icl1023/mac).
- **Google Calendar, whole plan:** download the same .ics and import it in Google Calendar's Import & export settings. [Google's import guide](https://support.google.com/calendar/answer/37118?hl=en).
- **Google Calendar, individual work session:** each scheduled block has a link opening a Google event preview. The student confirms and saves it. The URL includes school, work category and times, without draft text, essay title, personal notes or API keys.
- Calendar files and event links are snapshots, not authenticated two-way synchronization. Replace/review older imports after replanning to avoid duplicates. The local desktop app cannot offer an authenticated public subscription feed without separate hosting/account connection. No background calendar writes, invitations, emails or reminders are performed by this feature.
