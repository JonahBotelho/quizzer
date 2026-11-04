/** Question navigation keeps correctness, current position, and deadline state distinct. */
import { Flag } from 'lucide-react';
import type { Attempt } from '../core/types';
import { isLocked, timedOut } from '../core/timing';
import { number, t } from '../i18n';

interface Props {
  attempt: Attempt;
  busy: boolean;
  onNavigate(position: number): void;
  onFinish(): void;
}

function QuestionButton({ attempt, position, busy, onNavigate }: Omit<Props, 'onFinish'> & { position: number }) {
  const current = attempt.position === position;
  const answered = attempt.answers[position] !== null;
  const locked = isLocked(attempt, position);
  const expired = timedOut(attempt, position);
  const correct = attempt.answers[position] === attempt.questions[position].answer;
  const result = answered ? (correct ? 'correct' : 'incorrect') : expired ? 'incorrect' : '';
  const state = expired ? 'timeStateExpired' : answered ? (correct ? 'stateCorrect' : 'stateIncorrect') : locked ? 'timeStateLocked' : 'stateUnanswered';
  const stateLabel = current ? t('questionCurrentState', { current: t('stateCurrent'), state: t(state) }) : t(state);
  return <button className={`${current ? 'current' : ''} ${answered ? 'answered' : ''} ${result} ${locked ? 'locked' : ''} ${expired ? 'expired' : ''}`}
    aria-current={current ? 'step' : undefined}
    aria-label={t('questionLabel', { number: number(position + 1), state: stateLabel })}
    disabled={busy || locked} onClick={() => onNavigate(position)}>
    {number(position + 1)}{answered && <span aria-hidden="true" className="answered-dot" />}
  </button>;
}

export function QuestionNavigator({ attempt, busy, onNavigate, onFinish }: Props) {
  return <aside className="question-sidebar">
    <h2>{t('questionNav')}</h2>
    <p>{t(attempt.timing?.limit.mode === 'question' ? 'timeQuestionNavHint' : 'navHint')}</p>
    <nav className="question-numbers" aria-label={t('questionNav')}>
      {attempt.questions.map((question, position) => <QuestionButton key={question.id}
        attempt={attempt} position={position} busy={busy} onNavigate={onNavigate} />)}
    </nav>
    <button className="button secondary finish-sidebar" disabled={busy} onClick={onFinish}>
      <Flag size={16} />{t('finish')}
    </button>
  </aside>;
}
