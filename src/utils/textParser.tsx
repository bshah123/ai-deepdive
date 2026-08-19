import React from 'react';
import { MathRenderer } from '../components/MathRenderer';

/**
 * Universal inline Markdown, Code, and LaTeX math tokenizer.
 * Renders \( ... \), $ ... $, `code`, **bold**, *italic*, [link](url), and ~~strikethrough~~.
 */
export function parseInlineText(text: string): React.ReactNode {
  if (!text) return null;
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // 1. Inline LaTeX: \( ... \)
    const parenMathMatch = remaining.match(/^\\\(([\s\S]*?)\\\)/);
    if (parenMathMatch) {
      tokens.push(<MathRenderer key={`pm-${keyIdx++}`} math={parenMathMatch[1]} inline />);
      remaining = remaining.slice(parenMathMatch[0].length);
      continue;
    }

    // 2. Inline LaTeX: $ ... $
    const dollarMathMatch = remaining.match(/^\$([^$\n]+)\$/);
    if (dollarMathMatch) {
      tokens.push(<MathRenderer key={`dm-${keyIdx++}`} math={dollarMathMatch[1]} inline />);
      remaining = remaining.slice(dollarMathMatch[0].length);
      continue;
    }

    // 3. Inline code: `...`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push(
        <code
          key={`c-${keyIdx++}`}
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono text-[0.88em] border border-slate-200 dark:border-slate-700/60 font-semibold"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // 4. Bold: **...**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      tokens.push(
        <strong key={`b-${keyIdx++}`} className="font-semibold text-slate-900 dark:text-slate-100">
          {parseInlineText(boldMatch[1])}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // 5. Italic: *...*
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      tokens.push(
        <em key={`i-${keyIdx++}`} className="italic text-slate-700 dark:text-slate-300">
          {parseInlineText(italicMatch[1])}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // 6. Markdown Link: [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      tokens.push(
        <a
          key={`l-${keyIdx++}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-600 dark:text-brand-400 underline hover:text-brand-700 font-medium"
        >
          {parseInlineText(linkMatch[1])}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // 7. Strikethrough: ~~...~~
    const strikeMatch = remaining.match(/^~~([^~]+)~~/);
    if (strikeMatch) {
      tokens.push(
        <del key={`s-${keyIdx++}`} className="line-through opacity-70">
          {parseInlineText(strikeMatch[1])}
        </del>
      );
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    // Next special character
    const nextSpecial = remaining.search(/[\$`\*~]|\\\(|\\\[|\[/);
    if (nextSpecial === -1) {
      tokens.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      tokens.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      tokens.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return tokens.length === 1 ? tokens[0] : <>{tokens}</>;
}
