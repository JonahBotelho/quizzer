/** Import a local file or download an importable, formatted JSON example. */
import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import sampleUrl from '../data/sample-quiz.json?url';
import type { Bank } from '../core/types';
import { importErrorMessage } from '../core/importError';
import { number, t } from '../i18n';
interface Props { ready: boolean; onImport(file: File): Promise<Bank>; onImported(bank: Bank): void }
export function QuizFiles({ ready, onImport, onImported }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  async function selectFile(file?: File) {
    if (!file) return;
    setPending(true); setError(null); setSuccess(null);
    try {
      const bank = await onImport(file); onImported(bank);
      setSuccess(t('importSuccess', { name: bank.name, count: number(bank.questions.length) }));
    } catch (reason) { setError(importErrorMessage(reason)); }
    finally { setPending(false); if (input.current) input.current.value = ''; }
  }
  return <section className="quiz-files" aria-labelledby="files-title">
    <div className="file-toolbar"><div><h2 id="files-title">{t('filesTitle')}</h2><p>{t('filesHint')}</p></div><div className="file-actions">
      <button className="button secondary small" disabled={!ready || pending} onClick={() => input.current?.click()}><Upload size={15} />{t(pending ? 'importingQuiz' : 'importQuiz')}</button>
      <a className="button secondary small" href={sampleUrl} download="quizzer-sample.json"><Download size={15} />{t('downloadSample')}</a>
    </div></div>
    <input id="quiz-import" type="file" accept=".json,application/json" ref={input} hidden onChange={event => { void selectFile(event.target.files?.[0]); }} />
    <p className="file-format-hint">{t('importFormatHint')}</p>
    {error && <p className="file-error" role="alert">{error}</p>}
    {success && <p className="file-success" role="status">{success}</p>}
  </section>;
}
