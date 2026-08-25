import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SearchModal } from './components/SearchModal';
import { LessonView } from './components/LessonView';
import { HomePage } from './pages/HomePage';
import { CurriculumPage } from './pages/CurriculumPage';
import { PartPage } from './pages/PartPage';
import { ChapterPage } from './pages/ChapterPage';
import { GlossaryPage } from './pages/GlossaryPage';
import { BookmarksPage } from './pages/BookmarksPage';
import { ProgressPage } from './pages/ProgressPage';
import { CourseHubPage } from './pages/CourseHubPage';
import { ScrollToTop } from './components/ScrollToTop';
import curriculumData from '../data/curriculum.json';
import { Part, ReadingMode } from './types/curriculum';
import {
  getStoredProgress,
  getStoredTheme,
  setStoredTheme,
  getStoredReadingMode,
  setStoredReadingMode
} from './utils/storage';

export const App: React.FC = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(getStoredTheme());
  const [readingMode, setReadingMode] = useState<ReadingMode>(getStoredReadingMode());
  const [progress, setProgress] = useState(getStoredProgress());

  // Apply dark class to <html> tag
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    setStoredTheme(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleChangeReadingMode = (mode: ReadingMode) => {
    setReadingMode(mode);
    setStoredReadingMode(mode);
  };

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-brand-500 selection:text-white">
        {/* Header Bar */}
        <Header
          onOpenSearch={() => setIsSearchOpen(true)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          readingMode={readingMode}
          onChangeReadingMode={handleChangeReadingMode}
        />

        {/* Main Application Content Area */}
        <div className="flex-1 flex min-w-0">
          {/* Collapsible Left Sidebar */}
          <Sidebar parts={curriculumData.parts as Part[]} progress={progress} />

          {/* Main Route View */}
          <div
            id="main-scroll-area"
            className="flex-1 min-w-0 overflow-y-auto h-[calc(100vh-3.5rem)]"
            style={{ overflowAnchor: 'none' }}
          >
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/curriculum" element={<CurriculumPage />} />
              <Route path="/part/:partId" element={<PartPage />} />
              <Route path="/chapter/:chapterId" element={<ChapterPage />} />
              <Route path="/lesson/:lessonId" element={<LessonView readingMode={readingMode} />} />
              <Route path="/glossary" element={<GlossaryPage />} />
              <Route path="/bookmarks" element={<BookmarksPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/course" element={<CourseHubPage />} />
              <Route path="/syllabus" element={<Navigate to="/course" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>

        {/* Command Palette Search Modal */}
        <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      </div>
    </BrowserRouter>
  );
};
