import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, ChevronDown, CheckCircle2, Circle, GraduationCap, Sparkles } from 'lucide-react';
import { Part, UserProgress } from '../types/curriculum';
import { parseInlineText } from '../utils/textParser';

interface SidebarProps {
  parts: Part[];
  progress: UserProgress;
}

export const Sidebar: React.FC<SidebarProps> = ({ parts, progress }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Track expanded chapters
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({
    'chapter-01': true,
    'chapter-02': true,
    'chapter-03': true
  });

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => ({ ...prev, [chapterId]: !prev[chapterId] }));
  };

  return (
    <aside className="w-72 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-y-auto h-[calc(100vh-3.5rem)] text-xs select-none">
      <div className="p-4 space-y-6">
        {/* Quick Course Portal Hub Link */}
        <Link
          to="/course"
          className={`flex items-center justify-between p-3 rounded-xl border transition group ${
            location.pathname.startsWith('/course')
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
              : 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200/60 dark:border-indigo-800/40 text-indigo-950 dark:text-indigo-200 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs">Visual Explainer Lab</div>
              <div className="text-[10px] text-indigo-400/90 dark:text-indigo-300/80 font-sans">Interactive Math Simulators</div>
            </div>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
        </Link>

        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
            Table of Contents (60 Chapters)
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 font-semibold">
            {progress.completedLessons.length} Done
          </span>
        </div>

        {parts.map(part => (
          <div key={part.id} className="space-y-2">
            <div className="font-bold text-slate-900 dark:text-slate-200 text-xs tracking-tight flex items-center justify-between">
              <span>Part {part.number} — {parseInlineText(part.title)}</span>
            </div>

            <div className="space-y-1 pl-1">
              {part.chapters.map(ch => {
                const isExpanded = !!expandedChapters[ch.id];

                return (
                  <div key={ch.id} className="space-y-0.5">
                    <button
                      onClick={() => toggleChapter(ch.id)}
                      className="w-full text-left py-1.5 px-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between font-medium text-slate-800 dark:text-slate-300 transition-colors"
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                        <span className="truncate">Ch {ch.number} — {parseInlineText(ch.title)}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 ml-1 font-mono flex-shrink-0">
                        {ch.lessons.length}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="pl-5 space-y-0.5 border-l border-slate-200/80 dark:border-slate-800 ml-3 my-1">
                        {ch.lessons.map(lesson => {
                          const lessonUrl = `/lesson/${lesson.id}`;
                          const isActive = currentPath === lessonUrl;
                          const isCompleted = progress.completedLessons.includes(lesson.id);

                          return (
                            <Link
                              key={lesson.id}
                              to={lessonUrl}
                              className={`group flex items-center justify-between py-1 px-2 rounded text-[11px] transition-colors ${isActive ? 'bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
                            >
                              <div className="flex items-center space-x-1.5 truncate">
                                {isCompleted ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                ) : (
                                  <Circle className="w-3 h-3 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                                )}
                                <span className="truncate">{lesson.id} {parseInlineText(lesson.title)}</span>
                              </div>
                              {lesson.status === 'under-construction' && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                                  WIP
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
