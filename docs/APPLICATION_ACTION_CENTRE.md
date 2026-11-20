# Application action centre

Open **My college list → Application action centre** (`/my-list/hub`), also linked from the journey and daily plan. English and Chinese are supported. This is part of the standalone TrueDraft app; the separate Anna essay-review candidate is unchanged.

## Today’s focus

The focus panel selects up to three ready tasks within work minutes already allocated for today in the saved schedule and selected time zone. It does not assume extra availability. Writing stages wait for earlier unfinished stages; application submission waits for open tasks, including the relevant shared platform statement. Shared tasks list the active schools they cover. Partial sessions are labeled; starting a session does not mark a whole task finished. Suggested dates, date basis and recorded source can be inspected. This is deterministic planning, not AI or a prediction of completion.

## For a student

1. Add your schools in My college list. Choose each programme, application round and entry year; confirm school-specific requirements and dates in the official portal.
2. Open the action centre. It uses your existing school checklist, writing progress and saved planning availability across US, UK, HK, Canada, Australia, Singapore and custom schools. It requires no AI key.
3. Start with **Information to confirm**, then **What to do next**. Up to eight unfinished tasks are ordered by suggested work date, with verification and earlier writing stages first when target dates coincide. Suggested work dates and estimated minutes are planning aids, not institutional requirements or closing times.
4. Open a task, or mark its work complete. Completion uses the same saved task state as the daily plan; use the daily plan to undo. It does not submit an application or change a school's application status.
5. Check **Deadline watch**. It includes open supporting-document, aid, interview and other dates after submission. Submitted applications no longer repeat the application-submission deadline here. Missing closing times stay visibly unknown; no exact countdown is invented. The selected planning time zone is used for dates recorded as "local".
6. Review the per-school checklist. Mark only items you have actually handled (including confirming non-applicability where appropriate). The default checklist is generic; it does not certify that every item is required. Add school-specific or post-submission actions in the existing My list editor. Closed denied/withdrawn choices remain visible for reference and have no reminders; their checklist is read-only here.
7. After submitting yourself, set the school status in My list, retain your receipt, activate the institution's applicant portal and verify material receipt there. A submitted application and a completed checklist are not proof the institution received all documents.
8. Use **Refresh** after making changes elsewhere. A timestamp and time zone identify the displayed snapshot. Search and stage filters affect school cards; task/deadline overview remains across the full list.
9. **Download checklist** saves a JSON snapshot of all schools, checklist state, entered dates/sources and next-step titles. It excludes essay bodies, feedback, account IDs and private school notes. Custom checklist labels may still contain personal information: review before sharing. **Print / save PDF** uses your browser's print dialog; school cards follow the current filter, while the overview remains global. No export is sent automatically.

If there are no planner warnings or unfinished tasks, still check the official portal. Coverage and student records may be incomplete. No automatic submission, external messages, new deadline claims, admissions predictions, continuous calendar sync or payment processing are introduced.

## Implementation and verification

The authenticated page uses `requirePageUser` and existing owner-scoped `getApplicationSchedule`. All writes reuse the authenticated task/checklist APIs and transactional updates. No new account identifier is accepted; no database migration, external service, AI call or new storage is introduced. Download is generated in the browser only when requested.

Pure tests cover post-submission follow-ups, closed choices, all six systems/custom schools, school-zone/date-only urgency, missing dates, saved completion, workload gaps, phase ordering and minimal snapshot export. Production browser tests cover persisted checklists, stage filtering, a filtered view still exporting the full list, print controls, English/Chinese and mobile layout. All data used in tests is fictional.

The build identified the existing Next.js16.4.3 dependency as affected by [GHSA-mfr8-8qww-v76h](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h). This change updates Next.js to the fixed16.4.5 patch. The affected cache API combination was not found in TrueDraft source; that search is not a comprehensive exploitability assessment. No broad dependency upgrade or user-data migration is included.

## Basis

Official references checked November18,2026:

- [Common App first-year guide](https://www.commonapp.org/apply/first-year-students/): separate application sections and school-specific requirements.
- [Common App recommender guide](https://www.commonapp.org/counselors-and-recommenders/recommender-guide/): supporting forms and recommendations are tracked separately.
- [UCAS application tracking](https://www.ucas.com/applying/after-you-apply/tracking-your-ucas-application?qt-mpc=0): track decisions and follow institution-specific interview communications.

These references inform workflow design. They do not verify every institution's deadlines or import private portal data.

Verified locally November18,2026:296 unit/integration checks, TypeScript/lint, production webpack build and both new production-browser scenarios passed. Desktop and populated Chinese-mobile screenshots were visually inspected. Production-only dependency audit reports zero vulnerabilities; this does not claim all development dependencies are advisory-free. Test configuration, credentials and databases were temporary and isolated. GitHub checks are recorded in the change request and local loop state.
