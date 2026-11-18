/** Question bank removal protects samples and keeps saved attempts available. */
import { expect, test, type Page } from '@playwright/test';

function defineComponents(page: Page) {
  const banks = page.getByRole('group', { name: 'Choose your question banks' });
  const bankHeading = page.getByRole('heading', { name: 'Choose your question banks' });
  const removeButtons = banks.getByRole('button', { name: /^Remove / });
  const removeBank = banks.getByRole('button', { name: 'Remove Local Quiz', exact: true });
  const removalDialog = page.getByRole('dialog', { name: 'Remove question bank' });
  const cancelRemoval = removalDialog.getByRole('button', { name: 'Cancel', exact: true });
  const confirmRemoval = removalDialog.getByRole('button', { name: 'Remove bank', exact: true });
  const localBank = banks.getByRole('checkbox', { name: /^Local Quiz/ });
  const allBanks = banks.getByRole('checkbox', { name: /^All [\d,]+ questions$/ });
  const importButton = page.getByRole('button', { name: 'Import quiz JSON', exact: true });
  const importInput = page.locator('#quiz-import');
  const importSuccess = page.getByText('Imported Local Quiz with 1 questions.', { exact: true });
  const removeError = page.getByText('The question bank could not be removed. Please try again.');
  const start = page.getByRole('button', { name: 'Start practicing', exact: true });
  const back = page.getByRole('button', { name: 'Back to practice' });
  const resume = page.getByRole('button', { name: 'Resume quiz' });
  const question = page.locator('#question-heading');

  return {
    bankHeading, removeButtons, removeBank, localBank, allBanks, importButton, importInput,
    importSuccess, removeError, start, back, resume, question, removalDialog, cancelRemoval,
    confirmRemoval,
  };
}

const question = { id: 1, question: 'Which option is correct?', options: ['One', 'Two'], answer: 1 };

async function importBank(page: Page) {
  const { importButton, importInput, localBank } = defineComponents(page);

  await expect(importButton).toBeEnabled();
  await importInput.setInputFiles({
    name: 'local-quiz.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([question])),
  });
  await expect(localBank).toBeChecked();
}

test('confirmed removal updates All and other tabs while the saved quiz can still resume', async ({
  page,
  context,
}) => {
  const components = defineComponents(page);
  const other = await context.newPage();
  const otherComponents = defineComponents(other);

  await page.goto('/');
  await other.goto('/');
  await expect(otherComponents.importButton).toBeEnabled();
  await expect(components.allBanks).toBeVisible();
  const originalAllName = await components.allBanks.evaluate(element =>
    element.parentElement!.innerText.replace(/\s+/g, ' ').trim(),
  );
  await expect(components.removeButtons).toHaveCount(0);
  await otherComponents.allBanks.check();

  await importBank(page);
  await expect(otherComponents.localBank).toBeVisible();
  await expect(components.removeButtons).toHaveCount(1);
  await expect(components.allBanks).not.toHaveAccessibleName(originalAllName);

  await components.removeBank.press('Enter');
  await expect(components.removalDialog).toHaveAccessibleDescription('Remove “Local Quiz” from your question banks?');
  await expect(components.cancelRemoval).toBeFocused();
  await components.cancelRemoval.press('Escape');

  await expect(components.removalDialog).toBeHidden();
  await expect(components.removeBank).toBeFocused();
  await expect(components.localBank).toBeChecked();

  await components.start.click();
  await expect(components.question).toHaveText(question.question);
  await components.back.click();
  await components.allBanks.check();
  await components.localBank.check();

  await components.removeBank.press('Enter');
  await components.confirmRemoval.click();

  await expect(components.localBank).toHaveCount(0);
  await expect(otherComponents.localBank).toHaveCount(0);
  await expect(components.bankHeading).toBeFocused();
  await expect(components.start).toBeDisabled();
  await expect(components.allBanks).toHaveAccessibleName(originalAllName);
  await expect(otherComponents.allBanks).toHaveAccessibleName(originalAllName);
  await expect(otherComponents.allBanks).toBeChecked();

  await page.reload();
  await expect(components.importButton).toBeEnabled();
  await expect(components.localBank).toHaveCount(0);
  await components.resume.click();
  await expect(components.question).toHaveText(question.question);
});

test('the mobile removal dialog can cancel or retry after a failed deletion', async ({ page }) => {
  const components = defineComponents(page);

  await page.addInitScript(() => {
    const remove = IDBObjectStore.prototype.delete;
    let failNext = true;
    IDBObjectStore.prototype.delete = function (query) {
      if (this.name === 'banks' && failNext) {
        failNext = false;
        throw new DOMException('Deletion failed', 'InvalidStateError');
      }

      return remove.call(this, query);
    };
  });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await importBank(page);
  await expect(components.importSuccess).toBeVisible();

  await components.removeBank.click();
  await expect(components.removalDialog).toBeInViewport({ ratio: 1 });
  await expect(components.confirmRemoval).toBeInViewport({ ratio: 1 });
  await components.cancelRemoval.click();

  await expect(components.removalDialog).toBeHidden();
  await expect(components.localBank).toBeChecked();

  await components.removeBank.click();
  await components.confirmRemoval.click();
  await expect(components.removeError).toBeVisible();
  await expect(components.removeBank).toBeFocused();
  await expect(components.localBank).toBeChecked();

  await components.removeBank.click();
  await components.confirmRemoval.click();
  await expect(components.localBank).toHaveCount(0);
  await expect(components.importSuccess).toHaveCount(0);
  await expect(components.removeError).toHaveCount(0);
});
