/** Quiz screen combines the current question, countdown, and question navigation. */
import { ArrowLeft } from 'lucide-react';
import { t } from '../i18n';
import { Countdown } from './Countdown';
import { QuestionNavigator } from './QuestionNavigator';
import { QuizQuestion, type QuizQuestionProps } from './QuizQuestion';

interface Props extends QuizQuestionProps {
  onBack(): void;
}

export function Quiz({ onBack, ...props }: Props) {
  const { attempt, busy, onNavigate, onFinish } = props;

  return (
    <>
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={16} />
        {t('backSetup')}
      </button>
      <div className="page-heading">
        <span className="eyebrow">{t('quizEyebrow')}</span>
        <h1>{attempt.bankName}</h1>
      </div>
      <Countdown attempt={attempt} />
      <div className="quiz-layout">
        <QuizQuestion {...props} />
        <QuestionNavigator
          attempt={attempt}
          busy={busy}
          onNavigate={onNavigate}
          onFinish={onFinish}
        />
      </div>
    </>
  );
}
