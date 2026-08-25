import React, { useState, useMemo } from 'react';
import { Play, RotateCcw, Activity } from 'lucide-react';

export const EigenTransformWidget: React.FC = () => {
  // 2x2 Matrix entries: [[a, b], [c, d]]
  const [matrix, setMatrix] = useState<{ a: number; b: number; c: number; d: number }>({
    a: 2.0,
    b: 1.0,
    c: 1.0,
    d: 2.0,
  });

  const [animStage, setAnimStage] = useState<number>(3); // 0: Input, 1: Rotate U^T, 2: Scale Lambda, 3: Rotate U

  // Eigendecomposition calculation
  const eigenData = useMemo(() => {
    const { a, b, c, d } = matrix;
    const isSymmetric = Math.abs(b - c) < 1e-6;

    // Characteristic polynomial: lambda^2 - tr(A)*lambda + det(A) = 0
    const tr = a + d;
    const det = a * d - b * c;
    const disc = tr * tr - 4 * det;

    if (disc < 0) {
      return { isReal: false, isSymmetric, l1: 0, l2: 0, v1: [0, 0], v2: [0, 0], tr, det };
    }

    const sqrtDisc = Math.sqrt(disc);
    const l1 = (tr + sqrtDisc) / 2;
    const l2 = (tr - sqrtDisc) / 2;

    // Eigenvectors: (A - lambda*I) * v = 0
    const getEigenvector = (lambda: number): [number, number] => {
      // (a - lambda)*x + b*y = 0 => [b, lambda - a] or [lambda - d, c]
      if (Math.abs(b) > 1e-7) {
        const vx = b;
        const vy = lambda - a;
        const norm = Math.sqrt(vx * vx + vy * vy) || 1.0;
        return [vx / norm, vy / norm];
      } else if (Math.abs(c) > 1e-7) {
        const vx = lambda - d;
        const vy = c;
        const norm = Math.sqrt(vx * vx + vy * vy) || 1.0;
        return [vx / norm, vy / norm];
      } else {
        return lambda === a ? [1.0, 0.0] : [0.0, 1.0];
      }
    };

    const v1 = getEigenvector(l1);
    const v2 = getEigenvector(l2);

    return { isReal: true, isSymmetric, l1, l2, v1, v2, tr, det };
  }, [matrix]);

  // Compute grid lines under current transformation stage
  const transformedGrid = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    const scale = 30; // Grid spacing

    // Generate coordinate lines from -4 to 4
    for (let i = -3; i <= 3; i++) {
      // Vertical grid line (x = i)
      const p1 = transformPoint(i, -3);
      const p2 = transformPoint(i, 3);
      lines.push({ x1: 150 + p1[0] * scale, y1: 150 - p1[1] * scale, x2: 150 + p2[0] * scale, y2: 150 - p2[1] * scale });

      // Horizontal grid line (y = i)
      const q1 = transformPoint(-3, i);
      const q2 = transformPoint(3, i);
      lines.push({ x1: 150 + q1[0] * scale, y1: 150 - q1[1] * scale, x2: 150 + q2[0] * scale, y2: 150 - q2[1] * scale });
    }

    return lines;

    function transformPoint(px: number, py: number): [number, number] {
      if (animStage === 0) return [px, py];

      const { a, b, c, d } = matrix;
      if (!eigenData.isSymmetric || animStage === 3) {
        // Full matrix transform A * p
        return [a * px + b * py, c * px + d * py];
      }

      // Spectral theorem stages: A = U * Lambda * U^T
      const [u11, u21] = eigenData.v1;
      const [u12, u22] = eigenData.v2;

      // Step 1: Rotate by U^T
      const r1x = u11 * px + u21 * py;
      const r1y = u12 * px + u22 * py;
      if (animStage === 1) return [r1x, r1y];

      // Step 2: Scale by Lambda
      const s1x = eigenData.l1 * r1x;
      const s1y = eigenData.l2 * r1y;
      if (animStage === 2) return [s1x, s1y];

      // Step 3: Rotate back by U
      const r2x = u11 * s1x + u12 * s1y;
      const r2y = u21 * s1x + u22 * s1y;
      return [r2x, r2y];
    }
  }, [matrix, animStage, eigenData]);

  return (
    <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-sm select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Activity className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold text-slate-100">Spectral Theorem: Rotate · Scale · Rotate</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Observe how symmetric matrix <code className="text-amber-300">A = U Λ Uᵀ</code> rotates into eigenbasis, scales along axes, and rotates back.
          </p>
        </div>

        {/* Presets */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMatrix({ a: 2.0, b: 1.0, c: 1.0, d: 2.0 })}
            className="px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            Symmetric (2,1;1,2)
          </button>
          <button
            onClick={() => setMatrix({ a: 3.0, b: -1.0, c: -1.0, d: 1.0 })}
            className="px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            Anisotropic (3,-1;-1,1)
          </button>
          <button
            onClick={() => setMatrix({ a: 1.0, b: 1.0, c: 0.0, d: 1.0 })}
            className="px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            Shear (1,1;0,1)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* SVG Transformed Grid */}
        <div className="flex justify-center p-4 bg-slate-950 rounded-xl border border-slate-800/80 relative">
          <svg width="300" height="300" viewBox="0 0 300 300" className="overflow-visible">
            {/* Standard Background Circle */}
            <circle cx="150" cy="150" r="90" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />

            {/* Transformed Grid Lines */}
            {transformedGrid.map((line, idx) => (
              <line
                key={idx}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="rgba(99, 102, 241, 0.25)"
                strokeWidth="1.2"
              />
            ))}

            {/* Axes */}
            <line x1="30" y1="150" x2="270" y2="150" stroke="#334155" strokeWidth="1.5" />
            <line x1="150" y1="30" x2="150" y2="270" stroke="#334155" strokeWidth="1.5" />

            {/* Eigenvector 1 Line (Amber) */}
            {eigenData.isReal && (
              <line
                x1={150 - eigenData.v1[0] * 120}
                y1={150 + eigenData.v1[1] * 120}
                x2={150 + eigenData.v1[0] * 120}
                y2={150 - eigenData.v1[1] * 120}
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeDasharray="4 3"
              />
            )}

            {/* Eigenvector 2 Line (Cyan) */}
            {eigenData.isReal && (
              <line
                x1={150 - eigenData.v2[0] * 120}
                y1={150 + eigenData.v2[1] * 120}
                x2={150 + eigenData.v2[0] * 120}
                y2={150 - eigenData.v2[1] * 120}
                stroke="#06b6d4"
                strokeWidth="2.5"
                strokeDasharray="4 3"
              />
            )}
          </svg>

          <div className="absolute top-2 left-3 text-[10px] font-mono text-slate-500">
            Dashed lines: Invariant Eigenvector directions
          </div>
        </div>

        {/* Matrix Inputs & Spectral Breakdown */}
        <div className="space-y-4 font-mono">
          <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-sans font-semibold mb-2">Matrix Entries: A</div>
            <div className="grid grid-cols-2 gap-2 max-w-[200px]">
              <input
                type="number"
                step="0.5"
                value={matrix.a}
                onChange={(e) => setMatrix(prev => ({ ...prev, a: parseFloat(e.target.value) || 0 }))}
                className="p-1.5 bg-slate-900 border border-slate-700 rounded text-center text-slate-100 font-bold"
              />
              <input
                type="number"
                step="0.5"
                value={matrix.b}
                onChange={(e) => setMatrix(prev => ({ ...prev, b: parseFloat(e.target.value) || 0 }))}
                className="p-1.5 bg-slate-900 border border-slate-700 rounded text-center text-slate-100 font-bold"
              />
              <input
                type="number"
                step="0.5"
                value={matrix.c}
                onChange={(e) => setMatrix(prev => ({ ...prev, c: parseFloat(e.target.value) || 0 }))}
                className="p-1.5 bg-slate-900 border border-slate-700 rounded text-center text-slate-100 font-bold"
              />
              <input
                type="number"
                step="0.5"
                value={matrix.d}
                onChange={(e) => setMatrix(prev => ({ ...prev, d: parseFloat(e.target.value) || 0 }))}
                className="p-1.5 bg-slate-900 border border-slate-700 rounded text-center text-slate-100 font-bold"
              />
            </div>
          </div>

          {/* 4-Stage Decomposition Buttons */}
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-2 font-sans font-semibold">Spectral Decomposition Step:</span>
            <div className="grid grid-cols-4 gap-1 text-[10px]">
              <button
                onClick={() => setAnimStage(0)}
                className={`py-1.5 rounded border transition ${animStage === 0 ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-300 border-slate-800'}`}
              >
                0. Input
              </button>
              <button
                onClick={() => setAnimStage(1)}
                className={`py-1.5 rounded border transition ${animStage === 1 ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-300 border-slate-800'}`}
              >
                1. Rotate Uᵀ
              </button>
              <button
                onClick={() => setAnimStage(2)}
                className={`py-1.5 rounded border transition ${animStage === 2 ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-300 border-slate-800'}`}
              >
                2. Scale Λ
              </button>
              <button
                onClick={() => setAnimStage(3)}
                className={`py-1.5 rounded border transition ${animStage === 3 ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-300 border-slate-800'}`}
              >
                3. Rotate U
              </button>
            </div>
          </div>

          {/* Real-time Eigenvalues */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-amber-400 block text-[11px]">Eigenvalue λ₁:</span>
              <span className="text-slate-100 font-bold text-sm">{eigenData.isReal ? eigenData.l1.toFixed(3) : 'Complex'}</span>
              <span className="text-slate-500 text-[10px] block mt-0.5">v₁ = [{eigenData.v1[0].toFixed(2)}, {eigenData.v1[1].toFixed(2)}]</span>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-cyan-400 block text-[11px]">Eigenvalue λ₂:</span>
              <span className="text-slate-100 font-bold text-sm">{eigenData.isReal ? eigenData.l2.toFixed(3) : 'Complex'}</span>
              <span className="text-slate-500 text-[10px] block mt-0.5">v₂ = [{eigenData.v2[0].toFixed(2)}, {eigenData.v2[1].toFixed(2)}]</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
