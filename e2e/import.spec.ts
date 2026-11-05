/** Browser file upload/download, persistence, validation, and repeat coverage. */
import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import importCopy from '../src/locales/en-CA/import.json' with { type: 'json' };

// Locators are lazy; bind them to each test's page without sharing browser state.
function defineComponents(page: Page) {
  const allBanksOption = page.getByRole('checkbox', { name: /^All [\d,]+ questions$/ });
  const importButton = page.getByRole('button', { name: 'Import quiz JSON', exact: true });
  const quizImportInput = page.locator('#quiz-import');
  const importSuccessMessage = page.getByText('Imported My Import with 2 questions.', {
    exact: true,
  });
  const importedBankOption = page.getByRole('checkbox', { name: /My Import 2 questions Imported/ });
  const fiftyQuestionsOption = page.getByRole('radio', { name: '50 questions', exact: true });
  const startButton = page.getByRole('button', { name: 'Start practising', exact: true });
  const questionHeading = page.locator('#question-heading');
  const answerOptions = page.getByRole('radio');
  const nextButton = page.getByRole('button', { name: 'Next question', exact: true });
  const answerOptionAt = (position: number) => answerOptions.nth(position);
  const quizActions = page.locator('.quiz-actions');
  const finishButton = quizActions.getByRole('button', { name: 'Finish quiz' });
  const scoreSummary = page.getByText('2 out of 2 correct', { exact: true });
  const practiceAgainButton = page.getByRole('button', { name: 'Practice again' });
  const historyNavigationButton = page.getByRole('button', { name: /^History/ });
  const viewResultsButton = page.getByRole('button', { name: 'View results' });
  const questionPosition = page.getByText('Question 1 of 2', { exact: true });
  const downloadSampleLink = page.getByRole('link', { name: 'Download sample JSON' });
  const sampleBankOption = page.getByRole('checkbox', { name: /Quizzer Sample 2 questions Imported/ });
  const codeBlocks = page.locator('.question-code');
  const codeContent = page.locator('.question-code code');
  const questionParagraphs = page.locator('#question-content p');
  const lastQuestionParagraph = questionParagraphs.last();
  const banks = page.getByRole('group', { name: 'Choose your question banks' });
  const bankOptions = banks.getByRole('checkbox');
  const errorMessage = page.getByRole('alert');
  const correctedBankOption = page.getByRole('checkbox', {
    name: /^Broken\s*1 questions\s*Imported$/,
  });
  const duplicateImportedBankOption = page.getByRole('checkbox', {
    name: /My Import \(2\) 2 questions Imported/,
  });
  const importStorageNotice = page.getByText(/Imported quizzes cannot be saved/);
  const darkModeButton = page.getByRole('button', { name: 'Switch to dark mode' });
  const body = page.locator('body');
  const pythonBankOption = page.getByRole('checkbox', { name: /Python/ });
  const firstAnswerOption = answerOptions.first();
  const backToPracticeButton = page.getByRole('button', { name: 'Back to practice' });
  const resumeButton = page.getByRole('button', { name: 'Resume quiz' });

  return {
    allBanksOption,
    importButton,
    quizImportInput,
    importSuccessMessage,
    importedBankOption,
    fiftyQuestionsOption,
    startButton,
    questionHeading,
    answerOptions,
    nextButton,
    answerOptionAt,
    quizActions,
    finishButton,
    scoreSummary,
    practiceAgainButton,
    historyNavigationButton,
    viewResultsButton,
    questionPosition,
    downloadSampleLink,
    sampleBankOption,
    codeBlocks,
    codeContent,
    questionParagraphs,
    lastQuestionParagraph,
    banks,
    bankOptions,
    errorMessage,
    correctedBankOption,
    duplicateImportedBankOption,
    importStorageNotice,
    darkModeButton,
    body,
    pythonBankOption,
    firstAnswerOption,
    backToPracticeButton,
    resumeButton,
  };
}

const questions = [
  {
    id: 1,
    question: 'Imported question one?',
    options: ['One', 'Two', 'Three', 'Four'],
    answer: 3,
  },
  { id: 2, question: 'Imported question two?', options: ['A', 'B'], answer: 2 },
];

async function upload(page: Page, data: unknown = questions, name = 'my-import.json') {
  const components = defineComponents(page);

  await expect(components.importButton).toBeEnabled();

  await components.quizImportInput.setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(typeof data === 'string' ? data : JSON.stringify(data)),
  });
}

