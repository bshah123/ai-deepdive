import React, { useState } from 'react';
import { CheckCircle2, Bookmark, ChevronLeft, ChevronRight, Share2, Check, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FloatingDockProps {
  lessonId: string;
  isCompleted: boolean;
  isBookmarked: boolean;
  onToggleComplete: () => void;
  onToggleBookmark: () => void;
  onOpenNotes: () => void;
  prevLesson?: { id: string; title: string } | null;
  nextLesson?: { id: string; title: string } | null;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({
  lessonId,
  isCompleted,
  isBookmarked,
  onToggleComplete,
  onToggleBookmark,
  onOpenNotes,
  prevLesson,
  nextLesson
}) => {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 p-1.5 rounded-full bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-xl border border-slate-700/60 dark:border-slate-800 shadow-2xl shadow-slate-950/50 transition-all duration-300 hover:border-slate-600">
      {/* Previous Lesson */}
      {prevLesson ? (
        <Link
          to={`/lesson/${prevLesson.id}`}
          className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title={`Previous: ${prevLesson.title}`}
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
      ) : (
        <div className="p-2 text-slate-600 cursor-not-allowed">
          <ChevronLeft className="w-4 h-4" />
        </div>
      )}

      <div className="w-[1px] h-4 bg-slate-700/60" />

      {/* Complete Button */}
      <button
        onClick={onToggleComplete}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
          isCompleted
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
        }`}
        title={isCompleted ? 'Completed! Click to unmark' : 'Mark as Completed'}
      >
        <CheckCircle2 className={`w-3.5 h-3.5 ${isCompleted ? 'text-emerald-400' : 'text-slate-400'}`} />
        <span>{isCompleted ? 'Done' : 'Mark Done'}</span>
      </button>

      {/* Bookmark Button */}
      <button
        onClick={onToggleBookmark}
        className={`p-2 rounded-full transition ${
          isBookmarked
            ? 'text-amber-400 bg-amber-500/20 border border-amber-500/30'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
        title={isBookmarked ? 'Bookmarked' : 'Add to Bookmarks'}
      >
        <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-400' : ''}`} />
      </button>

      {/* Notes Button */}
      <button
        onClick={onOpenNotes}
        className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
        title="Open Lesson Notes"
      >
        <FileText className="w-4 h-4" />
      </button>

      {/* Share Button */}
      <button
        onClick={handleShare}
        className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
        title="Copy Link to Clipboard"
      >
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
      </button>

      <div className="w-[1px] h-4 bg-slate-700/60" />


      {/* Next Lesson */}
      {nextLesson ? (
        <Link
          to={`/lesson/${nextLesson.id}`}
          className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title={`Next: ${nextLesson.title}`}
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      ) : (
        <div className="p-2 text-slate-600 cursor-not-allowed">
          <ChevronRight className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};
