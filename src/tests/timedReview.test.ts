/** Expired and answered questions stay reviewable without changing answers or saved deadlines. */
import 'fake-indexeddb/auto';
import { afterEach, expect, it, vi } from 'vitest';
import type { Bank } from '../core/types';
import { IndexedRepository } from '../storage/repository';
import { SessionStore } from '../storage/session';

const bank: Bank = {
  id: 'timed-review',
  name: 'Timed review',
  sample: false,
  questions: Array.from({ length: 3 }, (_, id) => ({
    id,
    question: `Question ${id}`,
    options: ['Incorrect', 'Correct'],
    answer: 2,
  })),
};
const stores: SessionStore[] = [];

async function session(name: string) {
  const store = new SessionStore(() => IndexedRepository.open(name));
  stores.push(store);
  await store.initialize();

  return store;
}

afterEach(() => {
  stores.splice(0).forEach(store => store.close());
  vi.useRealTimers();
});

it.each([null, 1, 2])(
  'restores a locked question with answer %s and preserves timer progress',
  async answer => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-05T00:00:00Z'));
    const name = crypto.randomUUID();
    const store = await session(name);
    const attempt = (await store.start(bank, 3, null, { mode: 'question', seconds: 10 }))!;

    if (answer !== null) await store.answer(attempt.id, 0, answer);

    const firstDeadline = attempt.timing!.deadlines[0]!;
    vi.setSystemTime(firstDeadline);
    await store.expire();
    expect(store.getSnapshot().active!.position).toBe(1);

    await store.navigate(attempt.id, 0);
    expect(await store.answer(attempt.id, 0, 2)).toBeNull();
    vi.setSystemTime(firstDeadline + 10_000);
    await store.expire();

    const reviewed = store.getSnapshot().active!;
    expect(reviewed.position).toBe(0);
    expect(reviewed.answers[0]).toBe(answer);
    expect(reviewed.timing!.position).toBe(2);
    store.close();

    const restored = await session(name);
    expect(restored.getSnapshot().active!.position).toBe(0);
    expect(restored.getSnapshot().active!.timing).toEqual(reviewed.timing);
    expect(await restored.answer(attempt.id, 0, 2)).toBeNull();

    await restored.navigate(attempt.id, 1);
    expect(restored.getSnapshot().active!.position).toBe(1);
    expect(await restored.answer(attempt.id, 1, 2)).toBeNull();
    await restored.navigate(attempt.id, 2);
    await restored.answer(attempt.id, 2, 2);

    expect(restored.getSnapshot().active!.answers).toEqual([answer, null, 2]);
  },
);
