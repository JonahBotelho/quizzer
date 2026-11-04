/** Screen navigation and confirmations for replacing, finishing, or deleting attempts. */
import { useCallback, useEffect, useState } from 'react';
import { sessionStore, useQuizSession } from './useQuizSession';
import { noTimeLimit } from '../core/timing';
import type { TimeLimit } from '../core/timingTypes';
import type { Bank } from '../core/types';
import { t } from '../i18n';

type Screen = 'setup' | 'quiz' | 'history' | 'results';

export function usePracticeFlow() {
  const [screen, setScreen] = useState<Screen>('setup');
  const [resultId, setResultId] = useState<string | null>(null);
  const resume = useCallback(() => setScreen('quiz'), []);
  const state = useQuizSession(resume);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [screen, resultId]);
  useEffect(() => {
    if (state.ready && screen === 'quiz' && !state.active) setScreen('setup');
  }, [state.ready, state.active, screen]);
  useEffect(() => {
    if (state.autoCompletedId) openResult(state.autoCompletedId);
  }, [state.autoCompletedId]);

  function openResult(id: string) {
    setResultId(id);
    setScreen('results');
  }

  async function start(bank: Bank, count: number, limit: TimeLimit = noTimeLimit) {
    const expected = sessionStore.getSnapshot().active;
    if (expected && !window.confirm(t('replaceConfirm'))) return;
    const attempt = await sessionStore.start(bank, count, expected, limit);
    if (attempt) resume();
  }

  async function finish() {
    if (!state.active) return;
    const completed = await sessionStore.finish(state.active.id);
    if (completed) openResult(completed.id);
  }

  function discard() {
    const active = sessionStore.getSnapshot().active;
    if (active && window.confirm(t('discardConfirm'))) void sessionStore.discard(active);
  }

  function deleteCompleted(id?: string) {
    if (window.confirm(t(id ? 'deleteConfirm' : 'clearConfirm'))) void sessionStore.removeCompleted(id);
  }

  return {
    state, screen, result: state.history.find(attempt => attempt.id === resultId),
    resume, start, finish, discard, deleteCompleted, openResult,
    showSetup: () => setScreen('setup'), showHistory: () => setScreen('history'),
  };
}
