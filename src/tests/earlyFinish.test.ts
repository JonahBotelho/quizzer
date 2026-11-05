/** Early completion scores answered questions and survives real persistence transactions. */
import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';

import { createAttempt, isAttempt, score, scoredQuestions } from '../core/quiz';
import { reconcileTiming } from '../core/timing';
import type { Bank } from '../core/types';
import { IndexedRepository } from '../storage/repository';
import { SessionStore } from '../storage/session';

const bank: Bank = {
  id: 'early-finish',
  name: 'Early finish fixture',
  sample: false,
  questions: Array.from({ length: 10 }, (_, index) => ({
    id: index + 1,
    question: 'Question ' + (index + 1),
    options: ['Incorrect', 'Correct'],
    answer: 2,
  })),
};

it('scores five correct answers out of five answered in a ten-question quiz', () => {
  const attempt = createAttempt(bank, 10);
  attempt.answers = [2, 2, 2, 2, 2, null, null, null, null, null];

  expect(score(attempt)).toEqual({ correct: 5, total: 5, ratio: 1 });
});

it('counts incorrect answers and retains original positions when questions are skipped', () => {
  const attempt = createAttempt(bank, 10);
  attempt.answers = [2, null, 1, null, 2, null, 1, null, null, 2];

  expect(score(attempt)).toEqual({ correct: 3, total: 5, ratio: 0.6 });
  expect(scoredQuestions(attempt).map(item => item.index)).toEqual([0, 2, 4, 6, 9]);
});

it('uses a finite empty score when nothing was answered', () => {
  expect(score(createAttempt(bank, 10))).toEqual({ correct: 0, total: 0, ratio: 0 });
});

it('continues to count unanswered questions as incorrect on automatic expiry', () => {
  const attempt = createAttempt(bank, 10, { mode: 'quiz', seconds: 60 });
  attempt.answers[0] = 2;
  reconcileTiming(attempt, attempt.timing!.deadlines[0]!);

  expect(score(attempt)).toEqual({ correct: 1, total: 10, ratio: 0.1 });
  expect(isAttempt(attempt)).toBe(true);
});

it('excludes expired unanswered questions when manually ending a per-question quiz', () => {
  const attempt = createAttempt(bank, 10, { mode: 'question', seconds: 60 });
  const firstDeadline = attempt.timing!.deadlines[0]!;
  reconcileTiming(attempt, firstDeadline);
  attempt.answers[1] = 2;

  expect(score(attempt)).toEqual({ correct: 1, total: 1, ratio: 1 });
});

it('finishes after queued answers, restores the partial result, and cannot resume it', async () => {
  const repository = await IndexedRepository.open(crypto.randomUUID());
  const store = new SessionStore(async () => repository);

  try {
    await store.initialize();
    const attempt = (await store.start(bank, 10, null))!;
    const answers = Array.from({ length: 5 }, (_, index) => store.answer(attempt.id, index, 2));
    const finish = store.finish(attempt.id);
    await Promise.all([...answers, finish]);
    await store.finish(attempt.id);

    const saved = await repository.load();
    expect(saved.active).toBeNull();
    expect(saved.invalid).toBe(false);
    expect(saved.history).toHaveLength(1);
    expect(saved.history[0].questions).toHaveLength(10);
    expect(saved.history[0].answers.slice(5)).toEqual(Array(5).fill(null));
    expect(score(saved.history[0])).toEqual({ correct: 5, total: 5, ratio: 1 });
    expect(isAttempt(JSON.parse(JSON.stringify(saved.history[0])))).toBe(true);
    expect(store.getSnapshot().active).toBeNull();
  } finally {
    store.close();
  }
});
