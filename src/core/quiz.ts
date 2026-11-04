/** Pure sampling, scoring, and saved-record validation. */
import { createTiming, noTimeLimit, timedOut, validTiming } from './timing';
import type { TimeLimit } from './timingTypes';
import { validateQuestions } from './banks';
import { t } from '../i18n';
import type { Attempt, Bank, Question } from './types';
export function sample(questions: Question[], count: number, random = Math.random): Question[] {
  if (!Number.isInteger(count) || count < 1 || count > questions.length) throw new Error(t('invalidSampleSize'));
  const pool = [...questions];
  // Shuffle the full pool before sampling so source order does not favour early entries.
  for (let index = pool.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(random() * (index + 1));
    [pool[index], pool[randomIndex]] = [pool[randomIndex], pool[index]];
  }
  return structuredClone(pool.slice(0, count));
}
export function createAttempt(bank: Bank, count: number, limit: TimeLimit = noTimeLimit): Attempt {
  const now = new Date().toISOString();
  return { version: 1, id: crypto.randomUUID(), bankId: bank.id, bankName: bank.name,
    timing: createTiming(limit, count, Date.parse(now)), questions: sample(bank.questions, count), answers: Array(count).fill(null), position: 0,
    startedAt: now, updatedAt: now, completedAt: null, status: 'active', revision: 0 };
}
export function score(attempt: Attempt) {
  const correct = attempt.questions.filter((question, index) => question.answer === attempt.answers[index] && !timedOut(attempt, index)).length;
  return { correct, total: attempt.questions.length, ratio: correct / attempt.questions.length };
}
export function unanswered(attempt: Attempt): number[] {
  return attempt.answers.flatMap((answer, index) => answer === null && !timedOut(attempt, index) ? [index] : []);
}
export function isAttempt(value: unknown): value is Attempt {
  if (!value || typeof value !== 'object') return false;
  const attempt = value as Attempt;
  if (attempt.version !== 1 || !['active', 'completed'].includes(attempt.status)) return false;
  if (![attempt.id, attempt.bankId, attempt.bankName].every(value => typeof value === 'string' && value.trim())) return false;
  if (validateQuestions(attempt.questions).error) return false;
  if (!Array.isArray(attempt.answers) || attempt.answers.length !== attempt.questions.length) return false;
  if (!attempt.answers.every((answer, index) => answer === null || (Number.isInteger(answer) && answer >= 1 && answer <= attempt.questions[index].options.length))) return false;
  if (!Number.isInteger(attempt.position) || attempt.position < 0 || attempt.position >= attempt.questions.length) return false;
  if (!Number.isSafeInteger(attempt.revision) || attempt.revision < 0) return false;
  if (![attempt.startedAt, attempt.updatedAt].every(value => typeof value === 'string' && Number.isFinite(Date.parse(value)))) return false;
  if (!validTiming(attempt)) return false;
  return attempt.status === 'active' ? attempt.completedAt === null : typeof attempt.completedAt === 'string' && Number.isFinite(Date.parse(attempt.completedAt)) && unanswered(attempt).length === 0;
}


