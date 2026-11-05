/** Preview the actual session size and timing using the same rules as quiz start. */
import { resolveQuestionCount, type QuizLength } from '../core/quizLength';
import type { TimeLimit } from '../core/timingTypes';
import type { Bank } from '../core/types';
import { number, t } from '../i18n';
import { timeLimitLabel } from '../timingCopy';
import { BankIcon } from './BankIcon';

interface Props {
  bank: Bank;
  length: QuizLength;
  limit: TimeLimit;
}

export function SessionSummary({ bank, length, limit }: Props) {
  const count = resolveQuestionCount(length, bank.questions.length);

  return (
    <div className="session-summary">
      <BankIcon bank={bank} />
      <div>
        <strong>{bank.name}</strong>
        <p>{t('timeStartMeta', { count: number(count), limit: timeLimitLabel(limit) })}</p>
      </div>
    </div>
  );
}
