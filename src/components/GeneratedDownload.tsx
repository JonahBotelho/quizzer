/** Offer a JSON backup, including when the generated bank is only available in memory. */
import { useEffect, useState } from 'react';
import type { Bank } from '../core/types';
import { t } from '../i18n';

export function GeneratedDownload({ bank }: { bank: Bank }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const next = URL.createObjectURL(
      new Blob([JSON.stringify(bank.questions, null, 2)], { type: 'application/json' }),
    );
    setUrl(next);

    return () => URL.revokeObjectURL(next);
  }, [bank]);
  const filename = bank.name.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'quiz';

  return (
    <a
      className="button secondary small generated-download"
      href={url}
      download={`${filename}.json`}
    >
      {t('downloadGeneratedQuiz')}
    </a>
  );
}
