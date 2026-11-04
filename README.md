# quizzer

A browser-only practice quiz app built with React, TypeScript, and Vite. Practice bundled or imported questions, get immediate feedback, and review saved results. No backend, accounts, API keys, or environment variables are required.

## Run locally

Use Node.js 24 LTS and npm:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite (normally http://127.0.0.1:5173).

## Practice

- Choose a question bank or **All** to mix banks, then select 10, 25, 50, or all questions. Shorter banks use every available question.
- Questions are shuffled without repetition within an attempt. Answers show immediate feedback and can be revised while time remains.
- Choose no time limit, a per-question timer, or a whole-quiz timer. Timers continue when navigating away, refreshing, or closing the tab; unanswered timeouts count as incorrect.
- Resume unfinished attempts, review mistakes in History, and switch between light and dark themes.

## Quiz files

Choose **Import quiz JSON** to add a local file or **Download sample JSON** for an editable example. Imports accept a single question object or a nonempty array, and are saved in the current browser.

To bundle a bank with the app, add a UTF-8 JSON array to `src/data/quizzes/`:

```json
[
  {
    "id": 1,
    "question": "Which option is correct?",
    "options": ["Option one", "Option two", "Option three", "Option four"],
    "answer": 3
  }
]
```

**Answers are one-based:** `3` means the third option. Use unique safe-integer IDs within each bank, nonblank question and option text, and at least two options with one correct answer.

For questions containing code, replace the `question` string with an ordered array of blocks:

```json
[
  { "type": "text", "text": "What does this print?" },
  { "type": "code", "code": "const total = 4 + 3;\nconsole.log(total);" }
]
```

Code preserves supplied whitespace and is displayed literally, never executed. Options remain plain strings.

Bundled filenames are stable bank identifiers. Add display names to `src/locales/en-CA/bank-names.json` and rebuild/redeploy after changing bundled banks. Invalid banks are excluded with an error; saved attempts retain their original questions.

## Saved data and limitations

Progress, results, and imports stay in the current browser profile and origin (scheme, hostname, and port). Imports are never uploaded. There is no cross-device sync or results export; clearing browser storage removes saved data. Keep your original quiz files. If storage fails, the app warns you and works in memory until the tab closes or refreshes.

This is a practice tool: answers are included in the browser and timers rely on the device clock. Serve it over HTTP(S); offline/PWA support is not included.

## Project structure

```text
quizzer/
├── e2e/                    # Playwright browser tests
│   ├── bankOrganisation.spec.ts # Bundled bank names and question counts
│   ├── combinedBank.spec.ts # Practice across all banks
│   ├── feedback.spec.ts     # Immediate answer feedback
│   ├── header.spec.ts       # Header layout stability
│   ├── import.spec.ts       # Quiz import and sample download
│   ├── localisation.spec.ts # Locale copy and accessibility labels
│   ├── questionContent.spec.ts # Text/code rendering and responsive layouts
│   ├── questionHelpers.ts   # Shared question-fixture lookup
│   ├── quizSetup.spec.ts    # Bank selection and quiz length
│   ├── quizzer.spec.ts      # Practice, history, recovery, and themes
│   └── timing.spec.ts       # Timer expiry and refresh recovery
├── public/                 # Static assets
├── src/
│   ├── components/         # Quiz setup, practice, results, and history
│   ├── core/               # Quiz types, validation, scoring, and timing
│   ├── data/
│   │   ├── quizzes/        # Bundled question banks
│   │   └── sample-quiz.json
│   ├── hooks/              # Theme, quiz library, and session hooks
│   ├── locales/en-CA/      # Interface text and bank display names
│   ├── storage/            # Browser persistence and session commands
│   ├── tests/              # Unit and integration tests
│   ├── App.tsx             # App shell
│   ├── main.tsx            # Entry point
│   └── styles.css          # Shared styles
├── AGENTS.md               # Contributor guidance
├── package.json            # Dependencies and npm scripts
├── playwright.config.ts    # Browser-test configuration
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Development and build configuration
```

## Validate

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

Unit/integration tests live in `src/tests/`; browser tests live in `e2e/`. Playwright builds the app and starts its own preview server on port 4174, which must be free.

## Deploy

`npm run build` creates `dist/`. Deploy its contents to any static HTTP(S) host; no SPA rewrite rules are needed. Use `npm run preview` to check the production build locally.
