/** Shared generation contracts and bounded validation for untrusted client/model input. */
import { validateQuestions } from './banks';
import type { Question } from './types';

export const generationLimits = {
  title: 120,
  description: 5_000,
  questions: 50,
  files: 5,
  fileBytes: 10 * 1024 * 1024,
  totalBytes: 20 * 1024 * 1024,
  characters: 100_000,
  bodyBytes: 1024 * 1024,
  extractionMs: 30_000,
  providerMs: 120_000,
  outputTokens: 16_384,
} as const;

export const generationCodes = [
  'invalidInput',
  'unauthorized',
  'unavailable',
  'rateLimited',
  'refused',
  'insufficientMaterial',
  'contextLimit',
  'invalidOutput',
  'timeout',
  'network',
  'tooLarge',
  'fileType',
  'fileUnreadable',
  'fileEncrypted',
  'fileEmpty',
] as const;

export type GenerationCode = (typeof generationCodes)[number];

export type GenerationField = 'title' | 'description' | 'questionCount' | 'documents' | 'password';

export interface ReferenceDocument {
  name: string;
  text: string;
}

export interface GenerationRequest {
  title: string;
  description: string;
  questionCount: number;
  documents: ReferenceDocument[];
  password?: string;
}

export interface GenerationAvailability {
  available: boolean;
  passwordRequired: boolean;
}

export interface GenerationFailure {
  code: GenerationCode;
  field?: GenerationField;
}

export interface GenerationResponse {
  questions: Question[];
}

export class GenerationError extends Error {
  constructor(
    public code: GenerationCode,
    public field?: GenerationField,
  ) {
    super(code);
    this.name = 'GenerationError';
  }
}

function boundedText(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && !!value.trim() && value.length <= maximum;
}

export function validateGenerationRequest(
  value: unknown,
  passwordRequired = false,
): GenerationRequest {
  if (!value || typeof value !== 'object') throw new GenerationError('invalidInput');

  const input = value as GenerationRequest;

  if (!boundedText(input.title, generationLimits.title))
    throw new GenerationError('invalidInput', 'title');

  if (!boundedText(input.description, generationLimits.description))
    throw new GenerationError('invalidInput', 'description');

  if (
    !Number.isInteger(input.questionCount) ||
    input.questionCount < 1 ||
    input.questionCount > generationLimits.questions
  ) {
    throw new GenerationError('invalidInput', 'questionCount');
  }

  if (passwordRequired && !boundedText(input.password, 1024))
    throw new GenerationError('invalidInput', 'password');

  if (
    input.password !== undefined &&
    (typeof input.password !== 'string' || input.password.length > 1024)
  ) {
    throw new GenerationError('invalidInput', 'password');
  }

  validateDocuments(input.documents);

  return {
    title: input.title.trim(),
    description: input.description.trim(),
    questionCount: input.questionCount,
    ...(input.password === undefined ? {} : { password: input.password }),
    documents: input.documents.map(({ name, text }) => ({ name, text })),
  };
}

function validateDocuments(documents: unknown): asserts documents is ReferenceDocument[] {
  if (!Array.isArray(documents) || documents.length > generationLimits.files) {
    throw new GenerationError('invalidInput', 'documents');
  }

  let characters = 0;

  for (const item of documents) {
    if (
      !item ||
      !boundedText(item.name, 255) ||
      !boundedText(item.text, generationLimits.characters)
    ) {
      throw new GenerationError('invalidInput', 'documents');
    }

    characters += item.text.length;
  }

  if (characters > generationLimits.characters) throw new GenerationError('tooLarge', 'documents');
}

export function validateGeneratedQuestions(value: unknown, count: number): Question[] {
  if (!Array.isArray(value) || value.length !== count) throw new GenerationError('invalidOutput');

  const questions = value.map((item, index) => ({ ...item, id: index + 1 }));

  if (validateQuestions(questions).error) throw new GenerationError('invalidOutput');

  const seen = new Set<string>();

  for (const question of questions) {
    if (typeof question.question !== 'string' || question.question.length > 2_000)
      throw new GenerationError('invalidOutput');

    const text = normalise(question.question);

    if (seen.has(text)) throw new GenerationError('invalidOutput');

    seen.add(text);

    if (
      question.options.length !== 4 ||
      question.options.some((option: string) => option.length > 1_000) ||
      new Set(question.options.map(normalise)).size !== 4
    )
      throw new GenerationError('invalidOutput');
  }

  return questions.map(({ id, question, options, answer }) => ({
    id,
    question,
    options: [...options],
    answer,
  }));
}

function normalise(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
