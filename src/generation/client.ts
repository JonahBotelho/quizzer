/** Same-origin generation requests accept only validated results and safe error codes. */
import { GenerationError, generationCodes, generationLimits, validateGeneratedQuestions,
  type GenerationRequest, type GenerationCode, type GenerationField, type GenerationAvailability } from '../core/generation';

export const generationEndpoint = '/api/generate-quiz';

export async function generationAvailability(signal: AbortSignal): Promise<GenerationAvailability> {
  const unavailable = { available: false, passwordRequired: false };
  try {
    const response = await fetch(generationEndpoint, { signal, cache: 'no-store' });
    if (!response.ok) return unavailable;
    const data = await response.json();
    if (data.available !== true) return unavailable;
    // Older generation servers require a password but do not advertise the flag.
    return { available: true, passwordRequired: data.passwordRequired !== false };
  } catch { return unavailable; }
}

export async function requestGeneration(input: GenerationRequest, signal: AbortSignal) {
  const body = JSON.stringify(input);
  if (new TextEncoder().encode(body).byteLength > generationLimits.bodyBytes) throw new GenerationError('tooLarge');
  try {
    const response = await fetch(generationEndpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
      signal: AbortSignal.any([signal, AbortSignal.timeout(generationLimits.providerMs + 10_000)]),
      cache: 'no-store',
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw responseError(response.status, data);
    return validateGeneratedQuestions(data?.questions, input.questionCount);
  } catch (error) {
    signal.throwIfAborted();
    if (error instanceof GenerationError) throw error;
    if ((error as Error)?.name === 'TimeoutError') throw new GenerationError('timeout');
    throw new GenerationError('network');
  }
}

function responseError(status: number, data: { code?: GenerationCode; field?: GenerationField } | null): GenerationError {
  const fields: GenerationField[] = ['title', 'description', 'questionCount', 'documents', 'password'];
  if (data?.code && generationCodes.includes(data.code)) {
    return new GenerationError(data.code, fields.includes(data.field!) ? data.field : undefined);
  }
  const codes: Record<number, GenerationCode> = {
    401: 'unauthorized', 403: 'unauthorized', 404: 'unavailable', 413: 'tooLarge',
    429: 'rateLimited', 502: 'network', 503: 'unavailable', 504: 'timeout',
  };
  return new GenerationError(codes[status] ?? 'network');
}
