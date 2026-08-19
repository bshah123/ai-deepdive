import React from 'react';
import { X, Command, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Cmd + K / /', desc: 'Open Command Palette & Global Search' },
    { key: 'Cmd + J', desc: 'Open / Close AI Systems Mentor Drawer' },
    { key: 'j', desc: 'Navigate to Next Lesson' },
    { key: 'k', desc: 'Navigate to Previous Lesson' },
    { key: 'm', desc: 'Toggle Bookmark for current lesson' },
    { key: 'n', desc: 'Toggle Lesson Notes Drawer' },
    { key: 't', desc: 'Toggle Dark / Light Theme' },
    { key: '?', desc: 'Open this Keyboard Shortcuts Dialog' },
    { key: 'Esc', desc: 'Close open modal or drawer' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Keyboard className="w-4 h-4 text-indigo-400" />
            <span>Keyboard Shortcuts</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2.5 max-h-[70vh] overflow-y-auto">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40 text-xs"
            >
              <span className="text-slate-300 font-medium">{s.desc}</span>
              <kbd className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 font-mono text-[11px] text-indigo-300 font-semibold shadow-inner">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-center text-[11px] text-slate-500">
          Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">Esc</kbd> or click outside to dismiss
        </div>
      </div>
    </div>
  );
};
