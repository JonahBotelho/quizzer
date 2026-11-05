/** Brief, attachment, and optional password fields for quiz generation. */
import type { ReferenceFile, useQuizGeneration } from '../hooks/useQuizGeneration';
import { number, t } from '../i18n';

type GenerationFlow = ReturnType<typeof useQuizGeneration>;
type BriefProps = Pick<GenerationFlow, 'form' | 'setForm'>;

function TitleField({ form, setForm }: BriefProps) {
  return (
    <>
      <label htmlFor="generation-title">{t('generationTitle')}</label>
      <input
        id="generation-title"
        autoFocus
        required
        maxLength={120}
        value={form.title}
        onChange={event => setForm({ ...form, title: event.target.value })}
      />
    </>
  );
}

function DescriptionField({ form, setForm }: BriefProps) {
  return (
    <>
      <label htmlFor="generation-description">{t('generationDescription')}</label>
      <textarea
        id="generation-description"
        required
        maxLength={5000}
        rows={4}
        value={form.description}
        aria-describedby="generation-description-hint"
        onChange={event => setForm({ ...form, description: event.target.value })}
      />
      <p id="generation-description-hint" className="generation-hint">
        {t('generationDescriptionHint')}
      </p>
    </>
  );
}

function CountField({ form, setForm }: BriefProps) {
  return (
    <>
      <label htmlFor="generation-count">{t('generationCount')}</label>
      <input
        id="generation-count"
        type="number"
        required
        min={1}
        max={50}
        step={1}
        value={Number.isNaN(form.questionCount) ? '' : form.questionCount}
        onChange={event => setForm({ ...form, questionCount: event.target.valueAsNumber })}
      />
    </>
  );
}

function ReferenceFileItem({
  item,
  onRemove,
}: {
  item: ReferenceFile;
  onRemove(id: string): void;
}) {
  const status =
    item.error ??
    (item.text
      ? t('generationFileReady', { count: number(item.text.length) })
      : t('generationFilePending'));

  return (
    <li>
      <div>
        <strong>{item.file.name}</strong>
        <span>{status}</span>
      </div>
      <button
        type="button"
        className="text-button"
        aria-label={t('generationRemoveFile', { name: item.file.name })}
        onClick={() => onRemove(item.id)}
      >
        {t('generationRemove')}
      </button>
    </li>
  );
}

function ReferenceFields({ flow }: { flow: GenerationFlow }) {
  return (
    <>
      <label htmlFor="generation-documents">{t('generationDocuments')}</label>
      <input
        id="generation-documents"
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.md,.markdown"
        aria-describedby="generation-document-hint"
        onChange={event => {
          flow.addFiles(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
      <p id="generation-document-hint" className="generation-hint">
        {t('generationDocumentHint')}
      </p>
      {flow.files.length > 0 && (
        <ul className="generation-files">
          {flow.files.map(item => (
            <ReferenceFileItem key={item.id} item={item} onRemove={flow.removeFile} />
          ))}
        </ul>
      )}
      {flow.files.some(item => /\.pdf$/i.test(item.file.name)) && (
        <p className="generation-hint">{t('generationPdfHint')}</p>
      )}
    </>
  );
}

function PasswordField({ form, setForm }: BriefProps) {
  return (
    <>
      <label htmlFor="generation-password">{t('generationPassword')}</label>
      <input
        id="generation-password"
        type="password"
        required
        maxLength={1024}
        autoComplete="off"
        aria-describedby="generation-password-hint"
        value={form.password}
        onChange={event => setForm({ ...form, password: event.target.value })}
      />
      <p id="generation-password-hint" className="generation-hint">
        {t('generationPasswordHint')}
      </p>
    </>
  );
}

export function GenerationFields({
  flow,
  passwordRequired,
}: {
  flow: GenerationFlow;
  passwordRequired: boolean;
}) {
  const brief = { form: flow.form, setForm: flow.setForm };

  return (
    <fieldset disabled={flow.phase !== 'idle'}>
      <TitleField {...brief} />
      <DescriptionField {...brief} />
      <CountField {...brief} />
      <ReferenceFields flow={flow} />
      {passwordRequired && <PasswordField {...brief} />}
    </fieldset>
  );
}
