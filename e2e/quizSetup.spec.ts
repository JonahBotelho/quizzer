/** Quiz-length choices and bank selection remain consistent across setup changes. */
import { expect, test, type Page } from '@playwright/test';
import python from '../src/data/quizzes/sample-python.json' with { type: 'json' };
import javascript from '../src/data/quizzes/sample-javascript.json' with { type: 'json' };
import appCopy from '../src/locales/en-CA/app.json' with { type: 'json' };
import { currentQuestion } from './questionHelpers';

// Locators are lazy; bind them to each test's page without sharing browser state.
function defineComponents(page: Page) {
  const allBanksOption = page.getByRole('checkbox', { name: /^All [\d,]+ questions$/ });
  const counts = page.getByRole('radiogroup', { name: appCopy.chooseLength });
  const lengthOptions = counts.getByRole('radio');
  const lengthOption = (name: string) => counts.getByRole('radio', { name, exact: true });
  const fiftyQuestionsOption = counts.getByRole('radio', { name: '50 questions', exact: true });
  const javascriptBankOption = page.getByRole('checkbox', { name: /JavaScript/ });
  const javascriptSessionSummary = page.getByText(`${javascript.length} questions · No time limit`, {
    exact: true,
  });
  const pythonBankOption = page.getByRole('checkbox', { name: /Python/ });
  const pythonSessionSummary = page.getByText(`${python.length} questions · No time limit`, {
    exact: true,
  });
  const allQuestionsOption = counts.getByRole('radio', { name: 'All questions', exact: true });
  const darkModeButton = page.getByRole('button', { name: 'Switch to dark mode' });
  const documentRoot = page.locator('html');
  const startButton = page.getByRole('button', { name: 'Start practising', exact: true });
  const javascriptQuestionPosition = page.getByText(`Question 1 of ${javascript.length}`, {
    exact: true,
  });
  const nextButton = page.getByRole('button', { name: 'Next question' });
  const markupAnswer = (text: string | RegExp) =>
    page.getByText(text, {
      exact: true,
    });
  const pythonQuestionPosition = page.getByText(`Question 1 of ${python.length}`, { exact: true });
  const questionNavigation = page.getByRole('navigation', { name: 'Your questions' });
  const questionButtons = questionNavigation.getByRole('button');

  return {
    allBanksOption,
    counts,
    lengthOptions,
    lengthOption,
    fiftyQuestionsOption,
    javascriptBankOption,
    javascriptSessionSummary,
    pythonBankOption,
    pythonSessionSummary,
    allQuestionsOption,
    darkModeButton,
    documentRoot,
    startButton,
    javascriptQuestionPosition,
    nextButton,
    markupAnswer,
    pythonQuestionPosition,
    questionNavigation,
    questionButtons,
  };
}

test('fixed lengths stay enabled and preserve selection across question banks', async ({
  page,
}) => {
  const components = defineComponents(page);

  await page.goto('/');

  await expect(components.lengthOptions).toHaveCount(4);

  for (const name of ['10 questions', '25 questions', '50 questions', 'All questions']) {
    const lengthOption = components.lengthOption(name);
    await expect(lengthOption).toBeEnabled();
  }

  await components.fiftyQuestionsOption.check();
  await components.allBanksOption.check();
  await components.javascriptBankOption.check();
  await expect(components.fiftyQuestionsOption).toBeChecked();
  await expect(components.javascriptSessionSummary).toBeVisible();

  await components.allBanksOption.check();
  await components.pythonBankOption.check();
  await expect(components.fiftyQuestionsOption).toBeChecked();
  await expect(components.pythonSessionSummary).toBeVisible();

  await components.allQuestionsOption.check();
  await components.allBanksOption.check();
  await components.javascriptBankOption.check();
  await expect(components.allQuestionsOption).toBeChecked();
  await expect(components.lengthOptions).toHaveCount(4);

  await components.darkModeButton.click();
  await page.reload();

  await expect(components.documentRoot).toHaveAttribute('data-theme', 'dark');
  await components.allBanksOption.check();
  await components.javascriptBankOption.check();
  await components.fiftyQuestionsOption.check();
  await components.startButton.click();

  await expect(components.javascriptQuestionPosition).toBeVisible();

  const markupQuestion = javascript.find((question) =>
    question.options.some((option) => option.startsWith('<h1>')),
  )!;

  for (let i = 0; i < javascript.length; i++) {
    if ((await currentQuestion(page, javascript)).id === markupQuestion.id) break;
    if (i < javascript.length - 1) await components.nextButton.click();
  }

  expect((await currentQuestion(page, javascript)).id).toBe(markupQuestion.id);

  const markupAnswer = components.markupAnswer(markupQuestion.options[markupQuestion.answer - 1]);
  await expect(markupAnswer).toBeVisible();
});

test('all questions starts a quiz using the full selected bank', async ({ page }) => {
  const components = defineComponents(page);

  await page.goto('/');
  await components.allBanksOption.check();
  await components.pythonBankOption.check();
  await components.allQuestionsOption.check();
  await components.startButton.click();

  await expect(components.pythonQuestionPosition).toBeVisible();
  await expect(components.questionButtons).toHaveCount(python.length);
});
