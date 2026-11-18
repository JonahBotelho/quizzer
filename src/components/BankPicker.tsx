/** A responsive bank library with independent selection and removal controls. */
import { Check, Trash2 } from 'lucide-react';

import { combinedBankId } from '../core/combinedBank';
import type { Bank } from '../core/types';
import { number, t } from '../i18n';
import { BankIcon } from './BankIcon';
import { GeneratedDownload } from './GeneratedDownload';

interface Props {
  banks: Bank[];
  selected: string[];
  removeReady: boolean;
  onSelect(bank: Bank): void;
  onRequestRemove(bank: Bank, trigger: HTMLButtonElement): void;
}

interface BankCardProps extends Pick<Props, 'removeReady' | 'onSelect' | 'onRequestRemove'> {
  bank: Bank;
  selected: boolean;
}

function BankCard({ bank, selected, removeReady, onSelect, onRequestRemove }: BankCardProps) {
  const canRemove = !bank.sample && bank.id !== combinedBankId;

  return (
    <div className="bank-card">
      <label className={selected ? 'bank-option selected' : 'bank-option'}>
        <input
          type="checkbox"
          name="bank"
          value={bank.id}
          checked={selected}
          onChange={() => onSelect(bank)}
        />
        <BankIcon bank={bank} />
        <span className="bank-text">
          <strong>{bank.name}</strong>
          <span>{t('questions', { count: number(bank.questions.length) })}</span>
          <span className="bank-badges">
            {bank.sample && <span className="sample-badge">{t('sample')}</span>}
            {bank.imported && (
              <span className="sample-badge">
                {t(bank.source === 'generated' ? 'generatedBadge' : 'importedBadge')}
              </span>
            )}
          </span>
        </span>
        {selected && (
          <span className="bank-check-mark" aria-hidden="true">
            <Check size={22} />
          </span>
        )}
      </label>
      {canRemove && (
        <button
          type="button"
          className="icon-button bank-remove"
          aria-label={t('removeBank', { name: bank.name })}
          aria-haspopup="dialog"
          disabled={!removeReady}
          onClick={event => onRequestRemove(bank, event.currentTarget)}
        >
          <Trash2 size={20} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function BankPicker({ banks, selected, removeReady, onSelect, onRequestRemove }: Props) {
  return (
    <section className="bank-library" aria-labelledby="banks-heading">
      <div className="bank-grid" role="group" aria-labelledby="banks-heading">
        {banks.map(bank => (
          <BankCard
            key={bank.id}
            bank={bank}
            selected={selected.includes(bank.id)}
            removeReady={removeReady}
            onSelect={onSelect}
            onRequestRemove={onRequestRemove}
          />
        ))}
      </div>
      {banks
        .filter(bank => selected.includes(bank.id) && bank.source === 'generated')
        .map(bank => (
          <GeneratedDownload key={bank.id} bank={bank} />
        ))}
    </section>
  );
}
