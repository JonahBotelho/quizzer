/** Resolve independent bank choices into a repeatable quiz pool. */
import { combineBanks, combinedBankId } from './combinedBank';
import type { Bank } from './types';
import { locale, t } from '../i18n';

const selectionPrefix = 'combined:selected:';

export function toggleBankSelection(selected: string[], id: string): string[] {
  if (selected.includes(id)) return selected.filter(candidate => candidate !== id);

  if (id === combinedBankId) return [id];

  return [...selected.filter(candidate => candidate !== combinedBankId), id];
}

export function selectedBank(banks: Bank[], ids: string[]): Bank | undefined {
  const selected = banks.filter(bank => ids.includes(bank.id));
  const all = selected.find(bank => bank.id === combinedBankId);

  if (all) return all;

  if (selected.length < 2) return selected[0];

  const id = selectionPrefix + JSON.stringify(selected.map(bank => bank.id).sort());
  const names = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' });

  return combineBanks(selected, id, names.format(selected.map(bank => bank.name)));
}

export function resolveBank(banks: Bank[], id: string): Bank | undefined {
  const existing = banks.find(bank => bank.id === id);

  if (existing || !id.startsWith(selectionPrefix)) return existing;

  try {
    const ids: unknown = JSON.parse(id.slice(selectionPrefix.length));

    if (!Array.isArray(ids) || ids.length < 2 || !ids.every(value => typeof value === 'string'))
      return;

    if (ids.includes(combinedBankId) || new Set(ids).size !== ids.length) return;

    if (!ids.every(value => banks.some(bank => bank.id === value))) return;

    return selectedBank(banks, ids);
  } catch {
    return undefined;
  }
}

export function emptyBankSelection(): Bank {
  return { id: '', name: t('noBanksSelected'), questions: [], sample: false };
}
