# Contributing to TrueDraft

Thanks for helping students research colleges and improve their own writing. You can contribute without writing code.

## Ways to help

- Try the [desktop app](https://github.com/yangsy57272/TrueDraft/releases) and report confusing steps or reproducible bugs.
- Improve English or Simplified Chinese wording, accessibility, or setup instructions.
- Report outdated college information with an official source URL, application cycle, and the field that needs correcting.
- Propose a focused improvement before starting a large change.

Use [GitHub Issues](https://github.com/yangsy57272/TrueDraft/issues) for reports and ideas. Search existing issues first. Use fictional essays and profiles; remove API keys, sign-in links, email addresses, and personal documents from logs or screenshots.

## Code changes

1. Fork the repository and create a branch for one focused change.
2. Follow [Run locally](README.md#run-locally) to set up the app. Keep secrets in your local `.env`.
3. Preserve English and Simplified Chinese UI support. Keep missing college data explicit and attach official sources to data corrections. Writing tools should support the student's own work and experiences.
4. Run checks appropriate to your change:

   ```bash
   npm run typecheck
   npm run lint
   npm test
   ```

   For browser behavior, also run `npm run test:e2e` with the environment configured in [the CI workflow](.github/workflows/ci.yml). Documentation-only changes need working links and accurate instructions.

5. Open a pull request describing the problem, your change, and what you checked. Include screenshots for visible UI changes and note any checks you could not run.

Contributions to original project code and documentation are under the [MIT License](LICENSE). Keep third-party attribution and licensing intact. Be respectful, specific, and constructive when giving feedback.
