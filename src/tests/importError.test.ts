/** Import failures preserve actionable locale copy without exposing native errors. */
import { describe, expect, it } from 'vitest';
import { importBank } from '../core/importBank';
import { importErrorMessage, QuizImportError } from '../core/importError';
import { t } from '../i18n';

describe('import error display', () => {
  it('preserves localized validation details', () => {
    try {
      importBank('broken.json', '[', []);
      expect.unreachable('Malformed JSON should fail validation');
    } catch (error) {
      expect(error).toBeInstanceOf(QuizImportError);
      expect(importErrorMessage(error)).toBe(t('bankParse', { file: 'broken.json' }));
    }
  });

  it('keeps localized file-read errors actionable', () => {
    const error = new QuizImportError('importReadFailed', { file: 'quiz.json' });
    expect(importErrorMessage(error)).toBe(t('importReadFailed', { file: 'quiz.json' }));
  });

  it.each([
    new Error('Browser-specific failure'),
    new DOMException('Access denied'),
    'failure',
    null,
  ])('replaces unexpected failures with the locale fallback %#', error => {
    expect(importErrorMessage(error)).toBe(t('importFailed'));
  });
});
