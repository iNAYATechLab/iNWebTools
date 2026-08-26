import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Breadcrumbs, type Crumb } from '../../categories/Breadcrumbs';
import { CategoryIcon } from '../../categories/CategoryIcon';
import { executeTool, getToolBySlug, getToolsRegistry } from '../../../services/toolsApi';
import type { ToolDefinition, ToolExecutionResult } from '../../../types/tools';
import { BmiVisualGauge } from './BmiVisualGauge';
import { KinematicsFormulaCard } from './KinematicsFormulaCard';
import { MatrixWorkbench } from './MatrixWorkbench';
import { ScientificKeypad } from './ScientificKeypad';

interface ScienceMathToolViewProps {
  slugOverride?: string;
}

const DEFAULT_OPTIONS_MAP: Record<string, Record<string, unknown>> = {
  'bmi-calculator': { weight: 70, height: 175 },
  'bmr-calculator': { gender: 'male', weight: 70, height: 175, age: 28 },
  'body-fat-percentage-calculator': {
    gender: 'male',
    height: 175,
    waist: 82,
    neck: 38,
    hip: 95,
    weight: 70,
  },
  'ideal-body-weight-calculator': { gender: 'male', height: 175 },
  'waist-to-height-hip-ratio-calculator': { gender: 'male', waist: 80, hip: 95, height: 175 },
  'daily-calorie-intake-calculator': {
    weight: 70,
    height: 175,
    age: 25,
    gender: 'male',
    activityMultiplier: 1.4,
  },
  'water-intake-calculator': { weight: 70, activityMinutes: 30, climate: 'normal' },
  'target-heart-rate-calculator': { age: 25, restingHeartRate: 65 },
  'pregnancy-due-date-calculator': { lastPeriodDate: '2026-01-01', cycleLength: 28 },
  'macro-nutrient-calculator': { dailyCalories: 2000, dietType: 'balanced' },
  'matrix-calculator': {
    operation: 'determinant',
    matrixA: [
      [1, 2],
      [3, 4],
    ],
  },
  'fraction-calculator': { num1: 3, den1: 4, operator: '+', num2: 2, den2: 3 },
  'prime-factorization-tool': { number: 360 },
  'gcd-lcm-calculator': { numbers: '24, 36, 60' },
  'quadratic-equation-solver': { a: 1, b: -5, c: 6 },
  'exponential-logarithm-calculator': { value: 100, base: 10, exponent: 2 },
  'scientific-calculator-online': { expression: 'sin(30) + sqrt(144) + 2^4' },
  'geometry-area-volume-calculator': {
    shape: 'circle',
    radius: 5,
    height: 10,
    width: 8,
    length: 12,
  },
  'speed-velocity-acceleration-calculator': { initialVelocity: 0, acceleration: 9.8, time: 5 },
  'force-newton-calculator': { mass: 10, acceleration: 9.8 },
  'work-energy-calculator': { mass: 5, velocity: 12, height: 10 },
  'ohms-law-calculator': { voltage: 12, resistance: 4 },
  'power-energy-cost-calculator': { powerWatts: 1500, hoursPerDay: 8, costPerKwh: 0.15 },
  'frequency-wavelength-converter': { frequencyHz: 2400000000 },
};

