/** Timing contracts use absolute deadlines so refreshes cannot reset the clock. */
export type TimeLimit = { mode: 'none' } | { mode: 'question' | 'quiz'; seconds: number };
export interface AttemptTiming {
  limit: Exclude<TimeLimit, { mode: 'none' }>;
  deadlines: (number | null)[];
  expired: boolean[];
  finishedByTimeout: boolean;
}
