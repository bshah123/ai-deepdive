import React, { useState, useMemo, useCallback } from 'react';
import { Layers, RotateCcw, Plus, Eye } from 'lucide-react';

interface Point2D {
  x: number;
  y: number;
}

export const PCAPlaygroundWidget: React.FC = () => {
  // Generate default tilted Gaussian distribution
  const generatePreset = (type: 'tilted' | 'circular' | 'bimodal'): Point2D[] => {
    const pts: Point2D[] = [];
    const n = 35;
    if (type === 'tilted') {
      for (let i = 0; i < n; i++) {
        const u = (Math.random() - 0.5) * 160;
        const v = (Math.random() - 0.5) * 35;
        // Rotate by 35 degrees
        const rad = (35 * Math.PI) / 180;
        const x = 150 + u * Math.cos(rad) - v * Math.sin(rad);
        const y = 150 - (u * Math.sin(rad) + v * Math.cos(rad));
        pts.push({ x, y });
      }
    } else if (type === 'circular') {
      for (let i = 0; i < n; i++) {
        const r = Math.random() * 70;
        const theta = Math.random() * 2 * Math.PI;
        pts.push({ x: 150 + r * Math.cos(theta), y: 150 + r * Math.sin(theta) });
      }
    } else {
      // Bimodal clusters
      for (let i = 0; i < n / 2; i++) {
        pts.push({ x: 100 + (Math.random() - 0.5) * 40, y: 100 + (Math.random() - 0.5) * 40 });
        pts.push({ x: 200 + (Math.random() - 0.5) * 40, y: 200 + (Math.random() - 0.5) * 40 });
      }
    }
    return pts;
  };

  const [points, setPoints] = useState<Point2D[]>(() => generatePreset('tilted'));
  const [showProjection, setShowProjection] = useState<boolean>(true);

  // Compute PCA: Mean center -> Covariance Matrix -> Eigendecomposition
  const pcaResults = useMemo(() => {
    const n = points.length;
    if (n < 3) {
      return { meanX: 150, meanY: 150, cov: [[0, 0], [0, 0]], pc1: [1, 0], pc2: [0, 1], l1: 1, l2: 1, var1: 100, var2: 0, isValid: false };
    }

    const meanX = points.reduce((acc, p) => acc + p.x, 0) / n;
    const meanY = points.reduce((acc, p) => acc + p.y, 0) / n;

    // Centered coordinates
    let cxx = 0, cyy = 0, cxy = 0;
    points.forEach(p => {
      const dx = p.x - meanX;
      const dy = -(p.y - meanY); // Math Y orientation
      cxx += dx * dx;
      cyy += dy * dy;
      cxy += dx * dy;
    });

    cxx /= n;
    cyy /= n;
    cxy /= n;

    // Eigendecomposition of 2x2 symmetric matrix
    const tr = cxx + cyy;
    const det = cxx * cyy - cxy * cxy;
    const disc = Math.sqrt(Math.max(0, tr * tr - 4 * det));

    const l1 = (tr + disc) / 2;
    const l2 = (tr - disc) / 2;

    const getVector = (l: number): [number, number] => {
      if (Math.abs(cxy) > 1e-6) {
        const vx = cxy;
        const vy = l - cxx;
        const norm = Math.sqrt(vx * vx + vy * vy) || 1.0;
        return [vx / norm, vy / norm];
      }
      return l === cxx ? [1, 0] : [0, 1];
    };

    const pc1 = getVector(l1);
    const pc2 = getVector(l2);

    const totalVar = l1 + l2 || 1e-6;
    const var1 = (l1 / totalVar) * 100;
    const var2 = (l2 / totalVar) * 100;

    return { meanX, meanY, cov: [[cxx, cxy], [cxy, cyy]], pc1, pc2, l1, l2, var1, var2, isValid: true };
  }, [points]);

  // Click on canvas to add points
  const handleCanvasClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPoints(prev => [...prev, { x, y }]);
  }, []);

  return (
    <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-sm select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Layers className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold text-slate-100">Principal Component Analysis (PCA) Playground</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Observe live sample covariance matrix eigenspaces and 1D variance-maximizing subspace projections.
          </p>
        </div>

        {/* Presets */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPoints(generatePreset('tilted'))}
            className="px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            Tilted Gaussian
          </button>
          <button
            onClick={() => setPoints(generatePreset('bimodal'))}
            className="px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            Bimodal
          </button>
          <button
            onClick={() => setPoints(generatePreset('circular'))}
            className="px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            Circular
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
            {/* Coordinate Grid */}
            <line x1="30" y1="150" x2="270" y2="150" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="150" y1="30" x2="150" y2="270" stroke="#1e293b" strokeDasharray="3 3" />

            {/* Mean Center */}
            <circle cx={pcaResults.meanX} cy={pcaResults.meanY} r="4" fill="#94a3b8" />

            {/* 1D Projection Drop Lines onto PC1 */}
            {showProjection && pcaResults.isValid && points.map((p, idx) => {
              const dx = p.x - pcaResults.meanX;
              const dy = -(p.y - pcaResults.meanY);
              const [v1x, v1y] = pcaResults.pc1;
              const projScalar = dx * v1x + dy * v1y;
              const projSvgX = pcaResults.meanX + projScalar * v1x;
              const projSvgY = pcaResults.meanY - projScalar * v1y;

              return (
                <line
                  key={`proj-${idx}`}
                  x1={p.x}
                  y1={p.y}
                  x2={projSvgX}
                  y2={projSvgY}
                  stroke="rgba(244, 63, 94, 0.4)"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              );
            })}

            {/* PC1 Principal Axis (Rose) */}
            {pcaResults.isValid && (
              <line
                x1={pcaResults.meanX - pcaResults.pc1[0] * 120}
                y1={pcaResults.meanY + pcaResults.pc1[1] * 120}
                x2={pcaResults.meanX + pcaResults.pc1[0] * 120}
                y2={pcaResults.meanY - pcaResults.pc1[1] * 120}
                stroke="#f43f5e"
                strokeWidth="2.5"
              />
            )}

            {/* PC2 Orthogonal Axis (Sky Blue) */}
            {pcaResults.isValid && (
              <line
                x1={pcaResults.meanX - pcaResults.pc2[0] * 70}
                y1={pcaResults.meanY + pcaResults.pc2[1] * 70}
                x2={pcaResults.meanX + pcaResults.pc2[0] * 70}
                y2={pcaResults.meanY - pcaResults.pc2[1] * 70}
                stroke="#38bdf8"
                strokeWidth="1.8"
                strokeDasharray="3 3"
              />
            )}

            {/* Data Points */}
            {points.map((p, idx) => (
              <circle key={idx} cx={p.x} cy={p.y} r="4" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1" />
            ))}
          </svg>

          <div className="absolute bottom-2 left-4 text-[10px] font-mono text-slate-500">
            Click to add points ({points.length} samples)
          </div>
        </div>

        {/* Real-time Eigendecomposition & Variance Panel */}
        <div className="space-y-4 font-mono">
          <div className="flex items-center justify-between p-3 bg-slate-950/70 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-300 font-sans font-semibold">1D Projection Visualizer:</span>
            <button
              onClick={() => setShowProjection(!showProjection)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition ${showProjection ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-400'}`}
            >
              <Eye className="w-3.5 h-3.5" />
              {showProjection ? 'Hide Drops' : 'Show Drops'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-rose-400 block text-[11px]">PC1 Variance (λ₁):</span>
              <span className="text-slate-100 font-bold text-base">{pcaResults.var1.toFixed(1)}%</span>
              <span className="text-slate-500 text-[10px] block mt-0.5">v₁ = [{pcaResults.pc1[0].toFixed(2)}, {pcaResults.pc1[1].toFixed(2)}]</span>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-sky-400 block text-[11px]">PC2 Variance (λ₂):</span>
              <span className="text-slate-100 font-bold text-base">{pcaResults.var2.toFixed(1)}%</span>
              <span className="text-slate-500 text-[10px] block mt-0.5">v₂ = [{pcaResults.pc2[0].toFixed(2)}, {pcaResults.pc2[1].toFixed(2)}]</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-[11px] font-sans text-slate-300">
            <span className="font-semibold text-rose-400">Optimization Theorem:</span> PC1 aligns with the direction of maximal Rayleigh quotient <code className="text-rose-300">max vᵀCv</code>. The projection minimizes Euclidean reconstruction error (represented by the dashed drop lines).
          </div>
        </div>
      </div>
    </div>
  );
};
