/** Identify bank sources without relying on translated or user-supplied names. */
import { BookOpen, Code2, Layers3, Sparkles } from 'lucide-react';

import { combinedBankId } from '../core/combinedBank';
import type { Bank } from '../core/types';

export function BankIcon({ bank }: { bank: Bank }) {
  const Icon =
    bank.id === combinedBankId
      ? Layers3
      : bank.source === 'generated'
        ? Sparkles
        : bank.imported
          ? BookOpen
          : Code2;

  return <Icon size={48} strokeWidth={1.7} aria-hidden="true" />;
}
