/** Parse banks independently so one broken file never hides usable quizzes. */
import { number, t } from '../i18n';
import { questionContentError } from './questionContent';
import type { Bank, Question } from './types';

export function validateQuestions(value: unknown): { questions: Question[]; error?: string } {
  if (!Array.isArray(value) || value.length === 0) return { questions: [], error: t('bankEmpty') };

  const ids = new Set<number>();

  for (const [index, item] of value.entries()) {
    let reason: string | undefined;

    if (!item || typeof item !== 'object' || Array.isArray(item)) reason = t('bankObject');
    else if (!Number.isSafeInteger(item.id) || ids.has(item.id)) reason = t('bankId');
    else {
      reason = questionContentError(item.question);

      if (
        !reason &&
        (!Array.isArray(item.options) ||
          item.options.length < 2 ||
          !item.options.every((option: unknown) => typeof option === 'string' && option.trim()))
      )
        reason = t('bankOptions');

      if (
        !reason &&
        (!Number.isInteger(item.answer) || item.answer < 1 || item.answer > item.options.length)
      )
        reason = t('bankAnswer');
    }

    if (reason)
      return { questions: [], error: t('bankEntry', { entry: number(index + 1), reason }) };

    ids.add(item.id);
  }

  return { questions: value as Question[] };
}

export function parseBanks(
  files: Record<string, string>,
  names: Record<string, string> = {},
): { banks: Bank[]; errors: string[] } {
  const banks: Bank[] = [];
  const errors: string[] = [];

  for (const [path, raw] of Object.entries(files).sort(([leftPath], [rightPath]) =>
    leftPath.localeCompare(rightPath),
  )) {
    const file = path.split('/').pop()!;
    let data: unknown;

    try {
      data = JSON.parse(raw);
    } catch {
      errors.push(t('bankParse', { file }));
      continue;
    }

    const result = validateQuestions(data);

    if (result.error) {
      errors.push(t('bankFileError', { file, reason: result.error }));
      continue;
    }

    const id = file.replace(/\.json$/, '');
    const name =
      names[id] ?? id.replace(/[-_]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
    banks.push({ id, name, questions: result.questions, sample: id.startsWith('sample-') });
  }

  return { banks, errors };
}
