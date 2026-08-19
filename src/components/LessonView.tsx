import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  CheckCircle2,
  FileText,
  Clock,
  Tag,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  BookOpen,
  Sparkles,
  Keyboard,
  Code
} from 'lucide-react';
import curriculumData from '../../data/curriculum.json';
import { getLessonContent, getChapterQuiz } from '../utils/contentLoader';
import {
  getStoredProgress,
  toggleLessonCompleted,
  toggleBookmark,
  updateLastVisited
} from '../utils/storage';
import { QuizComponent } from './QuizComponent';
import { Toc } from './Toc';
import { NotesDrawer } from './NotesDrawer';
import { MathRenderer } from './MathRenderer';
import { MermaidRenderer } from './MermaidRenderer';
import { CodeBlock } from './CodeBlock';
import { AITutorDrawer } from './AITutorDrawer';
import { FloatingDock } from './FloatingDock';
import { ReadingProgressBar } from './ReadingProgressBar';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { LessonMeta, ReadingMode } from '../types/curriculum';
import { parseInlineText as parseInline } from '../utils/textParser';
import glossaryData from '../../data/glossary.json';

interface LessonViewProps {
  readingMode: ReadingMode;
}

export const LessonView: React.FC<LessonViewProps> = ({ readingMode }) => {
  const { lessonId = '1.1' } = useParams();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(getStoredProgress());
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isAITutorOpen, setIsAITutorOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  useEffect(() => {
    updateLastVisited(lessonId);
    setProgress(getStoredProgress());
  }, [lessonId]);

  // Find lesson in curriculum data
  let currentPart: any = null;
  let currentChapter: any = null;
  let currentLesson: LessonMeta | null = null;
  let allLessons: { lesson: LessonMeta; chapter: any; part: any }[] = [];

  curriculumData.parts.forEach(p => {
    p.chapters.forEach(c => {
      c.lessons.forEach(l => {
        const item = { lesson: l as LessonMeta, chapter: c, part: p };
        allLessons.push(item);
        if (l.id === lessonId) {
          currentLesson = l as LessonMeta;
          currentChapter = c;
          currentPart = p;
        }
      });
    });
  });

  if (!currentLesson || !currentChapter || !currentPart) {
    return (
      <div className="p-12 text-center text-slate-500">
        <h2 className="text-xl font-bold mb-2">Lesson Not Found</h2>
        <p className="text-xs mb-4">Lesson ID "{lessonId}" could not be located in the curriculum.</p>
        <Link to="/curriculum" className="text-brand-600 underline font-semibold text-xs">
          Return to Curriculum
        </Link>
      </div>
    );
  }

  const activeLesson: LessonMeta = currentLesson;
  const activeChapter = currentChapter;
  const activePart = currentPart;

  // Calculate prev and next lessons automatically
  const currentIndex = allLessons.findIndex(item => item.lesson.id === lessonId);
  const prevItem = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextItem = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const parsedContent = getLessonContent(lessonId);
  const quizData = getChapterQuiz(activeChapter.id);

  const isCompleted = progress.completedLessons.includes(lessonId);
  const isBookmarked = progress.bookmarkedLessons.includes(lessonId);

  const handleToggleComplete = () => {
    const updated = toggleLessonCompleted(lessonId);
    setProgress(updated);
  };

  const handleToggleBookmark = () => {
    const updated = toggleBookmark(lessonId);
    setProgress(updated);
  };

  // ---------- Block Markdown Renderer ----------
  const renderMarkdownBody = (rawBody: string) => {
    const lines = rawBody.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Fenced code block or Terminal Output block
      if (line.trim().startsWith('```')) {
        const lang = line.trim().replace(/^`+/, '').trim() || 'text';
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        const codeText = codeLines.join('\n');
        if (lang === 'mermaid') {
          elements.push(<MermaidRenderer key={`mermaid-${i}`} chart={codeText} />);
        } else if (lang === 'output' || lang === 'console' || (lang === 'text' && codeText.startsWith('Output:'))) {
          elements.push(
            <div key={`out-${i}`} className="terminal-output">
              <div className="terminal-output-header">
                <span>Sample Program Output</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">stdout</span>
              </div>
              <pre className="terminal-output-body">{codeText.replace(/^Output:\s*\n?/, '')}</pre>
            </div>
          );
        } else {
          elements.push(<CodeBlock key={`code-${i}`} language={lang} code={codeText} />);
        }
        i++;
        continue;
      }

      // LearnCpp Signature Callout Box System
      if (line.startsWith('> [!') || line.startsWith('> [') || /^#{1,4}\s*\[!/.test(line)) {
        const typeMatch = line.match(/(?:>|#{1,4})\s*\[!(BEST-PRACTICE|BEST_PRACTICE|BEST PRACTICE|WARNING|CAUTION|KEY-INSIGHT|KEY_INSIGHT|KEY INSIGHT|KEY-TAKEAWAY|ADVANCED|FOR-ADVANCED-READERS|ASIDE|QA|QUESTION|FAQ|AUTHORS-NOTE|AUTHOR'S NOTE|AUTHOR'S-NOTE|RELATED-CONTENT|RULE|NOTE|TIP|TRAP|AI|IMPORTANT)\]/i);
        const rawType = typeMatch ? typeMatch[1].toUpperCase().replace(/[_\s']/g, '-') : 'NOTE';
        const calloutLines: string[] = [];
        const isHeaderStyle = /^#{1,4}\s*\[!/.test(line);
        i++;

        if (isHeaderStyle) {
          while (i < lines.length && !lines[i].startsWith('#') && !lines[i].startsWith('```') && !lines[i].startsWith('>')) {
            if (lines[i].trim()) calloutLines.push(lines[i]);
            i++;
          }
        } else {
          while (i < lines.length && lines[i].startsWith('>')) {
            calloutLines.push(lines[i].replace(/^>\s?/, ''));
            i++;
          }
        }

        let calloutClass = 'callout-note';
        let title = 'NOTE';
        let icon = <Lightbulb className="w-3.5 h-3.5 text-blue-500" />;

        if (rawType === 'BEST-PRACTICE' || rawType === 'TIP') {
          calloutClass = 'callout-best-practice';
          title = 'BEST PRACTICE';
          icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
        } else if (rawType === 'WARNING' || rawType === 'CAUTION' || rawType === 'TRAP') {
          calloutClass = 'callout-warning';
          title = 'WARNING';
          icon = <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />;
        } else if (rawType === 'KEY-INSIGHT' || rawType === 'KEY-TAKEAWAY') {
          calloutClass = 'callout-key-insight';
          title = 'KEY INSIGHT';
          icon = <Sparkles className="w-3.5 h-3.5 text-cyan-500" />;
        } else if (rawType === 'ADVANCED' || rawType === 'FOR-ADVANCED-READERS' || rawType === 'ASIDE') {
          calloutClass = 'callout-advanced';
          title = 'FOR ADVANCED READERS';
          icon = <Code className="w-3.5 h-3.5 text-slate-400" />;
        } else if (rawType === 'QA' || rawType === 'QUESTION' || rawType === 'FAQ') {
          calloutClass = 'callout-qa';
          title = 'Q&A';
          icon = <BookOpen className="w-3.5 h-3.5 text-indigo-500" />;
        } else if (rawType.includes('AUTHOR')) {
          calloutClass = 'callout-authors-note';
          title = "AUTHOR'S NOTE";
          icon = <Lightbulb className="w-3.5 h-3.5 text-amber-500" />;
        } else if (rawType === 'RELATED-CONTENT') {
          calloutClass = 'callout-related-content';
          title = 'RELATED CONTENT';
          icon = <BookOpen className="w-3.5 h-3.5 text-blue-500" />;
        } else if (rawType === 'RULE') {
          calloutClass = 'callout-best-practice';
          title = 'LANGUAGE RULE';
          icon = <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />;
        } else if (rawType === 'AI') {
          calloutClass = 'callout-ai';
          title = 'AI CONNECTION';
          icon = <Sparkles className="w-3.5 h-3.5 text-indigo-400" />;
        }

        elements.push(
          <div key={`callout-${i}`} className={`callout ${calloutClass}`}>
            <div className="font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
              {icon}
              <span>{title}</span>
            </div>
            <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
              {calloutLines.map((cl, ci) => (cl.trim() ? <p key={ci}>{parseInline(cl)}</p> : null))}
            </div>
          </div>
        );
        continue;
      }

      // Interactive LearnCpp Quiz Solution (<details><summary>Show Solution</summary>...</details>)
      if (line.trim().startsWith('<details>') || line.trim().startsWith('<details')) {
        const detailLines: string[] = [];
        let summaryText = 'Show Solution';
        i++;
        while (i < lines.length && !lines[i].trim().includes('</details>')) {
          const dl = lines[i];
          const sumMatch = dl.match(/<summary>(.*?)<\/summary>/);
          if (sumMatch) {
            summaryText = sumMatch[1];
          } else {
            detailLines.push(dl);
          }
          i++;
        }
        elements.push(
          <details key={`details-${i}`} className="wpsolution-container group my-3">
            <summary className="wpsolution-summary">
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>{summaryText}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform duration-200" />
            </summary>
            <div className="wpsolution-content space-y-2">
              {detailLines.map((dl, di) => (dl.trim() ? <p key={di}>{parseInline(dl)}</p> : null))}
            </div>
          </details>
        );
        i++;
        continue;
      }

      // Block LaTeX Math: $$...$$ or \[...\]
      if (line.trim().startsWith('$$') || line.trim().startsWith('\\[')) {
        const isBracket = line.trim().startsWith('\\[');
        const endMarker = isBracket ? '\\]' : '$$';
        const mathLines: string[] = [];

        if (line.trim().endsWith(endMarker) && line.trim().length > 4) {
          mathLines.push(line.trim().slice(2, -2).trim());
        } else {
          if (line.trim().length > 2) {
            mathLines.push(line.trim().slice(2).trim());
          }
          i++;
          while (i < lines.length && !lines[i].trim().endsWith(endMarker)) {
            mathLines.push(lines[i]);
            i++;
          }
          if (i < lines.length && lines[i].trim().endsWith(endMarker)) {
            const lastLine = lines[i].trim();
            if (lastLine !== endMarker) {
              mathLines.push(lastLine.slice(0, -endMarker.length).trim());
            }
          }
        }

        elements.push(
          <div key={`math-${i}`} className="my-6 p-4 bg-slate-100/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 text-center overflow-x-auto shadow-sm">
            <MathRenderer math={mathLines.join('\n')} block />
          </div>
        );
        i++;
        continue;
      }

      // Headers (h1 to h4)
      if (line.startsWith('# ')) {
        const titleText = line.replace(/^#\s+/, '');
        const anchorId = titleText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        elements.push(
          <h1 key={`h1-${i}`} id={anchorId} className="group scroll-mt-20 flex items-center gap-2">
            <span>{parseInline(titleText)}</span>
          </h1>
        );
        i++;
        continue;
      }
      if (line.startsWith('## ')) {
        const titleText = line.replace(/^##\s+/, '');
        const anchorId = titleText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        elements.push(
          <h2 key={`h2-${i}`} id={anchorId} className="group scroll-mt-20 flex items-center gap-2">
            <span>{parseInline(titleText)}</span>
          </h2>
        );
        i++;
        continue;
      }
      if (line.startsWith('### ')) {
        const titleText = line.replace(/^###\s+/, '');
        elements.push(<h3 key={`h3-${i}`} className="scroll-mt-20">{parseInline(titleText)}</h3>);
        i++;
        continue;
      }

      // Markdown Tables
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }
        if (tableLines.length >= 2) {
          const headerCells = tableLines[0].slice(1, -1).split('|').map(c => c.trim());
          const bodyRows = tableLines.slice(2).map(row => row.slice(1, -1).split('|').map(c => c.trim()));
          elements.push(
            <div key={`table-${i}`} className="my-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <table className="min-w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 uppercase font-semibold">
                  <tr>
                    {headerCells.map((hc, idx) => (
                      <th key={idx} className="px-4 py-3">{parseInline(hc)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950/60">
                  {bodyRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-4 py-2.5 text-slate-700 dark:text-slate-300 leading-normal">{parseInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        continue;
      }

      // Lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const listItems: string[] = [];
        while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
          listItems.push(lines[i].trim().replace(/^[-*]\s+/, ''));
          i++;
        }
        elements.push(
          <ul key={`ul-${i}`} className="list-disc list-inside space-y-1.5 my-3 text-slate-700 dark:text-slate-300 text-sm">
            {listItems.map((item, idx) => <li key={idx}>{parseInline(item)}</li>)}
          </ul>
        );
        continue;
      }

      // Numbered lists
      if (/^\d+\.\s+/.test(line.trim())) {
        const listItems: string[] = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
          listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
          i++;
        }
        elements.push(
          <ol key={`ol-${i}`} className="list-decimal list-inside space-y-1.5 my-3 text-slate-700 dark:text-slate-300 text-sm">
            {listItems.map((item, idx) => <li key={idx}>{parseInline(item)}</li>)}
          </ol>
        );
        continue;
      }

      // Horizontal rules
      if (line.trim() === '---' || line.trim() === '***') {
        elements.push(<hr key={`hr-${i}`} className="my-8 border-slate-200 dark:border-slate-800" />);
        i++;
        continue;
      }

      // Normal paragraph
      if (line.trim()) {
        elements.push(<p key={`p-${i}`} className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4 text-sm">{parseInline(line)}</p>);
      }
      i++;
    }

    return elements;
  };

  return (
    <div className="min-h-full flex justify-center py-8 px-4 sm:px-6 lg:px-8 relative">
      {/* Top Reading Progress Bar */}
      <ReadingProgressBar />

      {/* Main Reading Canvas */}
      <main className={`w-full max-w-4xl transition-all duration-300 ${readingMode === 'reference' ? 'max-w-3xl' : ''}`}>
        {/* Lesson Header Metadata Card */}
        <div className="mb-8 p-6 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          {/* Breadcrumb Navigation */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-4">
            <Link to={`/part/${activePart.id}`} className="hover:text-brand-600 transition font-medium">
              Part {activePart.number}: {activePart.title}
            </Link>
            <span>/</span>
            <Link to={`/chapter/${activeChapter.id}`} className="hover:text-brand-600 transition font-medium">
              Ch {activeChapter.number}: {activeChapter.title}
            </Link>
            <span>/</span>
            <span className="text-brand-600 dark:text-brand-400 font-bold">Lesson {activeLesson.id}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                Lesson {activeLesson.id}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                activeLesson.difficulty === 'beginner'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                  : activeLesson.difficulty === 'advanced'
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
              }`}>
                {activeLesson.difficulty}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>{activeLesson.estimatedMinutes || 20} min read</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsShortcutsOpen(true)}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-200 transition"
                title="Keyboard Shortcuts (?)"
              >
                <Keyboard className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsAITutorOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-sm transition"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>AI Tutor</span>
              </button>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight leading-tight">
            {activeLesson.title}
          </h1>

          <div className="flex flex-wrap gap-1.5 mt-4">
            {activeLesson.tags.map((tag: string) => (
              <span key={tag} className="flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                <Tag className="w-3 h-3" />
                <span>{tag}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Lesson Markdown Content */}
        <article className="prose-deepdive mb-16">
          {parsedContent ? (
            renderMarkdownBody(parsedContent.contentHtml)
          ) : (
            <p className="text-slate-500">Loading lesson content...</p>
          )}
        </article>

        {/* Interactive Quiz Component if available */}
        {quizData && (
          <section className="my-12">
            <QuizComponent quiz={quizData} />
          </section>
        )}

        {/* Next / Prev Navigation footer */}
        <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 pb-20">
          {prevItem ? (
            <Link
              to={`/lesson/${prevItem.lesson.id}`}
              className="flex items-center space-x-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition text-left group max-w-[48%]"
            >
              <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-brand-500 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Previous (k)</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 line-clamp-1">
                  {prevItem.lesson.id} {prevItem.lesson.title}
                </span>
              </div>
            </Link>
          ) : <div />}

          {nextItem ? (
            <Link
              to={`/lesson/${nextItem.lesson.id}`}
              className="flex items-center justify-end space-x-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition text-right group max-w-[48%]"
            >
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Next (j)</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 line-clamp-1">
                  {nextItem.lesson.id} {nextItem.lesson.title}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand-500 flex-shrink-0" />
            </Link>
          ) : <div />}
        </div>
      </main>

      {/* Right Table of Contents Sidebar */}
      {readingMode !== 'learning' && parsedContent && (
        <Toc headings={parsedContent.headings} />
      )}

      {/* Floating Action Dock */}
      <FloatingDock
        lessonId={lessonId}
        isCompleted={isCompleted}
        isBookmarked={isBookmarked}
        onToggleComplete={handleToggleComplete}
        onToggleBookmark={handleToggleBookmark}
        onOpenAITutor={() => setIsAITutorOpen(true)}
        onOpenNotes={() => setIsNotesOpen(true)}
        prevLesson={prevItem ? { id: prevItem.lesson.id, title: prevItem.lesson.title } : null}
        nextLesson={nextItem ? { id: nextItem.lesson.id, title: nextItem.lesson.title } : null}
      />

      {/* AI Tutor Drawer */}
      <AITutorDrawer
        isOpen={isAITutorOpen}
        onClose={() => setIsAITutorOpen(false)}
        lessonId={lessonId}
        lessonTitle={activeLesson.title}
        chapterTitle={currentChapter?.title || ''}
        partTitle={currentPart?.title || ''}
        lessonContent={parsedContent?.contentHtml || ''}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Slide-over Notes Drawer */}
      <NotesDrawer
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        lessonId={lessonId}
        lessonTitle={activeLesson.title}
      />
    </div>
  );
};
