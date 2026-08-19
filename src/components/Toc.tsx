import React from 'react';
import { TocHeading } from '../utils/markdownParser';

interface TocProps {
  headings: TocHeading[];
  activeId?: string;
}

export const Toc: React.FC<TocProps> = ({ headings }) => {
  if (headings.length === 0) return null;

  return (
    <aside className="w-56 flex-shrink-0 hidden xl:block pl-6 text-xs select-none">
      <div className="sticky top-20 space-y-3">
        <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
          On this page
        </h4>
        <nav className="space-y-1.5 border-l border-slate-200 dark:border-slate-800 pl-3">
          {headings.map(h => (
            <a
              key={h.id}
              href={`#${h.id}`}
              className={`block text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors leading-snug ${h.level === 2 ? 'font-medium text-slate-800 dark:text-slate-200' : 'pl-2 opacity-85'}`}
            >
              {h.text}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
};
