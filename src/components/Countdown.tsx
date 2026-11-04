/** A display clock; the session store remains authoritative for expiry and scoring. */
import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { deadline } from '../core/timing';
import type { Attempt } from '../core/types';
import { t } from '../i18n';
import { clockLabel } from '../timingCopy';
export function Countdown({ attempt }: { attempt: Attempt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now()); tick();
    const interval = window.setInterval(tick, 250); return () => window.clearInterval(interval);
  }, [attempt.id]);
  const end = deadline(attempt);
  if (end === null) return null;
  const remaining = Math.max(0, end - now);
  const label = t(attempt.timing?.limit.mode === 'question' ? 'timeRemainingQuestion' : 'timeRemainingQuiz');
  return <div className={`countdown ${remaining <= 10000 ? 'urgent' : ''}`}>
    <Clock3 size={17} /><span>{label}</span><strong role="timer" aria-label={label}>{clockLabel(remaining)}</strong>
  </div>;
}
