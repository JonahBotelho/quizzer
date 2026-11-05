# quizzer

A practice quiz app built with React, TypeScript, and Vite. Practice bundled, imported, or AI-generated questions, get immediate feedback, and review saved results. Practice and JSON import run entirely in the browser. Optional AI generation uses a Vercel function; no accounts are required.

## Run locally

Use Node.js 24 LTS and npm:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite (normally http://127.0.0.1:5173).

For generation, copy `.env.example` to `.env.local`, fill in the server-only configuration below, and run `npm run dev:full`. This uses the Vercel CLI (installed through npx when needed); its initial setup may ask you to sign in and link a project. The frontend-only dev and preview servers leave generation unavailable.

| Environment variable | Value |
| --- | --- |
| `LLM_PROVIDER` | `openai` or `gemini` |
| `LLM_MODEL` | A model supporting structured output, the reference text budget, and 16,384 output tokens |
| `OPENAI_API_KEY` | Required when using OpenAI |
| `GEMINI_API_KEY` | Required when using Gemini |
| `QUIZ_GENERATION_PASSWORD` | Optional shared password; leave unset or blank to allow generation without a password |

Keep these values server-only; never prefix them with `VITE_`. Generation is unavailable if required values are missing. Availability checks do not call a model.

## Practice

- Select one or more question banks, or **All** for the full library. **All** is mutually exclusive with individual banks. Then select 10, 25, 50, or all questions from the selected pool. Shorter pools use every available question.
- Questions are shuffled without repetition within an attempt. Your first answer to each question is final, with immediate feedback. You can revisit answered questions to review them.
- **Finish quiz** ends the attempt at any time and scores only answered questions: five correct answers out of five answered earns 100%, even in a longer quiz. Unanswered questions are excluded from the score and mistake review. Finishing without any answers saves an unscored attempt; **Practice again** keeps the original quiz length.
- Choose no time limit, a per-question timer, or a whole-quiz timer. Timers continue when navigating away, refreshing, or closing the tab; unanswered timeouts count as incorrect. In per-question mode, you can revisit answered or expired questions to review them, with answer choices locked.
- Opening or refreshing the app shows the practice setup. Choose **Resume quiz** to continue an unfinished attempt, or review completed attempts in History. Click anywhere on the sun and moon toggle in navigation to switch between light and dark mode; the app follows your system theme until you choose one.

## Generate a quiz

Choose **Generate quiz** on the setup screen. Enter a title, description of the learning goals, and 1–50 questions (default 10). If a generation password is configured, enter it in the password field; otherwise that field is hidden and no password is needed. Optionally attach up to five PDF, DOCX, TXT, or Markdown files: 10 MiB each, 20 MiB combined, and 100,000 extracted characters in total. Text files must be UTF-8. Encrypted files and wholly scanned PDFs are unsupported; PDF images and formatting are not read. Each file has a 30-second extraction deadline.

Original files stay on your device. The title, description, and extracted reference text are sent through the generation server to the configured AI provider. The app does not persist these requests. Both providers are called with `store: false` to disable stored response/interaction resources; this does not override their broader retention policies. See [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) and [Gemini data retention](https://aistudio.google.com/docs/interactions-overview#data-storage-retention).

The generated quiz is saved only in this browser and selected with **All** questions. Existing timers and unfinished attempts are preserved. **Download quiz JSON** creates a backup that can be imported later, including when browser saving fails. Passwords, descriptions, and reference documents are not saved with the quiz.

Generation makes one model request with no automatic retries, a 120-second deadline, and a 16,384-token output cap. Invalid or incomplete responses are rejected; reduce the material or question count if the configured model reaches its limits. Cancelling stops waiting but may not stop an already-running provider request. AI-generated questions and answers can contain factual mistakes; check them against your sources.

## Quiz files

Choose **Import quiz JSON** to add a local file or **Download sample JSON** for an editable example. Expand **About quiz JSON files** below these actions for format guidance. Imports accept a single question object or a nonempty array, and are saved in the current browser.

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

Progress, results, imports, and generated quizzes stay in the current browser profile and origin (scheme, hostname, and port). JSON imports are never uploaded; generation sends the brief and extracted reference text to the configured provider. There is no cross-device sync, quiz sharing, or results export; clearing browser storage removes saved data. Keep original quiz files and download generated quiz backups. If storage fails, the app warns you and works in memory until the tab closes or refreshes.

This is a practice tool: answers are included in the browser and timers rely on the device clock. Serve it over HTTP(S); offline/PWA support is not included.

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

Generation tests mock model calls and need no keys. Document browser tests exercise the bundled PDF and DOCX workers. To smoke-test a real provider, configure its environment variables, run `npm run dev:full`, and generate a small quiz with a reference file. Repeat with the other provider when validating both integrations; live requests use your API budget.

## Deploy

For generation, deploy the repository as a Vite project on Vercel and set the server environment variables above in the relevant deployment environments. `vercel.json` enables Fluid Compute and gives the generation function 180 seconds. Confirm that API requests reach the function rather than an SPA fallback.

Before enabling shared generation, configure a Vercel Firewall rate-limit rule matching **POST `/api/generate-quiz`**, keyed by source IP, with **10 requests per 60 seconds** and a **429** response. Apply it to each accessible deployment using the API key. The optional shared password and request/output limits complement this rule; no application database is required. See [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting).

`npm run build` also creates `dist/` for static HTTP(S) hosts; no SPA rewrite rules are needed. Static deployments support practice and imports with generation unavailable. Use `npm run preview` to check that frontend build locally.
