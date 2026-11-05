/** Studio themes, responsive controls, and expanded session settings stay usable. */
import { expect, test, type Page } from '@playwright/test';

function defineComponents(page: Page) {
  const root = page.locator('html');
  const body = page.locator('body');
  const header = page.locator('.site-header');
  const mainNavigation = page.getByRole('navigation', { name: 'Main navigation' });
  const themeToggle = page.getByRole('button', { name: /^Switch to (light|dark) mode$/ });
  const banks = page.getByRole('group', { name: 'Choose your question banks' });
  const bankOptions = banks.getByRole('checkbox');
  const firstBank = bankOptions.nth(0);
  const secondBank = bankOptions.nth(1);
  const bankOption = (name: string) => banks.getByRole('checkbox', { name: new RegExp('^' + name + ' ', 'i') });
  const session = page.getByRole('region', { name: 'Your session' });
  const summary = session.locator('.session-summary');
  const lengths = session.getByRole('radiogroup', { name: 'Choose the quiz length' });
  const fifty = lengths.getByRole('radio', { name: '50 questions', exact: true });
  const perQuestion = session.getByRole('radio', { name: 'Per question', exact: true });
  const duration = session.getByLabel('Seconds per question', { exact: true });
  const timeError = session.getByRole('alert');
  const start = session.getByRole('button', { name: 'Start practising', exact: true });
  const help = page.locator('.file-format-help');
  const helpToggle = help.getByText('About quiz JSON files', { exact: true });
  const format = help.locator('.file-format-hint');
  const importInput = page.locator('#quiz-import');
  const fileActions = page.locator('.file-actions');
  const toolbarActions = fileActions.locator('button, a');
  const toolbarActionAt = (index: number) => toolbarActions.nth(index);
  const saveStatus = page.locator('.save-status');
  const questionHeading = page.locator('#question-heading');
  const importError = page.getByRole('alert');

  return { root, body, header, mainNavigation, themeToggle, banks, bankOptions,
    firstBank, secondBank, bankOption, session, summary, fifty, perQuestion, duration, timeError,
    start, help, helpToggle, format, importInput, toolbarActionAt, saveStatus, questionHeading, importError };
}

test('system theme follows changes until a toggle choice is saved', async ({ page }) => {
  const components = defineComponents(page);

  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(components.themeToggle).toHaveAccessibleName('Switch to dark mode');

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(components.root).toHaveAttribute('data-theme', 'dark');
  await expect(components.themeToggle).toHaveAccessibleName('Switch to light mode');
  await expect(components.root).toHaveCSS('background-color', 'rgb(16, 23, 37)');

  await components.themeToggle.click();
  await expect(components.root).toHaveAttribute('data-theme', 'light');
  await expect(components.themeToggle).toHaveAccessibleName('Switch to dark mode');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(components.root).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(components.themeToggle).toHaveAccessibleName('Switch to dark mode');

  await components.themeToggle.click();
  await page.reload();
  await expect(components.root).toHaveAttribute('data-theme', 'dark');
  await expect(components.themeToggle).toHaveAccessibleName('Switch to light mode');
});

test('theme selection works for this tab when preference storage is unavailable', async ({ page }) => {
  const components = defineComponents(page);

  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() { throw new DOMException('Unavailable', 'SecurityError'); },
    });
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');

  await components.themeToggle.click();
  await expect(components.root).toHaveAttribute('data-theme', 'dark');
  await components.themeToggle.click();
  await expect(components.root).toHaveAttribute('data-theme', 'light');
});

for (const width of [390, 1280]) {
  test(`theme toggles from either icon, the gap, and padding at ${width}px`, async ({ page }) => {
    const components = defineComponents(page);

    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await expect(components.themeToggle).toHaveCount(1);

    const bounds = await components.themeToggle.boundingBox();
    expect(bounds).not.toBeNull();
    const positions = [
      { x: 26, y: 26 },
      { x: bounds!.width - 26, y: 26 },
      { x: bounds!.width / 2, y: 26 },
      { x: 2, y: 26 },
      { x: bounds!.width / 2, y: 2 },
    ];
    let dark = false;

    for (const position of positions) {
      await components.themeToggle.click({ position });
      dark = !dark;
      await expect(components.root).toHaveAttribute('data-theme', dark ? 'dark' : 'light');
    }

    await components.themeToggle.focus();
    await page.keyboard.press('Space');
    await expect(components.root).toHaveAttribute('data-theme', 'light');
    await page.keyboard.press('Enter');
    await expect(components.root).toHaveAttribute('data-theme', 'dark');
  });
}

