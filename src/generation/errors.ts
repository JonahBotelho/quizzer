/** Map safe generation error codes to locale-owned interface messages. */
import { GenerationError, type GenerationCode } from '../core/generation';
import { t, type MessageKey } from '../i18n';

const messages: Record<GenerationCode, MessageKey> = {
  invalidInput: 'generationInvalidInput', unauthorized: 'generationUnauthorized',
  unavailable: 'generationUnavailable', rateLimited: 'generationRateLimited',
  refused: 'generationRefused', insufficientMaterial: 'generationInsufficientMaterial',
  contextLimit: 'generationContextLimit', invalidOutput: 'generationInvalidOutput',
  timeout: 'generationTimeout', network: 'generationNetwork', tooLarge: 'generationTooLarge',
  fileType: 'generationFileType', fileUnreadable: 'generationFileUnreadable',
  fileEncrypted: 'generationFileEncrypted', fileEmpty: 'generationFileEmpty',
};

export function generationErrorMessage(error: unknown): string {
  return t(messages[error instanceof GenerationError ? error.code : 'network']);
}
