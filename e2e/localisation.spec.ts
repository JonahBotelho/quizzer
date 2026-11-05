/** Locale copy reaches the document head, bank picker, and accessible controls. */
import { expect, test, type Page } from '@playwright/test';
import appCopy from '../src/locales/en-CA/app.json' with { type: 'json' };
import bankNames from '../src/locales/en-CA/bank-names.json' with { type: 'json' };

// Locators are lazy; bind them to each test's page without sharing browser state.
function defineComponents(page: Page) {
  const documentRoot = page.locator('html');
  const banks = page.getByRole('group', { name: appCopy.chooseBank });
  const bankOptions = banks.getByRole('checkbox');
  const bankOption = (name: string | RegExp) => banks.getByRole('checkbox', { name });
  const startButton = page.getByRole('button', { name: appCopy.start, exact: true });

  return { documentRoot, banks, bankOptions, bankOption, startButton };
}

test('serves Canadian English metadata and locale-owned bank names', async ({ page }) => {
  const components = defineComponents(page);

  await page.goto('/');
  await expect(page).toHaveTitle(appCopy.brand);
  await expect(components.documentRoot).toHaveAttribute('lang', 'en-CA');
  await expect(components.bankOptions).toHaveCount(Object.keys(bankNames).length + 1);

  for (const name of Object.values(bankNames)) {
    const bankOption = components.bankOption(new RegExp(`^${name} `));
    await expect(bankOption).toBeVisible();
  }

  await expect(components.startButton).toBeVisible();
});
