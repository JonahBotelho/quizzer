/** Locate source fixtures using rendered blocks rather than a presentation heading. */
import type { Page } from '@playwright/test';

// Locators are lazy; bind them to each test's page without sharing browser state.
function defineComponents(page: Page) {
  const blocks = page.locator('#question-content');
  const questionBlocks = blocks.locator(':scope > *');
  const questionHeading = page.locator('#question-heading');

  return { blocks, questionBlocks, questionHeading };
}

interface SourceQuestion {
  question: string | { type: string; text?: string; code?: string }[];
}

export async function currentQuestion<T extends SourceQuestion>(
  page: Page,
  questions: T[],
): Promise<T> {
  const components = defineComponents(page);

  const content = (await components.blocks.count())
    ? await components.questionBlocks.allTextContents()
    : [await components.questionHeading.innerText()];
  const found = questions.find((item) => {
    const expected =
      typeof item.question === 'string'
        ? [item.question]
        : item.question.map((block) => (block.type === 'text' ? block.text : block.code));
    return JSON.stringify(expected) === JSON.stringify(content);
  });
  if (!found) throw new Error('Rendered question did not match a source fixture');
  return found;
}
