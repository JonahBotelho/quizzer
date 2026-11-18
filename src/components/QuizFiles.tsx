/** Import a local file or download an importable, formatted JSON example. */
import { useRef, useState, type ReactNode } from 'react';
import { Download, Upload } from 'lucide-react';
import sampleUrl from '../data/sample-quiz.json?url';
import type { Bank } from '../core/types';
import { importErrorMessage } from '../core/importError';
import { number, t } from '../i18n';

interface Props {
  banks: Bank[];
  ready: boolean;
  onImport(file: File): Promise<Bank>;
  onImported(bank: Bank): void;
  generation?: ReactNode;
}

export function QuizFiles({ banks, ready, onImport, onImported, generation }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedBank, setImportedBank] = useState<Bank | null>(null);
  async function selectFile(file?: File) {
    if (!file) return;

    setPending(true);
    setError(null);
    setImportedBank(null);

    try {
      const bank = await onImport(file);
      onImported(bank);
      setImportedBank(bank);
    } catch (reason) {
      setError(importErrorMessage(reason));
    } finally {
      setPending(false);

      if (input.current) input.current.value = '';
    }
  }

  return (
    <section className="quiz-files" aria-labelledby="files-title">
      <div className="file-toolbar">
        <h2 className="visually-hidden" id="files-title">
          {t('filesTitle')}
        </h2>
        <div className="file-actions">
          <button
            className="button secondary small"
            disabled={!ready || pending}
            onClick={() => input.current?.click()}
          >
            <Upload size={15} />
            {t(pending ? 'importingQuiz' : 'importQuiz')}
          </button>
          <a className="button secondary small" href={sampleUrl} download="quizzer-sample.json">
            <Download size={15} />
            {t('downloadSample')}
          </a>
          {generation}
        </div>
      </div>
      <input
        id="quiz-import"
        type="file"
        accept=".json,application/json"
        ref={input}
        hidden
        onChange={event => {
          void selectFile(event.target.files?.[0]);
        }}
      />
      {error && (
        <p className="file-error" role="alert">
          {error}
        </p>
      )}
      {importedBank && banks.some(bank => bank.id === importedBank.id) && (
        <p className="file-success" role="status">
          {t('importSuccess', {
            name: importedBank.name,
            count: number(importedBank.questions.length),
          })}
        </p>
      )}
    </section>
  );
}
