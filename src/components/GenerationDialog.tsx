/** Accessible generation form with transient inputs and bounded reference attachments. */
import { useEffect, useRef, type FormEvent } from 'react';
import { useQuizGeneration, type GenerationPhase, type SaveGenerated } from '../hooks/useQuizGeneration';
import type { Bank } from '../core/types';
import { number, t, type MessageKey } from '../i18n';

interface Props { passwordRequired: boolean; onClose(): void; onSave: SaveGenerated; onGenerated(bank: Bank): void }

const phaseMessages: Record<GenerationPhase, MessageKey | null> = {
  idle: null, extracting: 'generationExtracting', generating: 'generationGenerating', saving: 'generationSaving',
};

export function GenerationDialog({ passwordRequired, onClose, onSave, onGenerated }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const flow = useQuizGeneration(onSave, onGenerated, passwordRequired);
  const { form, setForm, phase } = flow;
  const pending = phase !== 'idle';
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);

  function close() {
    if (flow.cancel()) onClose();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void flow.submit();
  }

  return <dialog ref={dialog} className="generation-dialog" aria-labelledby="generation-heading"
    aria-describedby="generation-privacy" onCancel={event => { event.preventDefault(); close(); }}>
    <form onSubmit={submit} noValidate>
      <h2 id="generation-heading">{t('generationHeading')}</h2>
      <p id="generation-privacy" className="generation-hint">{t('generationPrivacy')}</p>
      <fieldset disabled={pending}>
        <label htmlFor="generation-title">{t('generationTitle')}</label>
        <input id="generation-title" autoFocus required maxLength={120} value={form.title}
          onChange={event => setForm({ ...form, title: event.target.value })} />
        <label htmlFor="generation-description">{t('generationDescription')}</label>
        <textarea id="generation-description" required maxLength={5000} rows={4} value={form.description}
          aria-describedby="generation-description-hint" onChange={event => setForm({ ...form, description: event.target.value })} />
        <p id="generation-description-hint" className="generation-hint">{t('generationDescriptionHint')}</p>
        <label htmlFor="generation-count">{t('generationCount')}</label>
        <input id="generation-count" type="number" required min={1} max={50} step={1} value={Number.isNaN(form.questionCount) ? '' : form.questionCount}
          onChange={event => setForm({ ...form, questionCount: event.target.valueAsNumber })} />
        <label htmlFor="generation-documents">{t('generationDocuments')}</label>
        <input id="generation-documents" type="file" multiple accept=".pdf,.docx,.txt,.md,.markdown"
          aria-describedby="generation-document-hint" onChange={event => {
            flow.addFiles(Array.from(event.target.files ?? []));
            event.target.value = '';
          }} />
        <p id="generation-document-hint" className="generation-hint">{t('generationDocumentHint')}</p>
        {flow.files.length > 0 && <ul className="generation-files">{flow.files.map(item => <li key={item.id}>
          <div><strong>{item.file.name}</strong><span>{item.error ?? (item.text
            ? t('generationFileReady', { count: number(item.text.length) }) : t('generationFilePending'))}</span></div>
          <button type="button" className="text-button" aria-label={t('generationRemoveFile', { name: item.file.name })}
            onClick={() => flow.removeFile(item.id)}>{t('generationRemove')}</button>
        </li>)}</ul>}
        {flow.files.some(item => /\.pdf$/i.test(item.file.name)) && <p className="generation-hint">{t('generationPdfHint')}</p>}
        {passwordRequired && <>
          <label htmlFor="generation-password">{t('generationPassword')}</label>
          <input id="generation-password" type="password" required maxLength={1024} autoComplete="off"
            aria-describedby="generation-password-hint" value={form.password}
            onChange={event => setForm({ ...form, password: event.target.value })} />
          <p id="generation-password-hint" className="generation-hint">{t('generationPasswordHint')}</p>
        </>}
      </fieldset>
      <p className="generation-hint">{t('generationLimitation')}</p>
      <p className="generation-hint">{t('generationCancelHint')}</p>
      <p role="status" aria-live="polite">{phaseMessages[phase] && t(phaseMessages[phase]!)}</p>
      {flow.error && <p role="alert" className="file-error">{flow.error}</p>}
      <div className="generation-actions">
        <button type="button" className="button secondary" disabled={phase === 'saving'} onClick={close}>{t('generationCancel')}</button>
        <button className="button" type="submit" disabled={pending}>{t('generateQuiz')}</button>
      </div>
    </form>
  </dialog>;
}
