/** Bounded HTTP boundary: authenticate before paid work and never persist request content. */
import { createHash, timingSafeEqual } from 'node:crypto';
import {
  GenerationError,
  generationLimits,
  validateGenerationRequest,
} from '../src/core/generation';
import { generationConfig } from './config';
import { generateQuestions } from './providers';

interface Dependencies {
  config?: typeof generationConfig;
  generate?: typeof generateQuestions;
  timeoutMs?: number;
}

const statuses = {
  invalidInput: 400,
  unauthorized: 401,
  unavailable: 503,
  rateLimited: 429,
  refused: 422,
  insufficientMaterial: 422,
  contextLimit: 422,
  invalidOutput: 502,
  timeout: 504,
  network: 502,
  tooLarge: 413,
  fileType: 400,
  fileUnreadable: 400,
  fileEncrypted: 400,
  fileEmpty: 400,
} as const;

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

async function readBody(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.match(/^application\/json(?:\s*;|$)/i)) {
    throw new GenerationError('invalidInput');
  }

  const reader = request.body?.getReader();

  if (!reader) throw new GenerationError('invalidInput');

  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      size += value.byteLength;

      if (size > generationLimits.bodyBytes) {
        await reader.cancel();
        throw new GenerationError('tooLarge');
      }

      chunks.push(value);
    }

    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    if (error instanceof GenerationError) throw error;

    throw new GenerationError('invalidInput');
  } finally {
    reader.releaseLock();
  }
}

function passwordMatches(actual: string, expected: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();

  return timingSafeEqual(digest(actual), digest(expected));
}

async function generateWithDeadline(
  request: Request,
  input: Parameters<typeof generateQuestions>[1],
  config: NonNullable<ReturnType<typeof generationConfig>>,
  dependencies: Dependencies,
) {
  const controller = new AbortController();
  const signal = AbortSignal.any([controller.signal, request.signal]);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new GenerationError('timeout'));
    }, dependencies.timeoutMs ?? generationLimits.providerMs);
  });

  try {
    return await Promise.race([
      (dependencies.generate ?? generateQuestions)(config, input, signal),
      expired,
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

export async function handleGeneration(
  request: Request,
  dependencies: Dependencies = {},
): Promise<Response> {
  try {
    const origin = request.headers.get('origin');

    if (origin && origin !== new URL(request.url).origin)
      return json({ code: 'unauthorized' }, 403);

    const config = (dependencies.config ?? generationConfig)();

    if (request.method === 'GET')
      return json({ available: !!config, passwordRequired: !!config?.password });

    if (request.method !== 'POST') {
      const response = json({ code: 'invalidInput' }, 405);
      response.headers.set('Allow', 'GET, POST');

      return response;
    }

    if (!config) throw new GenerationError('unavailable');

    const input = validateGenerationRequest(await readBody(request), !!config.password);

    if (config.password && !passwordMatches(input.password!, config.password)) {
      throw new GenerationError('unauthorized', 'password');
    }

    request.signal.throwIfAborted();
    const questions = await generateWithDeadline(request, input, config, dependencies);

    return json({ questions });
  } catch (error) {
    const failure = error instanceof GenerationError ? error : new GenerationError('network');

    return json(
      { code: failure.code, ...(failure.field ? { field: failure.field } : {}) },
      statuses[failure.code],
    );
  }
}
