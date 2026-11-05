/** Current question content, final answer selection, progress, and sequential navigation. */
import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type { Attempt } from '../core/types';
import { unanswered } from '../core/quiz';
import { isLocked } from '../core/timing';
import { AnswerOptions } from './AnswerOptions';
import { AnswerFeedback } from './AnswerFeedback';
import { QuestionContent } from './QuestionContent';
import { number, t } from '../i18n';

export interface QuizQuestionProps {
  attempt: Attempt;
  busy: boolean;
  onAnswer(position: number, answer: number): void;
  onNavigate(position: number): void;
  onFinish(): void;
}

function QuestionProgress({ attempt }: { attempt: Attempt }) {
  const remaining = unanswered(attempt);

  return (
    <>
      <div className="question-top">
        <span>
          {t('questionPosition', {
            current: number(attempt.position + 1),
            total: number(attempt.questions.length),
          })}
        </span>
        <span>
          {t('answeredProgress', {
            answered: number(attempt.answers.filter(answer => answer !== null).length),
            total: number(attempt.questions.length),
          })}
        </span>
      </div>
      <div className="progress-track">
        <div
          style={{
            width: `${((attempt.questions.length - remaining.length) / attempt.questions.length) * 100}%`,
          }}
        />
      </div>
    </>
  );
}

function QuestionActions({
  attempt,
  busy,
  onNavigate,
  onFinish,
}: Omit<QuizQuestionProps, 'onAnswer'>) {
  const previousPosition = attempt.position > 0 ? attempt.position - 1 : undefined;
  const nextPosition =
    attempt.position < attempt.questions.length - 1 ? attempt.position + 1 : undefined;

  return (
    <div className="quiz-actions">
      <button
        className="button secondary"
        disabled={previousPosition === undefined || busy}
        onClick={() => previousPosition !== undefined && onNavigate(previousPosition)}
      >
        <ArrowLeft size={16} />
        {t('previous')}
      </button>
      {nextPosition !== undefined ? (
        <button className="button" disabled={busy} onClick={() => onNavigate(nextPosition)}>
          {t('next')}
          <ArrowRight size={16} />
        </button>
      ) : (
        <button className="button" disabled={busy} onClick={onFinish}>
          {t('finish')}
          <Check size={17} />
        </button>
      )}
    </div>
  );
}

export function QuizQuestion({ attempt, busy, onAnswer, onNavigate, onFinish }: QuizQuestionProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const question = attempt.questions[attempt.position];
  const selected = attempt.answers[attempt.position];
  const locked = isLocked(attempt, attempt.position);
  const expiredCount = attempt.timing?.expired.filter(Boolean).length ?? 0;
  useEffect(() => {
    heading.current?.focus();
  }, [attempt.position]);
  const answerHint = locked
    ? 'timeLocked'
    : attempt.timing?.limit.mode === 'question'
      ? 'timeQuestionAnswerHint'
      : attempt.timing
        ? 'timeQuizAnswerHint'
        : 'answerHint';

  return (
    <section className="question-card">
      <QuestionProgress attempt={attempt} />
      <QuestionContent
        content={question.question}
        position={attempt.position}
        headingLevel={2}
        headingRef={heading}
        headingId="question-heading"
        contentId="question-content"
      />
      <p className="answer-hint" id="answer-hint">
        {t(answerHint)}
      </p>
      <AnswerOptions
        question={question}
        attemptId={attempt.id}
        selected={selected}
        locked={locked}
        onAnswer={answer => onAnswer(attempt.position, answer)}
      />
      <AnswerFeedback question={question} selected={selected} />
      <p className="expired-status" role="status">
        {expiredCount > 0 &&
          t(expiredCount === 1 ? 'timeExpiredCountOne' : 'timeExpiredCount', {
            count: number(expiredCount),
          })}
      </p>
      <QuestionActions attempt={attempt} busy={busy} onNavigate={onNavigate} onFinish={onFinish} />
    </section>
  );
}
