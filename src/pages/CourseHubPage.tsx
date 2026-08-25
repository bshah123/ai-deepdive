import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  BookOpen,
  FileText,
  ChevronRight,
  Code,
  Layers,
  Compass,
  Activity,
  TrendingUp,
  Cpu,
  Calculator,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { NormBallsWidget } from '../components/explainers/NormBallsWidget';
import { CosineSimilarityWidget } from '../components/explainers/CosineSimilarityWidget';
import { LeastSquaresWidget } from '../components/explainers/LeastSquaresWidget';
import { EigenTransformWidget } from '../components/explainers/EigenTransformWidget';
import { PCAPlaygroundWidget } from '../components/explainers/PCAPlaygroundWidget';

export const CourseHubPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'explainers' | 'topics' | 'proofs' | 'references'>('explainers');
  const [activeExplainer, setActiveExplainer] = useState<'norms' | 'cosine' | 'ols' | 'eigen' | 'pca'>('norms');
  const [topicFilter, setTopicFilter] = useState<'all' | 'la' | 'theory' | 'opt' | 'nn'>('all');

  const foundationTopics = [
    {
      id: 'la-norms',
      category: 'la',
      title: 'Vector Norms, Metric Geometry & Hölder Invariance',
      formula: '‖x‖_p = (∑ |x_i|^p)^(1/p)  |  1/p + 1/q = 1',
      summary: 'Norm axioms (separation, absolute homogeneity, subadditivity). Comparison of ℓ₁ sparsity vs ℓ₂ Euclidean rotational invariance and ℓ_∞ max bounds. Hölder and Cauchy-Schwarz inequalities.',
      linkedLesson: '/lesson/20.1'
    },
    {
      id: 'la-projection',
      category: 'la',
      title: 'Orthogonal Projections & OLS Normal Equations',
      formula: 'P = X(XᵀX)⁻¹Xᵀ  |  β̂ = (XᵀX)⁻¹Xᵀy',
      summary: 'Derivation of Ordinary Least Squares from subspace projection geometry. Proof that residual vector e = y - Xβ̂ is strictly orthogonal to the column space (Xᵀe = 0).',
      linkedLesson: '/lesson/20.1'
    },
    {
      id: 'la-conditioning',
      category: 'la',
      title: 'Matrix Condition Number κ(A) & Sensitivity Bounds',
      formula: 'κ₂(A) = σ_max / σ_min  |  ‖δx‖/‖x‖ ≤ κ(A) (‖δb‖/‖b‖)',
      summary: 'Quantitative measurement of numerical error amplification in floating-point operations. Why ill-conditioned matrices lose decimal precision and how Ridge regularization (Tikhonov) restores stability.',
      linkedLesson: '/lesson/20.4'
    },
    {
      id: 'la-spectral',
      category: 'la',
      title: 'Spectral Theorem & Rotate · Scale · Rotate Decomposition',
      formula: 'A = U Λ Uᵀ  (for real symmetric A)',
      summary: 'Orthogonal diagonalization of symmetric matrices. The 3-stage geometric transformation: rotate into eigenbasis (Uᵀ), scale along principal axes (Λ), and rotate back (U).',
      linkedLesson: '/lesson/20.2'
    },
    {
      id: 'opt-quadratic',
      category: 'opt',
      title: 'Quadratic Forms & Rayleigh Quotient Optimization',
      formula: 'R_A(x) = (xᵀAx) / (xᵀx)  |  λ_min ≤ R_A(x) ≤ λ_max',
      summary: 'Second-order curvature analysis, positive definiteness criteria (A ≻ 0), Hessian eigenvalues, and the Rayleigh-Ritz theorem proving PCA principal components via Lagrange multipliers.',
      linkedLesson: '/lesson/20.5'
    },
    {
      id: 'theory-concentration',
      category: 'theory',
      title: 'Concentration Inequalities (Markov, Chebyshev, Hoeffding)',
      formula: 'P(|X̄_n - μ| ≥ ε) ≤ 2 exp(-2nε² / (b - a)²)',
      summary: 'Mathematical bounds on sample average deviations. Progression from Markov (first moment) to Chebyshev (variance) to Hoeffding (exponential tail decay for bounded losses).',
      linkedLesson: '/lesson/19.4'
    },
    {
      id: 'theory-pac',
      category: 'theory',
      title: 'PAC Learning, Sample Complexity & VC Dimension',
      formula: 'n ≥ (1 / 2ε²) (ln(2|H|) + ln(1/δ))',
      summary: 'Probably Approximately Correct learning framework. Uniform convergence via Union Bound, finite sample complexity, point shattering, and Sauer-Shelah polynomial bounds.',
      linkedLesson: '/lesson/19.5'
    },
    {
      id: 'theory-ebm',
      category: 'theory',
      title: 'Energy-Based Models (EBM) & Loss Functionals',
      formula: 'L_margin = max(0, m + E(Y_pos) - E(Y_neg))',
      summary: 'Unnormalized energy surfaces E(W, Y, X). Inference as energy minimization (argmin_y E(y)). Why negative contrastive terms are strictly required to prevent energy surface collapse.',
      linkedLesson: '/lesson/19.6'
    },
    {
      id: 'nn-perceptron',
      category: 'nn',
      title: 'Perceptron Learning Algorithm & Novikoff Proof',
      formula: 'k ≤ (R / γ)²',
      summary: 'Step-by-step formal convergence proof for linearly separable datasets with margin γ and bounding radius R. Geometric proof that mistake count k is strictly bounded.',
      linkedLesson: '/lesson/21.4'
    }
  ];

  const filteredTopics = foundationTopics.filter(t => {
    if (topicFilter === 'all') return true;
    return t.category === topicFilter;
  });

  return (
    <div className="min-h-screen pb-20 pt-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans text-slate-100">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-8 shadow-2xl mb-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5" />
            Foundations & Visual Lab
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-slate-800/80 text-slate-300 border border-slate-700">
            Interactive AI/ML Foundations
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-emerald-950/50 text-emerald-300 border border-emerald-800/60">
            5 Live Visualizers · 9 Core Mathematical Invariants
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
          Mathematical Foundations & Visual Explainer Lab
        </h1>
        <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed mb-6">
          Explore the mathematical spine of machine learning from first principles: metric geometry, spectral eigendecomposition, numerical conditioning, concentration inequalities, and learning theory proofs.
        </p>

        {/* Feature Stat Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-400 block font-semibold">Visual Simulators:</span>
            <span className="text-indigo-300 font-medium font-mono">5 Live Canvas Labs</span>
            <span className="text-slate-500 text-[11px] block">ℓₚ balls, OLS, PCA, Eigen, Cosine</span>
          </div>
          <div>
            <span className="text-slate-400 block font-semibold">Mathematical Proofs:</span>
            <span className="text-slate-200 font-medium font-mono">Novikoff · Rayleigh · PCA</span>
            <span className="text-slate-500 text-[11px] block">Step-by-step algebraic derivations</span>
          </div>
          <div>
            <span className="text-slate-400 block font-semibold">Learning Theory:</span>
            <span className="text-slate-200 font-medium font-mono">Hoeffding · PAC · VC-Dim</span>
            <span className="text-slate-500 text-[11px] block">Sample complexity bounds</span>
          </div>
          <div>
            <span className="text-slate-400 block font-semibold">Compiler Environment:</span>
            <span className="text-emerald-400 font-medium font-mono">In-Browser Python 3.12</span>
            <span className="text-slate-500 text-[11px] block">Local WASM + PyTorch Cloud</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 mb-8 overflow-x-auto pb-2 text-sm font-medium">
        <button
          onClick={() => setActiveTab('explainers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'explainers'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Interactive Visualizers (5 Labs)
        </button>

        <button
          onClick={() => setActiveTab('topics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'topics'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          Mathematical Invariants & Subtopics
        </button>

        <button
          onClick={() => setActiveTab('proofs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'proofs'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          Formal Proofs & Code Labs
        </button>

        <button
          onClick={() => setActiveTab('references')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'references'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Classical Literature & Texts
        </button>
      </div>

      {/* TAB 1: INTERACTIVE VISUALIZERS */}
      {activeTab === 'explainers' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Select Visualizer Lab:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveExplainer('norms')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  activeExplainer === 'norms'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                1. ℓₚ Unit Balls in ℝ²
              </button>
              <button
                onClick={() => setActiveExplainer('cosine')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  activeExplainer === 'cosine'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                2. Cosine Similarity Lab
              </button>
              <button
                onClick={() => setActiveExplainer('ols')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  activeExplainer === 'ols'
                    ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                3. OLS Subspace Projection
              </button>
              <button
                onClick={() => setActiveExplainer('eigen')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  activeExplainer === 'eigen'
                    ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                4. Spectral Theorem (Rotate·Scale)
              </button>
              <button
                onClick={() => setActiveExplainer('pca')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  activeExplainer === 'pca'
                    ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                5. PCA Covariance Playground
              </button>
            </div>
          </div>

          {activeExplainer === 'norms' && <NormBallsWidget />}
          {activeExplainer === 'cosine' && <CosineSimilarityWidget />}
          {activeExplainer === 'ols' && <LeastSquaresWidget />}
          {activeExplainer === 'eigen' && <EigenTransformWidget />}
          {activeExplainer === 'pca' && <PCAPlaygroundWidget />}
        </div>
      )}

      {/* TAB 2: MATHEMATICAL INVARIANTS & SUBTOPICS */}
      {activeTab === 'topics' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-xs text-slate-300 font-semibold">Filter Mathematical Categories:</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => setTopicFilter('all')}
                className={`px-3 py-1 rounded-lg border transition ${topicFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
              >
                All Topics ({foundationTopics.length})
              </button>
              <button
                onClick={() => setTopicFilter('la')}
                className={`px-3 py-1 rounded-lg border transition ${topicFilter === 'la' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
              >
                Linear Algebra & Conditioning
              </button>
              <button
                onClick={() => setTopicFilter('opt')}
                className={`px-3 py-1 rounded-lg border transition ${topicFilter === 'opt' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
              >
                Quadratic Optimization
              </button>
              <button
                onClick={() => setTopicFilter('theory')}
                className={`px-3 py-1 rounded-lg border transition ${topicFilter === 'theory' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
              >
                Learning Theory & Bounds
              </button>
              <button
                onClick={() => setTopicFilter('nn')}
                className={`px-3 py-1 rounded-lg border transition ${topicFilter === 'nn' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
              >
                Perceptrons & Neural Networks
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTopics.map((item) => (
              <div
                key={item.id}
                className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div className="space-y-3">
                  <h3 className="font-bold text-base text-slate-100">{item.title}</h3>
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-xs text-indigo-300 overflow-x-auto">
                    {item.formula}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {item.summary}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
                    Category: {item.category.toUpperCase()}
                  </span>
                  <Link
                    to={item.linkedLesson}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 group"
                  >
                    <span>Read Complete Lesson</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: FORMAL PROOFS & CODE LABS */}
      {activeTab === 'proofs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Proof 1: Perceptron Novikoff */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-[11px] font-mono text-indigo-400 font-bold block mb-1">PROOF #1</span>
              <h3 className="font-bold text-slate-100">Novikoff's Perceptron Convergence Theorem</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Theorem: If dataset is separable with margin γ = min yᵢ(w* · xᵢ) and bounding radius R = max ‖xᵢ‖, the algorithm makes at most <strong>k ≤ (R/γ)² updates</strong>.
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-indigo-300 block">Lower Bound: ‖w_k‖² ≥ k² γ²</span>
                <span className="text-slate-400 text-[11px]">Since w_k · w* grows by at least γ on every mistake.</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-indigo-300 block">Upper Bound: ‖w_k‖² ≤ k R²</span>
                <span className="text-slate-400 text-[11px]">Since updates occur only on misclassified points yᵢ(w_k-1 · xᵢ) ≤ 0.</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-emerald-400 font-bold block">Result: k² γ² ≤ k R² ⇒ k ≤ (R/γ)²</span>
              </div>
            </div>

            <Link
              to="/lesson/21.4"
              className="inline-flex items-center justify-center w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
            >
              Open Interactive Lesson 21.4
            </Link>
          </div>

          {/* Proof 2: PCA Rayleigh Quotient */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-[11px] font-mono text-amber-400 font-bold block mb-1">PROOF #2</span>
              <h3 className="font-bold text-slate-100">PCA Maximum Variance via Lagrange Multipliers</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Theorem: Maximizing projected sample variance max_‖v‖=1 vᵀCv over sample covariance C = (1/n)XᵀX yields the <strong>principal eigenvector corresponding to λ_max</strong>.
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-amber-300 block">Lagrangian: L(v, λ) = vᵀCv - λ(vᵀv - 1)</span>
                <span className="text-slate-400 text-[11px]">Constraining unit direction ‖v‖² = 1.</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-amber-300 block">Stationary Point: ∇_v L = 2Cv - 2λv = 0</span>
                <span className="text-slate-400 text-[11px]">Directly produces the eigenvalue problem Cv = λv.</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-emerald-400 font-bold block">Variance: vᵀCv = vᵀ(λv) = λ ‖v‖² = λ_max</span>
              </div>
            </div>

            <Link
              to="/lesson/20.5"
              className="inline-flex items-center justify-center w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition"
            >
              Open Interactive Lesson 20.5
            </Link>
          </div>

          {/* Proof 3: Sigmoid Derivative */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-[11px] font-mono text-sky-400 font-bold block mb-1">PROOF #3</span>
              <h3 className="font-bold text-slate-100">Sigmoid Derivative from First Principles</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Theorem: The logistic activation σ(z) = 1 / (1 + e⁻ᶻ) satisfies the recurrence relation <strong>σ'(z) = σ(z)(1 - σ(z))</strong>.
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-sky-300 block">Quotient Rule: d/dz (1 + e⁻ᶻ)⁻¹ = e⁻ᶻ / (1 + e⁻ᶻ)²</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-sky-300 block">Factoring: (1 / (1 + e⁻ᶻ)) · (e⁻ᶻ / (1 + e⁻ᶻ))</span>
                <span className="text-slate-400 text-[11px]">Notice e⁻ᶻ / (1 + e⁻ᶻ) = 1 - σ(z).</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-emerald-400 font-bold block">Result: σ'(z) = σ(z) · (1 - σ(z))</span>
              </div>
            </div>

            <Link
              to="/lesson/21.2"
              className="inline-flex items-center justify-center w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition"
            >
              Open Interactive Lesson 21.2
            </Link>
          </div>

          {/* Proof 4: Matrix Trace Commutativity */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-[11px] font-mono text-purple-400 font-bold block mb-1">PROOF #4</span>
              <h3 className="font-bold text-slate-100">Cyclic Trace Property for Matrix Products</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Theorem: For any matrices A ∈ ℝᵐˣⁿ and B ∈ ℝⁿˣᵐ, <strong>tr(AB) = tr(BA)</strong>, even though matrix multiplication is generally non-commutative (AB ≠ BA).
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-purple-300 block">Summation: tr(AB) = ∑ᵢ (AB)ᵢᵢ = ∑ᵢ ∑ⱼ Aᵢⱼ Bⱼᵢ</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-purple-300 block">Swapping Sums: ∑ⱼ ∑ᵢ Bⱼᵢ Aᵢⱼ = ∑ⱼ (BA)ⱼⱼ</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-emerald-400 font-bold block">Result: tr(AB) = tr(BA) (Cyclic Permutation Invariant)</span>
              </div>
            </div>

            <Link
              to="/lesson/20.1"
              className="inline-flex items-center justify-center w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition"
            >
              Open Interactive Lesson 20.1
            </Link>
          </div>
        </div>
      )}

      {/* TAB 4: REFERENCES & CLASSICAL LITERATURE */}
      {activeTab === 'references' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-100 text-sm">Probabilistic Machine Learning</h4>
            <p className="text-xs text-slate-400">Kevin P. Murphy · MIT Press, 2022/2023</p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Comprehensive reference on Bayesian methods, graphical models, variational inference, and deep generative architectures.
            </p>
            <a
              href="https://probml.github.io/pml-book-group/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              <span>Book Homepage</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-100 text-sm">Learning from Data</h4>
            <p className="text-xs text-slate-400">Y. Abu-Mostafa, M. Magdon-Ismail, H. Lin · AMLBook, 2017</p>
            <p className="text-xs text-slate-300 leading-relaxed">
              The classic text on statistical learning theory, VC dimension, Hoeffding bounds, and the Feasibility of Learning.
            </p>
            <a
              href="https://amlbook.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              <span>Book Homepage</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-100 text-sm">Introduction to Applied Linear Algebra</h4>
            <p className="text-xs text-slate-400">S. Boyd & L. Vandenberghe · Cambridge, 2018</p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Vectors, matrices, and least squares with applications in data science, tomography, and engineering control.
            </p>
            <a
              href="https://web.stanford.edu/~boyd/vmls/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              <span>Free PDF Download</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
