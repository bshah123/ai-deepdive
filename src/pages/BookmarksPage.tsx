import React from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, FileText, Trash2, ArrowRight } from 'lucide-react';
import curriculumData from '../../data/curriculum.json';
import { getStoredProgress, toggleBookmark } from '../utils/storage';
import { parseInlineText } from '../utils/textParser';

export const BookmarksPage: React.FC = () => {
  const [progress, setProgress] = React.useState(getStoredProgress());

  // Resolve bookmarked lessons
  const bookmarkedItems: any[] = [];
  curriculumData.parts.forEach(p => {
    p.chapters.forEach(c => {
      c.lessons.forEach(l => {
        if (progress.bookmarkedLessons.includes(l.id)) {
          bookmarkedItems.push({ lesson: l, chapter: c, part: p });
        }
      });
    });
  });

  const notesList = Object.entries(progress.notes).filter(([_, note]) => note.trim().length > 0);

  const handleRemoveBookmark = (lessonId: string) => {
    const updated = toggleBookmark(lessonId);
    setProgress(updated);
  };

  return (
    <div className="py-8 px-4 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
          <Bookmark className="w-7 h-7 text-amber-500 fill-current" />
          Saved Bookmarks & Local Notes
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Access your saved lessons and personal study notes stored locally in your browser.
        </p>
      </div>

      {/* Bookmarks Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>Bookmarked Lessons ({bookmarkedItems.length})</span>
        </h2>

        {bookmarkedItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bookmarkedItems.map(item => (
              <div
                key={item.lesson.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
                    Lesson {item.lesson.id}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {parseInlineText(item.lesson.title)}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ch {item.chapter.number} — {parseInlineText(item.chapter.title)}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Link
                    to={`/lesson/${item.lesson.id}`}
                    className="p-2 rounded bg-brand-50 text-brand-600 hover:bg-brand-100 text-xs font-semibold"
                  >
                    Open →
                  </Link>
                  <button
                    onClick={() => handleRemoveBookmark(item.lesson.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-xs text-slate-400">
            No bookmarked lessons yet. Click the bookmark icon inside any lesson to save it here!
          </div>
        )}
      </div>

      {/* Notes Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-500" />
          <span>Local Study Notes ({notesList.length})</span>
        </h2>

        {notesList.length > 0 ? (
          <div className="space-y-3">
            {notesList.map(([lessonId, noteText]) => (
              <div key={lessonId} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-center justify-between">
                  <Link
                    to={`/lesson/${lessonId}`}
                    className="text-xs font-bold text-brand-600 hover:underline"
                  >
                    Lesson {lessonId} Notes
                  </Link>
                  <Link
                    to={`/lesson/${lessonId}`}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    <span>View Lesson</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {parseInlineText(noteText)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-xs text-slate-400">
            No study notes taken yet. Open any lesson and click the Notes icon to write notes!
          </div>
        )}
      </div>
    </div>
  );
};
