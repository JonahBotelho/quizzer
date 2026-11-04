# Project guidance

- Read `README.md` before making changes.
- Leave Git operations (including commits, pushes, and pulls) to the user unless explicitly requested.
- Add unit tests in `src/tests/` for major features. Run checks appropriate to the change; see README for commands.

## Documentation

- Keep README focused on current setup, usage, quiz format, validation, deployment, and essential limitations.
- Update existing sections when behaviour changes. Omit change logs, lecture histories, exhaustive inventories, and implementation walkthroughs.
- Use short explanations and minimal examples. Keep contributor instructions here rather than duplicating them in README.

## Code style

- Use descriptive names and keep classes and functions focused.
- Use two-space indentation and one statement per line. Separate imports, declarations, and logical steps with blank lines; expand dense code rather than compressing it to meet line targets.
- Aim for files under 300 lines and functions under 30 lines; use judgement when splitting would reduce clarity. Describe each source file's purpose at the top.
- Comment non-obvious reasoning, assumptions, and constraints rather than restating code.
- Keep app-authored text, errors, and accessibility labels in feature JSON files under `src/locales/en-CA/`. Use BCP 47 locale tags and native `Intl` formatting; keep persisted codes and export fields separate from display text.
- Use Canadian English for interface copy; preserve technical syntax and user-provided content.

## End-to-end tests

- Keep Playwright tests in `e2e/`; see README for browser setup and validation commands.
- Declare descriptive locator variables for every page component and reuse them in actions and assertions instead of inline selector chains.
- Define all component locators in a page-bound factory near the top of each file, after imports. Initialize it at the start of each test or helper; create separate instances for different tabs.
- Define parameterized locators in that factory too. Resolve them beside their input data, such as the current question or a loop value.
- Group setup, actions, and assertions into readable steps with blank lines. Use Playwright's waiting assertions and browser clock controls instead of fixed delays.

## Quiz content

- Follow the JSON format in README: `id`, `question`, `options`, and `answer`. Answers are one-based: `answer: 3` selects the third option, not index 3.
- Use unique safe-integer IDs within each bank, plausible distractors, and exactly one correct option. Preserve existing IDs when editing questions.
- Keep question data in `src/data/quizzes/` and bundled display names in `src/locales/en-CA/bank-names.json`.
