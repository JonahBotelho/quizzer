/** A virtual bank lets the existing quiz lifecycle sample across the whole library. */
import { t } from '../i18n';
import type { Bank } from './types';
import { copyQuestionContent } from './questionContent';

export const combinedBankId = 'combined:all';

export function combineBanks(banks: Bank[], id: string, name: string): Bank {
  let nextQuestionId = 1;
  // Source IDs are only unique within each bank. Assign attempt-local IDs so
  // combined quizzes still pass saved-record validation and use distinct React keys.
  const questions = banks.flatMap(bank =>
    bank.questions.map(question => ({
      ...question,
      id: nextQuestionId++,
      question: copyQuestionContent(question.question),
      options: [...question.options],
    })),
  );

  return { id, name, questions, sample: false };
}

export function withCombinedBank(banks: Bank[]): Bank[] {
  const combined = combineBanks(banks, combinedBankId, t('allBanks'));

  return combined.questions.length ? [...banks, combined] : banks;
}
