/** Multiple bank choices, All exclusivity, and mixed attempt persistence. */
import { expect, test, type Page } from '@playwright/test';
import javascript from '../src/data/quizzes/sample-javascript.json' with { type: 'json' };
import python from '../src/data/quizzes/sample-python.json' with { type: 'json' };
import { currentQuestion } from './questionHelpers';

function defineComponents(page: Page) {
  const banks = page.getByRole('group', { name: 'Choose your question banks' });
  const allBanks = banks.getByRole('checkbox', { name: /^All [\d,]+ questions$/ });
  const javascriptBank = banks.getByRole('checkbox', { name: /^JavaScript / });
  const pythonBank = banks.getByRole('checkbox', { name: /^Python / });
  const checkedBanks = banks.getByRole('checkbox', { checked: true });
  const session = page.getByRole('region', { name: 'Your session' });
  const summary = session.locator('.session-summary');
  const start = session.getByRole('button', { name: 'Start practising', exact: true });
  const allQuestions = session.getByRole('radio', { name: 'All questions', exact: true });
  const wholeQuiz = session.getByRole('radio', { name: 'Whole quiz', exact: true });
  const minutes = session.getByRole('spinbutton', { name: 'Minutes for the whole quiz' });
  const questionNavigation = page.getByRole('navigation', { name: 'Your questions' });
  const questionButtons = questionNavigation.getByRole('button');
  const next = page.getByRole('button', { name: 'Next question' });
  const resume = page.getByRole('button', { name: 'Resume quiz', exact: true });
  const results = page.getByRole('heading', { name: 'Practice makes progress.' });
  const history = page.getByRole('button', { name: /^History/ });
  const viewResults = page.getByRole('button', { name: 'View results' });
  const repeat = page.getByRole('button', { name: 'Practice again', exact: true });

  return { allBanks, javascriptBank, pythonBank, checkedBanks, summary, start, allQuestions,
    wholeQuiz, minutes, questionButtons, next, resume, results, history, viewResults, repeat };
}

test('banks toggle independently and All is mutually exclusive in both directions', async ({ page }) => {
  const components = defineComponents(page);

  await page.goto('/');
  await components.allQuestions.check();
  await components.allBanks.check();
  await expect(components.checkedBanks).toHaveCount(1);

  await components.javascriptBank.check();
  await components.pythonBank.check();

  await expect(components.allBanks).not.toBeChecked();
  await expect(components.javascriptBank).toBeChecked();
  await expect(components.pythonBank).toBeChecked();
  await expect(components.checkedBanks).toHaveCount(2);
  await expect(components.summary).toContainText(`${javascript.length + python.length} questions`);

  await components.javascriptBank.uncheck();
  await expect(components.pythonBank).toBeChecked();
  await expect(components.summary).toContainText(`${python.length} questions`);
  await components.pythonBank.uncheck();
  await expect(components.checkedBanks).toHaveCount(0);
  await expect(components.start).toBeDisabled();

  await components.pythonBank.focus();
  await page.keyboard.press('Space');
  await expect(components.start).toBeEnabled();
  await components.javascriptBank.check();
  await components.allBanks.check();
  await expect(components.javascriptBank).not.toBeChecked();
  await expect(components.pythonBank).not.toBeChecked();
  await expect(components.checkedBanks).toHaveCount(1);
});

test('mixed banks contain only chosen questions and can resume and repeat after reload', async ({ page }) => {
  const components = defineComponents(page);
  const questions = [...javascript, ...python];

  await page.clock.install();
  await page.goto('/');
  await components.allBanks.check();
  await components.javascriptBank.check();
  await components.pythonBank.check();
  await components.allQuestions.check();
  await components.wholeQuiz.check();
  await components.minutes.fill('1');
  await components.start.click();

  await expect(components.questionButtons).toHaveCount(questions.length);
  const seen = new Set();
  for (let index = 0; index < questions.length; index++) {
    const question = await currentQuestion(page, questions);
    seen.add(question.question);
    if (index < questions.length - 1) await components.next.click();
  }
  expect(seen.size).toBe(questions.length);

  await page.reload();
  await components.resume.click();
  await expect(components.questionButtons).toHaveCount(questions.length);
  await page.clock.fastForward(61_000);
  await expect(components.results).toBeVisible();

  await page.reload();
  await components.history.click();
  await components.viewResults.click();
  await expect(components.repeat).toBeEnabled();
  await components.repeat.click();
  await expect(components.questionButtons).toHaveCount(questions.length);
});
