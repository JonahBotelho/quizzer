/** A responsive bank library with independent choices and source badges. */
import { Check } from 'lucide-react';

import type { Bank } from '../core/types';
import { number, t } from '../i18n';
import { BankIcon } from './BankIcon';
import { GeneratedDownload } from './GeneratedDownload';

interface Props {
  banks: Bank[];
  selected: string[];
  onSelect(bank: Bank): void;
}

export function BankPicker({ banks, selected, onSelect }: Props) {
  return (
    <section className="bank-library" aria-labelledby="banks-heading">
      <h2 id="banks-heading">{t('chooseBank')}</h2>
      <div className="bank-grid" role="group" aria-labelledby="banks-heading">
        {banks.map(bank => (
          <label
            className={'bank-option ' + (selected.includes(bank.id) ? 'selected' : '')}
            key={bank.id}
          >
            <input
              type="checkbox"
              name="bank"
              value={bank.id}
              checked={selected.includes(bank.id)}
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
            {selected.includes(bank.id) && (
              <span className="bank-check-mark" aria-hidden="true">
                <Check size={22} />
              </span>
            )}
          </label>
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
