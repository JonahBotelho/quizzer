/** Timed-mode journeys use the browser clock rather than real-time sleeps. */
import { currentQuestion } from './questionHelpers';
import { test, expect, type Page } from '@playwright/test';
import json from '../src/data/quizzes/json.json' with { type: 'json' };

// Locators are lazy; bind them to each test's page without sharing browser state.
function defineComponents(page: Page) {
  const jsonBankOption = page.getByRole('radio', { name: /JSON/ });
  const startButton = page.getByRole('button', { name: 'Start practicing', exact: true });
  const questionHeading = page.locator('#question-heading');
  const untimedOption = page.getByRole('radio', { name: 'No time limit', exact: true });
  const wholeQuizOption = page.getByRole('radio', { name: 'Whole quiz', exact: true });
  const durationInput = page.getByRole('spinbutton');
  const timeValidationMessage = page.getByText('Choose a valid time limit', { exact: false });
  const countdown = page.getByRole('timer');
  const questionPosition = page.getByText('Question 1 of 10', { exact: true });
  const answerOptions = page.getByRole('radio');
  const firstAnswerOption = answerOptions.first();
  const quizDurationInput = page.getByRole('spinbutton', { name: 'Minutes for the whole quiz' });
  const answerOptionAt = (position: number) => answerOptions.nth(position);
  const answerFeedback = page.locator('#answer-feedback');
  const resultsHeading = page.getByRole('heading', { name: 'Practice makes progress.' });
  const scoreSummary = page.getByText('1 out of 10 correct', { exact: true });
  const timedOutAnswers = page.getByText('No answer — time ran out', { exact: true });
  const practiceAgainButton = page.getByRole('button', { name: 'Practice again' });
  const perQuestionOption = page.getByRole('radio', { name: 'Per question', exact: true });
  const questionDurationInput = page.getByRole('spinbutton', { name: 'Seconds per question' });
  const darkModeButton = page.getByRole('button', { name: 'Switch to dark mode' });
  const secondQuestionPosition = page.getByText('Question 2 of 10', { exact: true });
  const thirdQuestionPosition = page.getByText('Question 3 of 10', { exact: true });
  const timedOutQuestionButton = page.getByRole('button', {
    name: 'Question 2: timed out, incorrect',
    exact: true,
  });
  const correctQuestionButton = page.getByRole('button', {
    name: 'Question 1: answered correctly',
    exact: true,
  });
  const body = page.locator('body');
  const historyNavigationButton = page.getByRole('button', { name: /^History/ });
  const viewResultsButton = page.getByRole('button', { name: 'View results' });
  const zeroCorrectSummary = page.getByText('0 out of 10 correct', { exact: true });

  return {
    jsonBankOption,
    startButton,
    questionHeading,
    untimedOption,
    wholeQuizOption,
    durationInput,
    timeValidationMessage,
    countdown,
    questionPosition,
    answerOptions,
    firstAnswerOption,
    quizDurationInput,
    answerOptionAt,
    answerFeedback,
    resultsHeading,
    scoreSummary,
    timedOutAnswers,
    practiceAgainButton,
    perQuestionOption,
    questionDurationInput,
    darkModeButton,
    secondQuestionPosition,
    thirdQuestionPosition,
    timedOutQuestionButton,
    correctQuestionButton,
    body,
    historyNavigationButton,
    viewResultsButton,
    zeroCorrectSummary,
  };
}

async function setup(page: Page) {
  const components = defineComponents(page);

  const time = new Date('2026-10-25T20:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
  await page.goto('/');
  await components.jsonBankOption.check();
}

async function start(page: Page) {
  const components = defineComponents(page);

  await components.startButton.click();

  await expect(components.questionHeading).toBeVisible();
}

test('no time limit is the default and stays untimed after a long interval', async ({ page }) => {
  const components = defineComponents(page);

  await setup(page);

  await expect(components.untimedOption).toBeChecked();

  await components.wholeQuizOption.check();
  await components.durationInput.fill('0');

  await expect(components.startButton).toBeDisabled();
  await components.durationInput.fill('');

  await expect(components.timeValidationMessage).toBeVisible();
  await components.untimedOption.check();
  await start(page);

  await expect(components.countdown).toHaveCount(0);
  await page.clock.fastForward(86400000);

  await expect(components.questionPosition).toBeVisible();
  await expect(components.firstAnswerOption).toBeEnabled();
});
test('whole-quiz expiry submits unanswered questions as incorrect and survives refresh', async ({
  page,
}) => {
  const components = defineComponents(page);

  await setup(page);

  await components.wholeQuizOption.check();
  await components.quizDurationInput.fill('1');
  await start(page);

  const current = await currentQuestion(page, json);

  const correctAnswerOption = components.answerOptionAt(current.answer - 1);
  await correctAnswerOption.check();

  await expect(components.answerFeedback).toContainText('Correct!');
  await page.clock.fastForward(30000);

  await expect(components.countdown).toHaveText('00:30');
  await page.reload();
  await expect(components.countdown).toHaveText('00:30');
  await page.clock.fastForward(30001);

  await expect(components.resultsHeading).toBeVisible();
  await expect(components.scoreSummary).toBeVisible();
  await expect(components.timedOutAnswers).toHaveCount(9);

  await components.practiceAgainButton.click();
  await expect(components.countdown).toHaveText('01:00');
});
test('per-question expiry advances, locks expired questions, and reviews timeouts', async ({
  page,
}, testInfo) => {
  const components = defineComponents(page);

  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await components.perQuestionOption.check();
  await components.questionDurationInput.fill('2');
  await page.screenshot({ path: testInfo.outputPath('timing-setup-mobile.png'), fullPage: true });
  await components.darkModeButton.click();
  await page.screenshot({
    path: testInfo.outputPath('timing-setup-mobile-dark.png'),
    fullPage: true,
  });
  await start(page);

  const current = await currentQuestion(page, json);

  const correctAnswerOption = components.answerOptionAt(current.answer - 1);
  await correctAnswerOption.check();

  await expect(components.answerFeedback).toContainText('Correct!');
  await page.clock.fastForward(2000);

  await expect(components.secondQuestionPosition).toBeVisible();
  await page.clock.fastForward(2000);

  await expect(components.thirdQuestionPosition).toBeVisible();
  await expect(components.timedOutQuestionButton).toBeDisabled();
  await expect(components.correctQuestionButton).toHaveClass(/correct/);
  await page.reload();
  await expect(components.thirdQuestionPosition).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('timing-quiz-mobile.png'), fullPage: true });

  await expect
    .poll(() => components.body.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBe(0);
  await page.clock.fastForward(16001);

  await expect(components.resultsHeading).toBeVisible();
  await expect(components.scoreSummary).toBeVisible();
  await expect(components.timedOutAnswers).toHaveCount(9);

  await components.historyNavigationButton.click();
  await components.viewResultsButton.click();
  await expect(components.scoreSummary).toBeVisible();
});
test('whole-quiz countdown keeps running while viewing setup or history', async ({ page }) => {
  const components = defineComponents(page);

  await setup(page);

  await components.wholeQuizOption.check();
  await components.durationInput.fill('1');
  await start(page);

  await components.historyNavigationButton.click();
  await page.clock.fastForward(60001);

  await expect(components.resultsHeading).toBeVisible();
  await expect(components.zeroCorrectSummary).toBeVisible();
});
