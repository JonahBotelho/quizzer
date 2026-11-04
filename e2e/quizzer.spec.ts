/** Full-browser coverage of the main journey, recovery, and responsive themes. */
import { currentQuestion } from './questionHelpers';
import { test, expect, type Page } from '@playwright/test';
import json from '../src/data/quizzes/json.json' with { type: 'json' };
import htmlAndCss from '../src/data/quizzes/html-css.json' with { type: 'json' };

// Locators are lazy; bind them to each test's page without sharing browser state.
function defineComponents(page: Page) {
  const jsonBankOption = page.getByRole('radio', { name: /JSON/ });
  const startButton = page.getByRole('button', { name: 'Start practicing', exact: true });
  const questionNavigationHeading = page.getByRole('heading', { name: 'Your questions' });
  const answerOptions = page.getByRole('radio');
  const nextButton = page.getByRole('button', { name: 'Next question', exact: true });
  const answerOptionAt = (position: number) => answerOptions.nth(position);
  const quizActions = page.locator('.quiz-actions');
  const finishButton = quizActions.getByRole('button', { name: 'Finish quiz' });
  const resultsHeading = page.getByRole('heading', { name: 'Practice makes progress.' });
  const scorePercentage = page.getByText('90.0%', { exact: true });
  const scoreSummary = page.getByText('9 out of 10 correct', { exact: true });
  const selectedAnswerLabel = page.getByText('Your answer', { exact: true });
  const correctAnswerLabel = page.getByText('Correct answer', { exact: true });
  const historyNavigationButton = page.getByRole('button', { name: /^History/ });
  const viewResultsButton = page.getByRole('button', { name: 'View results' });
  const deleteAttemptButton = page.getByRole('button', { name: 'Delete attempt' });
  const emptyHistoryHeading = page.getByRole('heading', { name: 'No completed quizzes' });
  const sidebarFinishButton = page.locator('.finish-sidebar');
  const errorMessage = page.getByRole('alert');
  const questionHeading = page.locator('#question-heading');
  const firstAnswerOption = answerOptions.nth(0);
  const secondAnswerOption = answerOptions.nth(1);
  const questionPosition = page.getByText('Question 2 of 10', { exact: true });
  const previousButton = page.getByRole('button', { name: 'Previous', exact: true });
  const backToPracticeButton = page.getByRole('button', { name: 'Back to practice' });
  const practiceNavigationButton = page.getByRole('button', { name: 'Practice', exact: true });
  const resumeButton = page.getByRole('button', { name: 'Resume quiz' });
  const perfectScoreHeading = page.getByRole('heading', { name: 'A clean sweep.' });
  const practiceAgainButton = page.getByRole('button', { name: 'Practice again' });
  const clearHistoryButton = page.getByRole('button', { name: 'Clear history' });
  const storageNotice = page.getByText(/Browser storage is unavailable/);
  const perfectScorePercentage = page.getByText('100.0%', { exact: true });
  const memoryStatus = page.getByText('Not saved · this tab only', { exact: true });
  const discardButton = page.getByRole('button', { name: 'Discard', exact: true });
  const bankSelectionHeading = page.getByRole('heading', { name: 'Choose your question bank' });
  const brandButton = page.getByRole('button', { name: 'quizzer', exact: true });
  const body = page.locator('body');
  const darkModeButton = page.getByRole('button', { name: 'Switch to dark mode' });

  return {
    jsonBankOption,
    startButton,
    questionNavigationHeading,
    answerOptions,
    nextButton,
    answerOptionAt,
    quizActions,
    finishButton,
    resultsHeading,
    scorePercentage,
    scoreSummary,
    selectedAnswerLabel,
    correctAnswerLabel,
    historyNavigationButton,
    viewResultsButton,
    deleteAttemptButton,
    emptyHistoryHeading,
    sidebarFinishButton,
    errorMessage,
    questionHeading,
    firstAnswerOption,
    secondAnswerOption,
    questionPosition,
    previousButton,
    backToPracticeButton,
    practiceNavigationButton,
    resumeButton,
    perfectScoreHeading,
    practiceAgainButton,
    clearHistoryButton,
    storageNotice,
    perfectScorePercentage,
    memoryStatus,
    discardButton,
    bankSelectionHeading,
    brandButton,
    body,
    darkModeButton,
  };
}

const questions = [...json, ...htmlAndCss];

async function start(page: Page) {
  const components = defineComponents(page);

  await page.goto('/');
  await components.jsonBankOption.check();
  await components.startButton.click();

  await expect(components.questionNavigationHeading).toBeVisible();
}

async function complete(page: Page, wrongFirst = false) {
  const components = defineComponents(page);

  for (let i = 0; i < 10; i++) {
    const question = await currentQuestion(page, questions);
    const answer =
      wrongFirst && i === 0 ? question.answer % question.options.length : question.answer - 1;
    const selectedAnswerOption = components.answerOptionAt(answer);
    await selectedAnswerOption.check();
    await expect(selectedAnswerOption).toBeChecked();
    if (i < 9) await components.nextButton.click();
  }

  await components.finishButton.click();

  await expect(components.resultsHeading).toBeVisible();
}

