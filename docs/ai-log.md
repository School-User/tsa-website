# AI use log

- 2026-11-15: Claude helped research TSA rules, drafted curriculum outline, design and plan.
- 2026-11-15: Claude wrote js/progress.js and tests/progress.test.js (Task 1); user to review and explain.
- 2026-11-15: Claude wrote css/style.css, index.html, js/dashboard.js (Task 2); user to review and explain.
- 2026-11-15: Freebuff (DeepSeek) wrote js/quiz.js; Claude tested it in headless Chromium and added right/wrong feedback classes (quiz.js) and hid the empty result box (style.css).
- 2026-11-15: Codex drafted Module 2 and 3 lessons/quizzes (docs/content-m2-m3.md); Claude checked sources.
- 2026-11-15: Codex built module2.html and module3.html (and module1.html). Freebuff (DeepSeek) built reference.html. Claude tested all pages end to end and edited the copyright wording in reference.html.
- 2026-11-15: Claude added the progress-code feature (exportCode/importCode in js/progress.js with tests, Switch devices box in index.html/dashboard.js) and a global [hidden] CSS rule.
- 2026-11-15: Codex built module1.html and listed its sources; Claude verified the URLs and added them to reference.html.
- 2026-11-16: Freebuff (DeepSeek) wrote docs/forms-guide.md — structure and fact-check sheet for the two required PDFs (no form text written for the user). Checked the site for media/frameworks/network calls and checked the 11 reference URLs: 7 returned 200, the 4 openai.com-family URLs could not be tested from this machine.
- 2026-11-16: Freebuff (DeepSeek) wrote docs/handoff.md — current state, rules, verified facts, open work and the BrowserOS neo blocker, for whoever resumes.
- 2026-11-16: Claude Code smoke-tested all 5 pages in headless Chromium (no console errors, progress tests pass) and published the repo to GitHub Pages at https://school-user.github.io/tsa-website/.
- 2026-11-16: Claude Code checked the lesson claims against saved copies of every source (all matched; UNESCO PDF read via OCR) and drafted a possible Module 4 in docs/content-m4-draft.md (draft only, not on the site).
- 2026-11-16: Codex reviewed the Module 4 draft against Modules 1-3 and the saved sources (read-only) and flagged an overstatement, repeated content and an unsupported line in Module 1. Claude fixed them, built module4.html from the corrected draft, softened one sentence in module1.html, and updated js/progress.js (4 modules, AIL2- codes, AIL1- codes still restore), js/dashboard.js, the nav links and tests/progress.test.js.
