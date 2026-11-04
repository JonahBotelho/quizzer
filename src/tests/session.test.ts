/** Session tests verify command ordering, fallback mode, and conflict recovery. */
import 'fake-indexeddb/auto';
import { afterEach, expect, it, vi } from 'vitest';
import { SessionStore } from '../storage/session';
import { IndexedRepository } from '../storage/repository';
import type { Bank } from '../core/types';
const bank: Bank = { id: 'bank', name: 'Bank', sample: false, questions: [{ id: 1, question: 'Choose', options: ['A', 'B'], answer: 2 }] };
const stores: SessionStore[] = [];
async function session(open = () => IndexedRepository.open(crypto.randomUUID())) { const store = new SessionStore(open); stores.push(store); await store.initialize(); return store; }
afterEach(() => stores.splice(0).forEach(store => store.close()));
it('saves ordered answer changes before finishing even when calls are not awaited', async () => {
  const store = await session(), attempt = (await store.start(bank, 1, null))!;
  const first = store.answer(attempt.id, 0, 1), second = store.answer(attempt.id, 0, 2), finish = store.finish(attempt.id);
  await Promise.all([first, second, finish]);
  expect(store.getSnapshot().active).toBeNull(); expect(store.getSnapshot().history[0].answers).toEqual([2]);
  expect(store.getSnapshot().history[0].revision).toBe(3);
  await store.finish(attempt.id); expect(store.getSnapshot().history).toHaveLength(1);
});
it('blocks unfinished submission', async () => {
  const store = await session(), attempt = (await store.start(bank, 1, null))!;
  expect(await store.finish(attempt.id)).toBeNull(); expect(store.getSnapshot().active).not.toBeNull();
});
it('works in memory when storage is unavailable', async () => {
  const store = await session(async () => { throw new Error('Unavailable'); });
  expect(store.getSnapshot().notice).toBe('storageUnavailable');
  const attempt = (await store.start(bank, 1, null))!; await store.answer(attempt.id, 0, 2); await store.finish(attempt.id);
  expect(store.getSnapshot().history).toHaveLength(1); expect(store.getSnapshot().persistent).toBe(false);
});
it('retains the latest answer in memory after a write failure', async () => {
  const repository = await IndexedRepository.open(crypto.randomUUID()), store = await session(async () => repository);
  const attempt = (await store.start(bank, 1, null))!;
  vi.spyOn(repository, 'write').mockRejectedValue(new DOMException('Full', 'QuotaExceededError'));
  await store.answer(attempt.id, 0, 2); await store.finish(attempt.id);
  expect(store.getSnapshot().notice).toBe('storageFailed'); expect(store.getSnapshot().history[0].answers).toEqual([2]);
});
it('reloads a competing tab state and never resurrects discarded progress', async () => {
  const name = crypto.randomUUID(), firstStore = await session(() => IndexedRepository.open(name));
  const attempt = (await firstStore.start(bank, 1, null))!;
  const secondStore = await session(() => IndexedRepository.open(name));
  await firstStore.answer(attempt.id, 0, 2); await secondStore.answer(attempt.id, 0, 1);
  expect(secondStore.getSnapshot().notice).toBe('storageConflict'); expect(secondStore.getSnapshot().active?.answers).toEqual([2]);
  await firstStore.discard(firstStore.getSnapshot().active!); await secondStore.answer(attempt.id, 0, 1);
  expect(secondStore.getSnapshot().active).toBeNull();
});

it('rejects an answer arriving at the deadline and finalizes only once', async () => {
  const repository = await IndexedRepository.open(crypto.randomUUID()), store = await session(async () => repository);
  const now = 1700000000000; vi.spyOn(Date, 'now').mockReturnValue(now);
  const attempt = (await store.start(bank, 1, null, { mode: 'question', seconds: 1 }))!;
  const end = attempt.timing!.deadlines[0]!;
  vi.spyOn(Date, 'now').mockReturnValue(end);
  await store.answer(attempt.id, 0, 2); await store.expire();
  expect(store.getSnapshot().active).toBeNull(); expect(store.getSnapshot().history).toHaveLength(1);
  expect(store.getSnapshot().history[0].answers).toEqual([null]);
  expect(store.getSnapshot().history[0].timing!.expired).toEqual([true]);
  expect((await repository.load()).history).toHaveLength(1); vi.restoreAllMocks();
});
it('reconciles an expired saved quiz on initialization', async () => {
  const name = crypto.randomUUID(), repository = await IndexedRepository.open(name);
  const { createAttempt } = await import('../core/quiz');
  const expired = createAttempt(bank, 1, { mode: 'quiz', seconds: 1 });
  expired.timing!.deadlines = [Date.now() - 1000]; await repository.create(expired, null); repository.close();
  const store = await session(() => IndexedRepository.open(name));
  expect(store.getSnapshot().active).toBeNull(); expect(store.getSnapshot().autoCompletedId).toBe(expired.id);
  expect(store.getSnapshot().history[0].timing!.expired).toEqual([true]);
});

it('two tabs reconcile the same timed completion without duplicate results', async () => {
  const name = crypto.randomUUID(), firstStore = await session(() => IndexedRepository.open(name));
  const attempt = (await firstStore.start(bank, 1, null, { mode: 'quiz', seconds: 1 }))!;
  const secondStore = await session(() => IndexedRepository.open(name));
  vi.spyOn(Date, 'now').mockReturnValue(attempt.timing!.deadlines[0]!);
  await firstStore.expire(); await secondStore.expire();
  expect(firstStore.getSnapshot().history).toHaveLength(1); expect(secondStore.getSnapshot().history).toHaveLength(1);
  expect(secondStore.getSnapshot().active).toBeNull(); expect(secondStore.getSnapshot().autoCompletedId).toBe(attempt.id);
  vi.restoreAllMocks();
});
