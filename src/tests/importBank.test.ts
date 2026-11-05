/** Import parsing and round-trip persistence use the public question schema. */
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { openDB } from 'idb';
import { importBank, isImportedBank } from '../core/importBank';
import { validateQuestions } from '../core/banks';
import { BankRepository } from '../storage/bankRepository';
import sample from '../data/sample-quiz.json';

const question = {
  id: 1,
  question: 'Choose the third option',
  options: ['One', 'Two', 'Three', 'Four'],
  answer: 3,
};
const repositories: BankRepository[] = [];

async function open(name: string = crypto.randomUUID()) {
  const repository = await BankRepository.open(name);
  repositories.push(repository);

  return repository;
}

afterEach(() => repositories.splice(0).forEach(repository => repository.close()));

describe('JSON imports', () => {
  it('imports arrays and a single question with one-based answers', () => {
    const bank = importBank('my-quiz.JSON', '\uFEFF' + JSON.stringify([question]), []);
    expect(bank.name).toBe('My Quiz');
    expect(bank.questions).toEqual([question]);
    expect(isImportedBank(bank)).toBe(true);
    expect(importBank('one.json', JSON.stringify(question), []).questions).toEqual([question]);
  });
  it('rejects malformed JSON, invalid structure, duplicate IDs, and zero-based answers', () => {
    expect(() => importBank('quiz.txt', '[]', [])).toThrow('.json');
    expect(() => importBank('bad.json', '[', [])).toThrow('bad.json');

    for (const data of [
      [],
      { questions: [question] },
      [question, question],
      [{ ...question, answer: 0 }],
      [{ ...question, options: ['Only one'] }],
    ]) {
      expect(() => importBank('bad.json', JSON.stringify(data), [])).toThrow();
    }
  });
  it('does not overwrite bundled or imported names and strips unrelated properties', () => {
    const bundled = { id: 'my-quiz', name: 'My Quiz', questions: [question], sample: false };
    const imported = importBank(
      'my-quiz.json',
      JSON.stringify([{ ...question, extra: 'ignored' }]),
      [bundled],
    );
    const copy = importBank('my-quiz.json', JSON.stringify([question]), [bundled, imported]);
    expect(imported.id).not.toBe(bundled.id);
    expect(copy.id).not.toBe(imported.id);
    expect(imported.name).toBe('My Quiz (2)');
    expect(copy.name).toBe('My Quiz (3)');
    expect(imported.questions[0]).not.toHaveProperty('extra');
    expect(bundled.name).toBe('My Quiz');
  });
  it('exports a valid sample that can be imported unchanged', () => {
    expect(validateQuestions(sample).error).toBeUndefined();
    expect(sample[0].answer).toBe(3);
    expect(importBank('quizzer-sample.json', JSON.stringify(sample), []).questions).toEqual(sample);
  });
});

describe('imported bank storage', () => {
  it('restores imported questions across repository reloads', async () => {
    const name = crypto.randomUUID();
    const repository = await open(name);
    const bank = importBank('local.json', JSON.stringify([question]), []);
    await repository.add(bank);
    repository.close();
    expect((await (await open(name)).load()).banks).toEqual([bank]);
  });
  it('keeps both same-filename imports and skips invalid stored records', async () => {
    const name = crypto.randomUUID();
    const repository = await open(name);
    const first = importBank('local.json', JSON.stringify([question]), []);
    const second = importBank('local.json', JSON.stringify([question]), [first]);
    await repository.add(first);
    await repository.add(second);
    const raw = await openDB(name);
    await raw.put('banks', { id: 'bad', version: 99 });
    raw.close();
    const saved = await repository.load();
    expect(saved.banks).toHaveLength(2);
    expect(saved.invalid).toBe(true);
  });
});
