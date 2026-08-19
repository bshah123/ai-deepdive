export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'research';
export type ContentStatus = 'draft' | 'review' | 'published' | 'under-construction';

export interface LessonMeta {
  id: string; // e.g. "2.4"
  partId: string; // e.g. "part-01"
  chapterId: string; // e.g. "chapter-02"
  title: string;
  slug: string;
  file: string; // filename in chapter dir
  difficulty: Difficulty;
  estimatedMinutes: number;
  prerequisites?: string[]; // array of lesson IDs
  tags: string[];
  status: ContentStatus;
  contentShape?: string;
  openingType?: string;
}

export interface Chapter {
  id: string; // e.g. "chapter-02"
  number: string; // e.g. "2"
  title: string;
  slug: string;
  description: string;
  estimatedHours: string;
  difficulty: Difficulty;
  prerequisites: string[]; // chapter IDs or names
  lessons: LessonMeta[];
  hasSummary?: boolean;
  hasQuiz?: boolean;
  hasProject?: boolean;
}

export interface Part {
  id: string; // e.g. "part-01"
  number: number;
  title: string;
  subtitle: string;
  description: string;
  slug: string;
  chapters: Chapter[];
}

export interface Curriculum {
  parts: Part[];
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
  deepDiveExplanation?: string;
}

export interface Quiz {
  chapterId: string;
  title: string;
  questions: QuizQuestion[];
}

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  simpleExplanation: string;
  technicalExplanation: string;
  curriculumReferences: {
    lessonId: string;
    lessonTitle: string;
  }[];
}

export interface Exercise {
  id: string;
  chapterId: string;
  title: string;
  difficulty: Difficulty;
  description: string;
  solutionCode?: string;
}

export interface ReferenceItem {
  id: string;
  chapterId: string;
  title: string;
  url: string;
  type: 'documentation' | 'paper' | 'specification' | 'resource';
}

export interface UserProgress {
  completedLessons: string[]; // lesson IDs
  completedQuizzes: Record<string, number>; // chapterId -> score percentage
  bookmarkedLessons: string[]; // lesson IDs
  completedChecks: Record<string, string[]>; // chapterId -> check IDs
  notes: Record<string, string>; // lessonId -> note text
  lastVisitedLessonId?: string;
}

export type ReadingMode = 'standard' | 'learning' | 'reference';
