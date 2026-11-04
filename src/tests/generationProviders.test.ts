/** Provider adapters use stateless structured output and avoid hidden paid retries. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ openai: vi.fn(), gemini: vi.fn(), openaiOptions: vi.fn() }));
vi.mock('openai', () => ({ default: class {
  responses = { create: mocks.openai };
  constructor(options: unknown) { mocks.openaiOptions(options); }
} }));
vi.mock('@google/genai', () => ({ GoogleGenAI: class { interactions = { create: mocks.gemini }; } }));

import { generateQuestions, providerError } from '../../server/providers';
import { generationInput } from '../../server/prompt';

const input = { title: 'Title', description: 'Subject', questionCount: 1,
  documents: [{ name: 'a.txt', text: 'reference' }], password: 'secret' };
const question = { question: 'Question?', options: ['A', 'B', 'C', 'D'], answer: 3 };
const output = JSON.stringify({ status: 'ok', questions: [question] });
const config = { provider: 'openai' as const, model: 'test-model', apiKey: 'key', password: 'secret' };
const signal = new AbortController().signal;

beforeEach(() => vi.clearAllMocks());

describe('generation adapters', () => {
  it('uses OpenAI structured output without stored responses or retries', async () => {
    mocks.openai.mockResolvedValue({ status: 'completed', output: [], output_text: output });
    expect(await generateQuestions(config, input, signal)).toEqual([{ ...question, id: 1 }]);
    expect(mocks.openaiOptions).toHaveBeenCalledWith(expect.objectContaining({ maxRetries: 0, timeout: 120_000 }));
    expect(mocks.openai).toHaveBeenCalledWith(expect.objectContaining({ store: false, model: 'test-model', max_output_tokens: 16_384,
      text: { format: expect.objectContaining({ type: 'json_schema', strict: true }) } }), { signal });
    expect(mocks.openai).toHaveBeenCalledTimes(1);
    expect(generationInput(input)).not.toContain('secret');
  });

  it('uses Gemini Interactions with stateless output and explicit request bounds', async () => {
    mocks.gemini.mockResolvedValue({ status: 'completed', output_text: output });
    expect(await generateQuestions({ ...config, provider: 'gemini' }, input, signal)).toEqual([{ ...question, id: 1 }]);
    expect(mocks.gemini).toHaveBeenCalledWith(expect.objectContaining({ store: false, automatic_continuation: false,
      generation_config: { max_output_tokens: 16_384 }, response_format: expect.objectContaining({ mime_type: 'application/json' }) }),
    { signal, maxRetries: 0, timeout: 120_000 });
    expect(mocks.gemini).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['{', 'invalidOutput'], [JSON.stringify({ status: 'insufficient_material', questions: [] }), 'insufficientMaterial'],
    [JSON.stringify({ status: 'ok', questions: [] }), 'invalidOutput'],
  ])('rejects unusable structured responses', async (raw, code) => {
    mocks.openai.mockResolvedValue({ status: 'completed', output: [], output_text: raw });
    await expect(generateQuestions(config, input, signal)).rejects.toThrow(code);
  });

  it('handles refusals and incomplete responses', async () => {
    mocks.openai.mockResolvedValue({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal' }] }] });
    await expect(generateQuestions(config, input, signal)).rejects.toThrow('refused');
    mocks.openai.mockResolvedValue({ status: 'incomplete', output: [] });
    await expect(generateQuestions(config, input, signal)).rejects.toThrow('invalidOutput');
  });

  it('does not continue an incomplete Gemini response and maps diagnostic failures', async () => {
    mocks.gemini.mockResolvedValue({ status: 'requires_continuation' });
    await expect(generateQuestions({ ...config, provider: 'gemini' }, input, signal)).rejects.toThrow('invalidOutput');
    expect(mocks.gemini).toHaveBeenCalledTimes(1);
    mocks.gemini.mockResolvedValue({ status: 'failed', errors: [{ message: 'safety blocked' }] });
    await expect(generateQuestions({ ...config, provider: 'gemini' }, input, signal)).rejects.toThrow('refused');
  });

  it.each([
    [{ status: 429 }, 'rateLimited'], [{ status: 401 }, 'unavailable'],
    [{ status: 400, message: 'context length exceeded' }, 'contextLimit'],
    [{ name: 'APIConnectionTimeoutError' }, 'timeout'], [{ message: 'safety blocked' }, 'refused'],
    [new Error('private provider content'), 'network'],
  ])('maps provider failures to safe codes', (error, code) => {
    expect(providerError(error).code).toBe(code);
  });
});
