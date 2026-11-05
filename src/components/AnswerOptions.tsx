/** One-based answer choices with accessible selection and correctness feedback. */
import { Check, X } from 'lucide-react';
import type { Question } from '../core/types';
import { number } from '../i18n';

interface Props {
  question: Question;
  attemptId: string;
  selected: number | null;
  locked: boolean;
  onAnswer(answer: number): void;
}

export function AnswerOptions({ question, attemptId, selected, locked, onAnswer }: Props) {
  const description = `${Array.isArray(question.question) ? 'question-content ' : ''}answer-hint answer-feedback`;

  return (
    <div
      className="answers"
      role="radiogroup"
      aria-labelledby="question-heading"
      aria-describedby={description}
    >
      {question.options.map((option, index) => {
        const chosen = selected === index + 1;
        const correct = selected !== null && question.answer === index + 1;
        const incorrect = chosen && !correct;

        return (
          <label
            key={`${question.id}-${index}`}
            className={`answer-option ${chosen ? 'selected' : ''} ${correct ? 'correct' : ''} ${incorrect ? 'incorrect' : ''}`}
          >
            <input
              type="radio"
              disabled={locked || selected !== null}
              name={`answer-${attemptId}-${question.id}`}
              value={index + 1}
              checked={chosen}
              onChange={() => onAnswer(index + 1)}
            />
            <span className="option-letter" aria-hidden="true">
              {index < 26 ? String.fromCharCode(65 + index) : number(index + 1)}
            </span>
            <span>{option}</span>
            <span className="answer-check" aria-hidden="true">
              {correct ? <Check size={18} /> : incorrect ? <X size={18} /> : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}
