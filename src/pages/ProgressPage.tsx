import React from 'react';
import { BarChart2, Award, CheckCircle2, BookOpen } from 'lucide-react';
import curriculumData from '../../data/curriculum.json';
import { getStoredProgress } from '../utils/storage';
import { ProgressTracker } from '../components/ProgressTracker';
import { Part } from '../types/curriculum';

export const ProgressPage: React.FC = () => {
  const progress = getStoredProgress();

  let totalLessons = 0;
  let totalQuizzes = 0;
  curriculumData.parts.forEach(p => {
    p.chapters.forEach(c => {
      totalLessons += c.lessons.length;
      totalQuizzes++;
    });
  });

  const completedLessonsCount = progress.completedLessons.length;
  const completedQuizzesCount = Object.keys(progress.completedQuizzes).length;

  return (
    <div className="py-8 px-4 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
          <BarChart2 className="w-7 h-7 text-brand-500" />
          Learning Analytics & Progress Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Detailed metrics tracking completed lessons, chapter quizzes, and system mastery.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
          <span className="text-xs text-slate-400 uppercase font-semibold">Completed Lessons</span>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {completedLessonsCount} / {totalLessons}
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
          <span className="text-xs text-slate-400 uppercase font-semibold">Quizzes Attempted</span>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {completedQuizzesCount} / {totalQuizzes}
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
          <span className="text-xs text-slate-400 uppercase font-semibold">Saved Notes</span>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {Object.keys(progress.notes).length}
          </div>
        </div>
      </div>

      <ProgressTracker curriculumParts={curriculumData.parts as Part[]} progress={progress} />
    </div>
  );
};
