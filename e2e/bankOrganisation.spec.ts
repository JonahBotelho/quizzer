/** Reorganized bank names and full question counts are usable in the practice flow. */
import { expect, test, type Page } from '@playwright/test';
import htmlAndCss from '../src/data/quizzes/html-css.json' with { type: 'json' };
import basics from '../src/data/quizzes/javascript-basics.json' with { type: 'json' };
import asynchronous from '../src/data/quizzes/javascript-async.json' with { type: 'json' };
import { currentQuestion } from './questionHelpers';

// Locators are lazy; bind them to each test's page without sharing browser state.
function defineComponents(page: Page) {
  const bankOption = (name: string | RegExp) =>
    page.getByRole('radio', {
      name,
      exact: true,
    });
  const allQuestionsOption = page.getByRole('radio', { name: 'All questions', exact: true });
  const startButton = page.getByRole('button', { name: 'Start practicing', exact: true });
  const bankHeading = (name: string | RegExp) => page.getByRole('heading', { name, exact: true });
  const questionPosition = (text: string | RegExp) =>
    page.getByText(text, {
      exact: true,
    });
  const questionNavigation = page.getByRole('navigation', { name: 'Your questions' });
  const questionButtons = questionNavigation.getByRole('button');

  return {
    bankOption,
    allQuestionsOption,
    startButton,
    bankHeading,
    questionPosition,
    questionNavigation,
    questionButtons,
  };
}

for (const bank of [
  { name: 'HTML and CSS', questions: htmlAndCss },
  { name: 'JavaScript Basics', questions: basics },
  { name: 'Asynchronous JavaScript', questions: asynchronous },
]) {
  test(`${bank.name} starts with its complete question bank`, async ({ page }) => {
    const components = defineComponents(page);

    await page.goto('/');

    const bankOption = components.bankOption(`${bank.name} ${bank.questions.length} questions`);
    await bankOption.check();

    await components.allQuestionsOption.check();
    await components.startButton.click();

    const bankHeading = components.bankHeading(bank.name);
    await expect(bankHeading).toBeVisible();

    const questionPosition = components.questionPosition(`Question 1 of ${bank.questions.length}`);
    await expect(questionPosition).toBeVisible();
    await currentQuestion(page, bank.questions);

    await expect(components.questionButtons).toHaveCount(bank.questions.length);
  });
}
