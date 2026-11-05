/** Every bundled programming example can be selected and practised in full. */
import { expect, test, type Page } from '@playwright/test';
import python from '../src/data/quizzes/sample-python.json' with { type: 'json' };
import java from '../src/data/quizzes/sample-java.json' with { type: 'json' };
import javascript from '../src/data/quizzes/sample-javascript.json' with { type: 'json' };
import csharp from '../src/data/quizzes/sample-csharp.json' with { type: 'json' };
import { currentQuestion } from './questionHelpers';

// Locators are lazy; bind them to each test's page without sharing browser state.
function defineComponents(page: Page) {
  const allBanksOption = page.getByRole('checkbox', { name: /^All [\d,]+ questions$/ });
  const bankOption = (name: string | RegExp) =>
    page.getByRole('checkbox', {
      name,
      exact: true,
    });
  const allQuestionsOption = page.getByRole('radio', { name: 'All questions', exact: true });
  const startButton = page.getByRole('button', { name: 'Start practising', exact: true });
  const bankHeading = (name: string | RegExp) => page.getByRole('heading', { name, exact: true });
  const questionPosition = (text: string | RegExp) =>
    page.getByText(text, {
      exact: true,
    });
  const questionNavigation = page.getByRole('navigation', { name: 'Your questions' });
  const questionButtons = questionNavigation.getByRole('button');

  return {
    allBanksOption,
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
  { name: 'Python', questions: python },
  { name: 'Java', questions: java },
  { name: 'JavaScript', questions: javascript },
  { name: 'C#', questions: csharp },
]) {
  test(`${bank.name} starts with its complete question bank`, async ({ page }) => {
    const components = defineComponents(page);

    await page.goto('/');

    const bankOption = components.bankOption(`${bank.name} ${bank.questions.length} questions Sample bank`);
    await components.allBanksOption.check();
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
