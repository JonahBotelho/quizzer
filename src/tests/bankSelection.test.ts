/** Bank choices stay exclusive with All and form safe, repeatable question pools. */
import { describe, expect, it } from 'vitest';

import { resolveBank, selectedBank, toggleBankSelection } from '../core/bankSelection';
import { combinedBankId, withCombinedBank } from '../core/combinedBank';
import { createAttempt, isAttempt, score } from '../core/quiz';
import type { Bank } from '../core/types';

const banks: Bank[] = ['first', 'second', 'third'].map(id => ({
  id,
  name: id,
  sample: false,
  questions: [{ id: 1, question: id + '?', options: ['Yes', 'No'], answer: 2 }],
}));
const library = withCombinedBank(banks);

describe('bank multiselect', () => {
  it('adds and removes individual banks independently, including the final choice', () => {
    expect(toggleBankSelection(['first'], 'second')).toEqual(['first', 'second']);
    expect(toggleBankSelection(['first', 'second'], 'first')).toEqual(['second']);
    expect(toggleBankSelection(['first'], 'first')).toEqual([]);
    expect(selectedBank(library, [])).toBeUndefined();
  });

  it('keeps All mutually exclusive in both directions', () => {
    expect(toggleBankSelection(['first', 'second'], combinedBankId)).toEqual([combinedBankId]);
    expect(toggleBankSelection([combinedBankId], 'second')).toEqual(['second']);
    expect(toggleBankSelection([combinedBankId], combinedBankId)).toEqual([]);
    expect(selectedBank(library, [combinedBankId])).toBe(library.at(-1));
  });

  it('preserves a single bank and combines only selected sources with unique IDs', () => {
    expect(selectedBank(library, ['second'])).toBe(banks[1]);
    const original = structuredClone(banks);
    const combined = selectedBank(library, ['second', 'first'])!;

    expect(combined.questions.map(question => question.question)).toEqual(['first?', 'second?']);
    expect(new Set(combined.questions.map(question => question.id)).size).toBe(2);
    expect(selectedBank(library, ['first', 'second'])!.id).toBe(combined.id);
    combined.questions[0].options[0] = 'Changed';
    expect(banks).toEqual(original);
  });

  it('restores mixed attempts and resolves the same pool for repeat after reload', () => {
    const combined = selectedBank(library, ['first', 'second'])!;
    const attempt = createAttempt(combined, 2, { mode: 'quiz', seconds: 60 });
    attempt.answers = attempt.questions.map(question => question.answer);
    const restored = JSON.parse(JSON.stringify(attempt));

    expect(isAttempt(restored)).toBe(true);
    expect(score(restored)).toEqual({ correct: 2, total: 2, ratio: 1 });
    expect(resolveBank(library, restored.bankId)).toEqual(combined);
    expect(resolveBank(withCombinedBank(banks.slice(1)), restored.bankId)).toBeUndefined();
    expect(resolveBank(library, 'second')).toBe(banks[1]);
  });

  it.each([
    'unknown',
    'combined:selected:invalid',
    'combined:selected:null',
    'combined:selected:[1,2]',
    'combined:selected:["first","first"]',
    'combined:selected:["first","combined:all"]',
  ])('ignores unresolvable pool identifiers: %s', id => {
    expect(resolveBank(library, id)).toBeUndefined();
  });
});
