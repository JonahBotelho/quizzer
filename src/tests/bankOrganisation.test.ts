/** Reorganizing banks must retain the original JavaScript question identities exactly once. */
import { describe, expect, it } from 'vitest';
import { catalog } from '../catalog';

const basics = catalog.banks.find(bank => bank.id === 'javascript-basics')!;
const asynchronous = catalog.banks.find(bank => bank.id === 'javascript-async')!;

describe('JavaScript bank organization', () => {
  it('retains all 90 original question IDs across the two banks without overlap', () => {
    const ids = [...basics.questions, ...asynchronous.questions].map(question => question.id);
    expect(ids.sort((left, right) => left - right)).toEqual(Array.from({ length: 90 }, (_, index) => index + 1));
  });

  it('places timer and event-loop questions with Promises while keeping synchronous function examples in Basics', () => {
    const asyncIds = asynchronous.questions.map(question => question.id);
    const basicIds = basics.questions.map(question => question.id);
    expect(asyncIds).toEqual(expect.arrayContaining([45, 46, 47, 59, 60, 63, 76, 87, 90]));
    expect(basicIds).toEqual(expect.arrayContaining([39, 52, 53, 56, 57, 58, 61]));
    expect(asyncIds.some(id => basicIds.includes(id))).toBe(false);
  });
});
