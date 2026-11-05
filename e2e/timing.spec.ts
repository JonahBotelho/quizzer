/** Timed-mode journeys use the browser clock rather than real-time sleeps. */
import { currentQuestion } from './questionHelpers';
import { test, expect, type Page } from '@playwright/test';
import python from '../src/data/quizzes/sample-python.json' with { type: 'json' };

// Locators are lazy; bind them to each test's page without sharing browser state.
function defineComponents(page: Page) {
  const allBanksOption = page.getByRole('checkbox', { name: /^All [\d,]+ questions$/ });
  const pythonBankOption = page.getByRole('checkbox', { name: /Python/ });
  const startButton = page.getByRole('button', { name: 'Start practising', exact: true });
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
  const resumeButton = page.getByRole('button', { name: 'Resume quiz', exact: true });
  const previousButton = page.getByRole('button', { name: 'Previous', exact: true });
  const nextButton = page.getByRole('button', { name: 'Next question', exact: true });
  const lockedAnswerHint = page.getByText('Time’s up for this question. Its answer is locked.', {
    exact: true,
  });
  const disabledAnswerOptions = page.locator('.answers input:disabled');

  return {
    allBanksOption,
    pythonBankOption,
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
    resumeButton,
    previousButton,
    nextButton,
    lockedAnswerHint,
    disabledAnswerOptions,
  };
}

async function setup(page: Page) {
  const components = defineComponents(page);

  const time = new Date('2026-10-25T20:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
  await page.goto('/');
  await components.allBanksOption.check();
  await components.pythonBankOption.check();
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

  const current = await currentQuestion(page, python);

  const correctAnswerOption = components.answerOptionAt(current.answer - 1);
  await correctAnswerOption.check();

  await expect(components.answerFeedback).toContainText('Correct!');
  await page.clock.fastForward(30000);

  await expect(components.countdown).toHaveText('00:30');
  await page.reload();
  await components.resumeButton.click();
  await expect(components.countdown).toHaveText('00:30');
  await page.clock.fastForward(30001);

  await expect(components.resultsHeading).toBeVisible();
  await expect(components.scoreSummary).toBeVisible();
  await expect(components.timedOutAnswers).toHaveCount(9);

  await components.practiceAgainButton.click();
  await expect(components.countdown).toHaveText('01:00');
});
test('per-question expiry keeps answered and expired questions available for locked review', async ({
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

  const current = await currentQuestion(page, python);

  const correctAnswerOption = components.answerOptionAt(current.answer - 1);
  await correctAnswerOption.check();

  await expect(components.answerFeedback).toContainText('Correct!');
  await page.clock.fastForward(2000);

  await expect(components.secondQuestionPosition).toBeVisible();
  await page.clock.fastForward(2000);

  await expect(components.thirdQuestionPosition).toBeVisible();
  await expect(components.timedOutQuestionButton).toBeEnabled();
  await expect(components.correctQuestionButton).toHaveClass(/correct/);
  await expect(components.correctQuestionButton).toBeEnabled();

  await components.timedOutQuestionButton.click();
  await expect(components.secondQuestionPosition).toBeVisible();
  await expect(components.lockedAnswerHint).toBeVisible();
  await expect(components.disabledAnswerOptions).toHaveCount(4);
  await page.clock.fastForward(250);
  await expect(components.secondQuestionPosition).toBeVisible();

  await page.reload();
  await components.resumeButton.click();
  await expect(components.secondQuestionPosition).toBeVisible();
  await expect(components.disabledAnswerOptions).toHaveCount(4);

  await components.previousButton.click();
  await expect(components.questionPosition).toBeVisible();
  await expect(correctAnswerOption).toBeChecked();
  await expect(components.disabledAnswerOptions).toHaveCount(4);
  await expect(components.answerFeedback).toContainText('Correct!');

  await components.nextButton.click();
  await expect(components.secondQuestionPosition).toBeVisible();
  await expect(components.disabledAnswerOptions).toHaveCount(4);
  await components.nextButton.click();
  await expect(components.thirdQuestionPosition).toBeVisible();
  await expect(components.firstAnswerOption).toBeEnabled();
  await expect(components.countdown).toHaveText('00:02');
  await page.screenshot({ path: testInfo.outputPath('timing-quiz-mobile.png'), fullPage: true });

  await expect
    .poll(() => components.body.evaluate(element => element.scrollWidth - element.clientWidth))
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
