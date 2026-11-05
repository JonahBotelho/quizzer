/** Session previews show real counts and locale-owned timing without browser APIs. */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SessionSummary } from '../components/SessionSummary';
import { Setup } from '../components/Setup';
import type { QuizLength } from '../core/quizLength';
import type { TimeLimit } from '../core/timingTypes';
import type { Bank } from '../core/types';

const bank: Bank = {
  id: 'summary-fixture',
  name: 'Practice <&> review',
  sample: false,
  questions: Array.from({ length: 20 }, (_, index) => ({
    id: index + 1,
    question: 'Choose one',
    options: ['One', 'Two'],
    answer: 1,
  })),
};

function render(length: QuizLength, limit: TimeLimit = { mode: 'none' }) {
  return renderToStaticMarkup(createElement(SessionSummary, { bank, length, limit }));
}

describe('session summary', () => {
  it('preserves and escapes the supplied bank name', () => {
    expect(render(10)).toContain('Practice &lt;&amp;&gt; review');
  });

  it.each([25, 50, 'all'] as const)('shows the available count for length %s', length => {
    expect(render(length)).toContain('20 questions · No time limit');
  });

  it('shows the requested count when enough questions are available', () => {
    expect(render(10)).toContain('10 questions · No time limit');
  });

  it.each([
    [{ mode: 'question', seconds: 30 }, '30 seconds per question'],
    [{ mode: 'quiz', seconds: 600 }, '10 minutes for the quiz'],
    [{ mode: 'question', seconds: Number.NaN }, 'Choose a valid time limit'],
  ] as const)('describes timing %j', (limit, expected) => {
    expect(render(10, limit)).toContain('10 questions · ' + expected);
  });

  it('keeps import tools and the empty state available without a bank', () => {
    const markup = renderToStaticMarkup(
      createElement(Setup, {
        banks: [],
        importReady: true,
        active: null,
        busy: false,
        onImport: async () => bank,
        onSaveGenerated: async () => bank,
        onStart() {},
        onResume() {},
        onDiscard() {},
      }),
    );

    expect(markup).toContain('Your first quiz starts here');
    expect(markup).toContain('Import quiz JSON');
    expect(markup).toContain('Download sample JSON');
    expect(markup).toContain('Generate quiz');
    expect(markup).not.toContain('id="session-heading"');
  });
});
