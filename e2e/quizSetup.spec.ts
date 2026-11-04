/** Quiz-length choices and bank selection remain consistent across setup changes. */
import { expect, test, type Page } from '@playwright/test';
import json from '../src/data/quizzes/json.json' with { type: 'json' };
import htmlAndCss from '../src/data/quizzes/html-css.json' with { type: 'json' };
import appCopy from '../src/locales/en-CA/app.json' with { type: 'json' };
import { currentQuestion } from './questionHelpers';

// Locators are lazy; bind them to each test's page without sharing browser state.
function defineComponents(page: Page) {
  const counts = page.getByRole('radiogroup', { name: appCopy.chooseLength });
  const lengthOptions = counts.getByRole('radio');
  const lengthOption = (name: string) => counts.getByRole('radio', { name, exact: true });
  const fiftyQuestionsOption = counts.getByRole('radio', { name: '50 questions', exact: true });
  const htmlBankOption = page.getByRole('radio', { name: /HTML/ });
  const htmlSessionSummary = page.getByText(`${htmlAndCss.length} questions · No time limit`, {
    exact: true,
  });
  const jsonBankOption = page.getByRole('radio', { name: /JSON/ });
  const jsonSessionSummary = page.getByText(`${json.length} questions · No time limit`, {
    exact: true,
  });
  const allQuestionsOption = counts.getByRole('radio', { name: 'All questions', exact: true });
  const darkModeButton = page.getByRole('button', { name: 'Switch to dark mode' });
  const documentRoot = page.locator('html');
  const startButton = page.getByRole('button', { name: 'Start practicing', exact: true });
  const htmlQuestionPosition = page.getByText(`Question 1 of ${htmlAndCss.length}`, {
    exact: true,
  });
  const nextButton = page.getByRole('button', { name: 'Next question' });
  const markupAnswer = (text: string | RegExp) =>
    page.getByText(text, {
      exact: true,
    });
  const jsonQuestionPosition = page.getByText(`Question 1 of ${json.length}`, { exact: true });
  const questionNavigation = page.getByRole('navigation', { name: 'Your questions' });
  const questionButtons = questionNavigation.getByRole('button');

  return {
    counts,
    lengthOptions,
    lengthOption,
    fiftyQuestionsOption,
    htmlBankOption,
    htmlSessionSummary,
    jsonBankOption,
    jsonSessionSummary,
    allQuestionsOption,
    darkModeButton,
    documentRoot,
    startButton,
    htmlQuestionPosition,
    nextButton,
    markupAnswer,
    jsonQuestionPosition,
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
  await components.htmlBankOption.check();
  await expect(components.fiftyQuestionsOption).toBeChecked();
  await expect(components.htmlSessionSummary).toBeVisible();

  await components.jsonBankOption.check();
  await expect(components.fiftyQuestionsOption).toBeChecked();
  await expect(components.jsonSessionSummary).toBeVisible();

  await components.allQuestionsOption.check();
  await components.htmlBankOption.check();
  await expect(components.allQuestionsOption).toBeChecked();
  await expect(components.lengthOptions).toHaveCount(4);

  await components.darkModeButton.click();
  await page.reload();

  await expect(components.documentRoot).toHaveAttribute('data-theme', 'dark');
  await components.htmlBankOption.check();
  await components.fiftyQuestionsOption.check();
  await components.startButton.click();

  await expect(components.htmlQuestionPosition).toBeVisible();

  const markupQuestion = htmlAndCss.find((question) =>
    question.options.some((option) => option.startsWith('<h1>')),
  )!;

  for (let i = 0; i < htmlAndCss.length; i++) {
    if ((await currentQuestion(page, htmlAndCss)).id === markupQuestion.id) break;
    if (i < htmlAndCss.length - 1) await components.nextButton.click();
  }

  expect((await currentQuestion(page, htmlAndCss)).id).toBe(markupQuestion.id);

  const markupAnswer = components.markupAnswer(markupQuestion.options[markupQuestion.answer - 1]);
  await expect(markupAnswer).toBeVisible();
});

test('all questions starts a quiz using the full selected bank', async ({ page }) => {
  const components = defineComponents(page);

  await page.goto('/');
  await components.jsonBankOption.check();
  await components.allQuestionsOption.check();
  await components.startButton.click();

  await expect(components.jsonQuestionPosition).toBeVisible();
  await expect(components.questionButtons).toHaveCount(json.length);
});
