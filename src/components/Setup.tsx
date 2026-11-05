/** Practice setup combines the bank library, session controls, and local quiz tools. */
import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, RotateCcw } from 'lucide-react';

import { catalog } from '../catalog';
import { unanswered } from '../core/quiz';
import { emptyBankSelection, selectedBank, toggleBankSelection } from '../core/bankSelection';
import { resolveQuestionCount, type QuizLength } from '../core/quizLength';
import { noTimeLimit } from '../core/timing';
import type { TimeLimit } from '../core/timingTypes';
import type { Attempt, Bank } from '../core/types';
import type { SaveGenerated } from '../hooks/useQuizGeneration';
import { number, t } from '../i18n';
import { BankPicker } from './BankPicker';
import { GenerateQuiz } from './GenerateQuiz';
import { QuizFiles } from './QuizFiles';
import { SessionPanel } from './SessionPanel';

interface Props {
  banks: Bank[];
  importReady: boolean;
  onImport(file: File): Promise<Bank>;
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
  const [bankIds, setBankIds] = useState<string[]>(() =>
    props.banks[0] ? [props.banks[0].id] : [],
  );
  const [length, setLength] = useState<QuizLength>(10);
  const [limit, setLimit] = useState<TimeLimit>(noTimeLimit);
  const [generatedName, setGeneratedName] = useState<string | null>(null);
  const bank = useMemo(() => selectedBank(props.banks, bankIds), [props.banks, bankIds]);
  const selectBank = (next: Bank) => setBankIds([next.id]);

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
        <div className="setup-heading">
          <h1>{t('tagline')}</h1>
        </div>
        <QuizFiles
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
                setGeneratedName(
                  t('generationSuccess', { name: next.name, count: number(next.questions.length) }),
                );
              }}
            />
          }
        />
      </div>
      {generatedName && (
        <p className="file-success generation-success" role="status">
          {generatedName}
        </p>
      )}
      {props.banks.length > 0 ? (
        <div className="setup-layout">
          <BankPicker
            banks={props.banks}
            selected={bankIds}
            onSelect={next => setBankIds(current => toggleBankSelection(current, next.id))}
          />
          <SessionPanel
            bank={bank ?? emptyBankSelection()}
            length={length}
            limit={limit}
            busy={props.busy}
            onLengthChange={setLength}
            onLimitChange={setLimit}
            onStart={() =>
              bank &&
              props.onStart(bank, resolveQuestionCount(length, bank.questions.length), limit)
            }
          />
        </div>
      ) : (
        <section className="empty-state">
          <BookOpen size={40} aria-hidden="true" />
          <h2>{t('emptyTitle')}</h2>
          <p>{t('emptyBody')}</p>
        </section>
      )}
    </div>
  );
}
