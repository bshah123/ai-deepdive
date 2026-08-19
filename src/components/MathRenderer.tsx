import React, { useEffect, useRef } from 'react';
import katex from 'katex';

interface MathRendererProps {
  math: string;
  block?: boolean;
  inline?: boolean;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ math, block = false }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!containerRef.current || !math) return;

    // Clean any accidentally duplicated or enclosing LaTeX delimiters
    const cleanMath = math
      .replace(/^\\\[\s*/, '')
      .replace(/\s*\\\]$/, '')
      .replace(/^\\\(\s*/, '')
      .replace(/\s*\\\)$/, '')
      .replace(/^\$\$\s*/, '')
      .replace(/\s*\$\$$/, '')
      .replace(/^\$\s*/, '')
      .replace(/\s*\$$/, '')
      .trim();

    try {
      katex.render(cleanMath, containerRef.current, {
        displayMode: block,
        throwOnError: false,
        strict: false,
      });
    } catch (err) {
      if (containerRef.current) {
        containerRef.current.textContent = cleanMath;
      }
    }
  }, [math, block]);

  return (
    <span
      ref={containerRef}
      className={
        block
          ? 'block my-3 text-center overflow-x-auto py-1.5 text-slate-900 dark:text-slate-100'
          : 'inline-block px-1 align-baseline text-indigo-600 dark:text-indigo-300 font-serif'
      }
    />
  );
};
