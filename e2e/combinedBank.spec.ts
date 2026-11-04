/** Full-library selection, imported additions, and the saved combined quiz lifecycle. */
import { readFileSync, readdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// Locators are lazy; bind them to each test's page without sharing browser state.
function defineComponents(page: Page) {
  const banks = page.getByRole('radiogroup', { name: 'Choose your question bank' });
  const combinedBankOption = banks.getByRole('radio', {
    name: `All ${bundledCount} questions`,
    exact: true,
  });
  const allQuestionsOption = page.getByRole('radio', { name: 'All questions', exact: true });
  const wholeQuizOption = page.getByRole('radio', { name: 'Whole quiz', exact: true });
  const durationInput = page.getByRole('spinbutton', { name: 'Minutes for the whole quiz' });
  const startButton = page.getByRole('button', { name: 'Start practicing', exact: true });
  const combinedQuizHeading = page.getByRole('heading', { name: 'All', exact: true });
  const questionPosition = page.getByText(`Question 1 of ${bundledCount}`, { exact: true });
  const questionNavigation = page.getByRole('navigation', { name: 'Your questions' });
  const questionButtons = questionNavigation.getByRole('button');
  const questionHeading = page.locator('#question-heading');
  const answerOptions = page.getByRole('radio');
  const firstAnswerOption = answerOptions.first();
  const resultsHeading = page.getByRole('heading', { name: 'Practice makes progress.' });
  const practiceAgainButton = page.getByRole('button', { name: 'Practice again', exact: true });
  const importButton = page.getByRole('button', { name: 'Import quiz JSON', exact: true });
  const quizImportInput = page.locator('#quiz-import');
  const combinedBankWithImportOption = banks.getByRole('radio', {
    name: `All ${bundledCount + 1} questions`,
    exact: true,
  });
  const twentyFiveQuestionsOption = page.getByRole('radio', { name: '25 questions', exact: true });
  const fixedLengthQuestionPosition = page.getByText('Question 1 of 25', { exact: true });

  return {
    banks,
    combinedBankOption,
    allQuestionsOption,
    wholeQuizOption,
    durationInput,
    startButton,
    combinedQuizHeading,
    questionPosition,
    questionNavigation,
    questionButtons,
    questionHeading,
    answerOptions,
    firstAnswerOption,
    resultsHeading,
    practiceAgainButton,
    importButton,
    quizImportInput,
    combinedBankWithImportOption,
    twentyFiveQuestionsOption,
    fixedLengthQuestionPosition,
  };
}

const quizDirectory = new URL('../src/data/quizzes/', import.meta.url);
const bundledCount = readdirSync(quizDirectory)
  .filter((file) => file.endsWith('.json'))
  .reduce(
    (total, file) => total + JSON.parse(readFileSync(new URL(file, quizDirectory), 'utf8')).length,
    0,
  );

test('all banks and all questions survive refresh, timed completion, and repeat', async ({
  page,
}) => {
  const components = defineComponents(page);

  await page.clock.install();
  await page.goto('/');
  await components.combinedBankOption.check();
  await components.allQuestionsOption.check();
  await components.wholeQuizOption.check();
  await components.durationInput.fill('1');
  await components.startButton.click();

  await expect(components.combinedQuizHeading).toBeVisible();
  await expect(components.questionPosition).toBeVisible();
  await expect(components.questionButtons).toHaveCount(bundledCount);

  const firstQuestion = await components.questionHeading.innerText();

  await components.firstAnswerOption.check();
  await page.reload();
  await expect(components.questionHeading).toHaveText(firstQuestion);
  await expect(components.firstAnswerOption).toBeChecked();
  await page.clock.fastForward(61_000);

  await expect(components.resultsHeading).toBeVisible();

  await components.practiceAgainButton.click();
  await expect(components.questionPosition).toBeVisible();
});

test('all banks includes new imports and respects a fixed question count', async ({ page }) => {
  const components = defineComponents(page);

  await page.goto('/');

  await expect(components.importButton).toBeEnabled();

  await components.quizImportInput.setInputFiles({
    name: 'extra.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify([{ id: 1, question: 'Extra question?', options: ['One', 'Two'], answer: 2 }]),
    ),
  });
  await components.combinedBankWithImportOption.check();
  await components.twentyFiveQuestionsOption.check();
  await components.startButton.click();

  await expect(components.combinedQuizHeading).toBeVisible();
  await expect(components.fixedLengthQuestionPosition).toBeVisible();
});
