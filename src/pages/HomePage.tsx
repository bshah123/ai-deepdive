import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Layers, Zap, Award, Compass, Code, Terminal } from 'lucide-react';
import curriculumData from '../../data/curriculum.json';
import { getStoredProgress } from '../utils/storage';
import { ProgressTracker } from '../components/ProgressTracker';
import { Part } from '../types/curriculum';
import { parseInlineText } from '../utils/textParser';

export const HomePage: React.FC = () => {
  const progress = getStoredProgress();
  const lastLessonId = progress.lastVisitedLessonId || '1.1';

  // Find last visited lesson title
  let lastLessonTitle = 'Python Programs & Source Code';
  curriculumData.parts.forEach(p => {
    p.chapters.forEach(c => {
      c.lessons.forEach(l => {
        if (l.id === lastLessonId) lastLessonTitle = l.title;
      });
    });
  });

  return (
    <div className="space-y-16 py-8 px-4 max-w-6xl mx-auto">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-6 pb-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 text-xs font-medium">
          <Zap className="w-3.5 h-3.5 text-brand-500 fill-current" />
          <span>Local-First • Self-Hosted • 60-Chapter Courseware</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-slate-50 tracking-tight leading-tight max-w-4xl mx-auto">
          Understand the systems behind <span className="text-brand-600 dark:text-brand-400">modern AI</span>.
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          From Python internals & PyObject memory layouts up to Transformers, HNSW Vector Search, RAG Pipelines, Autonomous Agents, and Production Serving.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            to={`/lesson/${lastLessonId}`}
            className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
          >
            <span>Continue Learning ({lastLessonId})</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/curriculum"
            className="flex items-center space-x-2 px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <Layers className="w-4 h-4" />
            <span>Explore 60 Chapters</span>
          </Link>
        </div>
      </section>

      {/* Continue Learning Banner */}
      <section className="p-6 rounded-2xl border border-brand-200 dark:border-brand-900/60 bg-gradient-to-r from-brand-50/80 via-white to-brand-50/40 dark:from-brand-950/40 dark:via-slate-900 dark:to-brand-950/20 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            Current Progress Landmark
          </span>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Lesson {lastLessonId} — {parseInlineText(lastLessonTitle)}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pick up right where you left off in your last study session.
          </p>
        </div>

        <Link
          to={`/lesson/${lastLessonId}`}
          className="px-5 py-2.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-500 flex-shrink-0 transition-colors"
        >
          Resume Lesson →
        </Link>
      </section>

      {/* Progress Dashboard Overview */}
      <section>
        <ProgressTracker curriculumParts={curriculumData.parts as Part[]} progress={progress} />
      </section>

      {/* 10-Part Curriculum Roadmap Overview */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            10-Part Systems Roadmap
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Python → Scientific Python → ML & NLP → Transformers → IR → RAG → Frameworks → Agents → Production → Research
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {curriculumData.parts.map(part => (
            <Link
              key={part.id}
              to={`/part/${part.id}`}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-500/50 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                  Part {part.number}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {part.chapters.length} Chapters
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                {parseInlineText(part.title)}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {parseInlineText(part.description)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Educational Philosophy */}
      <section className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Compass className="w-5 h-5 text-brand-500" />
          The "From-Scratch First" Educational Philosophy
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          <div className="space-y-2">
            <div className="font-bold text-slate-900 dark:text-slate-200 flex items-center space-x-1.5">
              <Code className="w-4 h-4 text-emerald-500" />
              <span>1. Build Before Using</span>
            </div>
            <p>
              Build a hash table before using `dict`. Implement micrograd before PyTorch autograd. Write self-attention matrix math before Hugging Face.
            </p>
          </div>

          <div className="space-y-2">
            <div className="font-bold text-slate-900 dark:text-slate-200 flex items-center space-x-1.5">
              <Terminal className="w-4 h-4 text-amber-500" />
              <span>2. Mental Models & Memory</span>
            </div>
            <p>
              Understand pointer addresses (`id()`), CPython `PyObject` headers, reference counting, and contiguous memory strides under the abstraction.
            </p>
          </div>

          <div className="space-y-2">
            <div className="font-bold text-slate-900 dark:text-slate-200 flex items-center space-x-1.5">
              <Award className="w-4 h-4 text-purple-500" />
              <span>3. Debugging Intuition</span>
            </div>
            <p>
              Master memory leak detection (`tracemalloc`), bytecode inspection (`dis`), vector search complexity, and LLM inference profiling.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
