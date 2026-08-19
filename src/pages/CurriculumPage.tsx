import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import curriculumData from '../../data/curriculum.json';
import { getStoredProgress } from '../utils/storage';
import { parseInlineText } from '../utils/textParser';

export const CurriculumPage: React.FC = () => {
  const progress = getStoredProgress();
  const [selectedPart, setSelectedPart] = useState<string | null>(null);

  const filteredParts = selectedPart
    ? curriculumData.parts.filter(p => p.id === selectedPart)
    : curriculumData.parts;

  return (
    <div className="py-8 px-4 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
          Complete Curriculum Syllabus
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Explore all 10 Parts and 60 Chapters progressing from foundational Python to advanced AI research systems.
        </p>
      </div>

      {/* Part Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
        <button
          onClick={() => setSelectedPart(null)}
          className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${selectedPart === null ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
        >
          All 10 Parts
        </button>
        {curriculumData.parts.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedPart(p.id)}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${selectedPart === p.id ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
          >
            Part {p.number}
          </button>
        ))}
      </div>

      {/* Parts & Chapters List */}
      <div className="space-y-8">
        {filteredParts.map(part => (
          <div key={part.id} className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                Part {part.number} — {part.subtitle}
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {parseInlineText(part.title)}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {parseInlineText(part.description)}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {part.chapters.map(ch => (
                <div key={ch.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-850/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <Link
                      to={`/chapter/${ch.id}`}
                      className="font-bold text-xs text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                    >
                      Ch {ch.number} — {parseInlineText(ch.title)}
                    </Link>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {ch.estimatedHours}
                    </span>
                  </div>

                  <div className="space-y-1 pt-1">
                    {ch.lessons.map(l => {
                      const isCompleted = progress.completedLessons.includes(l.id);
                      return (
                        <Link
                          key={l.id}
                          to={`/lesson/${l.id}`}
                          className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
                        >
                          <div className="flex items-center space-x-1.5 truncate">
                            {isCompleted ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                            )}
                            <span className="truncate">{l.id} {parseInlineText(l.title)}</span>
                          </div>
                          {l.status === 'under-construction' && (
                            <span className="text-[9px] px-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                              WIP
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
