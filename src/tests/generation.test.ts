/** Generation validation and local-bank compatibility protect the existing quiz lifecycle. */
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { GenerationError, generationLimits, validateGeneratedQuestions, validateGenerationRequest } from '../core/generation';
import { createLocalBank, importBank, isImportedBank } from '../core/importBank';
import { BankRepository } from '../storage/bankRepository';
import { generationErrorMessage } from '../generation/errors';

const question = { question: 'Which value is third?', options: ['One', 'Two', 'Three', 'Four'], answer: 3 };
const input = { title: '  My title  ', description: 'A useful quiz', questionCount: 1, documents: [], password: 'secret' };

describe('generation validation', () => {
  it('trims the brief, keeps passwords exact, and strips unknown request fields', () => {
    const result = validateGenerationRequest({ ...input, provider: 'override', password: ' secret ' });
    expect(result.title).toBe('My title');
    expect(result.password).toBe(' secret ');
    expect(result).not.toHaveProperty('provider');
  });

  it.each([
    { title: ' ' }, { title: 'x'.repeat(121) }, { description: '' }, { description: 'x'.repeat(5001) },
    { questionCount: 0 }, { questionCount: 51 }, { questionCount: 1.5 }, { password: 123 }, { password: 'x'.repeat(1025) },
    { documents: null }, { documents: [{ name: 'a.txt', text: '' }] },
    { documents: Array.from({ length: 6 }, () => ({ name: 'a.txt', text: 'a' })) },
    { documents: [{ name: 'a.txt', text: 'x'.repeat(generationLimits.characters + 1) }] },
  ])('rejects invalid requests: %j', change => {
    expect(() => validateGenerationRequest({ ...input, ...change })).toThrow(GenerationError);
  });

  it.each([undefined, '', '  '])('accepts an optional password value %j', password => {
    const result = validateGenerationRequest({ ...input, password });
    expect(result.password).toBe(password);
    if (password === undefined) expect(result).not.toHaveProperty('password');
  });

  it.each([undefined, '', '  '])('rejects password value %j when protection is enabled', password => {
    expect(() => validateGenerationRequest({ ...input, password }, true)).toThrow('invalidInput');
  });

  it('enforces the combined reference text limit', () => {
    const documents = [{ name: 'a', text: 'a'.repeat(60_000) }, { name: 'b', text: 'b'.repeat(60_000) }];
    expect(() => validateGenerationRequest({ ...input, documents })).toThrow('tooLarge');
  });

  it('assigns IDs, preserves case-sensitive options, and removes model metadata', () => {
    const options = ['Number', 'number', 'String', 'string'];
    const questions = validateGeneratedQuestions([{ ...question, id: -8, options, extra: true }], 1);
    expect(questions).toEqual([{ ...question, id: 1, options }]);
  });

  it.each([
    [], [null], [{ ...question, answer: 0 }], [{ ...question, answer: 5 }],
    [{ ...question, options: ['A', ' A ', 'B', 'C'] }], [{ ...question, options: ['A', 'B'] }],
    [{ ...question, question: [{ type: 'text', text: 'blocks unsupported' }] }],
  ].map(value => ({ value })))('rejects incomplete or invalid model questions: %j', ({ value }) => {
    expect(() => validateGeneratedQuestions(value, 1)).toThrow('invalidOutput');
  });

  it('rejects duplicate questions after whitespace normalization', () => {
    expect(() => validateGeneratedQuestions([question, { ...question, question: ' Which value  is third? ' }], 2)).toThrow('invalidOutput');
  });

  it('replaces unexpected errors with locale copy', () => {
    expect(generationErrorMessage(new Error('secret upstream content'))).not.toContain('upstream');
    expect(generationErrorMessage(new GenerationError('unauthorized'))).toContain('password');
  });
});

describe('generated bank storage', () => {
  it('round-trips generated banks and legacy imports without a database migration', async () => {
    const repository = await BankRepository.open(crypto.randomUUID());
    try {
      const questions = validateGeneratedQuestions([question], 1);
      const legacy = importBank('my-title.json', JSON.stringify(questions), []);
      const generated = createLocalBank('My Title', questions, [legacy], true);
      expect(generated.name).toBe('My Title (2)');
      expect(generated.source).toBe('generated');
      expect(isImportedBank(legacy)).toBe(true);
      expect(isImportedBank(generated)).toBe(true);
      await repository.add(legacy);
      await repository.add(generated);
      expect((await repository.load()).banks).toEqual(expect.arrayContaining([legacy, generated]));
      expect((await repository.load()).banks).toHaveLength(2);
      expect(generated).not.toHaveProperty('description');
      expect(importBank('backup.json', JSON.stringify(generated.questions), []).questions).toEqual(questions);
    } finally { repository.close(); }
  });
});
