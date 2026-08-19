import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Circle, Clock, Tag } from 'lucide-react';
import curriculumData from '../../data/curriculum.json';
import { getStoredProgress } from '../utils/storage';
import { parseInlineText } from '../utils/textParser';

export const ChapterPage: React.FC = () => {
  const { chapterId } = useParams();
  const progress = getStoredProgress();

  let foundChapter: any = null;
  let foundPart: any = null;

  curriculumData.parts.forEach(p => {
    p.chapters.forEach(c => {
      if (c.id === chapterId) {
        foundChapter = c;
        foundPart = p;
      }
    });
  });

  if (!foundChapter) {
    return <div className="p-8 text-center text-slate-500">Chapter not found.</div>;
  }

  const completedCount = foundChapter.lessons.filter((l: any) =>
    progress.completedLessons.includes(l.id)
  ).length;

  const pct = Math.round((completedCount / foundChapter.lessons.length) * 100);
  const quizScore = progress.completedQuizzes[foundChapter.id];

  return (
    <div className="py-8 px-4 max-w-4xl mx-auto space-y-8">
      {/* Navigation Breadcrumb */}
      <nav className="flex items-center space-x-2 text-xs text-slate-500">
        <Link to="/curriculum" className="hover:text-brand-600">Curriculum</Link>
        <span>/</span>
        <Link to={`/part/${foundPart.id}`} className="hover:text-brand-600">Part {foundPart.number}</Link>
        <span>/</span>
        <span className="font-semibold text-slate-800 dark:text-slate-200">Chapter {foundChapter.number}</span>
      </nav>

      {/* Chapter Dashboard Hero Header */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
            Chapter {foundChapter.number} Dashboard
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 capitalize">
            {foundChapter.difficulty}
          </span>
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">
          {parseInlineText(foundChapter.title)}
        </h1>

        <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {parseInlineText(foundChapter.description)}
        </div>

        {/* Dashboard Progress Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-850">
            <span className="text-slate-400 block text-[10px] uppercase">Lessons Completed</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{completedCount} / {foundChapter.lessons.length}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-850">
            <span className="text-slate-400 block text-[10px] uppercase">Est. Study Time</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{foundChapter.estimatedHours}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-850">
            <span className="text-slate-400 block text-[10px] uppercase">Quiz Status</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {quizScore !== undefined ? `${quizScore}%` : 'Not Attempted'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-850">
            <span className="text-slate-400 block text-[10px] uppercase">Prerequisites</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {foundChapter.prerequisites.length > 0 ? foundChapter.prerequisites.join(', ') : 'None'}
            </span>
          </div>
        </div>

        {/* Chapter Progress Bar */}
        <div className="space-y-1 pt-2">
          <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
            <span>Chapter Mastery</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Lesson Syllabus List */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Sub-Lessons
        </h2>

        <div className="space-y-2">
          {foundChapter.lessons.map((lesson: any) => {
            const isDone = progress.completedLessons.includes(lesson.id);
            return (
              <Link
                key={lesson.id}
                to={`/lesson/${lesson.id}`}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-500/50 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center space-x-3">
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                  )}
                  <div>
                    <span className="text-xs text-slate-400 font-mono block">Lesson {lesson.id}</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {parseInlineText(lesson.title)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{lesson.estimatedMinutes || 20}m</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
