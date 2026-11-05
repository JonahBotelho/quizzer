/** Extract bounded plain text without rendering or executing document contents. */
import { GenerationError, generationLimits } from '../core/generation';

export async function documentText(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  let text: string;

  try {
    if (extension === 'pdf') text = await pdfText(await file.arrayBuffer());
    else if (extension === 'docx') {
      const { default: mammoth } = await import('mammoth/mammoth.browser');
      text = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
    } else if (extension === 'txt' || extension === 'md' || extension === 'markdown') {
      text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
    } else throw new GenerationError('fileType');
  } catch (error) {
    if (error instanceof GenerationError) throw error;

    if ((error as Error)?.name === 'PasswordException') throw new GenerationError('fileEncrypted');

    throw new GenerationError('fileUnreadable');
  }

  text = text.replace(/^\uFEFF/, '').trim();

  if (!text) throw new GenerationError('fileEmpty');

  if (text.length > generationLimits.characters) throw new GenerationError('tooLarge');

  return text;
}

async function pdfText(data: ArrayBuffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  // An explicit port avoids PDF.js's window-dependent worker URL fallback in a worker.
  const port = new Worker(workerUrl, { type: 'module' });
  // PDF.js currently infers its constructor's port type as null; create accepts a worker port.
  const worker = pdfjs.PDFWorker.create({ port });
  const assets = import.meta.env.DEV
    ? new URL('/node_modules/pdfjs-dist/', self.location.origin)
    : new URL(/* @vite-ignore */ '../pdfjs/', import.meta.url);
  const task = pdfjs.getDocument({
    data,
    worker,
    disableFontFace: true,
    cMapUrl: new URL('cmaps/', assets).href,
    standardFontDataUrl: new URL('standard_fonts/', assets).href,
  });

  try {
    const document = await task.promise;
    const pages: string[] = [];
    let characters = 0;

    for (let position = 1; position <= document.numPages; position++) {
      const page = await document.getPage(position);
      const content = await page.getTextContent();
      const text = content.items
        .map(item => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : ''))
        .join('');
      characters += text.length + 1;

      if (characters > generationLimits.characters) throw new GenerationError('tooLarge');

      pages.push(text);
      page.cleanup();
    }

    return pages.join('\n');
  } finally {
    try {
      await task.destroy();
    } finally {
      worker.destroy();
      port.terminate();
    }
  }
}
