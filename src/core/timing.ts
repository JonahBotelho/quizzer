/** Pure deadline reconciliation. No interval counters or per-tick persistence. */
import type { Attempt } from './types';
import type { AttemptTiming, TimeLimit } from './timingTypes';
import { t } from '../i18n';
export const noTimeLimit: TimeLimit = { mode: 'none' };
export function isTimeLimit(value: unknown): value is TimeLimit {
  if (!value || typeof value !== 'object') return false;
  const limit = value as TimeLimit;
  if (limit.mode === 'none') return true;
  return (limit.mode === 'question' || limit.mode === 'quiz') && Number.isInteger(limit.seconds)
    && limit.seconds >= 1 && limit.seconds <= (limit.mode === 'question' ? 3600 : 86400);
}
export function createTiming(limit: TimeLimit, count: number, now: number): AttemptTiming | undefined {
  if (!isTimeLimit(limit)) throw new Error(t('timeInvalidSummary'));
  if (limit.mode === 'none') return undefined;
  return { limit: { ...limit }, deadlines: Array.from({ length: count }, (_, index) => limit.mode === 'quiz' || index === 0 ? now + limit.seconds * 1000 : null),
    expired: Array(count).fill(false), finishedByTimeout: false };
}
export function deadline(attempt: Attempt, position = attempt.position): number | null {
  return attempt.timing?.deadlines[position] ?? null;
}
export function isLocked(attempt: Attempt, position: number, now = Date.now()): boolean {
  const deadlineAt = deadline(attempt, position);
  return deadlineAt !== null && deadlineAt <= now;
}
export function timedOut(attempt: Attempt, position: number): boolean {
  return attempt.timing?.expired[position] ?? false;
}
function complete(attempt: Attempt, at: number) {
  attempt.status = 'completed'; attempt.completedAt = new Date(at).toISOString();
  attempt.timing!.finishedByTimeout = true;
}
/** Mutates a cloned attempt, catching up through elapsed questions after suspension. */
export function reconcileTiming(attempt: Attempt, now: number): boolean {
  const timing = attempt.timing;
  if (!timing || attempt.status !== 'active') return false;
  let changed = false;
  for (let step = 0; step <= attempt.questions.length; step++) {
    timing.deadlines.forEach((deadlineAt, index) => {
      if (deadlineAt !== null && deadlineAt <= now && attempt.answers[index] === null && !timing.expired[index]) {
        timing.expired[index] = true; changed = true;
      }
    });
    const currentEnd = deadline(attempt);
    if (currentEnd === null || currentEnd > now) return changed;
    if (timing.limit.mode === 'quiz') { complete(attempt, currentEnd); return true; }
    const candidates = Array.from({ length: attempt.questions.length }, (_, offset) => (attempt.position + offset + 1) % attempt.questions.length);
    const next = candidates.find(index => !isLocked(attempt, index, now));
    if (next === undefined) {
      complete(attempt, Math.max(...timing.deadlines.map(deadlineAt => deadlineAt!))); return true;
    }
    attempt.position = next; changed = true;
    // Carry forward the actual expiry, not the wake-up time, to avoid free time in a closed tab.
    if (timing.deadlines[next] === null) timing.deadlines[next] = currentEnd + timing.limit.seconds * 1000;
  }
  return changed;
}
export function visitQuestion(attempt: Attempt, position: number, now: number) {
  const timing = attempt.timing;
  if (timing?.limit.mode === 'question' && timing.deadlines[position] === null) {
    timing.deadlines[position] = now + timing.limit.seconds * 1000;
  }
  attempt.position = position;
}
export function validTiming(attempt: Attempt): boolean {
  if (attempt.timing === undefined) return true; // Existing untimed attempts stay readable.
  const timing = attempt.timing;
  if (!timing || !isTimeLimit(timing.limit) || !['question', 'quiz'].includes(timing.limit.mode)) return false;
  if (!Array.isArray(timing.deadlines) || timing.deadlines.length !== attempt.questions.length
    || !timing.deadlines.every(deadlineAt => deadlineAt === null || (Number.isSafeInteger(deadlineAt) && deadlineAt > 0 && Number.isFinite(new Date(deadlineAt).getTime())))) return false;
  if (!Array.isArray(timing.expired) || timing.expired.length !== attempt.questions.length
    || !timing.expired.every((expired, index) => typeof expired === 'boolean' && (!expired || (attempt.answers[index] === null && timing.deadlines[index] !== null)))) return false;
  if (typeof timing.finishedByTimeout !== 'boolean' || (attempt.status === 'active' && timing.finishedByTimeout)) return false;
  if (timing.deadlines[attempt.position] === null) return false;
  return timing.limit.mode !== 'quiz' || timing.deadlines.every(deadlineAt => deadlineAt === timing.deadlines[0]);
}


/** Setup accepts whole minutes for quiz limits; the domain stores integer seconds. */
export function isSetupTimeLimit(limit: TimeLimit): boolean {
  return isTimeLimit(limit) && (limit.mode !== 'quiz' || limit.seconds % 60 === 0);
}
