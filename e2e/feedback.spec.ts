/** Immediate feedback persists with selections without advancing the quiz. */
import { currentQuestion } from './questionHelpers';
import { test, expect } from '@playwright/test';
import json from '../src/data/quizzes/json.json' with { type: 'json' };

import type { Page } from '@playwright/test';

// Locators are lazy; bind them to each test's page without sharing browser state.
function defineComponents(page: Page) {
  const jsonBankOption = page.getByRole('radio', { name: /JSON/ });
  const startButton = page.getByRole('button', { name: 'Start practicing', exact: true });
  const heading = page.locator('#question-heading');
  const feedback = page.locator('#answer-feedback');
  const questionNavigation = page.getByRole('navigation', { name: 'Your questions' });
  const questionButtons = questionNavigation.getByRole('button');
  const firstNumber = questionButtons.first();
  const correctAnswerCards = page.locator('.answer-option.correct');
  const answerOptions = page.getByRole('radio');
  const answerOptionAt = (position: number) => answerOptions.nth(position);
  const answerCards = page.locator('.answer-option');
  const answerCardAt = (position: number) => answerCards.nth(position);
  const questionPosition = page.getByText('Question 1 of 10', { exact: true });
  const darkModeButton = page.getByRole('button', { name: 'Switch to dark mode' });
  const body = page.locator('body');
  const incorrectAnswerCards = page.locator('.answer-option.incorrect');
  const nextButton = page.getByRole('button', { name: 'Next question', exact: true });
  const previousButton = page.getByRole('button', { name: 'Previous', exact: true });
  const quizActions = page.locator('.quiz-actions');
  const finishButton = quizActions.getByRole('button', { name: 'Finish quiz' });
  const scoreSummary = page.getByText('10 out of 10 correct', { exact: true });

  return {
    jsonBankOption,
    startButton,
    heading,
    feedback,
    questionNavigation,
    questionButtons,
    firstNumber,
    correctAnswerCards,
    answerOptions,
    answerOptionAt,
    answerCards,
    answerCardAt,
    questionPosition,
    darkModeButton,
    body,
    incorrectAnswerCards,
    nextButton,
    previousButton,
    quizActions,
    finishButton,
    scoreSummary,
  };
}

test('shows incorrect and correct feedback immediately, restores it, and scores saved selections', async ({
  page,
}, testInfo) => {
  const components = defineComponents(page);

  await page.goto('/');
  await components.jsonBankOption.check();
  await components.startButton.click();

  const firstText = await components.heading.innerText();
  const first = await currentQuestion(page, json);

  await expect(components.feedback).toBeEmpty();
  await expect(components.correctAnswerCards).toHaveCount(0);

  const wrongIndex = first.answer % first.options.length;

  const wrongAnswerOption = components.answerOptionAt(wrongIndex);
  await wrongAnswerOption.check();
  await expect(components.feedback).toContainText('Incorrect');
  await expect(components.firstNumber).toHaveAccessibleName(
    'Question 1: current, answered incorrectly',
  );
  await expect(components.firstNumber).toHaveCSS(
    'color',
    await components.feedback.evaluate((element) => getComputedStyle(element).color),
  );
  await expect(components.feedback).toContainText(
    `The correct answer is: ${first.options[first.answer - 1]}`,
  );

  const wrongAnswerCard = components.answerCardAt(wrongIndex);
  await expect(wrongAnswerCard).toHaveClass(/incorrect/);

  const correctAnswerCard = components.answerCardAt(first.answer - 1);
  await expect(correctAnswerCard).toHaveClass(/correct/);
  await expect(components.heading).toHaveText(firstText);
  await expect(components.questionPosition).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('feedback-desktop-light.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('feedback-mobile-light.png'), fullPage: true });
  await components.darkModeButton.click();
  await page.screenshot({ path: testInfo.outputPath('feedback-mobile-dark.png'), fullPage: true });

  await expect
    .poll(() => components.body.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBe(0);
  await page.reload();
  await expect(components.heading).toHaveText(firstText);
  await expect(components.feedback).toContainText('Incorrect');
  await expect(components.firstNumber).toHaveAccessibleName(
    'Question 1: current, answered incorrectly',
  );
  await expect(components.firstNumber).toHaveCSS(
    'color',
    await components.feedback.evaluate((element) => getComputedStyle(element).color),
  );
  await expect(wrongAnswerOption).toBeChecked();

  const firstCorrectAnswerOption = components.answerOptionAt(first.answer - 1);
  await firstCorrectAnswerOption.check();
  await expect(components.feedback).toContainText('Correct!');
  await expect(components.incorrectAnswerCards).toHaveCount(0);
  await expect(components.firstNumber).toHaveAccessibleName(
    'Question 1: current, answered correctly',
  );
  await expect(components.firstNumber).toHaveCSS(
    'color',
    await components.feedback.evaluate((element) => getComputedStyle(element).color),
  );
  await expect(components.firstNumber).toHaveAttribute('aria-current', 'step');
  await expect(components.heading).toHaveText(firstText);
  await page.screenshot({
    path: testInfo.outputPath('feedback-correct-mobile-dark.png'),
    fullPage: true,
  });
  await components.nextButton.click();
  await expect(components.feedback).toBeEmpty();

  await components.previousButton.click();
  await expect(components.feedback).toContainText('Correct!');

  for (let i = 0; i < 10; i++) {
    const question = await currentQuestion(page, json);
    const correctAnswerOption = components.answerOptionAt(question.answer - 1);
    await correctAnswerOption.check();
    await expect(components.feedback).toContainText('Correct!');
    if (i < 9) await components.nextButton.click();
  }

  await components.finishButton.click();

  await expect(components.scoreSummary).toBeVisible();
});
