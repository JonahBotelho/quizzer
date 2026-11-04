/** Localized UI copy and Canadian English formatting. */
import app from './locales/en-CA/app.json';
import quiz from './locales/en-CA/quiz.json';
import storage from './locales/en-CA/storage.json';
import banks from './locales/en-CA/banks.json';
import timing from './locales/en-CA/timing.json';
import quizImport from './locales/en-CA/import.json';
const messages = { ...app, ...quiz, ...storage, ...banks, ...timing, ...quizImport };
export type MessageKey = keyof typeof messages;
export const locale = 'en-CA';
export function t(key: MessageKey, values: Record<string, string | number> = {}): string {
  return messages[key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
}
export const number = (value: number) => new Intl.NumberFormat(locale).format(value);
export const percent = (ratio: number) => new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(ratio);
export const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));


