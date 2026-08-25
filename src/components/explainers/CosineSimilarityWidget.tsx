import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Compass, RefreshCw } from 'lucide-react';

export const CosineSimilarityWidget: React.FC = () => {
  // Vector coordinates in [-100, 100] range
  const [u, setU] = useState<{ x: number; y: number }>({ x: 80, y: 30 });
  const [v, setV] = useState<{ x: number; y: number }>({ x: 40, y: 75 });
  const [activeDrag, setActiveDrag] = useState<'u' | 'v' | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Compute norms, dot product, and cosine similarity
  const metrics = useMemo(() => {
    const normU = Math.sqrt(u.x * u.x + u.y * u.y) || 1e-9;
    const normV = Math.sqrt(v.x * v.x + v.y * v.y) || 1e-9;
    const dot = u.x * v.x + u.y * v.y;
    const cosSim = Math.max(-1.0, Math.min(1.0, dot / (normU * normV)));
    const angleRad = Math.acos(cosSim);
    const angleDeg = (angleRad * 180) / Math.PI;
    const euclideanDist = Math.sqrt((u.x - v.x) ** 2 + (u.y - v.y) ** 2);

    let status = 'Acute (Similar direction)';
    let colorClass = 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60';
    if (Math.abs(cosSim - 1.0) < 0.01) {
      status = 'Collinear / Identical Direction (cos θ = 1)';
      colorClass = 'text-emerald-300 bg-emerald-950/60 border-emerald-500/60';
    } else if (Math.abs(cosSim) < 0.03) {
      status = 'Orthogonal / Uncorrelated (cos θ = 0)';
      colorClass = 'text-sky-400 bg-sky-950/50 border-sky-800/60';
    } else if (Math.abs(cosSim - (-1.0)) < 0.01) {
      status = 'Directly Opposing (cos θ = -1)';
      colorClass = 'text-rose-400 bg-rose-950/50 border-rose-800/60';
    } else if (cosSim < 0) {
      status = 'Obtuse (Negative similarity)';
      colorClass = 'text-amber-400 bg-amber-950/50 border-amber-800/60';
    }

    return { normU, normV, dot, cosSim, angleDeg, angleRad, euclideanDist, status, colorClass };
  }, [u, v]);

  // Handle pointer dragging
  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!activeDrag || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Convert from SVG [0, 300] to Math [-100, 100] centered at 150
    const rawX = clientX - 150;
    const rawY = -(clientY - 150); // Invert y

    const clampedX = Math.max(-100, Math.min(100, rawX));
    const clampedY = Math.max(-100, Math.min(100, rawY));

    if (activeDrag === 'u') {
      setU({ x: clampedX, y: clampedY });
    } else if (activeDrag === 'v') {
      setV({ x: clampedX, y: clampedY });
    }
  }, [activeDrag]);

  const stopDrag = () => setActiveDrag(null);

  // SVG coordinates centered at (150, 150)
  const uSvg = { x: 150 + u.x, y: 150 - u.y };
  const vSvg = { x: 150 + v.x, y: 150 - v.y };

  return (
    <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-sm select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Compass className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold text-slate-100">Interactive Cosine Similarity Lab</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Drag the arrowheads <span className="text-emerald-400 font-semibold">u (Green)</span> and <span className="text-indigo-400 font-semibold">v (Purple)</span> to observe dot products and angular metrics.
          </p>
        </div>

        {/* Preset Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setU({ x: 80, y: 0 }); setV({ x: 0, y: 80 }); }}
            className="px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            Orthogonal (90°)
          </button>
          <button
            onClick={() => { setU({ x: 70, y: 70 }); setV({ x: -70, y: -70 }); }}
            className="px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            Opposing (180°)
          </button>
          <button
            onClick={() => { setU({ x: 80, y: 30 }); setV({ x: 40, y: 75 }); }}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
            title="Reset"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Interactive Canvas */}
        <div className="flex justify-center p-4 bg-slate-950 rounded-xl border border-slate-800/80 relative">
          <svg
            ref={svgRef}
            width="300"
            height="300"
            viewBox="0 0 300 300"
            onPointerMove={handlePointerMove}
            onPointerUp={stopDrag}
            onPointerLeave={stopDrag}
            className="overflow-visible cursor-crosshair touch-none"
          >
            {/* Grid Lines */}
            <circle cx="150" cy="150" r="100" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />
            <line x1="30" y1="150" x2="270" y2="150" stroke="#334155" strokeWidth="1.5" />
            <line x1="150" y1="30" x2="150" y2="270" stroke="#334155" strokeWidth="1.5" />

            {/* Vector u (Green) */}
            <line
              x1="150"
              y1="150"
              x2={uSvg.x}
              y2={uSvg.y}
              stroke="#34d399"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <circle
              cx={uSvg.x}
              cy={uSvg.y}
              r="8"
              fill="#10b981"
              stroke="#ecfdf5"
              strokeWidth="2"
              className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
              onPointerDown={(e) => { e.stopPropagation(); setActiveDrag('u'); }}
            />
            <text x={uSvg.x + 10} y={uSvg.y - 10} fill="#34d399" fontSize="12" fontWeight="bold" fontFamily="monospace">u</text>

            {/* Vector v (Purple) */}
            <line
              x1="150"
              y1="150"
              x2={vSvg.x}
              y2={vSvg.y}
              stroke="#a78bfa"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <circle
              cx={vSvg.x}
              cy={vSvg.y}
              r="8"
              fill="#8b5cf6"
              stroke="#f5f3ff"
              strokeWidth="2"
              className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
              onPointerDown={(e) => { e.stopPropagation(); setActiveDrag('v'); }}
            />
            <text x={vSvg.x + 10} y={vSvg.y - 10} fill="#a78bfa" fontSize="12" fontWeight="bold" fontFamily="monospace">v</text>

            {/* Angle Arc */}
            <path
              d={`M 150 150 L ${150 + Math.cos(0) * 25} 150`}
              fill="none"
              stroke="#64748b"
              strokeWidth="1"
            />
          </svg>

          <div className="absolute top-2 left-3 text-[10px] font-mono text-slate-500">
            Drag circle heads to rotate
          </div>
        </div>

        {/* Real-Time Mathematical Metrics Panel */}
        <div className="space-y-4 font-mono">
          <div className={`p-3.5 rounded-xl border ${metrics.colorClass} flex items-center justify-between`}>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-sans font-semibold">Orientation Status</div>
              <div className="text-sm font-bold mt-0.5">{metrics.status}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black">{metrics.cosSim.toFixed(4)}</div>
              <div className="text-[10px] text-slate-400">cos(θ)</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Angle θ:</span>
              <span className="text-slate-100 font-bold text-sm">{metrics.angleDeg.toFixed(1)}°</span>
              <span className="text-slate-500 text-[10px] block">({metrics.angleRad.toFixed(3)} rad)</span>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Dot Product uᵀv:</span>
              <span className="text-slate-100 font-bold text-sm">{metrics.dot.toFixed(1)}</span>
              <span className="text-slate-500 text-[10px] block">u₁v₁ + u₂v₂</span>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Norm ‖u‖₂:</span>
              <span className="text-emerald-400 font-bold text-sm">{metrics.normU.toFixed(1)}</span>
              <span className="text-slate-500 text-[10px] block">u = [{u.x.toFixed(0)}, {u.y.toFixed(0)}]</span>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Norm ‖v‖₂:</span>
              <span className="text-purple-400 font-bold text-sm">{metrics.normV.toFixed(1)}</span>
              <span className="text-slate-500 text-[10px] block">v = [{v.x.toFixed(0)}, {v.y.toFixed(0)}]</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-[11px] font-sans text-slate-300">
            <span className="font-semibold text-emerald-300">Vector Search / RAG Invariant:</span> Cosine similarity measures angular alignment while being completely <strong>magnitude-invariant</strong>: scaling vector <code className="text-emerald-300">‖u‖</code> by $10\times$ leaves $\cos \theta$ completely unchanged.
          </div>
        </div>
      </div>
    </div>
  );
};