test('imports, completes, repeats, and persists a local quiz after refresh', async ({ page }) => {
  const components = defineComponents(page);

  await page.goto('/');
  await upload(page);

  await expect(components.importSuccessMessage).toBeVisible();
  await expect(components.importedBankOption).toBeChecked();

  await components.fiftyQuestionsOption.check();
  await components.startButton.click();

  for (let i = 0; i < 2; i++) {
    const text = await components.questionHeading.innerText();
    const question = questions.find((question) => question.question === text)!;
    const selectedAnswerOption = components.answerOptionAt(question.answer - 1);
    await selectedAnswerOption.check();
    if (!i) await components.nextButton.click();
  }

  await components.finishButton.click();

  await expect(components.scoreSummary).toBeVisible();
  await expect(components.practiceAgainButton).toBeEnabled();
  await page.reload();
  await components.historyNavigationButton.click();
  await components.viewResultsButton.click();
  await components.practiceAgainButton.click();

  await expect(components.questionPosition).toBeVisible();
});
test('downloaded JSON is readable and can be imported without changes', async ({ page }) => {
  const components = defineComponents(page);

  await page.goto('/');

  const waiting = page.waitForEvent('download');

  await components.downloadSampleLink.click();

  const download = await waiting;
  expect(download.suggestedFilename()).toBe('quizzer-sample.json');

  const raw = await readFile((await download.path())!, 'utf8');
  const sample = JSON.parse(raw);
  expect(Array.isArray(sample)).toBe(true);
  expect(sample[0].answer).toBe(3);
  expect(Object.keys(sample[0])).toEqual(['id', 'question', 'options', 'answer']);
  expect(sample[1].question.map((block: { type: string }) => block.type)).toEqual([
    'text',
    'code',
    'text',
  ]);
  await upload(page, raw, 'quizzer-sample.json');

  await expect(components.sampleBankOption).toBeChecked();

  await components.startButton.click();

  await expect(components.questionHeading).toBeFocused();
  if ((await components.codeBlocks.count()) === 0) await components.nextButton.click();
  await expect(components.codeBlocks).toHaveCount(1);
  expect(await components.codeContent.textContent()).toBe(sample[1].question[1].code);
  await expect(components.lastQuestionParagraph).toHaveText('What value is printed?');
});
test('invalid files explain the error and can be corrected using the same filename', async ({
  page,
}) => {
  const components = defineComponents(page);

  await page.goto('/');

  await expect(components.banks).toBeVisible();

  const initial = await components.bankOptions.count();
  await upload(page, '[', 'broken.json');

  await expect(components.errorMessage).toContainText('invalid JSON');
  await upload(page, [{ ...questions[0], answer: 0 }], 'broken.json');
  await expect(components.errorMessage).toContainText('entry 1');
  await expect(components.bankOptions).toHaveCount(initial);
  await upload(page, questions[0], 'broken.json');

  await expect(components.correctedBankOption).toBeChecked();
  await expect(components.errorMessage).toHaveCount(0);
});

test('unexpected native import failures use locale copy and allow retry', async ({ page }) => {
  const components = defineComponents(page);

  await page.addInitScript(() => {
    const randomUUID = crypto.randomUUID.bind(crypto);
    let failNext = true;
    Object.defineProperty(crypto, 'randomUUID', {
      value: () => {
        if (failNext) {
          failNext = false;
          throw new Error('Browser-specific crypto failure');
        }
        return randomUUID();
      },
    });
  });
  await page.goto('/');
  await upload(page);

  await expect(components.errorMessage).toHaveText(importCopy.importFailed);
  await upload(page);
  await expect(components.errorMessage).toHaveCount(0);
  await expect(components.importedBankOption).toBeChecked();
});
test('duplicate filenames create separate quizzes and imports appear in another tab', async ({
  page,
  context,
}) => {
  const components = defineComponents(page);

  await page.goto('/');

  const other = await context.newPage();
  const otherComponents = defineComponents(other);
  await other.goto('/');

  await expect(otherComponents.importButton).toBeEnabled();
  await upload(page);

  await expect(otherComponents.importedBankOption).toBeVisible();
  await upload(page);

  await expect(components.duplicateImportedBankOption).toBeChecked();
  await page.reload();

  await expect(components.importedBankOption).toBeVisible();
  await expect(components.duplicateImportedBankOption).toBeVisible();
});
test('imports remain usable in this tab when storage is unavailable', async ({
  page,
}, testInfo) => {
  const components = defineComponents(page);

  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new Error('Unavailable');
      },
    });
  });
  await page.goto('/');
  await upload(page);

  await expect(components.importStorageNotice).toBeVisible();
  await expect(components.importedBankOption).toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('import-mobile-light.png'), fullPage: true });
  await components.darkModeButton.click();
  await page.screenshot({ path: testInfo.outputPath('import-mobile-dark.png'), fullPage: true });

  await expect
    .poll(() => components.body.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBe(0);

  await components.startButton.click();

  await expect(components.questionPosition).toBeVisible();
});
test('importing preserves an unfinished attempt until the user replaces it', async ({ page }) => {
  const components = defineComponents(page);

  await page.goto('/');
  await components.allBanksOption.check();
  await components.pythonBankOption.check();
  await components.startButton.click();

  const question = await components.questionHeading.innerText();

  await components.firstAnswerOption.check();
  await components.backToPracticeButton.click();
  await upload(page);

  await expect(components.resumeButton).toBeVisible();
  await components.resumeButton.click();
  await expect(components.questionHeading).toHaveText(question);
  await expect(components.firstAnswerOption).toBeChecked();
});
