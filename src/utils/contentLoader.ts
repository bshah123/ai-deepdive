import { parseFrontmatter, extractHeadings, ParsedMarkdown } from './markdownParser';

// Use Vite's import.meta.glob to load all markdown content files at build/runtime
const markdownModules = import.meta.glob('/content/**/*.md', { as: 'raw', eager: true });
const quizModules = import.meta.glob('/content/**/*.json', { eager: true });

export function getLessonContent(lessonId: string): ParsedMarkdown | null {
  // Search through loaded markdown modules
  for (const path in markdownModules) {
    const rawText = markdownModules[path] as string;
    const { frontmatter, body } = parseFrontmatter(rawText);

    if (frontmatter.id === lessonId) {
      const headings = extractHeadings(body);
      return {
        frontmatter,
        contentHtml: body,
        headings,
        rawContent: rawText
      };
    }
  }
  return null;
}

function normalizeQuiz(raw: any): any {
  if (!raw || !raw.questions) return raw;
  // If questions already use {id, text} options format, return as-is
  if (raw.questions[0]?.options?.[0]?.id) return raw;

  return {
    ...raw,
    questions: raw.questions.map((q: any) => {
      // Convert string[] options to QuizOption[]
      const options = (q.options || []).map((opt: string, idx: number) => ({
        id: `opt-${idx}`,
        text: opt,
      }));
      const correctOptionId =
        typeof q.correctIndex === 'number'
          ? `opt-${q.correctIndex}`
          : q.correctOptionId ?? 'opt-0';
      return {
        ...q,
        options,
        correctOptionId,
      };
    }),
  };
}

export function getChapterQuiz(chapterId: string): any | null {
  for (const path in quizModules) {
    if (path.includes(chapterId) && path.endsWith('quiz.json')) {
      const raw = (quizModules[path] as any).default || quizModules[path];
      return normalizeQuiz(raw);
    }
  }
  return null;
}
