/** Timing display copy is independent of stored mode codes. */
import { isTimeLimit } from './core/timing';
import { locale, t } from './i18n';
import type { TimeLimit } from './core/timingTypes';
export function timeLimitLabel(limit?: TimeLimit): string {
  if (!limit || limit.mode === 'none') return t('timeNone');
  if (!isTimeLimit(limit)) return t('timeInvalidSummary');
  const minutes = limit.seconds >= 60 && limit.seconds % 60 === 0;
  const duration = new Intl.NumberFormat(locale, { style: 'unit', unit: minutes ? 'minute' : 'second', unitDisplay: 'long' }).format(minutes ? limit.seconds / 60 : limit.seconds);
  return t(limit.mode === 'question' ? 'timeQuestionSummary' : 'timeQuizSummary', { duration });
}
export function clockLabel(milliseconds: number): string {
  const total = Math.max(0, Math.ceil(milliseconds / 1000));
  const formatter = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2, useGrouping: false });
  return t('timeClock', { minutes: formatter.format(Math.floor(total / 60)), seconds: formatter.format(total % 60) });
}

