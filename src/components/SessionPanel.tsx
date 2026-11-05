/** Configure session length and timing beside the question-bank library. */
import { Play } from 'lucide-react';

import { quizLengths, type QuizLength } from '../core/quizLength';
import { isSetupTimeLimit } from '../core/timing';
import type { TimeLimit } from '../core/timingTypes';
import type { Bank } from '../core/types';
import { number, t } from '../i18n';
import { SessionSummary } from './SessionSummary';
import { TimeLimitSetup } from './TimeLimitSetup';

interface Props {
  bank: Bank;
  length: QuizLength;
  limit: TimeLimit;
  busy: boolean;
  onLengthChange(length: QuizLength): void;
  onLimitChange(limit: TimeLimit): void;
  onStart(): void;
}

export function SessionPanel(props: Props) {
  return (
    <section className="session-panel" aria-labelledby="session-heading">
      <h2 id="session-heading">{t('yourSession')}</h2>
      <SessionSummary bank={props.bank} length={props.length} limit={props.limit} />
      <div className="section-divider" />
      <h3 id="length-heading">{t('chooseLength')}</h3>
      <div className="length-grid" role="radiogroup" aria-labelledby="length-heading">
        {quizLengths.map(choice => (
          <label
            className={'length-option ' + (props.length === choice ? 'selected' : '')}
            key={choice}
          >
            <input
              type="radio"
              name="count"
              value={choice}
              checked={props.length === choice}
              onChange={() => props.onLengthChange(choice)}
              aria-label={
                choice === 'all'
                  ? t('allQuestionsChoice')
                  : t('questions', { count: number(choice) })
              }
            />
            <strong>{choice === 'all' ? t('allChoiceTitle') : number(choice)}</strong>
          </label>
        ))}
      </div>
      <TimeLimitSetup value={props.limit} onChange={props.onLimitChange} />
      <div className="start-row">
        <button
          className="button"
          disabled={props.busy || !props.bank.questions.length || !isSetupTimeLimit(props.limit)}
          onClick={props.onStart}
        >
          <Play size={23} aria-hidden="true" />
          {t('start')}
        </button>
      </div>
    </section>
  );
}
