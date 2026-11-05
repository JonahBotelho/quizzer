/** Real bundled document workers feed extracted text to a mocked generation backend. */
import { test, expect, type Page } from '@playwright/test';
import { pdfFixture, docxFixture } from '../src/tests/documentFixtures';

function defineComponents(page: Page) {
  const generateButton = page.getByRole('button', { name: 'Generate quiz', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Generate a new quiz' });
  const title = page.getByLabel('Quiz title', { exact: true });
  const description = page.getByLabel('Quiz description', { exact: true });
  const count = page.getByLabel('Number of questions', { exact: true });
  const password = page.getByLabel('Generation password', { exact: true });
  const documents = page.getByLabel('Reference documents (optional)', { exact: true });
  const submit = dialog.getByRole('button', { name: 'Generate quiz', exact: true });
  const remove = (name: string) => page.getByRole('button', { name: `Remove ${name}`, exact: true });
  const alert = page.getByRole('alert');
  const generatedBank = page.getByRole('checkbox', { name: /Document quiz.*Generated/ });
  return { generateButton, dialog, title, description, count, password, documents, submit, remove, alert, generatedBank };
}

async function openGeneration(page: Page) {
  const components = defineComponents(page);
  await page.route('**/api/generate-quiz', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true, passwordRequired: true } });
    await route.fulfill({ json: { questions: [{ question: 'Q?', options: ['A', 'B', 'C', 'D'], answer: 3 }] } });
  });
  await page.goto('/');
  await components.generateButton.click();
  await components.title.fill('Document quiz');
  await components.description.fill('Use the reference documents');
  await components.count.fill('1');
  await components.password.fill('shared-password');
}

test('PDF, DOCX, TXT and Markdown workers send readable text rather than original files', async ({ page }) => {
  const components = defineComponents(page);
  await openGeneration(page);
  await components.documents.setInputFiles([
    { name: 'reference.pdf', mimeType: 'application/pdf', buffer: pdfFixture() },
    { name: 'reference.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: docxFixture() },
    { name: 'reference.txt', mimeType: 'text/plain', buffer: Buffer.from('Plain text reference') },
    { name: 'reference.md', mimeType: 'text/markdown', buffer: Buffer.from('# Markdown reference') },
  ]);
  const waitingForRequest = page.waitForRequest(request => request.method() === 'POST');
  await components.submit.click();
  const request = await waitingForRequest;

  const input = request.postDataJSON();
  expect(input.documents).toHaveLength(4);
  expect(input.documents[0].text).toContain('Reference material for the quiz');
  expect(input.documents[1].text).toContain('Reference material in a Word document');
  expect(input.documents[2].text).toBe('Plain text reference');
  expect(input.documents[3].text).toBe('# Markdown reference');
  expect(input.documents[0]).not.toHaveProperty('file');
  await expect(components.generatedBank).toBeChecked();
});

for (const fixture of [
  { name: 'scanned.pdf', buffer: pdfFixture(''), expected: /no readable text/ },
  { name: 'encrypted.pdf', buffer: pdfFixture('Private text', true), expected: /Encrypted reference documents/ },
  { name: 'corrupt.pdf', buffer: Buffer.from('corrupt'), expected: /could not be read/ },
  { name: 'corrupt.docx', buffer: Buffer.from('corrupt'), expected: /could not be read/ },
]) {
  test(`rejects ${fixture.name} before generation and allows removal`, async ({ page }) => {
    const components = defineComponents(page);
    const removeFile = components.remove(fixture.name);
    let requests = 0;
    page.on('request', request => { if (request.method() === 'POST') requests++; });
    await openGeneration(page);
    await components.documents.setInputFiles({ name: fixture.name, mimeType: 'application/octet-stream', buffer: fixture.buffer });
    await components.submit.click();

    await expect(components.alert).toContainText(fixture.expected);
    expect(requests).toBe(0);
    await removeFile.click();
    await components.submit.click();
    await expect(components.generatedBank).toBeChecked();
  });
}
