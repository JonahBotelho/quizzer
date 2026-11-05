/** Transactional IndexedDB repository. Revision checks protect against stale tabs. */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { isAttempt } from '../core/quiz';
import type { Attempt, SavedState } from '../core/types';

interface QuizDatabase extends DBSchema {
  attempts: { key: string; value: Attempt };
  metadata: { key: string; value: string };
}

export class ConflictError extends Error {}

export interface Repository {
  load(): Promise<SavedState>;
  create(attempt: Attempt, expected: Attempt | null): Promise<void>;
  write(attempt: Attempt, expectedRevision: number): Promise<void>;
  discard(expected: Attempt): Promise<void>;
  removeCompleted(id?: string): Promise<void>;
  close(): void;
}

export class IndexedRepository implements Repository {
  constructor(private database: IDBPDatabase<QuizDatabase>) {}

  static async open(name = 'quizzer'): Promise<IndexedRepository> {
    const database = await openDB<QuizDatabase>(name, 1, {
      upgrade(database) {
        database.createObjectStore('attempts', { keyPath: 'id' });
        database.createObjectStore('metadata');
      },
      blocking() {
        database.close();
      },
    });

    return new IndexedRepository(database);
  }

  async load(): Promise<SavedState> {
    const transaction = this.database.transaction(['attempts', 'metadata'], 'readonly');
    const records: unknown[] = await transaction.objectStore('attempts').getAll();
    const activeId = await transaction.objectStore('metadata').get('active');
    await transaction.done;
    const validAttempts = records.filter(isAttempt);
    const active =
      validAttempts.find(attempt => attempt.id === activeId && attempt.status === 'active') ?? null;

    return {
      active,
      history: validAttempts
        .filter(attempt => attempt.status === 'completed')
        .sort((attempt, otherAttempt) =>
          otherAttempt.completedAt!.localeCompare(attempt.completedAt!),
        ),
      invalid:
        validAttempts.length !== records.length ||
        (!!activeId && !active) ||
        validAttempts.some(attempt => attempt.status === 'active' && attempt.id !== activeId),
    };
  }

  async create(attempt: Attempt, expected: Attempt | null): Promise<void> {
    // Read the revision and write inside one transaction so competing tabs cannot both win.
    const transaction = this.database.transaction(['attempts', 'metadata'], 'readwrite');
    const attempts = transaction.objectStore('attempts');
    const metadata = transaction.objectStore('metadata');
    const activeId = await metadata.get('active');
    const previous = activeId ? await attempts.get(activeId) : undefined;
    const current = isAttempt(previous) && previous.status === 'active' ? previous : null;

    if (current?.id !== expected?.id || current?.revision !== expected?.revision) {
      await transaction.done;
      throw new ConflictError();
    }

    if (current) await attempts.delete(current.id);

    await attempts.add(attempt);
    await metadata.put(attempt.id, 'active');
    await transaction.done;
  }

  async write(attempt: Attempt, expectedRevision: number): Promise<void> {
    const transaction = this.database.transaction(['attempts', 'metadata'], 'readwrite');
    const attempts = transaction.objectStore('attempts');
    const metadata = transaction.objectStore('metadata');
    const current = await attempts.get(attempt.id);
    // Completion is idempotent, but active edits can never resurrect a finished record.
    if (isAttempt(current) && current.status === 'completed' && attempt.status === 'completed') {
      await transaction.done;

      if (JSON.stringify(current) === JSON.stringify(attempt)) return;

      throw new ConflictError();
    }

    const activeId = await metadata.get('active');

    if (
      !isAttempt(current) ||
      current.status !== 'active' ||
      activeId !== attempt.id ||
      current.revision !== expectedRevision
    ) {
      await transaction.done;
      throw new ConflictError();
    }

    await attempts.put(attempt);

    if (attempt.status === 'completed') await metadata.delete('active');

    await transaction.done;
  }

  async discard(expected: Attempt): Promise<void> {
    const transaction = this.database.transaction(['attempts', 'metadata'], 'readwrite');
    const attempts = transaction.objectStore('attempts');
    const metadata = transaction.objectStore('metadata');
    const current = await attempts.get(expected.id);

    if (
      !isAttempt(current) ||
      current.status !== 'active' ||
      current.revision !== expected.revision ||
      (await metadata.get('active')) !== expected.id
    ) {
      await transaction.done;
      throw new ConflictError();
    }

    await attempts.delete(expected.id);
    await metadata.delete('active');
    await transaction.done;
  }

  async removeCompleted(id?: string): Promise<void> {
    const transaction = this.database.transaction('attempts', 'readwrite');
    let cursor = await transaction.store.openCursor();
    while (cursor) {
      if (
        isAttempt(cursor.value) &&
        cursor.value.status === 'completed' &&
        (!id || cursor.value.id === id)
      )
        await cursor.delete();

      cursor = await cursor.continue();
    }
    await transaction.done;
  }

  close() {
    this.database.close();
  }
}
