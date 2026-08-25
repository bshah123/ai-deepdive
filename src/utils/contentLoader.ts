import { parseFrontmatter, extractHeadings, ParsedMarkdown } from './markdownParser';

// Use Vite's import.meta.glob to load all markdown content files at build/runtime
const markdownModules = import.meta.glob('/content/**/*.md', { query: '?raw', import: 'default', eager: true });
const quizModules = import.meta.glob('/content/**/*.json', { eager: true });

export function getLessonContent(lessonId: string): ParsedMarkdown | null {
  const targetId = String(lessonId).trim();

  // Search through loaded markdown modules
  for (const path in markdownModules) {
    const rawVal = markdownModules[path];
    const rawText = typeof rawVal === 'string' ? rawVal : (rawVal as any)?.default || '';
    if (!rawText) continue;

    const { frontmatter, body } = parseFrontmatter(rawText);

    if (String(frontmatter.id).trim() === targetId) {
      const headings = extractHeadings(body);
      return {
        frontmatter,
        contentHtml: body,
        headings,
        rawContent: rawText
      };
    }
  }

  // Fallback: match by file path basename (e.g. ".../19.4-concentration-inequalities.md")
  for (const path in markdownModules) {
    const filename = path.split('/').pop() || '';
    if (filename.startsWith(`${targetId}-`) || filename.startsWith(`${targetId}.`)) {
      const rawVal = markdownModules[path];
      const rawText = typeof rawVal === 'string' ? rawVal : (rawVal as any)?.default || '';
      if (!rawText) continue;

      const { frontmatter, body } = parseFrontmatter(rawText);
      const headings = extractHeadings(body);
      return {
        frontmatter: { ...frontmatter, id: targetId },
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
