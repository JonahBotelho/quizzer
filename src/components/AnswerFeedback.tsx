/** Immediate, accessible correctness feedback derived from the saved selection. */
import { Check, X } from 'lucide-react';
import type { Question } from '../core/types';
import { t } from '../i18n';
export function AnswerFeedback({ question, selected }: { question: Question; selected: number | null }) {
  const correct = selected === question.answer;
  return <div id="answer-feedback" className={`answer-feedback ${selected === null ? '' : correct ? 'correct' : 'incorrect'}`} role="status" aria-live="polite" aria-atomic="true">
    {selected !== null && <>{correct ? <Check size={20} aria-hidden="true" /> : <X size={20} aria-hidden="true" />}<div>
      <strong>{t(correct ? 'feedbackCorrect' : 'feedbackIncorrect')}</strong>
      <p>{correct ? t('feedbackContinue') : t('feedbackCorrectAnswer', { answer: question.options[question.answer - 1] })}</p>
    </div></>}
  </div>;
}
