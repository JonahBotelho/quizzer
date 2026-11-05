/** Saved result scores and history statistics exclude manually skipped questions. */
import { ArrowRight, History as HistoryIcon, Trash2 } from 'lucide-react';

import type { Attempt } from '../core/types';
import { score } from '../core/quiz';
import { date, number, percent, t } from '../i18n';

interface Props {
  attempts: Attempt[];
  busy: boolean;
  onOpen(id: string): void;
  onDelete(id?: string): void;
  onSetup(): void;
}

function HistorySummary({ attempts }: Pick<Props, 'attempts'>) {
  const results = attempts.map(score).filter(result => result.total > 0);
  const total = results.reduce((sum, result) => sum + result.total, 0);
  const average = results.length
    ? percent(results.reduce((sum, result) => sum + result.ratio, 0) / results.length)
    : t('scoreUnavailable');

  return (
    <section className="history-stats">
      <div>
        <strong>{number(attempts.length)}</strong>
        <span>{t('summarySessions')}</span>
      </div>
      <div>
        <strong>{average}</strong>
        <span>{t('summaryAverage')}</span>
      </div>
      <div>
        <strong>{number(total)}</strong>
        <span>{t('summaryAnswered')}</span>
      </div>
    </section>
  );
}

function HistoryRow({
  attempt,
  busy,
  onOpen,
  onDelete,
}: Omit<Props, 'attempts' | 'onSetup'> & { attempt: Attempt }) {
  const result = score(attempt);

  return (
    <article className="history-row">
      <div className="history-icon">
        <HistoryIcon size={20} aria-hidden="true" />
      </div>
      <div className="grow">
        <h3>{attempt.bankName}</h3>
        <p>
          {date(attempt.completedAt!)}
          <span className="separator">{t('historySeparator')}</span>
          {t('historyScore', { correct: number(result.correct), total: number(result.total) })}
        </p>
      </div>
      <strong className="history-percent">
        {result.total ? percent(result.ratio) : t('scoreUnavailable')}
      </strong>
      <button
        className="icon-button delete-button"
        disabled={busy}
        aria-label={t('deleteAttempt')}
        onClick={() => onDelete(attempt.id)}
      >
        <Trash2 size={17} aria-hidden="true" />
      </button>
      <button className="button secondary small" onClick={() => onOpen(attempt.id)}>
        {t('viewResults')}
        <ArrowRight size={15} aria-hidden="true" />
      </button>
    </article>
  );
}

export function History({ attempts, busy, onOpen, onDelete, onSetup }: Props) {
  if (!attempts.length)
    return (
      <div className="history-content">
        <section className="empty-state">
          <HistoryIcon size={34} aria-hidden="true" />
          <h1>{t('historyEmpty')}</h1>
          <p>{t('historyEmptyBody')}</p>
          <button className="button" onClick={onSetup}>
            {t('start')}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </section>
      </div>
    );

  return (
    <div className="history-content">
      <HistorySummary attempts={attempts} />
      <div className="history-toolbar">
        <h1>{t('navHistory')}</h1>
        <button className="text-button danger" disabled={busy} onClick={() => onDelete()}>
          <Trash2 size={15} aria-hidden="true" />
          {t('clearHistory')}
        </button>
      </div>
      <div className="history-list">
        {attempts.map(attempt => (
          <HistoryRow
            key={attempt.id}
            attempt={attempt}
            busy={busy}
            onOpen={onOpen}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
