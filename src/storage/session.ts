/** Ordered session commands keep UI, persistence, and cross-tab changes coherent. */
import { isLocked, noTimeLimit, reconcileTiming, visitQuestion } from '../core/timing';
import type { TimeLimit } from '../core/timingTypes';
import { createAttempt, unanswered } from '../core/quiz';
import type { Attempt, Bank, SavedState } from '../core/types';
import type { MessageKey } from '../i18n';
import { ConflictError, IndexedRepository, type Repository } from './repository';
export interface SessionState {
  autoCompletedId: string | null; ready: boolean; saving: boolean; persistent: boolean; active: Attempt | null;
  history: Attempt[]; notice: MessageKey | null;
}
export class SessionStore {
  private state: SessionState = { autoCompletedId: null, ready: false, saving: false, persistent: true, active: null, history: [], notice: null };
  private listeners = new Set<() => void>();
  private queue: Promise<unknown> = Promise.resolve();
  private repository: Repository | null = null;
  private channel: BroadcastChannel | null = null;
  private initialization?: Promise<void>;
  constructor(private openRepository: () => Promise<Repository> = () => IndexedRepository.open()) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(change: Partial<SessionState>) {
    this.state = { ...this.state, ...change }; this.listeners.forEach(listener => listener());
  }
  private applySaved(saved: SavedState, notice: MessageKey | null) {
    const completed = saved.history.find(attempt => attempt.id === this.state.active?.id && attempt.timing?.finishedByTimeout);
    this.publish({ active: saved.active, history: saved.history, notice, autoCompletedId: completed?.id ?? this.state.autoCompletedId });
  }
  initialize() {
    return this.initialization ??= this.loadInitially();
  }
  private async loadInitially() {
    try {
      this.repository = await this.openRepository();
      const saved = await this.repository.load();
      this.applySaved(saved, saved.invalid ? 'invalidRecords' : null);
      if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
        this.channel = new BroadcastChannel('quizzer-changes');
        this.channel.onmessage = () => { void this.reloadExternal(); };
      }
    } catch { this.repository = null; this.publish({ persistent: false, notice: 'storageUnavailable' }); }
    await this.expire(); this.publish({ ready: true });
  }
  private ordered<T>(work: () => Promise<T>): Promise<T> {
    const result = this.queue.then(work);
    // A rejected command must not prevent later commands from running.
    this.queue = result.catch(() => undefined);
    return result;
  }
  private async persist(action: (repository: Repository) => Promise<void>): Promise<boolean> {
    if (!this.repository) return true;
    try { await action(this.repository); this.channel?.postMessage('changed'); return true; }
    catch (error) {
      if (error instanceof ConflictError) {
        try {
          const saved = await this.repository.load();
          this.applySaved(saved, 'storageConflict'); return false;
        } catch { /* A failed conflict reload falls back to the current in-memory state. */ }
      }
      this.repository.close(); this.repository = null;
      this.publish({ persistent: false, notice: 'storageFailed' }); return true;
    }
  }
  private reloadExternal() {
    return this.ordered(async () => {
      if (!this.repository) return;
      try {
        const saved = await this.repository.load();
        this.applySaved(saved, saved.invalid ? 'invalidRecords' : 'externalChange');
      } catch { this.repository.close(); this.repository = null; this.publish({ persistent: false, notice: 'storageFailed' }); }
    });
  }
  start(bank: Bank, count: number, expected: Attempt | null, limit: TimeLimit = noTimeLimit) {
    return this.ordered(async () => {
      // Confirmation applies to exactly the attempt the user saw, not a later tab update.
      if (this.state.active?.id !== expected?.id || this.state.active?.revision !== expected?.revision) {
        this.publish({ notice: 'storageConflict' }); return null;
      }
      const next = createAttempt(bank, count, limit);
      this.publish({ saving: true });
      const persisted = await this.persist(repository => repository.create(next, expected));
      this.publish({ saving: false, ...(persisted ? { active: next, autoCompletedId: null } : {}) });
      return persisted ? next : null;
    });
  }
  private update(id: string, transform: (current: Attempt) => Attempt | null) {
    return this.ordered(async () => {
      const current = this.state.active;
      if (!current || current.id !== id) return null;
      const clone = structuredClone(current);
      // Reconcile deadlines before applying edits, including answers delivered after expiry.
      const expired = reconcileTiming(clone, Date.now());
      const next = (clone.status === 'active' ? transform(clone) : null) ?? (expired ? clone : null);
      if (!next) return null;
      next.revision = current.revision + 1; next.updatedAt = new Date().toISOString();
      this.publish({ saving: true, active: next });
      const persisted = await this.persist(repository => repository.write(next, current.revision));
      if (persisted && next.status === 'completed') this.publish({ active: null, autoCompletedId: next.timing?.finishedByTimeout ? next.id : null, history: [next, ...this.state.history.filter(attempt => attempt.id !== next.id)] });
      this.publish({ saving: false });
      return persisted ? next : null;
    });
  }
  answer(id: string, position: number, answer: number) {
    return this.update(id, current => {
      if (isLocked(current, position) || !Number.isInteger(answer) || answer < 1 || answer > (current.questions[position]?.options.length ?? 0)) return null;
      current.answers[position] = answer; return current;
    });
  }
  navigate(id: string, position: number) {
    return this.update(id, current => {
      if (!Number.isInteger(position) || position < 0 || position >= current.questions.length) return null;
      if (isLocked(current, position)) return null; visitQuestion(current, position, Date.now()); return current;
    });
  }
  expire() {
    const active = this.state.active;
    return active?.timing ? this.update(active.id, () => null) : Promise.resolve(null);
  }
  finish(id: string) {
    return this.update(id, current => {
      if (unanswered(current).length) return null;
      current.status = 'completed'; current.completedAt = new Date().toISOString(); return current;
    });
  }
  discard(expected: Attempt) {
    return this.ordered(async () => {
      if (this.state.active?.id !== expected.id || this.state.active.revision !== expected.revision) { this.publish({ notice: 'storageConflict' }); return; }
      this.publish({ saving: true });
      const persisted = await this.persist(repository => repository.discard(expected));
      this.publish({ saving: false, ...(persisted ? { active: null } : {}) });
    });
  }
  removeCompleted(id?: string) {
    return this.ordered(async () => {
      this.publish({ saving: true });
      const persisted = await this.persist(repository => repository.removeCompleted(id));
      this.publish({ saving: false, ...(persisted ? { history: id ? this.state.history.filter(attempt => attempt.id !== id) : [] } : {}) });
    });
  }
  dismissNotice() { this.publish({ notice: null }); }
  close() { this.channel?.close(); this.repository?.close(); }
}


