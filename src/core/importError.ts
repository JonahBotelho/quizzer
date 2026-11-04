/** Only locale-owned import errors may be shown verbatim to the user. */
import { t, type MessageKey } from '../i18n';

export class QuizImportError extends Error {
  constructor(key: MessageKey, values: Record<string, string | number> = {}) {
    super(t(key, values));
    this.name = 'QuizImportError';
  }
}

export function importErrorMessage(error: unknown): string {
  // Native File, crypto, and storage failures can contain browser-authored copy.
  return error instanceof QuizImportError ? error.message : t('importFailed');
}
