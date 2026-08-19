import React, { useState } from 'react';
import { Quiz } from '../types/curriculum';
import { saveQuizScore } from '../utils/storage';
import { CheckCircle2, XCircle, HelpCircle, Award } from 'lucide-react';
import { parseInlineText } from '../utils/textParser';

interface QuizComponentProps {
  quiz: Quiz;
}

export const QuizComponent: React.FC<QuizComponentProps> = ({ quiz }) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [scorePercentage, setScorePercentage] = useState<number | null>(null);

  const handleSelectOption = (questionId: string, optionId: string) => {
    if (submitted) return;
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = () => {
    let correctCount = 0;
    quiz.questions.forEach(q => {
      if (selectedAnswers[q.id] === q.correctOptionId) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / quiz.questions.length) * 100);
    setScorePercentage(score);
    setSubmitted(true);
    saveQuizScore(quiz.chapterId, score);
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setSubmitted(false);
    setScorePercentage(null);
  };

  return (
    <div className="my-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-brand-500" />
            <span>{parseInlineText(quiz.title)}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Test your internal conceptual model and debugging intuition.
          </p>
        </div>

        {submitted && scorePercentage !== null && (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 font-semibold text-sm">
            <Award className="w-4 h-4 text-brand-500" />
            <span>Score: {scorePercentage}%</span>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {quiz.questions.map((q, idx) => {
          const selected = selectedAnswers[q.id];
          const isCorrect = selected === q.correctOptionId;

          return (
            <div key={q.id} className="p-4 rounded-lg bg-slate-50/50 dark:bg-slate-850/50 border border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug mb-3">
                    {parseInlineText(q.question)}
                  </h4>

                  <div className="space-y-2">
                    {q.options.map(opt => {
                      let optionStyle = 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300';

                      if (selected === opt.id) {
                        optionStyle = 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 text-brand-900 dark:text-brand-200 font-medium';
                      }

                      if (submitted) {
                        if (opt.id === q.correctOptionId) {
                          optionStyle = 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-medium';
                        } else if (selected === opt.id) {
                          optionStyle = 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200';
                        }
                      }

                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleSelectOption(q.id, opt.id)}
                          disabled={submitted}
                          className={`w-full text-left p-3 rounded-md border text-xs transition-all flex items-center justify-between ${optionStyle}`}
                        >
                          <span>{parseInlineText(opt.text)}</span>
                          {submitted && opt.id === q.correctOptionId && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          )}
                          {submitted && selected === opt.id && opt.id !== q.correctOptionId && (
                            <XCircle className="w-4 h-4 text-rose-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {submitted && (
                    <div className={`mt-4 p-3 rounded-md text-xs leading-relaxed border ${isCorrect ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' : 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'}`}>
                      <p className="font-semibold mb-1">{isCorrect ? '✓ Correct Explanation' : '✗ Incorrect'}</p>
                      <p>{parseInlineText(q.explanation)}</p>
                      {q.deepDiveExplanation && (
                        <p className="mt-2 text-[11px] opacity-90 border-t border-current/20 pt-2">{parseInlineText(q.deepDiveExplanation)}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-end space-x-3">
        {submitted ? (
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Retake Quiz
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={Object.keys(selectedAnswers).length < quiz.questions.length}
            className="px-5 py-2 rounded-md bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  );
};
