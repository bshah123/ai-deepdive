import { UserProgress, ReadingMode } from '../types/curriculum';

const STORAGE_KEY = 'ai_deepdive_progress_v1';
const THEME_KEY = 'ai_deepdive_theme';
const MODE_KEY = 'ai_deepdive_reading_mode';

const defaultProgress: UserProgress = {
  completedLessons: [],
  completedQuizzes: {},
  bookmarkedLessons: [],
  completedChecks: {},
  notes: {},
  lastVisitedLessonId: '1.1'
};

export function getStoredProgress(): UserProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress;
    return { ...defaultProgress, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Failed to load user progress:', err);
    return defaultProgress;
  }
}

export function saveStoredProgress(progress: UserProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.error('Failed to save user progress:', err);
  }
}

export function toggleLessonCompleted(lessonId: string): UserProgress {
  const current = getStoredProgress();
  const exists = current.completedLessons.includes(lessonId);
  const updated = exists
    ? current.completedLessons.filter(id => id !== lessonId)
    : [...current.completedLessons, lessonId];

  const newProgress = { ...current, completedLessons: updated };
  saveStoredProgress(newProgress);
  return newProgress;
}

export function toggleBookmark(lessonId: string): UserProgress {
  const current = getStoredProgress();
  const exists = current.bookmarkedLessons.includes(lessonId);
  const updated = exists
    ? current.bookmarkedLessons.filter(id => id !== lessonId)
    : [...current.bookmarkedLessons, lessonId];

  const newProgress = { ...current, bookmarkedLessons: updated };
  saveStoredProgress(newProgress);
  return newProgress;
}

export function saveQuizScore(chapterId: string, percentage: number): UserProgress {
  const current = getStoredProgress();
  const newProgress = {
    ...current,
    completedQuizzes: { ...current.completedQuizzes, [chapterId]: percentage }
  };
  saveStoredProgress(newProgress);
  return newProgress;
}

export function saveLessonNote(lessonId: string, noteText: string): UserProgress {
  const current = getStoredProgress();
  const newProgress = {
    ...current,
    notes: { ...current.notes, [lessonId]: noteText }
  };
  saveStoredProgress(newProgress);
  return newProgress;
}

export function updateLastVisited(lessonId: string): void {
  const current = getStoredProgress();
  saveStoredProgress({ ...current, lastVisitedLessonId: lessonId });
}

export function getStoredTheme(): 'light' | 'dark' | 'system' {
  return (localStorage.getItem(THEME_KEY) as any) || 'system';
}

export function setStoredTheme(theme: 'light' | 'dark' | 'system'): void {
  localStorage.setItem(THEME_KEY, theme);
}

export function getStoredReadingMode(): ReadingMode {
  return (localStorage.getItem(MODE_KEY) as ReadingMode) || 'standard';
}

export function setStoredReadingMode(mode: ReadingMode): void {
  localStorage.setItem(MODE_KEY, mode);
}
