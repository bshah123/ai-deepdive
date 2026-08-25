import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Sun, Moon, Bookmark, BarChart2, BookOpen, Layers, Eye, Compass, GraduationCap, Sparkles } from 'lucide-react';
import { ReadingMode } from '../types/curriculum';

interface HeaderProps {
  onOpenSearch: () => void;
  theme: 'light' | 'dark' | 'system';
  onToggleTheme: () => void;
  readingMode: ReadingMode;
  onChangeReadingMode: (mode: ReadingMode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  theme,
  onToggleTheme,
  readingMode,
  onChangeReadingMode
}) => {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors">
      <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
        {/* Brand logo & tagline */}
        <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-brand-600 dark:bg-brand-500 flex items-center justify-center text-white font-bold text-base shadow-sm group-hover:scale-105 transition-transform">
              AI
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight">
                AI-DeepDive
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-semibold tracking-widest px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                LearnCpp Style
              </span>
            </div>
          </Link>

          {/* Core nav links */}
          <nav className="hidden md:flex items-center space-x-1 text-xs font-medium">
            <Link
              to="/curriculum"
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 ${location.pathname.startsWith('/curriculum') ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Curriculum</span>
            </Link>
            <Link
              to="/course"
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 ${location.pathname.startsWith('/course') ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Visual Lab</span>
            </Link>
            <Link
              to="/glossary"
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 ${location.pathname.startsWith('/glossary') ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Glossary</span>
            </Link>
            <Link
              to="/bookmarks"
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 ${location.pathname.startsWith('/bookmarks') ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved</span>
            </Link>
            <Link
              to="/progress"
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 ${location.pathname.startsWith('/progress') ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Progress</span>
            </Link>
          </nav>
        </div>

        {/* Right action controls */}
        <div className="flex items-center space-x-2">
          {/* Search Trigger button */}
          <button
            onClick={onOpenSearch}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 font-mono">
              ⌘K
            </kbd>
          </button>

          {/* Reading Mode Switcher */}
          <div className="hidden lg:flex items-center p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-850 text-[11px]">
            <button
              onClick={() => onChangeReadingMode('standard')}
              className={`px-2 py-1 rounded-md transition-colors ${readingMode === 'standard' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 font-medium shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              title="Standard textbook view"
            >
              Standard
            </button>
            <button
              onClick={() => onChangeReadingMode('learning')}
              className={`px-2 py-1 rounded-md transition-colors ${readingMode === 'learning' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 font-medium shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              title="Focus mode (wide reading, hidden right TOC)"
            >
              Focus
            </button>
            <button
              onClick={() => onChangeReadingMode('reference')}
              className={`px-2 py-1 rounded-md transition-colors ${readingMode === 'reference' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 font-medium shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              title="Reference lookup mode"
            >
              Reference
            </button>
          </div>

          {/* Dark Mode toggle button */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Light / Dark mode"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>
    </header>
  );
};
