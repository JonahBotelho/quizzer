/** Immutable results, score breakdown, and mistake review. */
import { ArrowRight, Check, Trophy, X } from 'lucide-react';

import type { Attempt, Bank } from '../core/types';
import { noTimeLimit, timedOut } from '../core/timing';
import type { TimeLimit } from '../core/timingTypes';
import { timeLimitLabel } from '../timingCopy';
import { QuestionContent } from './QuestionContent';
import { score } from '../core/quiz';
import { date, number, percent, t } from '../i18n';
interface Props { banks: Bank[]; attempt: Attempt; busy: boolean; onRepeat(bank: Bank, count: number, limit: TimeLimit): void; onSetup(): void }
export function Results({ banks, attempt, busy, onRepeat, onSetup }: Props) {
  const result = score(attempt);
  const bank = banks.find(candidate => candidate.id === attempt.bankId);
  const mistakes = attempt.questions.map((question, index) => ({ question, index })).filter(({ question, index }) => question.answer !== attempt.answers[index]);
  const canRepeat = bank && bank.questions.length >= result.total;
  return <>
    <section className="hero compact"><span className="eyebrow">{t('resultsEyebrow')}</span><h1>{t('resultsTitle')}</h1><p>{t('resultsIntro')}</p></section>
    {attempt.timing && <p className="result-timing">{timeLimitLabel(attempt.timing.limit)}</p>}
    {attempt.timing?.finishedByTimeout && <p className="notice" role="status">{t('timeResultNotice')}</p>}
    <section className="score-card"><div className="score-ring" style={{ '--score': `${result.ratio * 100}%` } as React.CSSProperties}><div><span>{t('scoreLabel')}</span><strong>{percent(result.ratio)}</strong></div></div><div className="score-details"><span className="eyebrow">{attempt.bankName}</span><h2>{t('scoreDetail', { correct: number(result.correct), total: number(result.total) })}</h2><p>{t('completedOn', { date: date(attempt.completedAt!) })}</p><div className="score-stats"><span><strong>{number(result.correct)}</strong>{t('correctLabel')}</span><span><strong>{number(result.total - result.correct)}</strong>{t('incorrectLabel')}</span><span><strong>{number(result.total)}</strong>{t('totalLabel')}</span></div></div></section>
    <div className="results-actions"><button className="button" disabled={busy || !canRepeat} onClick={() => canRepeat && onRepeat(bank, result.total, attempt.timing?.limit ?? noTimeLimit)}>{t('tryAgain')}<ArrowRight size={17} /></button><button className="button secondary" onClick={onSetup}>{t('chooseAnother')}</button></div><p className="results-hint">{t(canRepeat ? 'repeatHint' : 'missingBank')}</p>
    {mistakes.length === 0 ? <section className="perfect-card"><Trophy size={35} /><h2>{t('perfectTitle')}</h2><p>{t('perfectBody')}</p></section> : <section className="review"><div className="section-heading"><h2>{t('reviewTitle')}<span className="count-badge">{number(mistakes.length)}</span></h2></div>{mistakes.map(({ question, index }) => <article className="review-card" key={question.id}>{typeof question.question === 'string' && <span className="eyebrow">{t('reviewQuestion', { number: number(index + 1) })}</span>}<QuestionContent content={question.question} position={index} headingLevel={3} /><div className="review-answer incorrect"><X size={17} /><div><span>{t('yourAnswer')}</span><p>{timedOut(attempt, index) ? t('timeExpiredAnswer') : question.options[attempt.answers[index]! - 1]}</p></div></div><div className="review-answer correct"><Check size={17} /><div><span>{t('correctAnswer')}</span><p>{question.options[question.answer - 1]}</p></div></div></article>)}</section>}
  </>;
}