test('completes, scores, reviews mistakes, and reopens history', async ({ page }) => {
  const components = defineComponents(page);

  await start(page);
  await complete(page, true);

  await expect(components.scorePercentage).toBeVisible();
  await expect(components.scoreSummary).toBeVisible();
  await expect(components.selectedAnswerLabel).toBeVisible();
  await expect(components.correctAnswerLabel).toBeVisible();

  await components.historyNavigationButton.click();
  await components.viewResultsButton.click();
  await expect(components.scorePercentage).toBeVisible();
  await page.reload();
  await components.historyNavigationButton.click();
  await expect(components.viewResultsButton).toHaveCount(1);
  page.on('dialog', (dialog) => dialog.accept());
  await components.deleteAttemptButton.click();

  await expect(components.emptyHistoryHeading).toBeVisible();
});
test('blocks incomplete submission, revises answers, and resumes on refresh', async ({ page }) => {
  const components = defineComponents(page);

  await start(page);

  await components.sidebarFinishButton.click();

  await expect(components.errorMessage).toContainText('remaining 10 questions');

  const question = await components.questionHeading.innerText();

  await components.firstAnswerOption.check();
  await components.secondAnswerOption.check();
  await components.nextButton.click();
  await page.reload();

  await expect(components.questionPosition).toBeVisible();

  await components.previousButton.click();
  await expect(components.questionHeading).toHaveText(question);
  await expect(components.secondAnswerOption).toBeChecked();

  await components.backToPracticeButton.click();
  await components.historyNavigationButton.click();
  await components.practiceNavigationButton.click();

  await expect(components.resumeButton).toBeVisible();
});
test('perfect score and clearing history preserves an active quiz', async ({ page }) => {
  const components = defineComponents(page);

  await start(page);
  await complete(page);

  await expect(components.perfectScoreHeading).toBeVisible();

  await components.practiceAgainButton.click();
  await components.firstAnswerOption.check();
  await components.historyNavigationButton.click();
  page.on('dialog', (dialog) => dialog.accept());
  await components.clearHistoryButton.click();
  await components.practiceNavigationButton.click();
  await components.resumeButton.click();
  await expect(components.firstAnswerOption).toBeChecked();
});

test('storage unavailable still permits completion in memory', async ({ page }) => {
  const components = defineComponents(page);

  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new Error('Unavailable');
      },
    });
  });
  await start(page);

  await expect(components.storageNotice).toBeVisible();
  await complete(page);

  await expect(components.perfectScorePercentage).toBeVisible();
  await expect(components.memoryStatus).toBeVisible();
});
test('tabs share active progress and cannot resurrect a discarded attempt', async ({
  page,
  context,
}) => {
  const components = defineComponents(page);

  await start(page);

  const other = await context.newPage();
  const otherComponents = defineComponents(other);
  await other.goto('/');

  await expect(otherComponents.questionHeading).toBeVisible();

  await components.secondAnswerOption.check();

  await expect(otherComponents.secondAnswerOption).toBeChecked();

  await components.backToPracticeButton.click();
  page.on('dialog', (dialog) => dialog.accept());
  await components.discardButton.click();

  await expect(otherComponents.bankSelectionHeading).toBeVisible();
  await other.reload();

  await expect(otherComponents.resumeButton).toHaveCount(0);
});
test('responsive layouts and keyboard navigation in both themes', async ({ page }, testInfo) => {
  const components = defineComponents(page);

  await page.goto('/');
  await page.screenshot({ path: testInfo.outputPath('desktop-light.png'), fullPage: true });
  await page.keyboard.press('Tab');

  await expect(components.brandButton).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });

  await expect
    .poll(() => components.body.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBe(0);
  await page.screenshot({ path: testInfo.outputPath('mobile-light.png'), fullPage: true });
  await components.darkModeButton.click();
  await page.screenshot({ path: testInfo.outputPath('mobile-dark.png'), fullPage: true });
  await components.jsonBankOption.check();
  await components.startButton.click();

  await expect(components.questionHeading).toBeFocused();

  await components.firstAnswerOption.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');

  await expect(components.secondAnswerOption).toBeChecked();
  await page.screenshot({ path: testInfo.outputPath('mobile-quiz-dark.png'), fullPage: true });
  await expect
    .poll(() => components.body.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBe(0);
  await complete(page, true);
  await page.screenshot({ path: testInfo.outputPath('mobile-results-dark.png'), fullPage: true });
  await components.historyNavigationButton.click();
  await page.screenshot({ path: testInfo.outputPath('mobile-history-dark.png'), fullPage: true });
  await expect
    .poll(() => components.body.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBe(0);
});

test('replacement confirmation preserves progress when cancelled', async ({ page }) => {
  const components = defineComponents(page);

  await start(page);

  const originalQuestion = await components.questionHeading.innerText();

  await components.firstAnswerOption.check();
  await components.backToPracticeButton.click();
  page.once('dialog', (dialog) => dialog.dismiss());
  await components.startButton.click();
  await components.resumeButton.click();
  await expect(components.questionHeading).toHaveText(originalQuestion);
  await expect(components.firstAnswerOption).toBeChecked();
});
