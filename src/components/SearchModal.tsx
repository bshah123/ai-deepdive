import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, BookOpen, Tag, CornerDownLeft } from 'lucide-react';
import { performSearch, SearchResultItem } from '../utils/search';
import { parseInlineText } from '../utils/textParser';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? onClose() : null;
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (query.trim()) {
      setResults(performSearch(query));
    } else {
      setResults([]);
    }
  }, [query]);

  if (!isOpen) return null;

  const handleSelect = (url: string) => {
    navigate(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search input bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lessons, concepts, glossary terms, or tags (e.g. reference counting)..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="ml-2 text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">
            Esc
          </button>
        </div>

        {/* Search results body */}
        <div className="p-2 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800/50">
          {results.length > 0 ? (
            results.map((res) => (
              <button
                key={res.id}
                onClick={() => handleSelect(res.url)}
                className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg transition-colors flex items-start justify-between group"
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5 p-1.5 rounded bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
                    {res.type === 'lesson' ? <BookOpen className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                      {parseInlineText(res.title)}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {parseInlineText(res.subtitle)}
                    </p>
                  </div>
                </div>
                <CornerDownLeft className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 flex-shrink-0 ml-3" />
              </button>
            ))
          ) : query ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No matching lessons or terms found for "{query}".
            </div>
          ) : (
            <div className="py-8 px-4 text-xs text-slate-400 space-y-2">
              <p className="font-semibold text-slate-500 dark:text-slate-400">Popular Search Terms:</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {['reference counting', 'is vs ==', 'mutability', 'attention', 'embedding', 'rag', 'autograd', 'hnsw', 'kv cache'].map(term => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
