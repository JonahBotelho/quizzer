/** Accessible generation form with transient inputs and bounded reference attachments. */
import { useEffect, useRef, type FormEvent } from 'react';
import {
  useQuizGeneration,
  type GenerationPhase,
  type SaveGenerated,
} from '../hooks/useQuizGeneration';
import type { Bank } from '../core/types';
import { t, type MessageKey } from '../i18n';
import { GenerationFields } from './GenerationFields';

interface Props {
  passwordRequired: boolean;
  onClose(): void;
  onSave: SaveGenerated;
  onGenerated(bank: Bank): void;
}

const phaseMessages: Record<GenerationPhase, MessageKey | null> = {
  idle: null,
  extracting: 'generationExtracting',
  generating: 'generationGenerating',
  saving: 'generationSaving',
};

export function GenerationDialog({ passwordRequired, onClose, onSave, onGenerated }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const flow = useQuizGeneration(onSave, onGenerated, passwordRequired);
  const { phase } = flow;
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

  return (
    <dialog
      ref={dialog}
      className="generation-dialog"
      aria-labelledby="generation-heading"
      aria-describedby="generation-privacy"
      onCancel={event => {
        event.preventDefault();
        close();
      }}
    >
      <form onSubmit={submit} noValidate>
        <h2 id="generation-heading">{t('generationHeading')}</h2>
        <p id="generation-privacy" className="generation-hint">
          {t('generationPrivacy')}
        </p>
        <GenerationFields flow={flow} passwordRequired={passwordRequired} />
        <p className="generation-hint">{t('generationLimitation')}</p>
        <p className="generation-hint">{t('generationCancelHint')}</p>
        <p role="status" aria-live="polite">
          {phaseMessages[phase] && t(phaseMessages[phase]!)}
        </p>
        {flow.error && (
          <p role="alert" className="file-error">
            {flow.error}
          </p>
        )}
        <div className="generation-actions">
          <button
            type="button"
            className="button secondary"
            disabled={phase === 'saving'}
            onClick={close}
          >
            {t('generationCancel')}
          </button>
          <button className="button" type="submit" disabled={pending}>
            {t('generateQuiz')}
          </button>
        </div>
      </form>
    </dialog>
  );
}
