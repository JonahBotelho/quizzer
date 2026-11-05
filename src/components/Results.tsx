/** Immutable results score answered questions and retain the full attempt for replay. */
import { ArrowRight, Check, Trophy, X } from 'lucide-react';

import type { Attempt, Bank } from '../core/types';
import { resolveBank } from '../core/bankSelection';
import { score, scoredQuestions } from '../core/quiz';
import { noTimeLimit, timedOut } from '../core/timing';
import type { TimeLimit } from '../core/timingTypes';
import { timeLimitLabel } from '../timingCopy';
import { date, number, percent, t } from '../i18n';
import { QuestionContent } from './QuestionContent';

interface Props {
  banks: Bank[];
  attempt: Attempt;
  busy: boolean;
  onRepeat(bank: Bank, count: number, limit: TimeLimit): void;
  onSetup(): void;
}

function ScoreSummary({ attempt, result }: { attempt: Attempt; result: ReturnType<typeof score> }) {
  return (
    <section className="score-card">
      <div
        className="score-ring"
        style={{ '--score': result.ratio * 100 + '%' } as React.CSSProperties}
      >
        <div>
          <span>{t('scoreLabel')}</span>
          <strong>{result.total ? percent(result.ratio) : t('scoreUnavailable')}</strong>
        </div>
      </div>
      <div className="score-details">
        <span className="eyebrow">{attempt.bankName}</span>
        <h2>
          {t('scoreDetail', { correct: number(result.correct), total: number(result.total) })}
        </h2>
        <p>{t('completedOn', { date: date(attempt.completedAt!) })}</p>
        <div className="score-stats">
          <span>
            <strong>{number(result.correct)}</strong>
            {t('correctLabel')}
          </span>
          <span>
            <strong>{number(result.total - result.correct)}</strong>
            {t('incorrectLabel')}
          </span>
          <span>
            <strong>{number(result.total)}</strong>
            {t('totalLabel')}
          </span>
        </div>
      </div>
    </section>
  );
}

function MistakeCard({ attempt, index }: { attempt: Attempt; index: number }) {
  const question = attempt.questions[index];

  return (
    <article className="review-card">
      {typeof question.question === 'string' && (
        <span className="eyebrow">{t('reviewQuestion', { number: number(index + 1) })}</span>
      )}
      <QuestionContent content={question.question} position={index} headingLevel={3} />
      <div className="review-answer incorrect">
        <X size={17} aria-hidden="true" />
        <div>
          <span>{t('yourAnswer')}</span>
          <p>
            {timedOut(attempt, index)
              ? t('timeExpiredAnswer')
              : question.options[attempt.answers[index]! - 1]}
          </p>
        </div>
      </div>
      <div className="review-answer correct">
        <Check size={17} aria-hidden="true" />
        <div>
          <span>{t('correctAnswer')}</span>
          <p>{question.options[question.answer - 1]}</p>
        </div>
      </div>
    </article>
  );
}

function ResultReview({ attempt, total }: { attempt: Attempt; total: number }) {
  const mistakes = scoredQuestions(attempt).filter(
    ({ question, index }) => question.answer !== attempt.answers[index],
  );

  if (!total)
    return (
      <section className="empty-state">
        <h2>{t('noAnswersTitle')}</h2>
        <p>{t('noAnswersBody')}</p>
      </section>
    );

  if (!mistakes.length)
    return (
      <section className="perfect-card">
        <Trophy size={35} aria-hidden="true" />
        <h2>{t('perfectTitle')}</h2>
        <p>{t('perfectBody')}</p>
      </section>
    );

  return (
    <section className="review">
      <div className="section-heading">
        <h2>
          {t('reviewTitle')}
          <span className="count-badge">{number(mistakes.length)}</span>
        </h2>
      </div>
      {mistakes.map(({ question, index }) => (
        <MistakeCard key={question.id} attempt={attempt} index={index} />
      ))}
    </section>
  );
}

function ResultActions({ banks, attempt, busy, onRepeat, onSetup }: Props) {
  const bank = resolveBank(banks, attempt.bankId);
  const canRepeat = bank && bank.questions.length >= attempt.questions.length;

  return (
    <>
      <div className="results-actions">
        <button
          className="button"
          disabled={busy || !canRepeat}
          onClick={() =>
            canRepeat &&
            onRepeat(bank, attempt.questions.length, attempt.timing?.limit ?? noTimeLimit)
          }
        >
          {t('tryAgain')}
          <ArrowRight size={17} aria-hidden="true" />
        </button>
        <button className="button secondary" onClick={onSetup}>
          {t('chooseAnother')}
        </button>
      </div>
      <p className="results-hint">{t(canRepeat ? 'repeatHint' : 'missingBank')}</p>
    </>
  );
}

export function Results(props: Props) {
  const { attempt } = props;
  const result = score(attempt);

  return (
    <>
      <section className="hero compact">
        <span className="eyebrow">{t('resultsEyebrow')}</span>
        <h1>{t('resultsTitle')}</h1>
        <p>{t('resultsIntro')}</p>
      </section>
      {attempt.timing && <p className="result-timing">{timeLimitLabel(attempt.timing.limit)}</p>}
      {attempt.timing?.finishedByTimeout && (
        <p className="notice" role="status">
          {t('timeResultNotice')}
        </p>
      )}
      {result.total < attempt.questions.length && (
        <p className="result-timing">{t('earlyFinishHint')}</p>
      )}
      <ScoreSummary attempt={attempt} result={result} />
      <ResultActions {...props} />
      <ResultReview attempt={attempt} total={result.total} />
    </>
  );
}
