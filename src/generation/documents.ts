/** Validate selected files and supervise one cancellable parser worker per document. */
import { GenerationError, generationLimits, type GenerationCode } from '../core/generation';

export function validateReferenceFiles(files: File[]): void {
  if (
    files.length > generationLimits.files ||
    files.reduce((size, file) => size + file.size, 0) > generationLimits.totalBytes
  ) {
    throw new GenerationError('tooLarge', 'documents');
  }

  for (const file of files) {
    if (!/\.(pdf|docx|txt|md|markdown)$/i.test(file.name))
      throw new GenerationError('fileType', 'documents');

    if (file.name.length > 255 || file.size > generationLimits.fileBytes)
      throw new GenerationError('tooLarge', 'documents');

    if (!file.size) throw new GenerationError('fileEmpty', 'documents');
  }
}

export function extractReference(
  file: File,
  signal: AbortSignal,
  createWorker = () =>
    new Worker(new URL('./document.worker.ts', import.meta.url), { type: 'module' }),
): Promise<string> {
  signal.throwIfAborted();

  return new Promise((resolve, reject) => {
    const worker = createWorker();
    let finished = false;
    const finish = (text?: string, error?: unknown) => {
      if (finished) return;

      finished = true;
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      worker.terminate();

      if (error) reject(error);
      else resolve(text!);
    };
    const abort = () => finish(undefined, signal.reason);
    const timeout = setTimeout(
      () => finish(undefined, new GenerationError('timeout')),
      generationLimits.extractionMs,
    );
    signal.addEventListener('abort', abort, { once: true });
    worker.onmessage = (
      event: MessageEvent<{ kind?: string; text?: string; code?: GenerationCode }>,
    ) => {
      if (event.data.kind !== 'quizzer-document-result') return;

      const { text, code } = event.data;
      finish(text, code ? new GenerationError(code, 'documents') : undefined);
    };
    worker.onerror = () => finish(undefined, new GenerationError('fileUnreadable', 'documents'));
    worker.onmessageerror = () =>
      finish(undefined, new GenerationError('fileUnreadable', 'documents'));

    try {
      worker.postMessage(file);
    } catch {
      finish(undefined, new GenerationError('fileUnreadable', 'documents'));
    }
  });
}
