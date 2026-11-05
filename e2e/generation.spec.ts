/** Generated quizzes stay local and reuse the normal practice and backup flows. */
import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

function defineComponents(page: Page) {
  const generateButton = page.getByRole('button', { name: 'Generate quiz', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Generate a new quiz' });
  const title = page.getByLabel('Quiz title', { exact: true });
  const description = page.getByLabel('Quiz description', { exact: true });
  const count = page.getByLabel('Number of questions', { exact: true });
  const password = page.getByLabel('Generation password', { exact: true });
  const passwordHint = page.getByText('Use the shared password provided by the app owner. It is not saved.', { exact: true });
  const submit = dialog.getByRole('button', { name: 'Generate quiz', exact: true });
  const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
  const alert = page.getByRole('alert');
  const generatedBank = (name = 'My generated quiz') => page.getByRole('checkbox', { name: new RegExp(`${name}.*Generated`) });
  const allQuestions = page.getByRole('radio', { name: 'All questions', exact: true });
  const download = page.getByRole('link', { name: 'Download quiz JSON', exact: true });
  const importInput = page.locator('#quiz-import');
  const generatedSuccess = page.getByText(/Generated My generated quiz with/);
  const temporary = page.getByText(/This quiz is available in this tab but could not be saved/);
  const unavailable = page.getByText(/Generation is unavailable/);
  const availabilityTooltip = page.getByRole('tooltip');
  const fileToolbar = page.locator('.file-toolbar');
  const fileActions = page.locator('.file-actions');
  const downloadSample = page.getByRole('link', { name: 'Download sample JSON', exact: true });
  const start = page.getByRole('button', { name: 'Start practising', exact: true });
  const questionHeading = page.locator('#question-heading');
  const answerOptions = page.getByRole('radio');
  const firstAnswer = answerOptions.first();
  const back = page.getByRole('button', { name: 'Back to practice', exact: true });
  const resume = page.getByRole('button', { name: 'Resume quiz', exact: true });
  const perQuiz = page.getByRole('radio', { name: 'Whole quiz', exact: true });
  const darkMode = page.getByRole('button', { name: 'Switch to dark mode', exact: true });
  const body = page.locator('body');
  return { generateButton, dialog, title, description, count, password, passwordHint, submit, cancel, alert, generatedBank,
    allQuestions, download, importInput, generatedSuccess, temporary, unavailable, availabilityTooltip,
    fileToolbar, fileActions, downloadSample, start, questionHeading,
    firstAnswer, back, resume, perQuiz, darkMode, body };
}

function questions(count: number) {
  return Array.from({ length: count }, (_, index) => ({ id: index + 1,
    question: `Generated question ${index + 1}?`, options: ['A', 'B', 'C', 'D'], answer: 3 }));
}

async function configureGeneration(page: Page) {
  await page.route('**/api/generate-quiz', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true, passwordRequired: true } });
    const input = route.request().postDataJSON();
    await route.fulfill({ json: { questions: questions(input.questionCount) } });
  });
}

async function fillGeneration(page: Page, count = 25) {
  const components = defineComponents(page);
  await components.generateButton.click();
  await components.title.fill('My generated quiz');
  await components.description.fill('A quiz about the attached learning material');
  await components.count.fill(String(count));
  await components.password.fill('shared-password');
}

test('generates once, selects all questions, persists locally, and downloads importable JSON', async ({ page, context, browser }) => {
  const components = defineComponents(page);
  const bank = components.generatedBank();
  let calls = 0;
  await configureGeneration(page);
  page.on('request', request => { if (request.url().endsWith('/api/generate-quiz') && request.method() === 'POST') calls++; });
  await page.goto('/');
  await components.perQuiz.check();

  const other = await context.newPage();
  const otherComponents = defineComponents(other);
  const otherBank = otherComponents.generatedBank();
  await other.goto('/');
  await fillGeneration(page);
  await expect(components.title).toBeVisible();
  await components.submit.click();

  await expect(components.dialog).toHaveCount(0);
  await expect(bank).toBeChecked();
  await expect(components.allQuestions).toBeChecked();
  await expect(components.perQuiz).toBeChecked();
  await expect(components.generatedSuccess).toBeVisible();
  await expect(otherBank).toBeVisible();
  expect(calls).toBe(1);
  await expect(components.generateButton).toBeFocused();

  const waitingForDownload = page.waitForEvent('download');
  await components.download.click();
  const download = await waitingForDownload;
  const backup = await readFile((await download.path())!, 'utf8');
  expect(JSON.parse(backup)).toEqual(questions(25));
  await components.importInput.setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
  await page.reload();
  await expect(bank).toBeVisible();

  const isolated = await browser.newContext();
  try {
    const isolatedPage = await isolated.newPage();
    const isolatedComponents = defineComponents(isolatedPage);
    const isolatedBank = isolatedComponents.generatedBank();
    await isolatedPage.goto('/');
    await expect(isolatedComponents.start).toBeVisible();
    await expect(isolatedBank).toHaveCount(0);
  } finally { await isolated.close(); }
});

test('validates inputs, keeps a failed form, and retries without displaying upstream text', async ({ page }) => {
  const components = defineComponents(page);
  const bank = components.generatedBank();
  let calls = 0;
  await configureGeneration(page);
  await page.route('**/api/generate-quiz', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true, passwordRequired: true } });
    calls++;
    if (calls === 1) return route.fulfill({ status: 401, json: { code: 'unauthorized', message: 'private server content' } });
    await route.fulfill({ json: { questions: questions(1) } });
  });
  await page.goto('/');
  await components.generateButton.click();
  await components.submit.click();

  await expect(components.alert).toContainText('Check the title');
  expect(calls).toBe(0);
  await components.title.fill('My generated quiz');
  await components.description.fill('Subject');
  await components.count.fill('1');
  await components.password.fill('wrong');
  await components.submit.click();
  await expect(components.alert).toContainText('password is incorrect');
  await expect(components.description).toHaveValue('Subject');
  await components.password.fill('correct');
  await components.submit.click();
  await expect(bank).toBeChecked();
  expect(calls).toBe(2);
});

