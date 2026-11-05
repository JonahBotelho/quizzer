/** Subscribe to saved session state and reconcile deadlines while any screen is open. */
import { useEffect, useSyncExternalStore } from 'react';
import { SessionStore } from '../storage/session';

// One store per app, rather than per screen, preserves the ordered write queue.
export const sessionStore = new SessionStore();

export function useQuizSession() {
  const state = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot);
  useEffect(() => {
    void sessionStore.initialize();
  }, []);
  useEffect(() => {
    if (!state.ready || !state.active?.timing) return;

    const tick = () => {
      void sessionStore.expire();
    };
    tick();
    const interval = window.setInterval(tick, 250);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [state.ready, state.active?.id]);

  return state;
}
