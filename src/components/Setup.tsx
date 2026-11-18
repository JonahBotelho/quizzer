/** Practice setup combines the bank library, session controls, and local quiz tools. */
import { useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, RotateCcw } from 'lucide-react';

import { catalog } from '../catalog';
import { unanswered } from '../core/quiz';
import { emptyBankSelection, selectedBank, toggleBankSelection } from '../core/bankSelection';
import { combinedBankId } from '../core/combinedBank';
import { resolveQuestionCount, type QuizLength } from '../core/quizLength';
import { noTimeLimit } from '../core/timing';
import type { TimeLimit } from '../core/timingTypes';
import type { Attempt, Bank } from '../core/types';
import type { SaveGenerated } from '../hooks/useQuizGeneration';
import { number, t } from '../i18n';
import { BankPicker } from './BankPicker';
import { BankRemovalDialog } from './BankRemovalDialog';
import { GenerateQuiz } from './GenerateQuiz';
import { QuizFiles } from './QuizFiles';
import { SessionPanel } from './SessionPanel';

interface Props {
  banks: Bank[];
  importReady: boolean;
  onImport(file: File): Promise<Bank>;
  onRemoveBank(id: string): Promise<boolean>;
  onSaveGenerated: SaveGenerated;
  active: Attempt | null;
  busy: boolean;
  onStart(bank: Bank, count: number, limit: TimeLimit): void;
  onResume(): void;
  onDiscard(): void;
}

function ResumeSession({
  active,
  busy,
  onDiscard,
  onResume,
}: Pick<Props, 'active' | 'busy' | 'onDiscard' | 'onResume'>) {
  if (!active) return null;

  return (
    <section className="resume-card">
      <RotateCcw className="resume-icon" size={24} aria-hidden="true" />
      <div className="grow">
        <h2>{t('activeTitle')}</h2>
        <p>
          {t('activeMeta', {
            bank: active.bankName,
            answered: number(active.questions.length - unanswered(active).length),
            total: number(active.questions.length),
          })}
        </p>
      </div>
      <button className="text-button" disabled={busy} onClick={onDiscard}>
        {t('discard')}
      </button>
      <button className="button small" onClick={onResume}>
        {t('resume')}
        <ArrowRight size={18} aria-hidden="true" />
      </button>
    </section>
  );
}

export function Setup(props: Props) {
  const [selection, setSelection] = useState<string[] | null>(null);
  const [length, setLength] = useState<QuizLength>(10);
  const [limit, setLimit] = useState<TimeLimit>(noTimeLimit);
  const [generatedBank, setGeneratedBank] = useState<Bank | null>(null);
  const [removal, setRemoval] = useState<{ bank: Bank; trigger: HTMLButtonElement } | null>(null);
  const pageHeading = useRef<HTMLHeadingElement>(null);
  const bankHeading = useRef<HTMLHeadingElement>(null);
  const bankIds = selection ?? (props.banks[0] ? [props.banks[0].id] : []);
  const bank = useMemo(() => selectedBank(props.banks, bankIds), [props.banks, bankIds]);
  const selectBank = (next: Bank) => setSelection([next.id]);

  async function removeBank(target: Bank, trigger: HTMLButtonElement) {
    if (!(await props.onRemoveBank(target.id))) return;

    setSelection(current => (current ?? bankIds).filter(id => id !== target.id));

    if (document.activeElement === trigger || document.activeElement === document.body) {
      const hasOtherBank = props.banks.some(candidate =>
        candidate.id !== target.id && candidate.id !== combinedBankId,
      );
      const focusTarget = hasOtherBank ? bankHeading.current : pageHeading.current;
      focusTarget?.focus();
    }
  }

  function closeRemoval(confirmed: boolean) {
    if (!removal) return;

    const { bank, trigger } = removal;
    setRemoval(null);

    const focusTarget = trigger.isConnected ? trigger : bankHeading.current ?? pageHeading.current;
    focusTarget?.focus();

    if (confirmed) void removeBank(bank, trigger);
  }

  return (
    <div className="setup-content">
      <ResumeSession {...props} />
      {catalog.errors.length > 0 && (
        <details className="bank-errors">
          <summary>{t('bankErrors')}</summary>
          <ul>
            {catalog.errors.map(error => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </details>
      )}
      <div className="setup-introduction">
        <h1 ref={pageHeading} tabIndex={-1}>{t('tagline')}</h1>
        <QuizFiles
          banks={props.banks}
          ready={props.importReady}
          onImport={props.onImport}
          onImported={selectBank}
          generation={
            <GenerateQuiz
              ready={props.importReady}
              onSave={props.onSaveGenerated}
              onGenerated={next => {
                selectBank(next);
                setLength('all');
                setGeneratedBank(next);
              }}
            />
          }
        />
      </div>
      {generatedBank && props.banks.some(bank => bank.id === generatedBank.id) && (
        <p className="file-success generation-success" role="status">
          {t('generationSuccess', {
            name: generatedBank.name,
            count: number(generatedBank.questions.length),
          })}
        </p>
      )}
      {props.banks.length > 0 ? (
        <>
          <h2 className="setup-bank-heading" id="banks-heading" ref={bankHeading} tabIndex={-1}>
            {t('chooseBank')}
          </h2>
          <div className="setup-layout">
            <BankPicker
              banks={props.banks}
              selected={bankIds}
              removeReady={props.importReady}
              onSelect={next => setSelection(current => toggleBankSelection(current ?? bankIds, next.id))}
              onRequestRemove={(bank, trigger) => setRemoval({ bank, trigger })}
            />
            <SessionPanel
              bank={bank ?? emptyBankSelection()}
              length={length}
              limit={limit}
              busy={props.busy || !props.importReady}
              onLengthChange={setLength}
              onLimitChange={setLimit}
              onStart={() =>
                bank &&
                props.onStart(bank, resolveQuestionCount(length, bank.questions.length), limit)
              }
            />
          </div>
        </>
      ) : (
        <section className="empty-state">
          <BookOpen size={40} aria-hidden="true" />
          <h2>{t('emptyTitle')}</h2>
          <p>{t('emptyBody')}</p>
        </section>
      )}
      {removal && <BankRemovalDialog name={removal.bank.name} onClose={closeRemoval} />}
    </div>
  );
}
