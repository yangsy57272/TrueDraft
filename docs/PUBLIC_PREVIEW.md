# Public interactive preview

The GitHub Pages preview and the app's public `/demo` route use the same `DemoExperience` component. `/quality` opens its evidence view directly. The preview demonstrates a fictional student journey: shortlist → today's work → quoted feedback and revision comparison → reproducible checks.

## Boundaries

The static preview has no login, backend, database, API keys, AI requests, browser storage or analytics. State lives in memory until reload or reset. All school names, admission figures, scores, fees and deadline dates in the scenario are invented. Fictional fee totals leave unknown fees explicit. The browser will request the static page/assets from GitHub Pages, which has its own hosting practices.

School groupings, scheduling, dependencies and quote lookup reuse production helpers. Feedback and revision examples are hand-written. This is an interactive product walkthrough, not a live AI sandbox or a substitute for checking official college requirements.

## Build and deploy

```bash
npm run quality:check
npm run preview:build
python3 -m http.server 4173 --directory dist/preview
```

The Pages workflow builds pull requests for verification and deploys only `main` to the configured GitHub Pages environment. Only `dist/preview` is uploaded; `.env`, local databases, profiles, account services and desktop downloads are excluded. The workflow does not deploy the authenticated Next.js app.

The HTML uses relative asset paths so the repository subpath works. It has a title, description, social card, sitemap, keyboard skip link and a no-JavaScript fallback. A content security policy disallows network connections from scripts. External links lead to the repository, license, downloads and documentation.
