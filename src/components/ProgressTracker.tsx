import React from 'react';
import { Part, Chapter } from '../types/curriculum';
import { UserProgress } from '../types/curriculum';

interface ProgressTrackerProps {
  curriculumParts: Part[];
  progress: UserProgress;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ curriculumParts, progress }) => {
  let totalLessons = 0;
  curriculumParts.forEach(p => {
    p.chapters.forEach(c => {
      totalLessons += c.lessons.length;
    });
  });

  const completedCount = progress.completedLessons.length;
  const overallPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
      <div>
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          <span>Overall Course Progress</span>
          <span>{completedCount} / {totalLessons} Lessons ({overallPercentage}%)</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${overallPercentage}%` }}
          />
        </div>
      </div>

      <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Part Completion</h4>
        {curriculumParts.map(part => {
          let partLessons = 0;
          let partCompleted = 0;

          part.chapters.forEach(ch => {
            ch.lessons.forEach(l => {
              partLessons++;
              if (progress.completedLessons.includes(l.id)) partCompleted++;
            });
          });

          const pct = partLessons > 0 ? Math.round((partCompleted / partLessons) * 100) : 0;

          return (
            <div key={part.id} className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                <span>Part {part.number} — {part.title}</span>
                <span>{pct}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
