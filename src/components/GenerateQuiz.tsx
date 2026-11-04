/** Discover generation availability without affecting browser-only practice. */
import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { GenerationDialog } from './GenerationDialog';
import { generationAvailability } from '../generation/client';
import type { GenerationAvailability } from '../core/generation';
import type { SaveGenerated } from '../hooks/useQuizGeneration';
import type { Bank } from '../core/types';
import { t } from '../i18n';

interface Props { ready: boolean; onSave: SaveGenerated; onGenerated(bank: Bank): void }

export function GenerateQuiz({ ready, onSave, onGenerated }: Props) {
  const [availability, setAvailability] = useState<GenerationAvailability | null>(null);
  const [open, setOpen] = useState(false);
  const [tooltipDismissed, setTooltipDismissed] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!open && wasOpen.current) trigger.current?.focus();
    wasOpen.current = open;
  }, [open]);
  useEffect(() => {
    const controller = new AbortController();
    void generationAvailability(AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]))
      .then(value => { if (!controller.signal.aborted) setAvailability(value); });
    return () => controller.abort();
  }, []);

  const hint = availability === null ? t('generationChecking') : availability.available ? undefined : t('generationUnavailable');
  const disabled = !ready || !availability?.available;
  return <>
    <div className="generation-entry" data-tooltip-dismissed={tooltipDismissed}
      onPointerEnter={() => setTooltipDismissed(false)} onFocus={() => setTooltipDismissed(false)}
      onKeyDown={event => { if (event.key === 'Escape') setTooltipDismissed(true); }}>
      <button ref={trigger} type="button" className="button secondary small" aria-disabled={disabled}
        aria-describedby={hint ? 'generation-availability' : undefined} onClick={() => { if (!disabled) setOpen(true); }}>
        <Sparkles size={15} />{t('generateQuiz')}
      </button>
      {hint && <span id="generation-availability" className="generation-tooltip" role="tooltip">{hint}</span>}
    </div>
    {open && <GenerationDialog passwordRequired={availability?.passwordRequired ?? true}
      onSave={onSave} onClose={() => setOpen(false)} onGenerated={bank => {
      setOpen(false);
      onGenerated(bank);
    }} />}
  </>;
}
