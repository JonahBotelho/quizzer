/** Setup screen: bank selection, session length, and resumable progress. */
import { useState } from 'react';
import { ArrowRight, BookOpen, Check, RotateCcw, Layers3 } from 'lucide-react';
import { QuizFiles } from './QuizFiles';
import { TimeLimitSetup } from './TimeLimitSetup';
import { isSetupTimeLimit, noTimeLimit } from '../core/timing';
import type { TimeLimit } from '../core/timingTypes';
import { timeLimitLabel } from '../timingCopy';
import { catalog } from '../catalog';
import { quizLengths, resolveQuestionCount, type QuizLength } from '../core/quizLength';
import { unanswered } from '../core/quiz';
import type { Attempt, Bank } from '../core/types';
import { number, t } from '../i18n';
interface Props { banks: Bank[]; importReady: boolean; onImport(file: File): Promise<Bank>; active: Attempt | null; busy: boolean; onStart(bank: Bank, count: number, limit: TimeLimit): void; onResume(): void; onDiscard(): void }
export function Setup({ banks, importReady, onImport, active, busy, onStart, onResume, onDiscard }: Props) {
  const [bankId, setBankId] = useState(banks[0]?.id ?? '');
  const [length, setLength] = useState<QuizLength>(10);
  const [limit, setLimit] = useState<TimeLimit>(noTimeLimit);
  const bank = banks.find(item => item.id === bankId) ?? banks[0];
  const count = resolveQuestionCount(length, bank?.questions.length ?? 0);
  function selectBank(next: Bank) {
    setBankId(next.id);
  }
  return <div className="setup-content">
    {active && <section className="resume-card"><div className="resume-icon"><RotateCcw size={21} /></div><div className="grow"><h2>{t('activeTitle')}</h2><p>{t('activeMeta', { bank: active.bankName, answered: number(active.questions.length - unanswered(active).length), total: number(active.questions.length) })}</p></div><button className="text-button" disabled={busy} onClick={onDiscard}>{t('discard')}</button><button className="button small" onClick={onResume}>{t('resume')}<ArrowRight size={16} /></button></section>}
    {catalog.errors.length > 0 && <details className="bank-errors"><summary>{t('bankErrors')}</summary><ul>{catalog.errors.map(error => <li key={error}>{error}</li>)}</ul></details>}
    <QuizFiles ready={importReady} onImport={onImport} onImported={selectBank} />
    {bank ? <section className="setup-card">
      <div className="section-label"><span className="step">{t('stepOne')}</span><div><h2 id="banks-heading">{t('chooseBank')}</h2></div></div>
      <div className="bank-grid" role="radiogroup" aria-labelledby="banks-heading">
        {banks.map(item => <label className={`bank-option ${bank.id === item.id ? 'selected' : ''}`} key={item.id}>
          <input type="radio" name="bank" value={item.id} checked={bank.id === item.id} onChange={() => selectBank(item)} />
          <div className="bank-icon"><BookOpen size={23} strokeWidth={1.7} /></div><span className="bank-text"><strong>{item.name}</strong><span>{t('questions', { count: number(item.questions.length) })}{item.sample && <span className="sample-badge">{t('sample')}</span>}{item.imported && <span className="sample-badge">{t('importedBadge')}</span>}</span></span>
          <span className="radio-mark">{bank.id === item.id && <Check size={12} strokeWidth={3} />}</span>
        </label>)}
      </div>
      <div className="section-divider" />
      <div className="section-label"><span className="step">{t('stepTwo')}</span><div><h2 id="length-heading">{t('chooseLength')}</h2></div></div>
      <div className="length-grid" role="radiogroup" aria-labelledby="length-heading">{quizLengths.map(choice => <label className={`length-option ${length === choice ? 'selected' : ''}`} key={choice}>
        <input type="radio" name="count" value={choice} checked={length === choice} onChange={() => setLength(choice)} aria-label={choice === 'all' ? t('allQuestionsChoice') : t('questions', { count: number(choice) })} />
        <strong>{choice === 'all' ? t('allChoiceTitle') : number(choice)}</strong><span>{t('questionUnit')}</span>{length === choice && <Check className="count-check" size={14} />}
      </label>)}</div>
      <TimeLimitSetup value={limit} onChange={setLimit} />
      <div className="start-row"><div><span className="session-meta"><Layers3 size={16} />{t('timeStartMeta', { count: number(count), limit: timeLimitLabel(limit) })}</span><p>{t(limit.mode === 'none' ? 'setupHint' : 'timePersists')}</p></div><button className="button" disabled={busy || !isSetupTimeLimit(limit)} onClick={() => onStart(bank, count, limit)}>{t('start')}<ArrowRight size={18} /></button></div>
    </section> : <section className="empty-state"><BookOpen size={32} /><h2>{t('emptyTitle')}</h2><p>{t('emptyBody')}</p></section>}
  </div>;
}
