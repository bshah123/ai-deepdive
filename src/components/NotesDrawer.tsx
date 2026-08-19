import React, { useState, useEffect } from 'react';
import { X, Save, FileText, Eye, Edit3 } from 'lucide-react';
import { getStoredProgress, saveLessonNote } from '../utils/storage';
import { parseInlineText } from '../utils/textParser';

interface NotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  lessonTitle: string;
}

export const NotesDrawer: React.FC<NotesDrawerProps> = ({
  isOpen,
  onClose,
  lessonId,
  lessonTitle
}) => {
  const [noteText, setNoteText] = useState('');
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

  useEffect(() => {
    if (lessonId) {
      const progress = getStoredProgress();
      setNoteText(progress.notes[lessonId] || '');
      setSaved(false);
    }
  }, [lessonId, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveLessonNote(lessonId, noteText);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
            Personal Notes ({lessonId})
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 mr-2">
            <button
              onClick={() => setActiveTab('write')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                activeTab === 'write'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              <span>Write</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Preview</span>
            </button>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col min-h-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 truncate">
          Saved for <span className="font-semibold text-slate-700 dark:text-slate-300">{lessonTitle}</span>:
        </p>

        {activeTab === 'write' ? (
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write your mental models, LaTeX equations \( E = mc^2 \), code notes, or questions here..."
            className="flex-1 w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono resize-none leading-relaxed"
          />
        ) : (
          <div className="flex-1 w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 overflow-y-auto leading-relaxed space-y-2">
            {noteText.trim() ? (
              noteText.split('\n').map((line, idx) => (
                <p key={idx}>{line.trim() ? parseInlineText(line) : <br />}</p>
              ))
            ) : (
              <p className="text-slate-400 italic">No notes written yet. Switch to Write tab to add notes.</p>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-400">{saved ? '✓ Saved to localStorage' : ''}</span>
        <button
          onClick={handleSave}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Save Note</span>
        </button>
      </div>
    </div>
  );
};
