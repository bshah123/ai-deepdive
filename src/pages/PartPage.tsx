import React from 'react';
import { useParams, Link } from 'react-router-dom';
import curriculumData from '../../data/curriculum.json';
import { parseInlineText } from '../utils/textParser';

export const PartPage: React.FC = () => {
  const { partId } = useParams();

  const part = curriculumData.parts.find(p => p.id === partId) || curriculumData.parts[0];

  return (
    <div className="py-8 px-4 max-w-4xl mx-auto space-y-8">
      <nav className="flex items-center space-x-2 text-xs text-slate-500">
        <Link to="/curriculum" className="hover:text-brand-600">Curriculum</Link>
        <span>/</span>
        <span className="font-semibold text-slate-800 dark:text-slate-200">Part {part.number}</span>
      </nav>

      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
        <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
          Part {part.number} Overview
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">
          {parseInlineText(part.title)}
        </h1>
        <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {parseInlineText(part.description)}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Chapters in Part {part.number}
        </h2>

        <div className="space-y-3">
          {part.chapters.map(ch => (
            <div key={ch.id} className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between">
                <Link
                  to={`/chapter/${ch.id}`}
                  className="text-lg font-bold text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400"
                >
                  Chapter {ch.number} — {parseInlineText(ch.title)}
                </Link>
                <span className="text-xs font-mono text-slate-400">{ch.estimatedHours}</span>
              </div>
              <div className="text-xs text-slate-500 leading-relaxed">{parseInlineText(ch.description)}</div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{ch.lessons.length} Sub-Lessons</span>
                <Link to={`/chapter/${ch.id}`} className="text-brand-600 font-semibold hover:underline">
                  Open Chapter Dashboard →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
