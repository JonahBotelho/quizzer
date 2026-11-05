/** Combined quizzes retain overlapping source IDs safely through scoring and reloads. */
import { describe, expect, it } from 'vitest';
import { combinedBankId, withCombinedBank } from '../core/combinedBank';
import { createAttempt, isAttempt, score } from '../core/quiz';
import { t } from '../i18n';
import type { Bank } from '../core/types';

const banks: Bank[] = [
  {
    id: 'bundled',
    name: 'Bundled',
    sample: true,
    questions: [
      { id: 1, question: 'Bundled question?', options: ['One', 'Two', 'Three'], answer: 3 },
    ],
  },
  {
    id: 'imported:demo',
    name: 'Imported',
    sample: false,
    imported: true,
    questions: [{ id: 1, question: 'Imported question?', options: ['First', 'Second'], answer: 2 }],
  },
];

describe('combined question bank', () => {
  it('includes bundled and imported questions with unique IDs without changing sources', () => {
    const original = structuredClone(banks);
    const library = withCombinedBank(banks);
    expect(library.slice(0, -1)).toEqual(original);
    const combined = library.at(-1)!;
    expect(combined.id).toBe(combinedBankId);
    expect(combined.name).toBe(t('allBanks'));
    expect(combined.questions.map(question => question.question)).toEqual(
      banks.flatMap(bank => bank.questions.map(question => question.question)),
    );
    expect(new Set(combined.questions.map(question => question.id)).size).toBe(2);
    combined.questions[0].options[0] = 'Edited';
    expect(banks).toEqual(original);
  });

  it('scores one-based answers and restores timed combined attempts', () => {
    const combined = withCombinedBank(banks).at(-1)!;
    const attempt = createAttempt(combined, 2, { mode: 'quiz', seconds: 60 });
    attempt.answers = attempt.questions.map(question => question.answer);
    expect(score(attempt)).toEqual({ correct: 2, total: 2, ratio: 1 });
    expect(isAttempt(JSON.parse(JSON.stringify(attempt)))).toBe(true);
    const sample = createAttempt(combined, 1);
    expect(sample.questions).toHaveLength(1);
    expect(isAttempt(sample)).toBe(true);
  });

  it('does not create an empty choice and rebuilds the pool when the library changes', () => {
    expect(withCombinedBank([])).toEqual([]);
    expect(withCombinedBank(banks.slice(0, 1)).at(-1)!.questions).toHaveLength(1);
    expect(withCombinedBank(banks).at(-1)!.questions).toHaveLength(2);
  });
});