export function ScienceMathToolView({ slugOverride }: ScienceMathToolViewProps) {
  const params = useParams<{
    toolSlug?: string;
    categorySlug?: string;
    subcategorySlug?: string;
  }>();

  const currentSlug = slugOverride || params.toolSlug || 'bmi-calculator';

  const [tool, setTool] = useState<ToolDefinition | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Options & form fields
  const [options, setOptions] = useState<Record<string, unknown>>({});

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolExecutionResult | null>(null);

  // Related tools
  const [relatedTools, setRelatedTools] = useState<ToolDefinition[]>([]);

  // Specialized view checks
  const isBmiTool = currentSlug === 'bmi-calculator';
  const isScientificCalcTool = currentSlug === 'scientific-calculator-online';
  const isMatrixTool = currentSlug === 'matrix-calculator';
  const isKinematicsTool = [
    'speed-velocity-acceleration-calculator',
    'ohms-law-calculator',
    'work-energy-calculator',
    'force-newton-calculator',
  ].includes(currentSlug);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setResult(null);

    const initialOpts = DEFAULT_OPTIONS_MAP[currentSlug] || {};
    setOptions(initialOpts);

    getToolBySlug(currentSlug)
      .then((data) => {
        if (!mounted) return;
        setTool(data);
        document.title = `${data.name} — iNWebTools`;

        getToolsRegistry({ module: 'math-science' })
          .then((reg) => {
            if (!mounted) return;
            setRelatedTools(reg.tools.filter((t) => t.slug !== data.slug).slice(0, 4));
          })
          .catch(() => {});
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setError(err.message || 'Tool not found');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [currentSlug]);

  const handleExecute = async (customOpts?: Record<string, unknown>) => {
    if (!tool) return;
    setIsProcessing(true);
    setProcessError(null);

    const activeOpts = customOpts || options;
    try {
      const response = await executeTool(tool.slug, [], activeOpts);
      setResult(response.result);
    } catch (err) {
      setProcessError((err as Error).message || 'Calculation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOptionChange = (key: string, value: unknown) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 animate-pulse">
        <div className="h-6 w-48 rounded bg-white/5" />
        <div className="h-36 rounded-2xl bg-white/[0.03]" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-80 rounded-2xl bg-white/[0.02]" />
          <div className="h-80 rounded-2xl bg-white/[0.02]" />
        </div>
      </div>
    );
  }

  if (error || !tool) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
          <h2 className="text-lg font-bold text-white">Scientific Tool Not Found</h2>
          <p className="mt-2 text-xs text-slate-400">
            {error || `Tool "${currentSlug}" is not registered.`}
          </p>
          <Link
            to="/tools/math-science"
            className="mt-6 inline-block rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-400 transition-colors"
          >
            ← Explore Scientific Suite
          </Link>
        </div>
      </div>
    );
  }

  const crumbs: Crumb[] = [
    { label: 'Home', to: '/' },
    { label: 'Tools', to: '/tools' },
    { label: 'Health & Science', to: '/tools/math-science' },
    { label: tool.name },
  ];

  const metaObj = result?.metadata as Record<string, unknown> | undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6">
      <Breadcrumbs items={crumbs} />

      {/* Hero Header */}
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-emerald-950/40 via-slate-900 to-transparent p-6 sm:p-8 backdrop-blur-md">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 p-3 text-white shadow-lg shadow-emerald-500/20 ring-1 ring-white/20">
              <CategoryIcon name={tool.icon || 'activity'} className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  {tool.name}
                </h1>
                {tool.isFeatured && (
                  <span className="rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
                    ★ Scientific Standard
                  </span>
                )}
                <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-teal-300 ring-1 ring-inset ring-teal-500/30">
                  Real-Time Computation
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-300 max-w-3xl">
                {tool.description}
              </p>
            </div>
          </div>

          <Link
            to="/tools/math-science"
            className="self-start rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors"
          >
            ← All Scientific Tools
          </Link>
        </div>
      </header>

      {/* Specialized Widgets */}
      {isBmiTool && (
        <div className="max-w-2xl mx-auto">
          <BmiVisualGauge
            bmi={Number(metaObj?.bmi) || 22.86}
            category={String(metaObj?.category || 'Normal Weight')}
            healthyWeightRange={metaObj?.healthyWeightRange as string}
            bmiPrime={metaObj?.bmiPrime as number}
          />
        </div>
      )}

      {isScientificCalcTool && (
        <div className="max-w-xl mx-auto">
          <ScientificKeypad
            onCalculate={(expr) => {
              handleOptionChange('expression', expr);
              void handleExecute({ expression: expr });
            }}
          />
        </div>
      )}

      {isMatrixTool && (
        <MatrixWorkbench
          onMatrixCalculate={(matrixA, op) => {
            handleOptionChange('matrixA', matrixA);
            handleOptionChange('operation', op);
            void handleExecute({ matrixA, operation: op });
          }}
        />
      )}

      {isKinematicsTool && (
        <KinematicsFormulaCard
          topic={
            currentSlug.includes('ohm')
              ? 'ohms'
              : currentSlug.includes('energy')
                ? 'energy'
                : currentSlug.includes('force')
                  ? 'force'
                  : 'kinematics'
          }
        />
      )}

      {/* Interactive Form & Results Workbench */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Parameter Form */}
        <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl lg:col-span-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-white/5 pb-3">
            Input Variables & Options
          </h3>

          <div className="space-y-3">
            {Object.entries(options).map(([k, v]) => (
              <div key={k} className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 capitalize">
                  {k.replace(/([A-Z])/g, ' $1')}
                </label>
                {typeof v === 'number' || typeof v === 'string' ? (
                  <input
                    type={typeof v === 'number' ? 'number' : 'text'}
                    value={String(v)}
                    onChange={(e) =>
                      handleOptionChange(
                        k,
                        typeof v === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={JSON.stringify(v)}
                    onChange={(e) => {
                      try {
                        handleOptionChange(k, JSON.parse(e.target.value));
                      } catch {
                        // ignore
                      }
                    }}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleExecute()}
            disabled={isProcessing}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? '⚡ Computing Engine...' : '⚡ Solve & Compute'}
          </button>

          {processError && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
              ⚠️ {processError}
            </div>
          )}
        </div>

        {/* Right Column: Computed Output */}
        <div className="space-y-4 lg:col-span-6">
          <div className="space-y-3 rounded-3xl border border-white/10 bg-slate-950/90 p-6 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Scientific Output & Telemetry
              </h4>
              <span className="text-[10px] font-mono text-emerald-400">✓ Real-time Verified</span>
            </div>

            {metaObj ? (
              <pre className="max-h-96 overflow-auto font-mono text-xs text-emerald-300 leading-relaxed">
                {JSON.stringify(metaObj, null, 2)}
              </pre>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                Click <strong>Solve & Compute</strong> to evaluate formula results.
              </div>
            )}
          </div>

          {/* Stats Bar */}
          {result?.stats && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Execution Stats
              </h4>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {Object.entries(result.stats).map(([k, v]) => (
                  <span
                    key={k}
                    className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-1.5 text-slate-300 font-mono"
                  >
                    <strong className="text-emerald-400 font-normal">{k}:</strong> {String(v)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Tools */}
      {relatedTools.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            More Health, Math & Science Engines
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedTools.map((rel) => (
              <Link
                key={rel.slug}
                to={`/tools/math-science/${rel.slug}`}
                className="group rounded-2xl border border-white/10 bg-slate-900/40 p-4 transition-all hover:border-emerald-400/40 hover:bg-slate-900/80"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <CategoryIcon name={rel.icon || 'activity'} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-xs font-semibold text-slate-200 group-hover:text-white">
                      {rel.name}
                    </h3>
                    <p className="truncate text-[10px] text-slate-400">{rel.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
