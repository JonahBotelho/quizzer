/** Exercise the production HTTP boundary without spending provider credits. */
import { describe, expect, it, vi } from 'vitest';
import endpoint from '../../api/generate-quiz';
import { handleGeneration } from '../../server/generationHandler';
import { generationConfig } from '../../server/config';
import { GenerationError, generationLimits } from '../core/generation';

const config = { provider: 'openai' as const, model: 'test-model', apiKey: 'private-key', password: 'shared-password' };
const input = { title: 'Title', description: 'Description', questionCount: 1, documents: [], password: config.password };
const questions = [{ id: 1, question: 'Q?', options: ['A', 'B', 'C', 'D'], answer: 3 }];

function request(body: unknown = input, init: RequestInit = {}) {
  return new Request('https://quiz.example/api/generate-quiz', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), ...init,
  });
}

describe('generation HTTP boundary', () => {
  it('exports the production handler and reports availability without calling a provider', async () => {
    expect(endpoint.fetch).toBeTypeOf('function');
    const generate = vi.fn();
    const response = await handleGeneration(new Request('https://quiz.example/api/generate-quiz'), { config: () => config, generate });
    expect(await response.json()).toEqual({ available: true, passwordRequired: true });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(generate).not.toHaveBeenCalled();
  });

  it('serves availability through the real Vercel entrypoint', async () => {
    vi.stubEnv('LLM_PROVIDER', 'openai');
    vi.stubEnv('LLM_MODEL', 'test-model');
    vi.stubEnv('OPENAI_API_KEY', 'private-key');
    vi.stubEnv('QUIZ_GENERATION_PASSWORD', 'shared-password');
    try {
      const response = await endpoint.fetch(new Request('https://quiz.example/api/generate-quiz'));
      expect(await response.json()).toEqual({ available: true, passwordRequired: true });
    } finally { vi.unstubAllEnvs(); }
  });

  it('fails closed when configuration is absent and never exposes credentials', async () => {
    expect(generationConfig({})).toBeUndefined();
    expect(generationConfig({ LLM_PROVIDER: 'other' })).toBeUndefined();
    const generate = vi.fn();
    const response = await handleGeneration(request(), { config: () => undefined, generate });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: 'unavailable' });
    expect(generate).not.toHaveBeenCalled();
  });

  it('selects only the configured provider key', () => {
    expect(generationConfig({ LLM_PROVIDER: 'gemini', LLM_MODEL: 'model', GEMINI_API_KEY: 'gemini',
      OPENAI_API_KEY: 'openai', QUIZ_GENERATION_PASSWORD: 'password' })?.apiKey).toBe('gemini');
  });

  it.each([undefined, '', '  '])('allows generation without a password when configuration is %j', async password => {
    const openConfig = generationConfig({ LLM_PROVIDER: 'openai', LLM_MODEL: 'test-model',
      OPENAI_API_KEY: 'private-key', QUIZ_GENERATION_PASSWORD: password });
    expect(openConfig).toBeDefined();
    expect(openConfig?.password).toBeUndefined();
    const generate = vi.fn().mockResolvedValue(questions);
    const dependencies = { config: () => openConfig, generate };
    const availability = await handleGeneration(new Request('https://quiz.example/api/generate-quiz'), dependencies);
    expect(await availability.json()).toEqual({ available: true, passwordRequired: false });
    expect(generate).not.toHaveBeenCalled();

    for (const suppliedPassword of [undefined, '']) {
      const response = await handleGeneration(request({ ...input, password: suppliedPassword }), dependencies);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ questions });
    }
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('continues to reject missing or blank passwords when one is configured', async () => {
    const generate = vi.fn();
    for (const password of [undefined, '', '  ']) {
      const response = await handleGeneration(request({ ...input, password }), { config: () => config, generate });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ code: 'invalidInput', field: 'password' });
    }
    expect(generate).not.toHaveBeenCalled();
  });

  it('still disables generation when required model configuration is missing', () => {
    expect(generationConfig({ LLM_PROVIDER: 'openai', LLM_MODEL: 'model' })).toBeUndefined();
    expect(generationConfig({ LLM_PROVIDER: 'openai', OPENAI_API_KEY: 'key' })).toBeUndefined();
  });

  it('rejects incorrect passwords, invalid fields, cross-origin requests, and unsupported methods', async () => {
    const generate = vi.fn();
    const dependencies = { config: () => config, generate };
    const wrongPassword = await handleGeneration(request({ ...input, password: 'wrong' }), dependencies);
    expect(wrongPassword.status).toBe(401);
    const invalid = await handleGeneration(request({ ...input, title: '' }), dependencies);
    expect(await invalid.json()).toEqual({ code: 'invalidInput', field: 'title' });
    const crossOrigin = await handleGeneration(request(input, { headers: { origin: 'https://other.example' } }), dependencies);
    expect(crossOrigin.status).toBe(403);
    const unsupported = await handleGeneration(new Request('https://quiz.example/api/generate-quiz', { method: 'DELETE' }), dependencies);
    expect(unsupported.status).toBe(405);
    expect(unsupported.headers.get('allow')).toBe('GET, POST');
    expect(generate).not.toHaveBeenCalled();
  });

  it('counts actual bytes rather than trusting Content-Length', async () => {
    const generate = vi.fn();
    const response = await handleGeneration(request(input, { body: ' '.repeat(generationLimits.bodyBytes + 1),
      headers: { 'Content-Type': 'application/json', 'Content-Length': '1' } }), { config: () => config, generate });
    expect(response.status).toBe(413);
    expect(generate).not.toHaveBeenCalled();
  });

  it('rejects non-JSON and malformed JSON', async () => {
    const dependencies = { config: () => config, generate: vi.fn() };
    expect((await handleGeneration(request(input, { headers: { 'Content-Type': 'text/plain' } }), dependencies)).status).toBe(400);
    expect((await handleGeneration(request(input, { body: '{' }), dependencies)).status).toBe(400);
  });

  it('calls the provider once and returns questions', async () => {
    const generate = vi.fn().mockResolvedValue(questions);
    const response = await handleGeneration(request(), { config: () => config, generate });
    expect(await response.json()).toEqual({ questions });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][2]).toBeInstanceOf(AbortSignal);
  });

  it('times out and aborts stalled provider work', async () => {
    const generate = vi.fn().mockImplementation(() => new Promise(() => {}));
    const response = await handleGeneration(request(), { config: () => config, generate, timeoutMs: 5 });
    expect(response.status).toBe(504);
    expect(generate.mock.calls[0][2].aborted).toBe(true);
  });

  it.each([
    ['refused', 422], ['insufficientMaterial', 422], ['rateLimited', 429], ['contextLimit', 422], ['invalidOutput', 502],
  ] as const)('maps %s without disclosing provider content', async (code, status) => {
    const generate = vi.fn().mockRejectedValue(new GenerationError(code));
    const response = await handleGeneration(request(), { config: () => config, generate });
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ code });
  });
});
