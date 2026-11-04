/** Optional timing controls with custom seconds or whole-quiz minutes. */
import type { TimeLimit } from '../core/timingTypes';
import { isSetupTimeLimit } from '../core/timing';
import { number, t } from '../i18n';
interface Props { value: TimeLimit; onChange(value: TimeLimit): void }
export function TimeLimitSetup({ value, onChange }: Props) {
  const modes = ['none', 'question', 'quiz'] as const;
  const maximumDuration = value.mode === 'question' ? 3600 : 1440;
  return <>
    <div className="section-divider" />
    <div className="section-label"><span className="step">{t('stepThree')}</span><div><h2 id="time-heading">{t('timeTitle')}</h2></div></div>
    <div className="time-modes" role="radiogroup" aria-labelledby="time-heading">{modes.map(mode => <label className={`time-mode ${value.mode === mode ? 'selected' : ''}`} key={mode}>
      <input type="radio" name="time-mode" checked={value.mode === mode} onChange={() => onChange(mode === 'none' ? { mode } : { mode, seconds: mode === 'question' ? 30 : 600 })} />
      <span>{t(mode === 'none' ? 'timeNone' : mode === 'question' ? 'timeQuestion' : 'timeQuiz')}</span>
    </label>)}</div>
    {value.mode !== 'none' && <div className="time-detail">
      <label htmlFor="time-duration">{t(value.mode === 'question' ? 'timeSeconds' : 'timeMinutes')}</label>
      <input id="time-duration" type="number" inputMode="numeric" min={1} max={maximumDuration} step={1} value={Number.isFinite(value.seconds) ? value.seconds / (value.mode === 'quiz' ? 60 : 1) : ''}
        onChange={event => onChange({ mode: value.mode as 'question' | 'quiz', seconds: event.target.value === '' ? Number.NaN : Number(event.target.value) * (value.mode === 'quiz' ? 60 : 1) })}
        aria-invalid={!isSetupTimeLimit(value)} aria-describedby="time-help time-validation" />
      <p id="time-help">{t(value.mode === 'question' ? 'timeQuestionHint' : 'timeQuizHint')} {t('timePersists')}</p>
      <p id="time-validation" className="inline-error" role={isSetupTimeLimit(value) ? undefined : 'alert'}>{!isSetupTimeLimit(value) && t('timeInvalid', { max: number(maximumDuration) })}</p>
    </div>}
  </>;
}

