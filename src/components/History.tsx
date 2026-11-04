/** Completed attempts with aggregate practice stats and deletion controls. */
import { ArrowRight, History as HistoryIcon, Trash2 } from 'lucide-react';
import type { Attempt } from '../core/types';
import { score } from '../core/quiz';
import { date, number, percent, t } from '../i18n';
interface Props { attempts: Attempt[]; busy: boolean; onOpen(id: string): void; onDelete(id?: string): void; onSetup(): void }
export function History({ attempts, busy, onOpen, onDelete, onSetup }: Props) {
  const results = attempts.map(score);
  const total = results.reduce((sum, item) => sum + item.total, 0);
  return <div className="history-content">
    {attempts.length ? <><section className="history-stats"><div><strong>{number(attempts.length)}</strong><span>{t('summarySessions')}</span></div><div><strong>{percent(results.reduce((sum, item) => sum + item.ratio, 0) / attempts.length)}</strong><span>{t('summaryAverage')}</span></div><div><strong>{number(total)}</strong><span>{t('summaryAnswered')}</span></div></section><div className="history-toolbar"><h1>{t('navHistory')}</h1><button className="text-button danger" disabled={busy} onClick={() => onDelete()}><Trash2 size={15} />{t('clearHistory')}</button></div><div className="history-list">{attempts.map(attempt => {
      const result = score(attempt);
      return <article className="history-row" key={attempt.id}><div className="history-icon"><HistoryIcon size={20} /></div><div className="grow"><h3>{attempt.bankName}</h3><p>{date(attempt.completedAt!)}<span className="separator">{t('historySeparator')}</span>{t('historyScore', { correct: number(result.correct), total: number(result.total) })}</p></div><strong className="history-percent">{percent(result.ratio)}</strong><button className="icon-button delete-button" disabled={busy} aria-label={t('deleteAttempt')} onClick={() => onDelete(attempt.id)}><Trash2 size={17} /></button><button className="button secondary small" onClick={() => onOpen(attempt.id)}>{t('viewResults')}<ArrowRight size={15} /></button></article>;
    })}</div></> : <section className="empty-state"><HistoryIcon size={34} /><h1>{t('historyEmpty')}</h1><p>{t('historyEmptyBody')}</p><button className="button" onClick={onSetup}>{t('start')}<ArrowRight size={17} /></button></section>}
  </div>;
}
