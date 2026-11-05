/** Disposable parser worker keeps document processing off the interface thread. */
import { documentText } from './documentText';
import { GenerationError } from '../core/generation';

self.onmessage = async (event: MessageEvent<File>) => {
  try {
    self.postMessage({ kind: 'quizzer-document-result', text: await documentText(event.data) });
  } catch (error) {
    self.postMessage({
      kind: 'quizzer-document-result',
      code: error instanceof GenerationError ? error.code : 'fileUnreadable',
    });
  }
};
