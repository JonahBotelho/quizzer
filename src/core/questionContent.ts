/** Validation and sanitized copies of literal question text and code blocks. */
import { number, t } from '../i18n';
import type { QuestionContent } from './types';

export function questionContentError(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() ? undefined : t('bankQuestion');
  if (!Array.isArray(value) || !value.length) return t('bankQuestion');
  for (const [index, block] of value.entries()) {
    const payload = block?.type === 'text' ? block.text : block?.type === 'code' ? block.code : undefined;
    if (!block || typeof block !== 'object' || Array.isArray(block)
      || typeof payload !== 'string' || !payload.trim()) {
      return t('bankQuestionBlock', { block: number(index + 1) });
    }
  }
}

export function copyQuestionContent(content: QuestionContent): QuestionContent {
  if (typeof content === 'string') return content;
  // Copy only documented fields; preserve whitespace exactly, including inside literals.
  return content.map(block => block.type === 'text'
    ? { type: 'text', text: block.text } : { type: 'code', code: block.code });
}
