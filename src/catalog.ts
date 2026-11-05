/** JSON is imported as text to isolate syntax errors to the individual bank. */
import { parseBanks } from './core/banks';
import bankNames from './locales/en-CA/bank-names.json';

export const catalog = parseBanks(
  import.meta.glob('./data/quizzes/*.json', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>,
  bankNames,
);
