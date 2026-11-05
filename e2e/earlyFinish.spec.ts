/** Manual finish scores only answered questions and preserves partial results in History. */
import { expect, test, type Page } from '@playwright/test';

function defineComponents(page: Page) {
  const importInput = page.locator('#quiz-import');
  const importedBank = page.getByRole('checkbox', { name: 'Partial Practice 10 questions Imported', exact: true });
  const start = page.getByRole('button', { name: 'Start practising', exact: true });
  const answers = page.getByRole('radio');
  const correctAnswer = answers.nth(1);
  const wrongAnswer = answers.nth(0);
  const next = page.getByRole('button', { name: 'Next question', exact: true });
  const sidebarFinish = page.locator('.finish-sidebar');
  const quizActions = page.locator('.quiz-actions');
  const lastQuestionFinish = quizActions.getByRole('button', { name: 'Finish quiz', exact: true });
  const lastQuestion = page.getByRole('button', { name: 'Question 10: unanswered', exact: true });
  const resultHeading = page.getByRole('heading', { name: 'Practice makes progress.' });
  const scoreSummary = (correct: number, total: number) =>
    page.getByRole('heading', { name: correct + ' out of ' + total + ' correct', exact: true });
  const perfectPercentage = page.getByText('100.0%', { exact: true });
  const earlyHint = page.getByText('This score includes only the questions you answered.', { exact: true });
  const reviewCards = page.locator('.review-card');
  const perfectHeading = page.getByRole('heading', { name: 'A clean sweep.', exact: true });
  const noAnswersHeading = page.getByRole('heading', { name: 'No answers to score', exact: true });
  const scoreValue = page.locator('.score-ring strong');
  const history = page.getByRole('button', { name: /^History/ });
  const historyScore = page.locator('.history-row p');
  const viewResults = page.getByRole('button', { name: 'View results', exact: true });
  const repeat = page.getByRole('button', { name: 'Practice again', exact: true });
  const questionPosition = page.getByText('Question 1 of 10', { exact: true });
  const questionPositionAt = (position: number) => page.getByText('Question ' + position + ' of 10', { exact: true });
  const resume = page.getByRole('button', { name: 'Resume quiz', exact: true });
  const wholeQuiz = page.getByRole('radio', { name: 'Whole quiz', exact: true });
  const questionHeading = page.locator('#question-heading');

  return { importInput, importedBank, start, correctAnswer, wrongAnswer, next, sidebarFinish,
    lastQuestionFinish, lastQuestion, resultHeading, scoreSummary, perfectPercentage, earlyHint,
    reviewCards, perfectHeading, noAnswersHeading, scoreValue, history, historyScore, viewResults,
    repeat, questionPosition, questionPositionAt, resume, wholeQuiz, questionHeading };
}

async function importPractice(page: Page) {
  const components = defineComponents(page);
  const questions = Array.from({ length: 10 }, (_, index) => ({
    id: index + 1,
    question: 'Partial question ' + (index + 1),
    options: ['Incorrect', 'Correct'],
    answer: 2,
  }));

  await page.goto('/');
  await components.importInput.setInputFiles({
    name: 'partial-practice.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(questions)),
  });
  await expect(components.importedBank).toBeChecked();
}

for (const finishLocation of ['sidebar', 'last question'] as const) {
  test('ends early from ' + finishLocation + ' and restores a five-out-of-five result', async ({ page }) => {
    const components = defineComponents(page);
    const score = components.scoreSummary(5, 5);

    await importPractice(page);
    await components.start.click();
    await expect(components.questionHeading).toBeFocused();
    for (let index = 0; index < 5; index++) {
      const nextPosition = components.questionPositionAt(index + 2);
      await components.correctAnswer.check();
      await components.next.click();
      await expect(nextPosition).toBeVisible();
    }
    if (finishLocation === 'last question') {
      await components.lastQuestion.click();
      await components.lastQuestionFinish.click();
    } else {
      await components.sidebarFinish.click();
    }

    await expect(score).toBeVisible();
    await expect(components.perfectPercentage).toBeVisible();
    await expect(components.earlyHint).toBeVisible();
    await expect(components.reviewCards).toHaveCount(0);
    await page.reload();
    await expect(components.resume).toHaveCount(0);
    await components.history.click();
    await expect(components.historyScore).toContainText('5 / 5 correct');
    await components.viewResults.click();
    await expect(score).toBeVisible();

    await components.repeat.click();
    await expect(components.questionPosition).toBeVisible();
  });
}

test('an early timed finish reviews only answered mistakes', async ({ page }) => {
  const components = defineComponents(page);
  const score = components.scoreSummary(1, 2);

  await importPractice(page);
  await components.wholeQuiz.check();
  await components.start.click();
  await expect(components.questionHeading).toBeFocused();
  await components.wrongAnswer.check();
  const wrongQuestion = await components.questionHeading.innerText();
  await components.next.click();
  await expect(components.questionHeading).not.toHaveText(wrongQuestion);
  await components.correctAnswer.check();
  await components.sidebarFinish.click();

  await expect(score).toBeVisible();
  await expect(components.reviewCards).toHaveCount(1);
  await expect(components.reviewCards).toContainText(wrongQuestion);
});

test('finishing without answers saves an unscored attempt and allows another session', async ({ page }) => {
  const components = defineComponents(page);
  const score = components.scoreSummary(0, 0);

  await importPractice(page);
  await components.start.click();
  await expect(components.questionHeading).toBeFocused();
  await components.sidebarFinish.click();

  await expect(score).toBeVisible();
  await expect(components.noAnswersHeading).toBeVisible();
  await expect(components.scoreValue).toHaveText('—');
  await expect(components.perfectHeading).toHaveCount(0);
  await expect(components.reviewCards).toHaveCount(0);
  await page.reload();
  await components.history.click();
  await components.viewResults.click();
  await expect(components.noAnswersHeading).toBeVisible();
  await components.repeat.click();
  await expect(components.questionPosition).toBeVisible();
});
