/** A virtual bank lets the existing quiz lifecycle sample across the whole library. */
import { t } from '../i18n';
import type { Bank } from './types';
import { copyQuestionContent } from './questionContent';

export const combinedBankId = 'combined:all';

export function withCombinedBank(banks: Bank[]): Bank[] {
  let nextQuestionId = 1;
  // Source IDs are only unique within each bank. Assign attempt-local IDs so
  // combined quizzes still pass saved-record validation and use distinct React keys.
  const questions = banks.flatMap(bank => bank.questions.map(question => ({
    ...question, id: nextQuestionId++, question: copyQuestionContent(question.question), options: [...question.options],
  })));
  if (!questions.length) return banks;
  return [...banks, { id: combinedBankId, name: t('allBanks'), questions, sample: false }];
}
