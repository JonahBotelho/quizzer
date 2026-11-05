/** Domain types. Answers remain one-based in both source and saved attempts. */
import type { AttemptTiming } from './timingTypes';

export type QuestionBlock = { type: 'text'; text: string } | { type: 'code'; code: string };

export type QuestionContent = string | QuestionBlock[];

export interface Question {
  id: number;
  question: QuestionContent;
  options: string[];
  answer: number;
}

export interface Bank {
  id: string;
  name: string;
  questions: Question[];
  sample: boolean;
  imported?: boolean;
  source?: 'generated';
}

export interface Attempt {
  version: 1;
  id: string;
  bankId: string;
  bankName: string;
  questions: Question[];
  answers: (number | null)[];
  position: number;
  startedAt: string;
  updatedAt: string;
  timing?: AttemptTiming;
  completedAt: string | null;
  status: 'active' | 'completed';
  revision: number;
}

export interface SavedState {
  active: Attempt | null;
  history: Attempt[];
  invalid: boolean;
}
