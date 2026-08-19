import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, Play, Terminal, Loader2, RotateCcw, Edit3, Eye, ChevronDown, ChevronUp, Cpu, Zap } from 'lucide-react';
import { runPythonCode, PyExecutionResult } from '../utils/pyodideRunner';

interface CodeBlockProps {
  language: string;
  code: string;
  filename?: string;
  executable?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  language,
  code: initialCode,
  filename,
  executable = true
}) => {
  const isPython = language.toLowerCase() === 'python' || language.toLowerCase() === 'py';
  const isJS = language.toLowerCase() === 'javascript' || language.toLowerCase() === 'js';
  const canExecute = executable && (isPython || isJS);

  const [currentCode, setCurrentCode] = useState(initialCode);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [execResult, setExecResult] = useState<PyExecutionResult | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCurrentCode(initialCode);
  }, [initialCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setCurrentCode(initialCode);
    setExecResult(null);
  };

  const handleRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setShowConsole(true);
    setExecResult(null);

    if (isPython) {
      const result = await runPythonCode(currentCode);
      setExecResult(result);
      setIsRunning(false);
    } else if (isJS) {
      const startTime = performance.now();
      const logs: string[] = [];
      const errLogs: string[] = [];
      const customConsole = {
        log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
        error: (...args: any[]) => errLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
        warn: (...args: any[]) => logs.push('WARN: ' + args.map(a => String(a)).join(' '))
      };

      try {
        const runFn = new Function('console', currentCode);
        runFn(customConsole);
        const endTime = performance.now();
        setExecResult({
          stdout: logs.join('\n') || '>>> Execution completed with 0 logs.',
          stderr: errLogs.join('\n'),
          executionTimeMs: Math.round((endTime - startTime) * 10) / 10,
          success: true,
          engine: 'WASM (Python 3.12)'
        });
      } catch (err: any) {
        const endTime = performance.now();
        setExecResult({
          stdout: logs.join('\n'),
          stderr: err.stack || err.message,
          executionTimeMs: Math.round((endTime - startTime) * 10) / 10,
          success: false,
          engine: 'WASM (Python 3.12)',
          error: err.message
        });
      } finally {
        setIsRunning(false);
      }
    }
  };

  const isTorchOrAI = /import\s+(torch|transformers|vllm|faiss|triton|sentence_transformers|langchain|llama_index|scipy|sklearn|jax|cupy)/.test(currentCode);

  return (
    <div className="my-6 rounded-xl border border-slate-700/70 bg-slate-900/95 shadow-xl overflow-hidden text-slate-100 font-mono text-xs transition-all">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-slate-400 select-none">
        <div className="flex items-center space-x-2.5">
          <div className="flex space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block shadow-sm"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block shadow-sm"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block shadow-sm"></span>
          </div>
          <span className="ml-2 font-semibold text-slate-300 text-xs flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            {filename || (isPython ? 'main.py' : language)}
          </span>
          {isPython && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-amber-400" />
              {isTorchOrAI ? 'PyTorch Cloud Sandbox' : 'Python 3.12 (WASM)'}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Edit / View Toggle */}
          {canExecute && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] transition-all ${
                isEditing
                  ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
                  : 'hover:bg-slate-800 border-slate-700/60 text-slate-400 hover:text-slate-200'
              }`}
              title={isEditing ? 'Switch to View mode' : 'Edit code in live compiler'}
            >
              {isEditing ? <Eye className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
              <span>{isEditing ? 'View' : 'Edit'}</span>
            </button>
          )}

          {/* Reset Code */}
          {currentCode !== initialCode && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-amber-300 transition text-[11px]"
              title="Reset to original code"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          {/* Copy Code */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition text-[11px]"
            title="Copy code"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* ▶ Run Code Button */}
          {canExecute && (
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition shadow-md shadow-emerald-900/30 disabled:opacity-50"
              title="Execute in sandbox compiler"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current text-emerald-200" />
                  <span>Run Code</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Code Editor / Viewer */}
      <div className="relative">
        {isEditing ? (
          <textarea
            ref={editorRef}
            value={currentCode}
            onChange={e => setCurrentCode(e.target.value)}
            onKeyDown={e => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleRun();
              }
            }}
            rows={Math.min(26, Math.max(8, currentCode.split('\n').length + 1))}
            className="w-full p-4 bg-slate-950 text-slate-200 font-mono text-[13px] leading-relaxed focus:outline-none resize-y border-none"
            placeholder="Type Python code here..."
            spellCheck={false}
          />
        ) : (
          <div className="p-4 overflow-x-auto leading-relaxed text-[13px] text-slate-200 bg-slate-950/40">
            <pre>
              <code>{currentCode.trim()}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Interactive Terminal Output Console */}
      {showConsole && (
        <div className="border-t border-slate-800 bg-slate-950 font-mono">
          {/* Console Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800/80 text-[11px]">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-slate-300">Terminal Output</span>
              {isRunning && (
                <span className="text-[10px] text-indigo-400 animate-pulse">● Executing...</span>
              )}
              {execResult && (
                <span
                  className={`text-[10px] px-2 py-0.2 rounded-full font-medium ${
                    execResult.success
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {execResult.success ? '✓ Exit Code: 0' : '✕ Traceback'}
                </span>
              )}
              {execResult && (
                <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.2 rounded border border-slate-700/50">
                  {execResult.engine} ({execResult.executionTimeMs}ms)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setExecResult(null)}
                className="text-[10px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded hover:bg-slate-800 transition"
              >
                Clear
              </button>
              <button
                onClick={() => setShowConsole(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition"
                title="Hide Console"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Console Body */}
          <div className="p-4 max-h-64 overflow-y-auto space-y-2 text-[12px] leading-relaxed">
            {isRunning && (
              <div className="flex items-center gap-2 text-indigo-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isTorchOrAI ? 'Executing in PyTorch Cloud Sandbox...' : 'Executing in Python 3.12 WASM sandbox...'}</span>
              </div>
            )}

            {execResult && (
              <>
                {execResult.stdout && (
                  <pre className="text-emerald-300 whitespace-pre-wrap font-mono">
                    {execResult.stdout}
                  </pre>
                )}
                {execResult.stderr && (
                  <pre className="text-rose-400 whitespace-pre-wrap font-mono bg-rose-950/20 p-2.5 rounded-lg border border-rose-900/40">
                    {execResult.stderr}
                  </pre>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