test('cancelling discards late results and clears the password on reopening', async ({ page }) => {
  const components = defineComponents(page);
  const bank = components.generatedBank();
  let release!: () => void;
  const released = new Promise<void>(resolve => { release = resolve; });
  await configureGeneration(page);
  await page.route('**/api/generate-quiz', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true, passwordRequired: true } });
    await released;
    await route.fulfill({ json: { questions: questions(25) } }).catch(() => {});
  });
  await page.goto('/');
  await fillGeneration(page);
  const waitingForRequest = page.waitForRequest(request => request.method() === 'POST');
  await components.submit.click();
  await waitingForRequest;
  await components.cancel.click();
  release();

  await expect(components.dialog).toHaveCount(0);
  await components.generateButton.click();
  await expect(components.password).toHaveValue('');
  await expect(bank).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(components.generateButton).toBeFocused();
});

test('storage failure leaves a downloadable temporary quiz', async ({ page }) => {
  const components = defineComponents(page);
  const bank = components.generatedBank();
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { get() { throw new Error('Unavailable'); } });
  });
  await configureGeneration(page);
  await page.goto('/');
  await fillGeneration(page, 1);
  await components.submit.click();

  await expect(bank).toBeChecked();
  await expect(components.temporary).toBeVisible();
  await expect(components.download).toBeVisible();
});

test('a quota failure while saving keeps generated questions available for backup', async ({ page }) => {
  const components = defineComponents(page);
  const bank = components.generatedBank();
  await page.addInitScript(() => {
    const add = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function(value, key) {
      if (this.name === 'banks') throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return add.call(this, value, key);
    };
  });
  await configureGeneration(page);
  await page.goto('/');
  await fillGeneration(page, 1);
  await components.submit.click();

  await expect(bank).toBeChecked();
  await expect(components.temporary).toBeVisible();
  const waitingForDownload = page.waitForEvent('download');
  await components.download.click();
  const download = await waitingForDownload;
  expect(JSON.parse(await readFile((await download.path())!, 'utf8'))).toEqual(questions(1));
});

test('generation without a configured password hides password controls and omits credentials', async ({ page }) => {
  const components = defineComponents(page);
  const bank = components.generatedBank();
  await page.route('**/api/generate-quiz', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true, passwordRequired: false } });
    await route.fulfill({ json: { questions: questions(1) } });
  });
  await page.goto('/');
  await components.generateButton.click();

  await expect(components.password).toHaveCount(0);
  await expect(components.passwordHint).toHaveCount(0);
  await components.title.fill('My generated quiz');
  await components.description.fill('A quiz without password protection');
  await components.count.fill('1');
  const waitingForRequest = page.waitForRequest(request => request.method() === 'POST');
  await components.submit.click();
  const request = await waitingForRequest;

  expect(request.postDataJSON()).not.toHaveProperty('password');
  await expect(components.dialog).toHaveCount(0);
  await expect(bank).toBeChecked();
});

test('unavailable generation shows a tooltip without changing toolbar spacing', async ({ page }) => {
  const components = defineComponents(page);
  await page.route('**/api/generate-quiz', route => route.fulfill({ status: 404, contentType: 'text/html', body: '<p>Not found</p>' }));
  await page.goto('/');

  await expect(components.generateButton).toBeDisabled();
  await expect(components.unavailable).toBeHidden();
  await expect(components.start).toBeEnabled();
  await expect(components.fileActions).toHaveText(/Import quiz JSON\s*Download sample JSON\s*Generate quiz/);
  const toolbarBounds = await components.fileToolbar.boundingBox();
  const sampleBounds = await components.downloadSample.boundingBox();
  const generationBounds = await components.generateButton.boundingBox();
  expect(generationBounds!.x).toBeGreaterThan(sampleBounds!.x + sampleBounds!.width);

  await components.generateButton.hover();

  await expect(components.availabilityTooltip).toBeVisible();
  await expect(components.availabilityTooltip).toContainText('Generation is unavailable');
  expect(await components.fileToolbar.boundingBox()).toEqual(toolbarBounds);
  await components.start.hover();
  await expect(components.availabilityTooltip).toBeHidden();

  await components.generateButton.focus();
  await expect(components.availabilityTooltip).toBeVisible();
  await components.generateButton.press('Enter');
  await expect(components.dialog).toHaveCount(0);
  await components.generateButton.press('Escape');
  await expect(components.availabilityTooltip).toBeHidden();
});

test('generation preserves an unfinished attempt and fits mobile themes', async ({ page }, testInfo) => {
  const components = defineComponents(page);
  await configureGeneration(page);
  await page.goto('/');
  await components.start.click();
  const previousQuestion = await components.questionHeading.innerText();
  await components.firstAnswer.check();
  await components.back.click();
  await page.setViewportSize({ width: 390, height: 844 });
  await fillGeneration(page, 1);

  await page.screenshot({ path: testInfo.outputPath('generation-light.png'), fullPage: true });
  await expect.poll(() => components.body.evaluate(element => element.scrollWidth - element.clientWidth)).toBe(0);
  await components.cancel.click();
  await components.darkMode.click();
  await fillGeneration(page, 1);
  await page.screenshot({ path: testInfo.outputPath('generation-dark.png'), fullPage: true });
  await components.submit.click();
  await components.resume.click();

  await expect(components.questionHeading).toHaveText(previousQuestion);
  await expect(components.firstAnswer).toBeChecked();
});
