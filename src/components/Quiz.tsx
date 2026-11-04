/** Editable quiz answers, deadline countdown, and navigation with timeout states. */
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type { Attempt } from '../core/types';
import { unanswered } from '../core/quiz';
import { isLocked } from '../core/timing';
import { AnswerOptions } from './AnswerOptions';
import { QuestionNavigator } from './QuestionNavigator';
import { AnswerFeedback } from './AnswerFeedback';
import { QuestionContent } from './QuestionContent';
import { Countdown } from './Countdown';
import { number, t } from '../i18n';
interface Props { attempt: Attempt; busy: boolean; onAnswer(position: number, answer: number): void; onNavigate(position: number): void; onFinish(): void; onBack(): void }
export function Quiz({ attempt, busy, onAnswer, onNavigate, onFinish, onBack }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [missing, setMissing] = useState(false);
  const question = attempt.questions[attempt.position];
  const selected = attempt.answers[attempt.position];
  const remaining = unanswered(attempt);
  const locked = isLocked(attempt, attempt.position);
  const expiredCount = attempt.timing?.expired.filter(Boolean).length ?? 0;
  useEffect(() => { heading.current?.focus(); }, [attempt.position]);
  function finish() {
    if (remaining.length) { setMissing(true); onNavigate(remaining[0]); heading.current?.focus(); }
    else onFinish();
  }
  const previousPosition = Array.from({ length: attempt.position }, (_, position) => position).reverse().find(position => !isLocked(attempt, position));
  const nextPosition = attempt.questions.map((_, position) => position).find(position => position > attempt.position && !isLocked(attempt, position));
  const answerHint = locked ? 'timeLocked' : attempt.timing?.limit.mode === 'question' ? 'timeQuestionAnswerHint' : attempt.timing ? 'timeQuizAnswerHint' : 'answerHint';
  return <>
    <button className="back-link" onClick={onBack}><ArrowLeft size={16} />{t('backSetup')}</button>
    <div className="page-heading"><span className="eyebrow">{t('quizEyebrow')}</span><h1>{attempt.bankName}</h1></div>
    <Countdown attempt={attempt} />
    <div className="quiz-layout"><section className="question-card">
      <div className="question-top"><span>{t('questionPosition', { current: number(attempt.position + 1), total: number(attempt.questions.length) })}</span><span>{t('answeredProgress', { answered: number(attempt.answers.filter(answer => answer !== null).length), total: number(attempt.questions.length) })}</span></div>
      <div className="progress-track"><div style={{ width: `${(attempt.questions.length - remaining.length) / attempt.questions.length * 100}%` }} /></div>
      <QuestionContent content={question.question} position={attempt.position} headingLevel={2} headingRef={heading} headingId="question-heading" contentId="question-content" /><p className="answer-hint" id="answer-hint">{t(answerHint)}</p>
      <AnswerOptions question={question} attemptId={attempt.id} selected={selected} locked={locked}
        onAnswer={answer => onAnswer(attempt.position, answer)} />
      <AnswerFeedback question={question} selected={selected} />
      <p className="expired-status" role="status">{expiredCount > 0 && t(expiredCount === 1 ? 'timeExpiredCountOne' : 'timeExpiredCount', { count: number(expiredCount) })}</p>
      {missing && remaining.length > 0 && <p role="alert" className="inline-error">{t('missingAnswers', { count: number(remaining.length) })}</p>}
      <div className="quiz-actions"><button className="button secondary" disabled={previousPosition === undefined || busy} onClick={() => previousPosition !== undefined && onNavigate(previousPosition)}><ArrowLeft size={16} />{t('previous')}</button>{nextPosition !== undefined ? <button className="button" disabled={busy} onClick={() => onNavigate(nextPosition)}>{t('next')}<ArrowRight size={16} /></button> : <button className="button" disabled={busy} onClick={finish}>{t('finish')}<Check size={17} /></button>}</div>
    </section><QuestionNavigator attempt={attempt} busy={busy} onNavigate={onNavigate} onFinish={finish} /></div>
  </>;
}




