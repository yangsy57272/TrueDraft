# School research and application systems

Every published school page now links to a programme-specific research workspace. The existing U.S. directory is retained; 38 reference institutions are added across UK (15), Hong Kong (8), Canada (6), Australia (6) and Singapore (3). St Andrews remains the separately existing UK entry. The directory is a starting set, not all universities in those systems. Countries/regions are searchable filters; they do not identify the applicant's qualification or application route.

## For applicants

1. Open Schools and choose a country/region, then a school. Open **Research courses, faculty, communities & Why School**.
2. Enter the exact intended programme. Add up to six official course, faculty, research or student-community URLs if you have them. The names matter: a broad subject label may not locate the right department automatically.
3. Choose **Find official sources** without configuring AI. This reads up to 12 institutional HTML pages, with a 55-second discovery bound, and shows URLs, retrieval times, excerpts and failed-page counts. This is bounded discovery, not exhaustive research. A failed page never proves an opportunity is absent.
4. Connect AI in Settings and consent to AI processing for the research workbook. The student's redacted profile is sent to their configured provider; school websites only receive public-page requests, not applicant profile text. Without relevant profile entries the tool asks questions instead of inventing personal connections.
5. Read the logic map first, followed by the evidence–learning–experience–action connections. Check course content/prerequisites, actual instructor assignment, current research opportunities, undergraduate eligibility and club joining requirements against the linked source. A faculty biography alone does not establish an instructor or a lab place.
6. Use the six-part audit and revision actions, then check the final checklist. Scores are AI self-assessment of a plan, not independent factual verification, draft quality scores or admission probabilities. The server removes items without an exact title/short-quotation match and caps the evidence score at 1/2 because matching text cannot prove an interpretation or current access. Missing categories remain explicit.
7. **Start my essay with this research** opens a draft setup carrying an owned research reference. Supply the actual essay prompt and limit yourself. Saved research is encrypted with the existing planning-results protection. Essay coaching retrieves only the signed-in owner's completed research; the original draft remains the student's work. Research links are references to recheck, not an instruction to copy quotations into an essay.
8. Revise the opening-to-ending chain and transitions, retain a humane consistent tone, use varied precise verbs, remove repetition and avoid “not … but …”. The model is instructed to review/refine its plan once internally; that is not an independent second reviewer. After writing, use the existing feedback/final-read tools for another revision round.

## Differences between systems

- U.S. and school-specific responses: use the exact institution/programme prompt. Existing Reach/Target/Safety rules are restricted to U.S. school data.
- UK: UCAS statements are shared with multiple choices and should focus on the subject. From 2026 entry there are three answers, each at least 350 characters and 4,000 characters overall including spaces. A UK research handoff defaults to subject-focused personal-statement setup, without inserting the school's name as a target. This does not create a full three-box UCAS editor; verify the live UCAS fields and any separate university response.
- Hong Kong: distinguish JUPAS, international/non-JUPAS and mainland routes. Confirm qualification, programme-specific prerequisites and current portal instructions.
- Canada, Australia and Singapore: entry routes, qualification requirements and supplementary forms differ by institution/programme. The application-system panel links to official guidance, with provincial/state scope where relevant. No U.S. CDS or dollar-fee assumptions are applied to these school pages. Complete non-U.S. essay prompts, automatic eligibility matching, local fee tables and admission predictions are not bundled by this feature.

## Boundaries and maintenance

Only the directory school's exact domain and subdomains may be fetched. Outbound requests require HTTPS, standard port, public IPv4 DNS results and a pinned checked address; every redirect is checked again. Pages have size/deadline limits. Private/LAN destinations, cross-institution redirects, PDFs, logins and unsupported content are rejected. Some institutions use a separate official domain for unions or catalogues; those are currently separate manual checks, not silently trusted. No applicant supplies an arbitrary website root.

Evidence is cached in bounded process memory for 30 minutes; refresh after that period or add a more precise official URL to collect again. The applicant-specific AI workbook is stored encrypted in their planning history. Editing a programme hides the prior result until research is run again. Course year, access and source date still require human review; a retrieval timestamp is not a publication date.

Add institutions to `data/global-schools.json` using their primary official website and ISO country/region code. Startup import adds missing entries without overwriting operator edits. Extend `src/lib/application-systems.ts` for another system. Neither needs a database schema change.
