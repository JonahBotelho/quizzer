/** Domain tests exercise the source format, random sampling, and scoring boundary. */
import { describe, expect, it } from 'vitest';
import { parseBanks, validateQuestions } from '../core/banks';
import { createAttempt, isAttempt, sample, score, unanswered } from '../core/quiz';
import { quizLengths, resolveQuestionCount } from '../core/quizLength';
import { percent } from '../i18n';
import type { Bank, Question } from '../core/types';

const questions: Question[] = Array.from({ length: 20 }, (_, id) => ({
  id,
  question: `Question ${id}`,
  options: ['First', 'Second', 'Third'],
  answer: 3,
}));
const bank: Bank = { id: 'demo', name: 'Demo', sample: false, questions };

describe('question banks', () => {
  it('isolates malformed files and gives entry-level validation errors', () => {
    const result = parseBanks({
      '/broken.json': '[',
      '/empty.json': '[]',
      '/invalid.json': JSON.stringify([{ ...questions[0], answer: 0 }]),
      '/valid.json': JSON.stringify(questions),
    });
    expect(result.banks).toHaveLength(1);
    expect(result.errors).toHaveLength(3);
    expect(result.errors.join(' ')).toContain('entry 1');
    expect(result.banks[0].questions[0].answer).toBe(3);
  });
  it.each([
    [{ ...questions[0], id: 1.5 }],
    [questions[0], questions[0]],
    [{ ...questions[0], question: ' ' }],
    [{ ...questions[0], options: ['one'] }],
    [{ ...questions[0], options: ['one', ''] }],
    [{ ...questions[0], answer: 4 }],
    [{ ...questions[0], answer: 1.2 }],
    [null],
    [],
  ])('rejects invalid question content %#', (...entries) => {
    expect(validateQuestions(entries).error).toBeTruthy();
  });
  it('keeps HTML-looking content as plain source text', () => {
    expect(
      validateQuestions([{ ...questions[0], question: '<script>alert(1)</script>' }]).error,
    ).toBeUndefined();
  });
});

describe('quiz domain', () => {
  it('samples without duplicates, preserves options, and snapshots its input', () => {
    const chosen = sample(questions, 10, () => 0.1);
    expect(new Set(chosen.map(question => question.id)).size).toBe(10);
    expect(chosen.map(question => question.id)).not.toEqual(
      questions.slice(0, 10).map(question => question.id),
    );
    expect(chosen[0].options).toEqual(questions[0].options);
    chosen[0].options[0] = 'Changed';
    expect(questions[0].options[0]).toBe('First');
  });
  it('resolves the same four choices against small and large banks', () => {
    expect(quizLengths).toEqual([10, 25, 50, 'all']);
    expect(quizLengths.map(choice => resolveQuestionCount(choice, 3))).toEqual([3, 3, 3, 3]);
    expect(quizLengths.map(choice => resolveQuestionCount(choice, 20))).toEqual([10, 20, 20, 20]);
    expect(quizLengths.map(choice => resolveQuestionCount(choice, 150))).toEqual([10, 25, 50, 150]);
    expect(() => sample(questions, 21)).toThrow();
  });
  it('samples and restores every question when an all-questions attempt exceeds 100', () => {
    const largeBank = {
      ...bank,
      questions: Array.from({ length: 150 }, (_, id) => ({ ...questions[0], id })),
    };
    const attempt = createAttempt(
      largeBank,
      resolveQuestionCount('all', largeBank.questions.length),
    );
    expect(attempt.questions).toHaveLength(150);
    expect(new Set(attempt.questions.map(question => question.id)).size).toBe(150);
    expect(attempt.answers).toHaveLength(150);
    expect(isAttempt(attempt)).toBe(true);
  });
  it('uses one-based answers and rounds percentage with Intl', () => {
    const attempt = createAttempt(bank, 3);
    attempt.answers = [3, 2, 3];
    expect(score(attempt)).toEqual({ correct: 2, total: 3, ratio: 2 / 3 });
    expect(percent(2 / 3)).toBe('66.7%');
  });
  it('identifies missing answers and accepts valid partial completions', () => {
    const attempt = createAttempt(bank, 3);
    attempt.answers[1] = 3;
    expect(unanswered(attempt)).toEqual([0, 2]);
    expect(isAttempt(attempt)).toBe(true);
    expect(
      isAttempt({ ...attempt, status: 'completed', completedAt: new Date().toISOString() }),
    ).toBe(true);
    expect(isAttempt({ ...attempt, status: 'completed', completedAt: null })).toBe(false);
    expect(isAttempt({ ...attempt, version: 2 })).toBe(false);
    expect(isAttempt({ ...attempt, position: 3 })).toBe(false);
    expect(isAttempt({ ...attempt, answers: [4, 2, 1] })).toBe(false);
  });
});
