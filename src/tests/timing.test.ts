/** Deadline tests cover boundary scoring, navigation, and suspended-tab recovery. */
import { describe, expect, it } from 'vitest';
import { createAttempt, isAttempt, score, unanswered } from '../core/quiz';
import {
  createTiming,
  isLocked,
  isSetupTimeLimit,
  isTimeLimit,
  reconcileTiming,
  visitQuestion,
} from '../core/timing';
import type { Attempt, Bank } from '../core/types';

const bank: Bank = {
  id: 'timed',
  name: 'Timed',
  sample: false,
  questions: Array.from({ length: 3 }, (_, id) => ({
    id,
    question: `Q${id}`,
    options: ['A', 'B'],
    answer: 1,
  })),
};

function attempt(mode: 'question' | 'quiz', seconds = 10): Attempt {
  const result = createAttempt(bank, 3);
  result.timing = createTiming({ mode, seconds }, 3, 100000);

  return result;
}

describe('time-limit validation', () => {
  it('keeps no limit as the default and existing records compatible', () => {
    const record = createAttempt(bank, 3);
    delete record.timing;
    expect(isAttempt(record)).toBe(true);
    expect(reconcileTiming(record, Number.MAX_SAFE_INTEGER)).toBe(false);
    expect(record.status).toBe('active');
    expect(isTimeLimit({ mode: 'none' })).toBe(true);
  });
  it('rejects invalid durations and malformed saved timers', () => {
    for (const seconds of [0, -1, 1.5, NaN, Infinity, 3601])
      expect(isTimeLimit({ mode: 'question', seconds })).toBe(false);

    expect(isSetupTimeLimit({ mode: 'quiz', seconds: 30 })).toBe(false);
    const record = attempt('quiz');
    record.timing!.deadlines[1] = null;
    expect(isAttempt(record)).toBe(false);
    const expired = attempt('question');
    expired.timing!.expired[0] = true;
    expired.answers[0] = 1;
    expect(isAttempt(expired)).toBe(false);
  });
});

describe('whole-quiz expiry', () => {
  it('counts unanswered questions wrong and preserves answers submitted in time', () => {
    const record = attempt('quiz');
    record.answers[0] = 1;
    expect(reconcileTiming(record, 109999)).toBe(false);
    expect(reconcileTiming(record, 110000)).toBe(true);
    expect(record.status).toBe('completed');
    expect(record.timing!.expired).toEqual([false, true, true]);
    expect(score(record).correct).toBe(1);
    expect(unanswered(record)).toEqual([]);
    expect(isAttempt(record)).toBe(true);
    expect(reconcileTiming(record, 999999)).toBe(false);
  });
  it('still ends after its deadline when every question was answered', () => {
    const record = attempt('quiz');
    record.answers = [1, 1, 1];
    reconcileTiming(record, 110000);
    expect(record.status).toBe('completed');
    expect(score(record).correct).toBe(3);
  });
});

describe('per-question expiry', () => {
  it('locks the expired question, advances, and excludes it from remaining answers', () => {
    const record = attempt('question');
    reconcileTiming(record, 110000);
    expect(record.position).toBe(1);
    expect(record.timing!.expired).toEqual([true, false, false]);
    expect(isLocked(record, 0, 110000)).toBe(true);
    expect(record.timing!.deadlines[1]).toBe(120000);
    expect(unanswered(record)).toEqual([1, 2]);
  });
  it('preserves a timely answer when its timer ends', () => {
    const record = attempt('question');
    record.answers[0] = 1;
    reconcileTiming(record, 110000);
    expect(record.timing!.expired[0]).toBe(false);
    expect(record.answers[0]).toBe(1);
    expect(record.position).toBe(1);
  });
  it('never resets a deadline on revisit and expires visited questions in parallel', () => {
    const record = attempt('question');
    visitQuestion(record, 1, 102000);
    visitQuestion(record, 0, 103000);
    expect(record.timing!.deadlines).toEqual([110000, 112000, null]);
    reconcileTiming(record, 112000);
    expect(record.timing!.expired).toEqual([true, true, false]);
    expect(record.position).toBe(2);
  });
  it('keeps an expired question open while the remaining timers progress', () => {
    const record = attempt('question');
    reconcileTiming(record, 110000);
    visitQuestion(record, 0, 111000);

    expect(record.position).toBe(0);
    expect(record.timing!.position).toBe(1);
    expect(reconcileTiming(record, 111000)).toBe(false);
    expect(record.position).toBe(0);

    reconcileTiming(record, 120000);

    expect(record.position).toBe(0);
    expect(record.timing!.position).toBe(2);
    expect(record.timing!.deadlines).toEqual([110000, 120000, 130000]);
    expect(record.timing!.expired).toEqual([true, true, false]);
    expect(isAttempt(record)).toBe(true);
  });

  it('allows reviewing older saved attempts without a timer position', () => {
    const record = attempt('question');
    reconcileTiming(record, 110000);
    delete record.timing!.position;
    expect(isAttempt(record)).toBe(true);

    visitQuestion(record, 0, 111000);
    reconcileTiming(record, 111250);

    expect(record.position).toBe(0);
    expect(record.timing!.position).toBe(1);
    expect(record.timing!.deadlines).toEqual([110000, 120000, null]);
  });

  it('rejects invalid saved timer positions', () => {
    for (const position of [-1, 0.5, 3, NaN, Infinity, 1]) {
      const record = attempt('question');
      record.timing!.position = position;
      expect(isAttempt(record)).toBe(false);
    }
  });

  it('catches up through the full quiz after a refresh or long suspension', () => {
    const record = attempt('question');
    const restored = structuredClone(record);
    reconcileTiming(restored, 999999);
    expect(restored.status).toBe('completed');
    expect(restored.timing!.expired).toEqual([true, true, true]);
    expect(restored.completedAt).toBe(new Date(130000).toISOString());
    expect(score(restored).correct).toBe(0);
    expect(isAttempt(restored)).toBe(true);
  });
});
