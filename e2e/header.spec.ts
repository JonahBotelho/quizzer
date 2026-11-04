/** Classic scrollbars must not recenter the header when switching screen lengths. */
import { test, expect } from '@playwright/test';

import type { Page } from '@playwright/test';

// Locators are lazy; bind them to each test's page without sharing browser state.
function defineComponents(page: Page) {
  const bankSelectionHeading = page.getByRole('heading', { name: 'Choose your question bank' });
  const historyCount = page.locator('.nav-count');
  const mainNavigation = page.locator('.main-nav');
  const historyNavigationButton = mainNavigation.getByRole('button', { name: /^History/ });
  const practiceNavigationButton = mainNavigation.getByRole('button', {
    name: 'Practice',
    exact: true,
  });
  const body = page.locator('body');
  const documentRoot = page.locator('html');
  const headerControls = page.locator('.brand,.main-nav button,.theme-toggle');
  const historyHeading = (name: string | RegExp) =>
    page.getByRole('heading', {
      name,
      exact: true,
    });

  return {
    bankSelectionHeading,
    historyCount,
    mainNavigation,
    historyNavigationButton,
    practiceNavigationButton,
    body,
    documentRoot,
    headerControls,
    historyHeading,
  };
}

// Playwright hides scrollbars by default; expose them to reproduce desktop layout shifts.
test.use({
  launchOptions: {
    ignoreDefaultArgs: ['--hide-scrollbars'],
    args: ['--disable-features=OverlayScrollbar,FluentOverlayScrollbar'],
  },
});

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`header stays fixed across short and long screens at ${viewport.width}px`, async ({
    page,
  }) => {
    const components = defineComponents(page);

    await page.setViewportSize(viewport);
    await page.goto('/');

    await expect(components.bankSelectionHeading).toBeVisible();

    const measure = async () => {
      const [width, overflowing, header] = await Promise.all([
        components.body.evaluate((element) => element.clientWidth),
        components.documentRoot.evaluate((element) => element.scrollHeight > element.clientHeight),
        components.headerControls.evaluateAll((elements) =>
          elements.map((element) => {
            const { x, y, width, height } = element.getBoundingClientRect();
            return { x, y, width, height };
          }),
        ),
      ]);
      return { width, overflowing, header };
    };

    for (const count of [0, 2, 30]) {
      if (count > 0) {
        // Seed only this isolated test context, avoiding a lengthy quiz for each layout case.
        await page.evaluate(async (count) => {
          const database = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('quizzer');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          const transaction = database.transaction('attempts', 'readwrite');
          transaction.objectStore('attempts').clear();

          for (let index = 0; index < count; index++) {
            transaction.objectStore('attempts').put({
              version: 1,
              id: `layout-${index}`,
              bankId: 'layout',
              bankName: 'Layout fixture',
              questions: [{ id: 1, question: 'Fixture?', options: ['A', 'B'], answer: 1 }],
              answers: [1],
              position: 0,
              startedAt: '2026-10-25T20:00:00Z',
              updatedAt: '2026-10-25T20:01:00Z',
              completedAt: '2026-10-25T20:01:00Z',
              status: 'completed',
              revision: 1,
            });
          }

          await new Promise<void>((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
          });
          database.close();
        }, count);
        await page.reload();
        await expect(components.bankSelectionHeading).toBeVisible();
        await expect(components.historyCount).toHaveText(String(count));
      }
      await page.evaluate(() => document.fonts.ready);

      const practice = await measure();
      expect(practice.overflowing).toBe(true);
      await components.historyNavigationButton.click();

      const historyHeading = components.historyHeading(count ? 'History' : 'No completed quizzes');
      await expect(historyHeading).toBeVisible();

      const history = await measure();
      if (count === 0 || count === 30) expect(history.overflowing).toBe(count === 30);
      expect(history.width).toBe(practice.width);
      expect(history.header).toEqual(practice.header);
      await components.practiceNavigationButton.click();
      await expect(components.bankSelectionHeading).toBeVisible();
      expect((await measure()).header).toEqual(practice.header);
    }
  });
}
