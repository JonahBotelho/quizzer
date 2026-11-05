/** Adapt stateless, non-retrying provider calls to a validated question array. */
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import {
  GenerationError,
  generationLimits,
  validateGeneratedQuestions,
  type GenerationRequest,
} from '../src/core/generation';
import type { GenerationConfig } from './config';
import { generationInput, quizOutputSchema, systemInstruction } from './prompt';

async function openai(
  config: GenerationConfig,
  request: GenerationRequest,
  signal: AbortSignal,
): Promise<string> {
  const client = new OpenAI({
    apiKey: config.apiKey,
    maxRetries: 0,
    timeout: generationLimits.providerMs,
  });
  const result = await client.responses.create(
    {
      model: config.model,
      store: false,
      instructions: systemInstruction,
      input: generationInput(request),
      max_output_tokens: generationLimits.outputTokens,
      text: {
        format: { type: 'json_schema', name: 'quiz', strict: true, schema: quizOutputSchema },
      },
    },
    { signal },
  );

  if (
    result.output.some(
      item => item.type === 'message' && item.content.some(content => content.type === 'refusal'),
    )
  ) {
    throw new GenerationError('refused');
  }

  if (result.status !== 'completed') throw new GenerationError('invalidOutput');

  return result.output_text;
}

async function gemini(
  config: GenerationConfig,
  request: GenerationRequest,
  signal: AbortSignal,
): Promise<string> {
  const client = new GoogleGenAI({ apiKey: config.apiKey });
  const result = await client.interactions.create(
    {
      model: config.model,
      store: false,
      automatic_continuation: false,
      system_instruction: systemInstruction,
      input: generationInput(request),
      generation_config: { max_output_tokens: generationLimits.outputTokens },
      response_format: { type: 'text', mime_type: 'application/json', schema: quizOutputSchema },
    },
    { signal, maxRetries: 0, timeout: generationLimits.providerMs },
  );

  if (result.errors?.length) throw providerError(result.errors[0]);

  if (result.status !== 'completed') throw new GenerationError('invalidOutput');

  return result.output_text ?? '';
}

export async function generateQuestions(
  config: GenerationConfig,
  request: GenerationRequest,
  signal: AbortSignal,
) {
  try {
    const raw = await (config.provider === 'openai' ? openai : gemini)(config, request, signal);
    let result: { status?: string; questions?: unknown };

    try {
      result = JSON.parse(raw);
    } catch {
      throw new GenerationError('invalidOutput');
    }

    if (result?.status === 'insufficient_material')
      throw new GenerationError('insufficientMaterial');

    if (result?.status !== 'ok') throw new GenerationError('invalidOutput');

    return validateGeneratedQuestions(result.questions, request.questionCount);
  } catch (error) {
    throw providerError(error);
  }
}

export function providerError(error: unknown): GenerationError {
  if (error instanceof GenerationError) return error;

  const failure = error as {
    status?: number;
    code?: string;
    name?: string;
    message?: string;
  } | null;
  const detail = `${failure?.code ?? ''} ${failure?.message ?? ''}`.toLowerCase();

  if (failure?.status === 429) return new GenerationError('rateLimited');

  if (failure?.name?.includes('Timeout') || failure?.name === 'AbortError')
    return new GenerationError('timeout');

  if (/context|token.*limit|input.*long/.test(detail)) return new GenerationError('contextLimit');

  if (/safety|blocked|refus/.test(detail)) return new GenerationError('refused');

  if ([400, 401, 403, 404].includes(failure?.status ?? 0))
    return new GenerationError('unavailable');

  return new GenerationError('network');
}
