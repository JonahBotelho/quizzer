/** Bound file selection and verify parser supervision always releases workers. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { documentText } from '../generation/documentText';
import { extractReference, validateReferenceFiles } from '../generation/documents';
import { generationLimits } from '../core/generation';
import { docxFixture } from './documentFixtures';

afterEach(() => vi.useRealTimers());

function parserWorker() {
  return { postMessage: vi.fn(), terminate: vi.fn(), onmessage: null, onerror: null, onmessageerror: null } as unknown as Worker;
}

describe('reference documents', () => {
  it('reads UTF-8 text and strips a BOM without interpreting Markdown', async () => {
    expect(await documentText(new File(['\uFEFF# Subject\nReference text'], 'reference.md'))).toBe('# Subject\nReference text');
  });

  it('extracts raw DOCX text using the production parser', async () => {
    const bytes = new Uint8Array(docxFixture());
    expect(await documentText(new File([bytes], 'reference.docx'))).toContain('Reference material in a Word document');
  });

  it.each([
    ['empty.txt', ' ', 'fileEmpty'], ['unsupported.exe', 'binary', 'fileType'], ['broken.docx', 'broken', 'fileUnreadable'],
  ])('rejects %s', async (name, content, code) => {
    await expect(documentText(new File([content], name))).rejects.toThrow(code);
  });

  it('rejects malformed UTF-8 and excessive extracted text', async () => {
    await expect(documentText(new File([new Uint8Array([255])], 'bad.txt'))).rejects.toThrow('fileUnreadable');
    await expect(documentText(new File(['x'.repeat(generationLimits.characters + 1)], 'large.txt'))).rejects.toThrow('tooLarge');
  });

  it('enforces file count, type, individual size, and combined size', () => {
    expect(() => validateReferenceFiles(Array.from({ length: 6 }, () => new File(['a'], 'a.txt')))).toThrow('tooLarge');
    expect(() => validateReferenceFiles([new File(['a'], 'a.exe')])).toThrow('fileType');
    expect(() => validateReferenceFiles([new File([], 'empty.txt')])).toThrow('fileEmpty');
    const large = { name: 'large.pdf', size: generationLimits.fileBytes + 1 } as File;
    expect(() => validateReferenceFiles([large])).toThrow('tooLarge');
    const medium = { name: 'medium.pdf', size: 8 * 1024 * 1024 } as File;
    expect(() => validateReferenceFiles([medium, medium, medium])).toThrow('tooLarge');
  });

  it('terminates its worker after success', async () => {
    const worker = parserWorker();
    const pending = extractReference(new File(['a'], 'a.txt'), new AbortController().signal, () => worker);
    worker.onmessage!.call(worker, { data: { kind: 'quizzer-document-result', text: 'readable text' } } as MessageEvent);
    expect(await pending).toBe('readable text');
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it('ignores internal parser messages and late results after cancellation', async () => {
    const worker = parserWorker();
    const controller = new AbortController();
    const pending = extractReference(new File(['a'], 'a.txt'), controller.signal, () => worker);
    worker.onmessage!.call(worker, { data: { sourceName: 'worker', action: 'ready' } } as MessageEvent);
    expect(worker.terminate).not.toHaveBeenCalled();
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    worker.onmessage!.call(worker, { data: { kind: 'quizzer-document-result', text: 'late' } } as MessageEvent);
    await rejected;
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it('terminates its worker on cancellation and ignores future processing', async () => {
    const worker = parserWorker();
    const controller = new AbortController();
    const pending = extractReference(new File(['a'], 'a.txt'), controller.signal, () => worker);
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await rejected;
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it('terminates on parser failures and the extraction deadline', async () => {
    vi.useFakeTimers();
    const worker = parserWorker();
    const pending = extractReference(new File(['a'], 'a.txt'), new AbortController().signal, () => worker);
    const rejected = expect(pending).rejects.toThrow('timeout');
    await vi.advanceTimersByTimeAsync(generationLimits.extractionMs);
    await rejected;
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    const broken = parserWorker();
    const failure = extractReference(new File(['a'], 'a.txt'), new AbortController().signal, () => broken);
    broken.onerror!.call(broken, {} as ErrorEvent);
    await expect(failure).rejects.toThrow('fileUnreadable');
    expect(broken.terminate).toHaveBeenCalledTimes(1);
  });
});
