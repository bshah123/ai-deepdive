import React, { useState, useMemo } from 'react';
import { Sparkles, Info } from 'lucide-react';

export const NormBallsWidget: React.FC = () => {
  const [p, setP] = useState<number>(2.0);
  const [showDual, setShowDual] = useState<boolean>(true);

  // Compute dual norm q = p / (p - 1)
  const q = useMemo(() => {
    if (p <= 1.0) return Infinity;
    if (p >= 10.0) return 1.0;
    return p / (p - 1);
  }, [p]);

  // Generate SVG path points for ||x||_p = 1
  const pathData = useMemo(() => {
    const points: string[] = [];
    const nSteps = 360;
    const scale = 110; // Canvas center offset scale

    for (let i = 0; i <= nSteps; i++) {
      const theta = (i * 2 * Math.PI) / nSteps;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const signCos = cosT >= 0 ? 1 : -1;
      const signSin = sinT >= 0 ? 1 : -1;

      const absCos = Math.abs(cosT);
      const absSin = Math.abs(sinT);

      // ( |x|^p + |y|^p )^(1/p) = 1  => r(theta) = ( |cos|^p + |sin|^p )^(-1/p)
      let r = 1.0;
      if (p >= 10.0) {
        r = 1.0 / Math.max(absCos, absSin);
      } else {
        r = Math.pow(Math.pow(absCos, p) + Math.pow(absSin, p), -1.0 / p);
      }

      const x = 150 + r * cosT * scale;
      const y = 150 - r * sinT * scale; // Invert y for SVG coords

      if (i === 0) {
        points.push(`M ${x.toFixed(2)} ${y.toFixed(2)}`);
      } else {
        points.push(`L ${x.toFixed(2)} ${y.toFixed(2)}`);
      }
    }
    points.push('Z');
    return points.join(' ');
  }, [p]);

  // Generate SVG path for dual norm ||x||_q = 1
  const dualPathData = useMemo(() => {
    if (!showDual || !isFinite(q) || q < 1.0) return null;
    const points: string[] = [];
    const nSteps = 360;
    const scale = 110;

    for (let i = 0; i <= nSteps; i++) {
      const theta = (i * 2 * Math.PI) / nSteps;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const absCos = Math.abs(cosT);
      const absSin = Math.abs(sinT);

      let r = 1.0;
      if (q >= 10.0) {
        r = 1.0 / Math.max(absCos, absSin);
      } else {
        r = Math.pow(Math.pow(absCos, q) + Math.pow(absSin, q), -1.0 / q);
      }

      const x = 150 + r * cosT * scale;
      const y = 150 - r * sinT * scale;

      if (i === 0) {
        points.push(`M ${x.toFixed(2)} ${y.toFixed(2)}`);
      } else {
        points.push(`L ${x.toFixed(2)} ${y.toFixed(2)}`);
      }
    }
    points.push('Z');
    return points.join(' ');
  }, [q, showDual]);

  const getGeometryName = (val: number) => {
    if (val < 1.0) return 'Non-convex Astroid (Non-norm concavity)';
    if (Math.abs(val - 1.0) < 0.05) return 'ℓ₁ Diamond (Manhattan / Sparsity inducing)';
    if (Math.abs(val - 2.0) < 0.05) return 'ℓ₂ Circle (Euclidean / Isotropic)';
    if (val >= 8.0) return 'ℓ_∞ Square (Chebyshev / Maximum coordinate)';
    return `Super-ellipse (p = ${val.toFixed(2)})`;
  };

  return (
    <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold text-slate-100">ℓₚ Unit Ball Morphing in ℝ²</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Explore geometric unit contours <code className="text-indigo-300">‖x‖_p = (|x₁|^p + |x₂|^p)^(1/p) = 1</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setP(1.0)}
            className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition ${
              p === 1.0
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            p = 1 (Lasso)
          </button>
          <button
            onClick={() => setP(2.0)}
            className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition ${
              p === 2.0
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            p = 2 (Ridge)
          </button>
          <button
            onClick={() => setP(10.0)}
            className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition ${
              p === 10.0
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            p = ∞ (Box)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* SVG Canvas */}
        <div className="flex justify-center p-4 bg-slate-950 rounded-xl border border-slate-800/80 relative">
          <svg width="300" height="300" viewBox="0 0 300 300" className="overflow-visible">
            {/* Grid Lines */}
            <line x1="40" y1="150" x2="260" y2="150" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="150" y1="40" x2="150" y2="260" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
            <text x="265" y="154" fill="#64748b" fontSize="10" fontFamily="monospace">x₁</text>
            <text x="146" y="32" fill="#64748b" fontSize="10" fontFamily="monospace">x₂</text>

            {/* Tick marks */}
            <circle cx="260" cy="150" r="2" fill="#64748b" />
            <circle cx="40" cy="150" r="2" fill="#64748b" />
            <circle cx="150" cy="40" r="2" fill="#64748b" />
            <circle cx="150" cy="260" r="2" fill="#64748b" />
            <text x="255" y="165" fill="#64748b" fontSize="9" fontFamily="monospace">+1</text>
            <text x="35" y="165" fill="#64748b" fontSize="9" fontFamily="monospace">-1</text>
            <text x="156" y="45" fill="#64748b" fontSize="9" fontFamily="monospace">+1</text>
            <text x="156" y="258" fill="#64748b" fontSize="9" fontFamily="monospace">-1</text>

            {/* Dual Norm (Dashed Amber) */}
            {dualPathData && (
              <path
                d={dualPathData}
                fill="rgba(245, 158, 11, 0.08)"
                stroke="#f59e0b"
                strokeWidth="1.8"
                strokeDasharray="4 4"
                className="transition-all duration-300"
              />
            )}

            {/* Primary Norm Ball (Indigo) */}
            <path
              d={pathData}
              fill="rgba(99, 102, 241, 0.22)"
              stroke="#818cf8"
              strokeWidth="2.5"
              className="transition-all duration-150"
            />
          </svg>

          {/* Overlay Tag */}
          <div className="absolute bottom-2 left-3 text-[11px] font-mono text-slate-400">
            Shape: <span className="text-indigo-300 font-semibold">{getGeometryName(p)}</span>
          </div>
        </div>

        {/* Controls & Math Details */}
        <div className="space-y-5">
          <div>
            <div className="flex justify-between items-center text-xs font-mono text-slate-300 mb-2">
              <span>Norm Parameter (p):</span>
              <span className="text-indigo-400 font-bold text-sm bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800">
                {p >= 10.0 ? 'p → ∞' : p.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="10.0"
              step="0.05"
              value={p}
              onChange={(e) => setP(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>0.5 (Non-convex)</span>
              <span>1.0 (Diamond)</span>
              <span>2.0 (Circle)</span>
              <span>10.0 (Box)</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-xs">
            <div>
              <div className="font-semibold text-slate-200">Dual Norm (Hölder Invariant):</div>
              <div className="text-[11px] font-mono text-amber-400/90 mt-0.5">
                1/p + 1/q = 1 ⇒ q = {isFinite(q) ? q.toFixed(2) : '∞'}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showDual}
                onChange={(e) => setShowDual(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
              />
              <span className="text-slate-400 text-[11px]">Show Dual Ball</span>
            </label>
          </div>

          <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800/80 text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
              <Info className="w-3.5 h-3.5" />
              <span>Machine Learning Connection</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When <code className="text-indigo-300">p = 1</code>, the unit ball has sharp corners on the coordinate axes.
              In Lasso regression, loss contours touch these sharp vertices first, forcing parameters to zero and producing <strong>sparse feature selection</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
