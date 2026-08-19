import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search, ExternalLink, Tag } from 'lucide-react';
import glossaryData from '../../data/glossary.json';
import { parseInlineText } from '../utils/textParser';

export const GlossaryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTerms = glossaryData.filter((t: any) =>
    t.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="py-8 px-4 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-brand-500" />
          Global AI Systems Glossary
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Technical definitions, mental models, and curriculum cross-references for core Python, ML, Transformer, IR, RAG, and AI terms.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter glossary terms (e.g. PyObject, attention, embedding, HNSW)..."
          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
        />
      </div>

      {/* Terms Grid */}
      <div className="space-y-4">
        {filteredTerms.map((t: any) => (
          <div
            key={t.id}
            id={t.id}
            className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 text-brand-600 dark:text-brand-400">
                {t.term}
              </h3>
            </div>

            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
              {parseInlineText(t.definition)}
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-850 text-xs space-y-1">
              <span className="font-bold text-slate-500 uppercase text-[10px] block">Intuition & Mental Model:</span>
              <div className="text-slate-700 dark:text-slate-300 leading-relaxed">{parseInlineText(t.simpleExplanation)}</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-850 text-xs space-y-1">
              <span className="font-bold text-slate-500 uppercase text-[10px] block">Technical Internals:</span>
              <div className="text-slate-700 dark:text-slate-300 font-mono text-[11px] leading-relaxed">{parseInlineText(t.technicalExplanation)}</div>
            </div>

            {t.curriculumReferences && t.curriculumReferences.length > 0 && (
              <div className="pt-2 flex items-center space-x-2 text-xs">
                <span className="text-slate-400 text-[11px]">Appears in:</span>
                {t.curriculumReferences.map((ref: any) => (
                  <Link
                    key={ref.lessonId}
                    to={`/lesson/${ref.lessonId}`}
                    className="flex items-center space-x-1 text-brand-600 dark:text-brand-400 hover:underline font-medium text-[11px]"
                  >
                    <span>Lesson {ref.lessonId}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
