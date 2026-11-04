/** Mixed question blocks retain content through validation, sampling, and storage. */
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { validateQuestions, parseBanks } from '../core/banks';
import { importBank } from '../core/importBank';
import { withCombinedBank } from '../core/combinedBank';
import { createAttempt, isAttempt, score } from '../core/quiz';
import { IndexedRepository } from '../storage/repository';
import { BankRepository } from '../storage/bankRepository';
import type { Question, QuestionBlock } from '../core/types';

const code = '\n\tconst markup = "<script>alert(1)</script>";\n  console.log(markup);\n';
const blocks: QuestionBlock[] = [
  { type: 'code', code }, { type: 'text', text: ' Between snippets.\n' },
  { type: 'code', code: 'console.log("second");' }, { type: 'text', text: 'What is printed?' },
];
const question: Question = { id: 1, question: blocks, options: ['One', 'Two', 'Three'], answer: 3 };

describe('question content', () => {
  it('accepts literal strings and interleaved blocks without altering whitespace', () => {
    for (const content of ['<b>Literal text</b>', blocks, [{ type: 'text', text: 'Text only' }]]) {
      const input = [{ ...question, question: content }];
      expect(validateQuestions(input)).toEqual({ questions: input });
      expect(parseBanks({ '/test.json': JSON.stringify(input) }).errors).toEqual([]);
    }
  });
  it.each([null, 42, '', '  ', [], {}, [null], ['code'], [{ type: 'html', text: 'x' }],
    [{ type: 'text', text: '' }], [{ type: 'text', text: 1 }], [{ type: 'text', code: 'x' }],
    [{ type: 'code' }], [{ type: 'code', code: ' \n\t' }], [{ type: 'code', code: false }],
  ].map(content => ({ content })))('rejects invalid content %#', ({ content }) => {
    expect(validateQuestions([{ ...question, question: content }]).error).toBeTruthy();
  });
  it('reports the question and block positions', () => {
    const result = validateQuestions([{ ...question, id: 2 }, { ...question, question: [blocks[0], { type: 'code', code: '' }] }]);
    expect(result.error).toContain('entry 2');
    expect(result.error).toContain('block 2');
  });
  it('sanitizes nested imports and independently copies combined banks and snapshots', () => {
    const source = { ...question, extra: 'discard', question: [{ type: 'code', code, extra: 'discard' }] };
    const bank = importBank('code.json', JSON.stringify(source), []);
    expect(bank.questions).toEqual([{ ...question, question: [{ type: 'code', code }] }]);
    const combined = withCombinedBank([bank]).at(-1)!;
    const combinedBlock = (combined.questions[0].question as QuestionBlock[])[0];
    if (combinedBlock.type === 'code') combinedBlock.code = 'Changed';
    expect(bank.questions[0].question).toEqual([{ type: 'code', code }]);
    const attempt = createAttempt(bank, 1);
    const snapshotBlock = (attempt.questions[0].question as QuestionBlock[])[0];
    if (snapshotBlock.type === 'code') snapshotBlock.code = 'Snapshot edit';
    expect(bank.questions[0].question).toEqual([{ type: 'code', code }]);
    attempt.answers = [3];
    expect(score(attempt).correct).toBe(1);
    expect(isAttempt(attempt)).toBe(true);
    attempt.questions[0].question = [{ type: 'code', code: '' }];
    expect(isAttempt(attempt)).toBe(false);
  });
  it.each([{ content: 'Legacy plain question' }, { content: blocks }])('restores imports, active attempts, and completed history %#', async ({ content }) => {
    const bank = importBank('code.json', JSON.stringify({ ...question, question: content }), []);
    const bankName = crypto.randomUUID(), attemptName = crypto.randomUUID();
    const imported = await BankRepository.open(bankName);
    try { await imported.add(bank); } finally { imported.close(); }
    const restored = await BankRepository.open(bankName);
    try { expect((await restored.load()).banks).toEqual([bank]); } finally { restored.close(); }
    const attempt = createAttempt(bank, 1);
    const repository = await IndexedRepository.open(attemptName);
    try { await repository.create(attempt, null); } finally { repository.close(); }
    const active = await IndexedRepository.open(attemptName);
    const completed = { ...attempt, answers: [3], revision: 1, status: 'completed' as const, completedAt: new Date().toISOString() };
    try {
      expect((await active.load()).active).toEqual(attempt);
      await active.write(completed, 0);
    } finally { active.close(); }
    const history = await IndexedRepository.open(attemptName);
    try { expect((await history.load()).history).toEqual([completed]); } finally { history.close(); }
  });
});
