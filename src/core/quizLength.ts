/** Stable setup choices; resolve against the selected bank only when starting. */
export const quizLengths = [10, 25, 50, 'all'] as const;

export type QuizLength = (typeof quizLengths)[number];

export function resolveQuestionCount(choice: QuizLength, available: number): number {
  return choice === 'all' ? available : Math.min(choice, available);
}
