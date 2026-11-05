/** Bundled programming examples provide complete, usable 20-question banks. */
import { describe, expect, it } from 'vitest';
import { catalog } from '../catalog';
import { createAttempt, isAttempt, score } from '../core/quiz';

const examples = [
  { id: 'sample-python', name: 'Python' },
  { id: 'sample-java', name: 'Java' },
  { id: 'sample-javascript', name: 'JavaScript' },
  { id: 'sample-csharp', name: 'C#' },
];

describe('bundled programming examples', () => {
  it.each(examples)(
    '$name has 20 questions and supports a complete saved attempt',
    ({ id, name }) => {
      const bank = catalog.banks.find(bank => bank.id === id)!;

      expect(bank).toMatchObject({ name, sample: true });
      expect(bank.questions).toHaveLength(20);
      expect(new Set(bank.questions.map(question => question.id)).size).toBe(20);

      const attempt = createAttempt(bank, 20);
      attempt.answers = attempt.questions.map(question => question.answer);

      expect(score(attempt)).toEqual({ correct: 20, total: 20, ratio: 1 });
      expect(isAttempt(JSON.parse(JSON.stringify(attempt)))).toBe(true);
    },
  );
});
