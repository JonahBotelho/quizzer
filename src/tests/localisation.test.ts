/** Guard locale-owned interface copy while validating quiz content from data files. */
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { catalog } from '../catalog';
import { parseBanks, validateQuestions } from '../core/banks';
import { importBank } from '../core/importBank';
import { locale, t } from '../i18n';
import bankNames from '../locales/en-CA/bank-names.json';
import sample from '../data/sample-quiz.json';

const components = import.meta.glob(['../components/*.tsx', '../App.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const displayAttributes = new Set([
  'alt',
  'title',
  'placeholder',
  'aria-label',
  'aria-description',
]);

describe('Canadian English display content', () => {
  it('keeps visible JSX text and accessibility copy out of components', () => {
    const hardcoded: string[] = [];

    for (const [path, source] of Object.entries(components)) {
      const file = ts.createSourceFile(
        path,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      function visit(node: ts.Node) {
        const visibleText = ts.isJsxText(node) && node.text.trim();
        const displayAttribute =
          ts.isJsxAttribute(node) &&
          displayAttributes.has(node.name.getText(file)) &&
          node.initializer &&
          ts.isStringLiteral(node.initializer);
        const literalChild =
          ts.isJsxExpression(node) &&
          node.expression &&
          ts.isStringLiteral(node.expression) &&
          (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent));

        if (visibleText || displayAttribute || literalChild)
          hardcoded.push(`${path}: ${node.getText(file)}`);

        ts.forEachChild(node, visit);
      }
      visit(file);
    }

    expect(Object.keys(components).length).toBeGreaterThan(0);
    expect(hardcoded).toEqual([]);
  });

  it('loads every bundled bank with a locale-owned name and valid one-based answers', () => {
    expect(catalog.errors).toEqual([]);
    expect(catalog.banks.map(bank => bank.id).sort()).toEqual(Object.keys(bankNames).sort());

    for (const bank of catalog.banks) {
      expect(bank.name).toBe(bankNames[bank.id as keyof typeof bankNames]);
      expect(validateQuestions(bank.questions).error).toBeUndefined();
    }

    expect(validateQuestions(sample).error).toBeUndefined();
    expect(sample[0].answer).toBe(3);
  });

  it('keeps four distinct choices in every bundled and downloadable question', () => {
    const sources = [
      ...catalog.banks.map(bank => ({ name: bank.id, questions: bank.questions })),
      { name: 'sample-quiz', questions: sample },
    ];

    for (const source of sources) {
      for (const question of source.questions) {
        const context = source.name + '/' + question.id;
        expect(question.options, context).toHaveLength(4);
        // Preserve case: code choices such as 'number' and 'Number' can differ meaningfully.
        const choices = question.options.map(option => option.trim().replace(/\s+/g, ' '));
        expect(new Set(choices).size, context).toBe(choices.length);
      }
    }
  });

  it('uses locale templates for both bundled-file and import validation errors', () => {
    const reason = t('bankEmpty');
    const expected = t('bankFileError', { file: 'empty.json', reason });
    expect(parseBanks({ '/empty.json': '[]' }).errors).toEqual([expected]);
    expect(() => importBank('empty.json', '[]', [])).toThrow(expected);
    expect(locale).toBe('en-CA');
  });

  it('preserves supplied names and question content when importing', () => {
    const question = { id: 1, question: 'Favorite color?', options: ['Gray', 'Blue'], answer: 1 };
    const imported = importBank('favorite-color.json', JSON.stringify([question]), []);
    expect(imported.name).toBe('Favorite Color');
    expect(imported.questions).toEqual([question]);
  });
});
