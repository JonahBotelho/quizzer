/** Startup reconciles saved attempts without redirecting away from the home screen. */
import { expect, test, type Page } from '@playwright/test';

import type { Attempt } from '../src/core/types';

function defineComponents(page: Page) {
  const bankHeading = page.getByRole('heading', { name: 'Choose your question banks' });
  const resume = page.getByRole('button', { name: 'Resume quiz', exact: true });
  const resultsHeading = page.getByRole('heading', { name: 'Practice makes progress.' });
  const historyCount = page.locator('.nav-count');
  const history = page.getByRole('button', { name: /^History/ });
  const viewResults = page.getByRole('button', { name: 'View results' });
  const timeoutNotice = page.getByText('Time ran out. Answers given in time were scored; unanswered questions count as incorrect.');

  return { bankHeading, resume, resultsHeading, historyCount, history, viewResults, timeoutNotice };
}

test('a quiz that expired while closed is saved to History and opens on home', async ({ page }) => {
  const components = defineComponents(page);
  const startedAt = new Date(Date.now() - 120_000).toISOString();
  const attempt: Attempt = {
    version: 1,
    id: 'expired-fixture',
    bankId: 'expired-fixture',
    bankName: 'Expired quiz',
    questions: [{ id: 1, question: 'Choose one', options: ['One', 'Two'], answer: 1 }],
    answers: [null],
    position: 0,
    startedAt,
    updatedAt: startedAt,
    completedAt: null,
    status: 'active',
    revision: 0,
    timing: {
      limit: { mode: 'quiz', seconds: 60 },
      deadlines: [Date.now() - 60_000],
      expired: [false],
      finishedByTimeout: false,
    },
  };

  await page.goto('/');
  await expect(components.bankHeading).toBeVisible();
  // Seed the closed-tab state directly; startup must catch up its elapsed deadline.
  await page.evaluate(async saved => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('quizzer');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction(['attempts', 'metadata'], 'readwrite');
    transaction.objectStore('attempts').put(saved);
    transaction.objectStore('metadata').put(saved.id, 'active');
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }, attempt);
  await page.reload();

  await expect(components.historyCount).toHaveText('1');
  await expect(components.bankHeading).toBeVisible();
  await expect(components.resume).toHaveCount(0);
  await expect(components.resultsHeading).toHaveCount(0);

  await components.history.click();
  await components.viewResults.click();
  await expect(components.timeoutNotice).toBeVisible();
});
