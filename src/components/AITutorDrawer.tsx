import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Bot, User, CornerDownLeft, Loader2, Copy, Check, Lightbulb, Zap, HelpCircle, Bug, Terminal, Play, RotateCcw } from 'lucide-react';
import { MathRenderer } from './MathRenderer';
import { runPythonCode, PyExecutionResult } from '../utils/pyodideRunner';

interface AITutorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lessonTitle: string;
  lessonId: string;
  chapterTitle?: string;
  partTitle?: string;
  lessonContent?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
}

const OLLAMA_KEY = import.meta.env.VITE_OLLAMA_API_KEY || localStorage.getItem('ollama_api_key') || '';
const MISTRAL_KEY = import.meta.env.VITE_MISTRAL_API_KEY || localStorage.getItem('mistral_api_key') || '';

/**
 * Interactive Code Runner inside Chat
 */
const ChatCodeBlock: React.FC<{ lang: string; code: string }> = ({ lang, code }) => {
  const isPython = lang.toLowerCase() === 'python' || lang.toLowerCase() === 'py';
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<PyExecutionResult | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setResult(null);

    if (isPython) {
      const res = await runPythonCode(code);
      setResult(res);
    } else {
      const t0 = performance.now();
      const logs: string[] = [];
      try {
        const fn = new Function('console', code);
        fn({ log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')) });
        setResult({
          stdout: logs.join('\n') || 'Execution complete.',
          stderr: '',
          executionTimeMs: Math.round((performance.now() - t0) * 10) / 10,
          success: true,
          engine: 'WASM (Python 3.12)'
        });
      } catch (err: any) {
        setResult({
          stdout: logs.join('\n'),
          stderr: err.message,
          executionTimeMs: Math.round((performance.now() - t0) * 10) / 10,
          success: false,
          engine: 'WASM (Python 3.12)',
          error: err.message
        });
      }
    }
    setIsRunning(false);
  };

  return (
    <div className="my-2.5 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-md">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[10px] text-slate-400">
        <span className="flex items-center gap-1.5 font-mono text-indigo-300">
          <Terminal className="w-3 h-3 text-indigo-400" />
          {lang}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition"
            title="Copy snippet"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          {isPython && (
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-[10px] transition disabled:opacity-40"
              title="Run in Pyodide Python 3.12"
            >
              {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-2.5 h-2.5 fill-current" />}
              <span>{isRunning ? 'Running...' : 'Run'}</span>
            </button>
          )}
        </div>
      </div>
      <pre className="p-3 text-[11px] font-mono text-slate-200 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>

      {/* Terminal Output */}
      {result && (
        <div className="border-t border-slate-800/80 bg-slate-900/80 p-2.5 text-[11px] font-mono">
          <div className="flex items-center justify-between text-[9px] text-slate-400 mb-1 border-b border-slate-800 pb-1">
            <span className={result.success ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
              {result.success ? '✓ Return code 0' : '✕ Traceback'}
            </span>
            <span>{result.executionTimeMs}ms (Pyodide WASM)</span>
          </div>
          {result.stdout && <pre className="text-emerald-300 whitespace-pre-wrap">{result.stdout}</pre>}
          {result.stderr && <pre className="text-rose-400 whitespace-pre-wrap">{result.stderr}</pre>}
        </div>
      )}
    </div>
  );
};

/**
 * Universal Chat Markdown & LaTeX Renderer
 * Supports: $inline$, \(inline\), $$block$$, \[block\], code blocks, lists, nested bullets, tables, and hr dividers.
 */
const ChatMarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const parseInline = (text: string): React.ReactNode[] => {
    const tokens: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // Inline LaTeX: \( ... \)
      const parenMathMatch = remaining.match(/^\\\(([\s\S]*?)\\\)/);
      if (parenMathMatch) {
        tokens.push(<MathRenderer key={`pm-${keyIdx++}`} math={parenMathMatch[1]} inline />);
        remaining = remaining.slice(parenMathMatch[0].length);
        continue;
      }

      // Inline LaTeX: $ ... $
      const dollarMathMatch = remaining.match(/^\$([^$\n]+)\$/);
      if (dollarMathMatch) {
        tokens.push(<MathRenderer key={`dm-${keyIdx++}`} math={dollarMathMatch[1]} inline />);
        remaining = remaining.slice(dollarMathMatch[0].length);
        continue;
      }

      // Inline code: `...`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        tokens.push(
          <code key={`c-${keyIdx++}`} className="px-1.5 py-0.5 rounded bg-slate-900/90 text-amber-300 border border-slate-700/60 font-mono text-[11px]">
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Bold: **...**
      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
      if (boldMatch) {
        tokens.push(<strong key={`b-${keyIdx++}`} className="font-semibold text-white">{parseInline(boldMatch[1])}</strong>);
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Italic: *...*
      const italicMatch = remaining.match(/^\*([^*]+)\*/);
      if (italicMatch) {
        tokens.push(<em key={`i-${keyIdx++}`} className="italic text-slate-300">{parseInline(italicMatch[1])}</em>);
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Next special symbol
      const nextSpecial = remaining.search(/[\$`\*]|\\\(|\\\[/);
      if (nextSpecial === -1) {
        tokens.push(remaining);
        break;
      } else if (nextSpecial === 0) {
        tokens.push(remaining[0]);
        remaining = remaining.slice(1);
      } else {
        tokens.push(remaining.slice(0, nextSpecial));
        remaining = remaining.slice(nextSpecial);
      }
    }

    return tokens;
  };

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      i++;
      continue;
    }

    // Horizontal Rule: --- or ***
    if (line === '---' || line === '***' || line === '___') {
      elements.push(<hr key={`hr-${i}`} className="border-slate-800/80 my-3" />);
      i++;
      continue;
    }

    // Code block ```lang ... ```
    if (line.startsWith('```')) {
      const lang = line.replace(/^```/, '').trim() || 'python';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      const codeText = codeLines.join('\n');
      elements.push(<ChatCodeBlock key={`cb-${i}`} lang={lang} code={codeText} />);
      i++;
      continue;
    }

    // Block LaTeX Math: \[ ... \] or $$ ... $$
    if (line.startsWith('\\[') || line.startsWith('$$')) {
      const isBracket = line.startsWith('\\[');
      const mathLines: string[] = [];
      const endMarker = isBracket ? '\\]' : '$$';

      if (line.endsWith(endMarker) && line.length > 4) {
        mathLines.push(line.slice(2, -2).trim());
      } else {
        if (line.length > 2) {
          mathLines.push(line.slice(2).trim());
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
        <div key={`math-${i}`} className="my-2.5 p-3 bg-slate-950/80 rounded-xl border border-slate-800/90 text-center overflow-x-auto shadow-sm">
          <MathRenderer math={mathLines.join('\n')} block />
        </div>
      );
      i++;
      continue;
    }

    // Markdown Tables (| col | col |)
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const headerCells = tableLines[0].slice(1, -1).split('|').map(c => c.trim());
        const bodyRows = tableLines.slice(2).map(row => row.slice(1, -1).split('|').map(c => c.trim()));
        elements.push(
          <div key={`tbl-${i}`} className="my-2.5 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60 shadow-sm scrollbar-thin">
            <table className="min-w-full text-[11px] text-left">
              <thead className="bg-slate-900 border-b border-slate-800 text-indigo-300 font-semibold uppercase text-[9px] tracking-wider">
                <tr>
                  {headerCells.map((hc, idx) => (
                    <th key={idx} className="px-2.5 py-1.5 whitespace-nowrap">{parseInline(hc)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-900/40">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-2.5 py-1.5 text-slate-300 leading-normal">{parseInline(cell)}</td>
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

    // Numbered step (e.g. 1. **Title**)
    const numMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numMatch) {
      elements.push(
        <div key={`num-${i}`} className="mt-3 mb-1 pl-0.5 text-slate-200 leading-relaxed text-xs">
          <div className="flex items-start gap-2">
            <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] flex-shrink-0 mt-0.5 border border-indigo-500/30 font-semibold">
              {numMatch[1]}
            </span>
            <div className="font-medium text-white">{parseInline(numMatch[2])}</div>
          </div>
        </div>
      );
      i++;
      continue;
    }

    // Sub-bullet (e.g. "   - *What it means*..." or "- bullet")
    const isIndented = rawLine.startsWith('   ') || rawLine.startsWith('  ') || rawLine.startsWith('\t');
    const bulletMatch = line.match(/^[-*•▸⦿]\s*(.+)$/);
    if (bulletMatch) {
      elements.push(
        <div
          key={`li-${i}`}
          className={`flex items-start gap-2 my-1 text-slate-300 leading-relaxed text-xs ${
            isIndented ? 'pl-6 text-[11.5px]' : 'pl-1'
          }`}
        >
          <span className="text-indigo-400 mt-1 flex-shrink-0 text-[10px]">▸</span>
          <div>{parseInline(bulletMatch[1])}</div>
        </div>
      );
      i++;
      continue;
    }

    // Section Header (# Title)
    if (line.startsWith('#')) {
      const headingText = line.replace(/^#+\s*/, '');
      elements.push(
        <div key={`h-${i}`} className="font-bold text-white text-xs mt-3 mb-1.5 flex items-center gap-1.5 text-indigo-300 border-b border-slate-800/80 pb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          <span>{parseInline(headingText)}</span>
        </div>
      );
      i++;
      continue;
    }

    // Standard Paragraph
    elements.push(
      <p key={`p-${i}`} className="my-1.5 text-slate-200 leading-relaxed text-xs">
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1">{elements}</div>;
};

export const AITutorDrawer: React.FC<AITutorDrawerProps> = ({
  isOpen,
  onClose,
  lessonTitle,
  lessonId,
  chapterTitle = '',
  partTitle = '',
  lessonContent = ''
}) => {
  const [selectedModel, setSelectedModel] = useState<'gpt-oss:120b' | 'codestral' | 'gemma4:31b' | 'nemotron-3-nano'>('gpt-oss:120b');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I am your AI Systems Mentor scoped to **Lesson ${lessonId}: ${lessonTitle}**.\n\nAsk me specific questions regarding the low-level systems mechanics, bytecode execution traces, kernel optimization, or memory invariants for this exact subtopic. You can click **▶ Run** on any code snippet I generate!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gpt-oss:120b'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: `Hello! I am your AI Systems Mentor scoped to **Lesson ${lessonId}: ${lessonTitle}**.\n\nAsk me specific questions regarding the low-level systems mechanics, bytecode execution traces, kernel optimization, or memory invariants for this exact subtopic. You can click **▶ Run** on any code snippet I generate!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'gpt-oss:120b'
      }
    ]);
  }, [lessonId, lessonTitle]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages]);

  const quickPrompts = [
    { icon: Lightbulb, label: 'Core Invariant', prompt: 'In 3 concise bullet points, what is the exact low-level invariant of this lesson?' },
    { icon: Zap, label: 'Production LLM Link', prompt: 'How does a production LLM engine (vLLM / TensorRT) apply this specific concept?' },
    { icon: HelpCircle, label: 'Technical Quiz', prompt: 'Give me 1 challenging multiple-choice question testing the edge-case behavior of this lesson.' },
    { icon: Bug, label: 'Memory / Bug Trap', prompt: 'What is the most critical silent bug or memory leak trap in this implementation?' }
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    const systemPrompt = `You are a Principal AI Systems Architect acting as a live 1-on-1 technical mentor in a chat interface.

### Active Scope:
- Domain: ${partTitle} -> ${chapterTitle}
- Topic: Lesson ${lessonId} ("${lessonTitle}")

### Strict Behavioral & Formatting Rules:
1. REVERT DIRECTLY IN A CLEAN CHAT FORMAT: Answer the user's specific query immediately with crisp technical precision. Do not use generic pleasantries or robotic introductions.
2. NO WIDE HORIZONTAL MARKDOWN TABLES: Never generate wide multi-column tables (| col1 | col2 | col3 | col4 |) because they look unreadable in narrow chat drawers. Instead, format execution traces and step sequences using clean numbered lists with bold headers (e.g., 1. **Step Name**: Explanation).
3. RUNNABLE CODE SNIPPETS: When providing Python code, write complete, self-contained, runnable snippets in \`\`\`python ... \`\`\` blocks with print() statements so the user can click "Run" in their browser compiler.
4. STRICT TOPIC ISOLATION: You are strictly scoped to Lesson ${lessonId} ("${lessonTitle}") and Chapter "${chapterTitle}". If the user asks an off-topic or unrelated query, refuse immediately: "I am specifically scoped to mentor you on Lesson ${lessonId}: ${lessonTitle}. Please ask a question related to this subtopic." and output nothing else.
5. HARD TOKEN LIMIT: Keep your response concise, high-density, and strictly under 800 tokens.`;

    const contextSnippet = lessonContent ? lessonContent.slice(0, 3500) : `Topic: ${lessonTitle}`;

    let reply = '';
    let usedModel = selectedModel;

    try {
      if (selectedModel !== 'codestral') {
        const ollamaModelName = selectedModel === 'nemotron-3-nano' ? 'nemotron-3-nano:30b' : selectedModel;
        const resp = await fetch('/api/ollama/chat', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OLLAMA_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: ollamaModelName,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Context from lesson document:\n${contextSnippet}\n\nStudent Query: ${query}` }
            ],
            options: {
              temperature: 0.2,
              num_predict: 800
            },
            stream: false
          })
        });

        if (resp.ok) {
          const data = await resp.json();
          reply = data?.message?.content || '';
          usedModel = selectedModel;
        }
      }

      if (!reply) {
        const mResp = await fetch('/api/mistral/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${MISTRAL_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'codestral-latest',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Context from lesson document:\n${contextSnippet}\n\nStudent Query: ${query}` }
            ],
            temperature: 0.2,
            max_tokens: 800
          })
        });

        if (mResp.ok) {
          const mData = await mResp.json();
          reply = mData?.choices?.[0]?.message?.content || '';
          usedModel = 'codestral';
        }
      }

      if (!reply) {
        throw new Error('Empty response from model');
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: usedModel
        }
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `**Mentor Insight for ${lessonTitle}:**\n\n1. **Core Invariant**: Minimize unnecessary heap allocations and pointer indirections across hot execution paths.\n2. **Runtime Diagnostics**: Inspect byte-level dispatch with \`dis.dis\` and track object allocations via \`tracemalloc\`.\n3. **Production Rule**: Avoid python-level loops over tensor elements; vectorize operations using contiguous memory strides.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: 'offline-fallback'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>AI Systems Mentor</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Chat
              </span>
            </div>
            <div className="text-xs text-slate-400 truncate max-w-[230px]">
              Lesson {lessonId}: {lessonTitle}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedModel}
            onChange={(e: any) => setSelectedModel(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="gpt-oss:120b">gpt-oss:120b</option>
            <option value="codestral">codestral</option>
            <option value="nemotron-3-nano">nemotron-3-nano</option>
            <option value="gemma4:31b">gemma4:31b</option>
          </select>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scope Pill Banner */}
      <div className="px-3.5 py-1.5 bg-indigo-950/40 border-b border-indigo-900/30 flex items-center justify-between text-[11px] text-indigo-300">
        <span className="truncate max-w-[340px]">
          🔒 Scoped to: <strong className="text-white">{chapterTitle || 'Active Chapter'}</strong> → {lessonTitle}
        </span>
        <span className="text-[10px] text-indigo-400 bg-indigo-900/40 px-1.5 py-0.5 rounded border border-indigo-700/40 font-mono">
          Python 3.12 WASM
        </span>
      </div>

      {/* Quick Prompt Pills */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/30 flex gap-2 overflow-x-auto scrollbar-none">
        {quickPrompts.map((qp, i) => {
          const Icon = qp.icon;
          return (
            <button
              key={i}
              onClick={() => handleSendMessage(qp.prompt)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-indigo-600/30 hover:border-indigo-500/50 border border-slate-700/60 text-slate-300 hover:text-indigo-200 text-xs whitespace-nowrap transition shadow-sm"
            >
              <Icon className="w-3.5 h-3.5 text-indigo-400" />
              <span>{qp.label}</span>
            </button>
          );
        })}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div
              className={`relative group max-w-[92%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20'
                  : 'bg-slate-800/90 text-slate-200 border border-slate-700/70 rounded-bl-none shadow-sm'
              }`}
            >
              {m.role === 'user' ? (
                <div className="whitespace-pre-wrap font-sans">{m.content}</div>
              ) : (
                <ChatMarkdownRenderer content={m.content} />
              )}
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400/80 border-t border-slate-700/40 pt-1.5">
                <span>{m.timestamp}</span>
                {m.role === 'assistant' && (
                  <div className="flex items-center gap-2">
                    {m.modelUsed && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                        {m.modelUsed}
                      </span>
                    )}
                    <button
                      onClick={() => handleCopy(m.content, i)}
                      className="opacity-0 group-hover:opacity-100 transition p-1 hover:text-white"
                      title="Copy answer"
                    >
                      {copiedIndex === i ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
            {m.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2.5 text-slate-400 text-xs p-2.5 bg-slate-800/60 rounded-xl w-fit border border-slate-700/40 shadow-sm animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Consulting {selectedModel}...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder={`Ask mentor about ${lessonTitle.slice(0, 28)}...`}
            disabled={isLoading}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-inner"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="absolute right-1.5 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition shadow-sm"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </form>
        <div className="mt-2 text-[10px] text-slate-500 text-center flex items-center justify-center gap-2">
          <span>Tip: Press <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono">Cmd+J</kbd> to toggle mentor</span>
        </div>
      </div>
    </div>
  );
};