test('bank and timer keyboard controls update the session and retain validation', async ({ page }) => {
  const components = defineComponents(page);

  await page.goto('/');
  await expect(components.bankOptions).toHaveCount(5);
  await components.firstBank.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await expect(components.secondBank).toBeChecked();
  await expect(components.secondBank).toBeFocused();

  await components.fifty.check();
  await expect(components.summary).toContainText('20 questions · No time limit');
  await components.perQuestion.check();
  await expect(components.summary).toContainText('30 seconds per question');
  await components.duration.fill('0');
  await expect(components.timeError).toContainText('Enter a whole number');
  await expect(components.start).toBeDisabled();
  await components.duration.fill('45');
  await expect(components.summary).toContainText('45 seconds per question');
  await components.start.click();
  await expect(components.questionHeading).toBeFocused();
});

test('format guidance expands independently of import errors', async ({ page }) => {
  const components = defineComponents(page);

  await page.goto('/');
  await expect(components.format).toBeHidden();
  await components.helpToggle.click();
  await expect(components.format).toContainText('Answers start at 1');
  await components.helpToggle.click();
  await expect(components.format).toBeHidden();
  await components.importInput.setInputFiles({
    name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{'),
  });

  await expect(components.importError).toBeVisible();
  await expect(components.help).not.toHaveAttribute('open');
});

test('real and long imported banks fit both palettes at every layout boundary', async ({ page }, testInfo) => {
  const components = defineComponents(page);
  const name = 'A very long imported programming practice collection with detailed reference material';
  const importedBank = components.bankOption(name);
  const questions = [{ id: 1, question: 'Choose one', options: ['One', 'Two'], answer: 1 }];

  await page.goto('/');
  await components.importInput.setInputFiles({
    name: name + '.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(questions)),
  });
  await expect(components.bankOptions).toHaveCount(6);
  await expect(importedBank).toBeChecked();
  await expect(components.summary).toContainText('1 questions · No time limit');
  await components.perQuestion.check();

  for (const theme of ['light', 'dark'] as const) {
    if (await components.root.getAttribute('data-theme') !== theme) {
      await components.themeToggle.click();
    }
    await expect(components.root).toHaveAttribute('data-theme', theme);

    for (const width of [320, 390, 768, 1199, 1200, 1536]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(components.mainNavigation).toHaveCount(1);
      await expect(components.themeToggle).toHaveCount(1);
      await expect(components.saveStatus).toBeVisible();
      await expect.poll(() => components.body.evaluate(element => element.scrollWidth - element.clientWidth)).toBe(0);

      for (let index = 0; index < 3; index++) {
        const action = components.toolbarActionAt(index);
        const bounds = await action.boundingBox();
        expect(bounds?.height).toBeGreaterThanOrEqual(44);
      }
      await page.screenshot({ path: testInfo.outputPath('setup-' + width + '-' + theme + '.png'), fullPage: true });
    }
  }

  await page.setViewportSize({ width: 1536, height: 480 });
  await expect(components.start).toBeEnabled();
  await components.start.click();
  await expect(components.questionHeading).toBeFocused();
});

test('expanded session settings remain reachable at 200 percent zoom', async ({ page }) => {
  const components = defineComponents(page);

  // At 200% desktop zoom, a 1200 × 800 window exposes 600 × 400 CSS pixels.
  await page.setViewportSize({ width: 600, height: 400 });
  await page.goto('/');
  await components.perQuestion.check();
  await components.duration.fill('60');

  await expect.poll(() => components.body.evaluate(element => element.scrollWidth - element.clientWidth)).toBe(0);
  await components.start.click();
  await expect(components.questionHeading).toBeFocused();
});
