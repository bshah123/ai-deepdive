import React, { useState, useMemo, useCallback } from 'react';
import { TrendingUp, Plus, Trash2, RotateCcw } from 'lucide-react';

interface DataPoint {
  id: number;
  x: number;
  y: number;
}

export const LeastSquaresWidget: React.FC = () => {
  // Points in canvas coordinate frame [0, 300]
  const [points, setPoints] = useState<DataPoint[]>([
    { id: 1, x: 50, y: 220 },
    { id: 2, x: 90, y: 190 },
    { id: 3, x: 130, y: 170 },
    { id: 4, x: 170, y: 120 },
    { id: 5, x: 210, y: 90 },
    { id: 6, x: 250, y: 60 },
  ]);

  // Compute OLS Linear Regression: y = beta1 * x + beta0
  const regression = useMemo(() => {
    const n = points.length;
    if (n < 2) {
      return { slope: 0, intercept: 150, r2: 0, rss: 0, tss: 0, isValid: false };
    }

    // Convert coordinates: x in [0, 10], y in [0, 10]
    // SVG: x=30 -> math=0, x=270 -> math=10
    // SVG: y=270 -> math=0, y=30 -> math=10
    const mathPts = points.map(p => ({
      mx: ((p.x - 30) / 240) * 10,
      my: ((270 - p.y) / 240) * 10
    }));

    const meanX = mathPts.reduce((acc, p) => acc + p.mx, 0) / n;
    const meanY = mathPts.reduce((acc, p) => acc + p.my, 0) / n;

    let num = 0;
    let den = 0;
    mathPts.forEach(p => {
      num += (p.mx - meanX) * (p.my - meanY);
      den += (p.mx - meanX) ** 2;
    });

    const slope = den !== 0 ? num / den : 0;
    const intercept = meanY - slope * meanX;

    // Compute RSS and R^2
    let rss = 0;
    let tss = 0;
    mathPts.forEach(p => {
      const predY = slope * p.mx + intercept;
      rss += (p.my - predY) ** 2;
      tss += (p.my - meanY) ** 2;
    });

    const r2 = tss > 1e-9 ? Math.max(0.0, 1.0 - (rss / tss)) : 1.0;

    return { slope, intercept, r2, rss, tss, isValid: true };
  }, [points]);

  // Handle adding point on canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= 30 && x <= 270 && y >= 30 && y <= 270) {
      setPoints(prev => [...prev, { id: Date.now(), x, y }]);
    }
  }, []);

  const clearPoints = () => setPoints([]);
  const resetDefault = () => {
    setPoints([
      { id: 1, x: 50, y: 220 },
      { id: 2, x: 90, y: 190 },
      { id: 3, x: 130, y: 170 },
      { id: 4, x: 170, y: 120 },
      { id: 5, x: 210, y: 90 },
      { id: 6, x: 250, y: 60 },
    ]);
  };

  // Convert regression equation back to SVG line endpoints
  const lineCoords = useMemo(() => {
    if (!regression.isValid) return { x1: 30, y1: 150, x2: 270, y2: 150 };
    // At math X=0: math Y = intercept => SVG y = 270 - (intercept/10)*240
    const mathY0 = regression.intercept;
    const mathY10 = regression.slope * 10 + regression.intercept;

    const y1 = 270 - (mathY0 / 10) * 240;
    const y2 = 270 - (mathY10 / 10) * 240;

    return { x1: 30, y1, x2: 270, y2 };
  }, [regression]);

  return (
    <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-sm select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold text-slate-100">Ordinary Least Squares (OLS) Projection</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Click anywhere on the coordinate plane to add data points and watch the normal equation solve live.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetDefault}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={clearPoints}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/60 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Interactive Scatter Canvas */}
        <div className="flex justify-center p-4 bg-slate-950 rounded-xl border border-slate-800/80 relative">
          <svg
            width="300"
            height="300"
            viewBox="0 0 300 300"
            onClick={handleCanvasClick}
            className="cursor-pointer overflow-visible"
          >
            {/* Coordinate Frame */}
            <rect x="30" y="30" width="240" height="240" fill="#020617" stroke="#1e293b" strokeWidth="1.5" />
            <line x1="30" y1="270" x2="270" y2="270" stroke="#475569" strokeWidth="2" />
            <line x1="30" y1="270" x2="30" y2="30" stroke="#475569" strokeWidth="2" />

            {/* Grid dashes */}
            <line x1="30" y1="150" x2="270" y2="150" stroke="#1e293b" strokeDasharray="3 3" />
            <line x1="150" y1="30" x2="150" y2="270" stroke="#1e293b" strokeDasharray="3 3" />

            {/* Residual Error Drop Lines */}
            {regression.isValid && points.map(p => {
              const mathX = ((p.x - 30) / 240) * 10;
              const predMathY = regression.slope * mathX + regression.intercept;
              const predSvgY = 270 - (predMathY / 10) * 240;

              return (
                <line
                  key={`res-${p.id}`}
                  x1={p.x}
                  y1={p.y}
                  x2={p.x}
                  y2={predSvgY}
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
              );
            })}

            {/* Best-Fit Regression Line */}
            {regression.isValid && (
              <line
                x1={lineCoords.x1}
                y1={lineCoords.y1}
                x2={lineCoords.x2}
                y2={lineCoords.y2}
                stroke="#38bdf8"
                strokeWidth="2.5"
              />
            )}

            {/* Data Points */}
            {points.map(p => (
              <circle
                key={p.id}
                cx={p.x}
                cy={p.y}
                r="5"
                fill="#0284c7"
                stroke="#e0f2fe"
                strokeWidth="1.5"
                className="hover:scale-150 transition-transform"
              />
            ))}
          </svg>

          <div className="absolute bottom-2 left-4 text-[10px] font-mono text-slate-500 flex items-center gap-1">
            <Plus className="w-3 h-3 text-sky-400" /> Click box to add data points ({points.length} points)
          </div>
        </div>

        {/* Real-Time Metrics & Normal Equations */}
        <div className="space-y-4 font-mono">
          <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-sans font-semibold">Fitted Regression Model</div>
              <div className="text-base font-bold text-sky-300 mt-0.5">
                {regression.isValid
                  ? `ŷ = ${regression.slope >= 0 ? '+' : ''}${regression.slope.toFixed(3)} x + ${regression.intercept.toFixed(3)}`
                  : 'Add ≥ 2 points'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-slate-100">
                {regression.isValid ? `${(regression.r2 * 100).toFixed(1)}%` : '0%'}
              </div>
              <div className="text-[10px] text-slate-400">R² Variance Score</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Normal Equation:</span>
              <span className="text-sky-300 font-bold text-xs">β̂ = (XᵀX)⁻¹Xᵀy</span>
              <span className="text-slate-500 text-[10px] block mt-0.5">Orthogonal Projection</span>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Residual Loss (RSS):</span>
              <span className="text-rose-400 font-bold text-sm">{regression.rss.toFixed(3)}</span>
              <span className="text-slate-500 text-[10px] block mt-0.5">Σ (yᵢ - ŷᵢ)²</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-[11px] font-sans text-slate-300 space-y-1">
            <span className="font-semibold text-sky-300">Geometric Invariant:</span> The residual error vector <code className="text-rose-400">e = y - Xβ̂</code> is mathematically orthogonal to the column space of $X$ (<code className="text-sky-300">Xᵀ(y - Xβ̂) = 0</code>). The red dashed drop lines represent the minimum Euclidean distance projection onto the subspace.
          </div>
        </div>
      </div>
    </div>
  );
};
