/** File imports share the source-bank validator and never overwrite existing banks. */
import { validateQuestions } from './banks';
import { copyQuestionContent } from './questionContent';
import { QuizImportError } from './importError';
import type { Bank } from './types';
import { locale, number, t } from '../i18n';
export interface ImportedBank extends Bank { imported: true; version: 1 }
export function importBank(filename: string, raw: string, existing: Bank[]): ImportedBank {
  if (!/\.json$/i.test(filename)) throw new QuizImportError('importFileType');
  let data: unknown;
  try { data = JSON.parse(raw.replace(/^\uFEFF/, '')); } catch { throw new QuizImportError('bankParse', { file: filename }); }
  // A single question object is accepted as a convenience; the exported template uses an array.
  const validated = validateQuestions(Array.isArray(data) ? data : [data]);
  if (validated.error) throw new QuizImportError('bankFileError', { file: filename, reason: validated.error });
  const base = filename.replace(/\.json$/i, '').replace(/[-_]+/g, ' ').trim().replace(/\b\w/g, letter => letter.toUpperCase()) || t('importedBadge');
  const names = new Set(existing.map(bank => bank.name.toLocaleLowerCase(locale)));
  let name = base;
  for (let suffix = 2; names.has(name.toLocaleLowerCase(locale)); suffix++) name = t('importCopyName', { name: base, count: number(suffix) });
  // Preserve just the documented schema, rather than persisting arbitrary properties from files.
  const questions = validated.questions.map(({ id, question, options, answer }) => ({ id, question: copyQuestionContent(question), options: [...options], answer }));
  return { version: 1, id: `imported:${crypto.randomUUID()}`, name, questions, sample: false, imported: true };
}
export function isImportedBank(value: unknown): value is ImportedBank {
  if (!value || typeof value !== 'object') return false;
  const bank = value as ImportedBank;
  return bank.version === 1 && bank.imported === true && bank.sample === false
    && typeof bank.id === 'string' && bank.id.startsWith('imported:')
    && typeof bank.name === 'string' && !!bank.name.trim() && !validateQuestions(bank.questions).error;
}
