/** Code boxes preserve literal content through practice, refresh, and history. */
import { test, expect, type Page } from '@playwright/test';

// Locators are lazy; bind them to each test's page without sharing browser state.
function defineComponents(page: Page) {
  const importButton = page.getByRole('button', { name: 'Import quiz JSON', exact: true });
  const quizImportInput = page.locator('#quiz-import');
  const codeBankOption = page.getByRole('radio', { name: /Code 1 questions Imported/ });
  const startButton = page.getByRole('button', { name: 'Start practicing', exact: true });
  const questionHeading = page.locator('#question-heading');
  const questionBlocks = page.locator('#question-content > *');
  const executableMarkup = page.locator('#question-content img, #question-content script');
  const answerGroup = page.getByRole('radiogroup');
  const answerOptions = page.getByRole('radio');
  const firstAnswerOption = answerOptions.first();
  const codeBlocks = page.locator('.question-code');
  const codeContent = page.locator('.question-code code');
  const firstCodeContent = codeContent.first();
  const quizActions = page.locator('.quiz-actions');
  const finishButton = quizActions.getByRole('button', { name: 'Finish quiz' });
  const reviewCodeBlocks = page.locator('.review-card .question-code');
  const historyNavigationButton = page.getByRole('button', { name: /^History/ });
  const viewResultsButton = page.getByRole('button', { name: 'View results' });
  const reviewCodeContent = page.locator('.review-card .question-code code');
  const firstReviewCodeContent = reviewCodeContent.first();
  const documentRoot = page.locator('html');
  const body = page.locator('body');
  const code = codeBlocks.last();
  const firstCodeBlock = codeBlocks.first();

  return {
    importButton,
    quizImportInput,
    codeBankOption,
    startButton,
    questionHeading,
    questionBlocks,
    executableMarkup,
    answerGroup,
    answerOptions,
    firstAnswerOption,
    codeBlocks,
    codeContent,
    firstCodeContent,
    quizActions,
    finishButton,
    reviewCodeBlocks,
    historyNavigationButton,
    viewResultsButton,
    reviewCodeContent,
    firstReviewCodeContent,
    documentRoot,
    body,
    code,
    firstCodeBlock,
  };
}

const firstCode = '\n\tconst markup = "<img src=x onerror=alert(1)>";\n  console.log(markup);\n';
const longCode = `console.log('${'long content '.repeat(30)}');`;
const question = {
  id: 1,
  question: [
    { type: 'text', text: 'Read this literal markup:' },
    { type: 'code', code: firstCode },
    { type: 'text', text: 'Then consider this longer line:' },
    { type: 'code', code: longCode },
    { type: 'text', text: 'Which value is printed?' },
  ],
  options: ['One', 'Two', 'Three'],
  answer: 3,
};

async function start(page: Page) {
  const components = defineComponents(page);

  await page.goto('/');

  await expect(components.importButton).toBeEnabled();

  await components.quizImportInput.setInputFiles({
    name: 'code.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([question])),
  });

  await expect(components.codeBankOption).toBeChecked();

  await components.startButton.click();

  await expect(components.questionHeading).toBeFocused();
}

test('mixed content is literal, ordered, resumable, and visible in saved reviews', async ({
  page,
}) => {
  const components = defineComponents(page);

  await start(page);

  expect(await components.questionBlocks.allTextContents()).toEqual(
    question.question.map((block) => block.text ?? block.code),
  );
  await expect(components.executableMarkup).toHaveCount(0);
  await expect(components.answerGroup).toHaveAttribute(
    'aria-describedby',
    'question-content answer-hint answer-feedback',
  );

  await components.firstAnswerOption.check();
  await page.reload();

  await expect(components.codeBlocks).toHaveCount(2);
  expect(await components.firstCodeContent.textContent()).toBe(firstCode);
  await expect(components.firstAnswerOption).toBeChecked();

  await components.finishButton.click();

  await expect(components.reviewCodeBlocks).toHaveCount(2);
  await page.reload();
  await components.historyNavigationButton.click();
  await components.viewResultsButton.click();

  expect(await components.firstReviewCodeContent.textContent()).toBe(firstCode);
});

for (const width of [1280, 390, 320]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`code boxes fit at ${width}px in ${theme} mode and support keyboard scrolling`, async ({
      page,
    }, testInfo) => {
      const components = defineComponents(page);

      await page.emulateMedia({ colorScheme: theme });
      await page.setViewportSize({ width, height: 900 });
      await start(page);

      await expect(components.documentRoot).toHaveAttribute('data-theme', theme);
      await expect
        .poll(() =>
          components.body.evaluate((element) => element.scrollWidth - element.clientWidth),
        )
        .toBe(0);
      expect(
        await components.code.evaluate((element) => element.scrollWidth > element.clientWidth),
      ).toBe(true);
      await page.keyboard.press('Tab');

      await expect(components.firstCodeBlock).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(components.code).toBeFocused();
      await expect(components.code).toHaveAccessibleName('Question 1, code snippet in block 4');
      await page.keyboard.press('ArrowRight');
      await expect
        .poll(() => components.code.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(0);
      await page.screenshot({
        path: testInfo.outputPath(`code-${width}-${theme}.png`),
        fullPage: true,
      });
      await components.firstAnswerOption.check();
      await components.finishButton.click();

      await expect(components.reviewCodeBlocks).toHaveCount(2);
      await expect
        .poll(() =>
          components.body.evaluate((element) => element.scrollWidth - element.clientWidth),
        )
        .toBe(0);
      await page.screenshot({
        path: testInfo.outputPath(`review-${width}-${theme}.png`),
        fullPage: true,
      });
    });
  }
}
