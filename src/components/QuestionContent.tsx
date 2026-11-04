/** Shared literal question presentation for practice and saved mistake reviews. */
import type { Ref } from 'react';
import type { QuestionContent as Content } from '../core/types';
import { number, t } from '../i18n';

interface Props {
  content: Content;
  position: number;
  headingLevel: 2 | 3;
  headingRef?: Ref<HTMLHeadingElement>;
  headingId?: string;
  contentId?: string;
}

export function QuestionContent({ content, position, headingLevel, headingRef, headingId, contentId }: Props) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return <>
    <Heading ref={headingRef} id={headingId} tabIndex={headingRef ? -1 : undefined}>
      {typeof content === 'string' ? content : t('reviewQuestion', { number: number(position + 1) })}
    </Heading>
    {Array.isArray(content) && <div className="question-content" id={contentId}>
      {content.map((block, index) => block.type === 'text'
        ? <p key={index}>{block.text}</p>
        : <pre key={index} className="question-code" tabIndex={0} role="region"
          aria-label={t('codeSnippetLabel', { question: number(position + 1), block: number(index + 1) })}>
          <code>{block.code}</code>
        </pre>)}
    </div>}
  </>;
}
