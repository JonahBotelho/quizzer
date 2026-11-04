/** Persistence integration tests run real IDB transactions against fake-indexeddb. */
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { openDB } from 'idb';
import { IndexedRepository, ConflictError } from '../storage/repository';
import { createAttempt } from '../core/quiz';
import type { Bank } from '../core/types';
const bank: Bank = { id: 'source', name: 'Source', sample: false, questions: [{ id: 1, question: 'Snapshot?', options: ['Yes', 'No'], answer: 1 }] };
const opened: IndexedRepository[] = [];
async function open(name: string = crypto.randomUUID()) { const repository = await IndexedRepository.open(name); opened.push(repository); return repository; }
afterEach(() => opened.splice(0).forEach(repository => repository.close()));
describe('IndexedDB repository', () => {
  it('recovers snapshots without the original bank', async () => {
    const name = crypto.randomUUID(), repository = await open(name), attempt = createAttempt(bank, 1);
    await repository.create(attempt, null); repository.close();
    expect((await (await open(name)).load()).active).toEqual(attempt);
    expect((await loadSavedState(name)).active?.questions[0].question).toBe('Snapshot?');
  });
  it('finalizes atomically and repeated submission does not duplicate history', async () => {
    const repository = await open(), attempt = createAttempt(bank, 1); await repository.create(attempt, null);
    const completed = { ...attempt, answers: [1], revision: 1, status: 'completed' as const, completedAt: new Date().toISOString() };
    await repository.write(completed, 0); await repository.write(completed, 0);
    await expect(repository.write({ ...completed, answers: [2] }, 0)).rejects.toBeInstanceOf(ConflictError);
    const saved = await repository.load(); expect(saved.active).toBeNull(); expect(saved.history).toEqual([completed]);
    await expect(repository.write({ ...attempt, revision: 1 }, 0)).rejects.toBeInstanceOf(ConflictError);
  });
  it('rejects competing writes and stale replacement or discard', async () => {
    const name = crypto.randomUUID(), first = await open(name), second = await open(name);
    const attempt = createAttempt(bank, 1); await first.create(attempt, null);
    await first.write({ ...attempt, revision: 1, answers: [2] }, 0);
    await expect(second.write({ ...attempt, revision: 1, answers: [1] }, 0)).rejects.toBeInstanceOf(ConflictError);
    await expect(second.create(createAttempt(bank, 1), attempt)).rejects.toBeInstanceOf(ConflictError);
    await expect(second.discard(attempt)).rejects.toBeInstanceOf(ConflictError);
    expect((await second.load()).active?.answers).toEqual([2]);
  });
  it('clears only completed history and preserves an active attempt', async () => {
    const repository = await open(), old = createAttempt(bank, 1); await repository.create(old, null);
    await repository.write({ ...old, revision: 1, answers: [1], status: 'completed', completedAt: new Date().toISOString() }, 0);
    const active = createAttempt(bank, 1); await repository.create(active, null); await repository.removeCompleted();
    expect((await repository.load()).active?.id).toBe(active.id); expect((await repository.load()).history).toEqual([]);
  });
  it('skips corrupt records without deleting good records', async () => {
    const name = crypto.randomUUID(), repository = await open(name), active = createAttempt(bank, 1); await repository.create(active, null);
    const raw = await openDB(name); await raw.put('attempts', { id: 'corrupt', version: 99 }); raw.close();
    const saved = await repository.load(); expect(saved.invalid).toBe(true); expect(saved.active).toEqual(active);
  });
});
async function loadSavedState(name: string) { return (await open(name)).load(); }


