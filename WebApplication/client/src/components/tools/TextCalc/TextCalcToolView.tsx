import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Breadcrumbs, type Crumb } from '../../categories/Breadcrumbs';
import { CategoryIcon } from '../../categories/CategoryIcon';
import { executeTool, getToolBySlug, getToolsRegistry } from '../../../services/toolsApi';
import type { ToolDefinition, ToolExecutionResult } from '../../../types/tools';
import { ToolControls } from '../DocumentImage/ToolControls';
import { CodeEditor } from '../Developer/CodeEditor';
import { DiffViewer } from './DiffViewer';
import { UnitConversionTable } from './UnitConversionTable';

interface TextCalcToolViewProps {
  slugOverride?: string;
}

const DEFAULT_SAMPLES: Record<string, string> = {
  'word-character-counter': `iNWebTools provides ultra-high performance web utilities, speech-to-text engines, cryptographic analyzers, and mathematical processors directly within your web browser.

It operates with zero telemetry, high precision, and military-grade encryption standards for modern developers, researchers, and global enterprises.`,

  'readability-score-analyzer': `The exponential development of distributed computing architecture has facilitated the integration of cryptographic validation protocols within modern browser runtimes. Consequently, computational latency has decreased dramatically.`,

  'sentiment-analyzer': `The new version is absolutely fantastic, extraordinarily fast, and remarkably reliable! I love using it daily.`,

  'read-time-estimator': `Welcome to the future of high-speed web productivity tools. In this guide, we will explore the core advantages of local in-memory transformations and zero-latency client processing.`,

  'case-converter': `enterprise developer utilities and financial calculators`,

  'remove-duplicate-lines': `Apple\nBanana\nOrange\nApple\nGrapes\nBanana\nMango\nApple`,

  'text-diff-checker': ``,

  'text-reverser': `iNWebTools Enterprise 2026`,

  'line-sorter': `Zebra\nApple\nMango\nBanana\nOrange\nPineapple`,

  'url-email-extractor': `Contact our team at support@inwebtools.com or security@inwebtools.com. For API documentation, visit https://inwebtools.com/docs and https://api.inwebtools.com.`,

  'url-slug-generator': `What are the Top Developer Utilities for 2026?`,

  'lorem-ipsum-generator': ``,

  'zalgo-text-generator': `CURSED GLITCH SYSTEM`,

  'markdown-to-html': `# Welcome to iNWebTools\n\n**High-speed** developer suite.\n\n- Zero latency\n- 100% Client privacy\n\n[Explore Tools](https://inwebtools.com)`,

  'loan-emi-calculator': ``,
  'compound-interest-calculator': ``,
  'simple-interest-calculator': ``,
  'sales-tax-vat-calculator': ``,
  'discount-margin-calculator': ``,
  'cagr-roi-calculator': ``,
  'inflation-calculator': ``,
  'percentage-calculator': ``,
  'statistics-mean-std-dev': `12, 18, 25, 34, 45, 60, 72, 85, 90, 100`,

  'length-distance-converter': `100`,
  'weight-mass-converter': `75`,
  'temperature-converter': `25`,
  'digital-data-speed-converter': `1024`,
};

export function TextCalcToolView({ slugOverride }: TextCalcToolViewProps) {
  const params = useParams<{
    toolSlug?: string;
    categorySlug?: string;
    subcategorySlug?: string;
  }>();

  const currentSlug = slugOverride || params.toolSlug || 'word-character-counter';

  const [tool, setTool] = useState<ToolDefinition | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Inputs & Options
  const [inputData, setInputData] = useState<string>('');
  const [options, setOptions] = useState<Record<string, unknown>>({});

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolExecutionResult | null>(null);

  // Related tools
  const [relatedTools, setRelatedTools] = useState<ToolDefinition[]>([]);

  const isDiffTool = currentSlug === 'text-diff-checker';
  const isUnitConverter = [
    'length-distance-converter',
    'weight-mass-converter',
    'temperature-converter',
    'digital-data-speed-converter',
  ].includes(currentSlug);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setResult(null);

    const initial = DEFAULT_SAMPLES[currentSlug] ?? 'Sample text or number...';
    setInputData(initial);

    getToolBySlug(currentSlug)
      .then((data) => {
        if (!mounted) return;
        setTool(data);
        document.title = `${data.name} — iNWebTools`;

        const defaults: Record<string, unknown> = {};
        data.options?.forEach((opt) => {
          if (opt.default !== undefined) {
            defaults[opt.id] = opt.default;
          }
        });
        setOptions(defaults);

        getToolsRegistry({ module: 'text-calculators' })
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

  const handleOptionChange = (id: string, value: unknown) => {
    setOptions((prev) => ({ ...prev, [id]: value }));
  };

  const handleExecute = async () => {
    if (!tool) return;
    setIsProcessing(true);
    setProcessError(null);

    try {
      const response = await executeTool(tool.slug, [], options, inputData);
      setResult(response.result);
    } catch (err) {
      setProcessError((err as Error).message || 'Calculation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiffCompare = (orig: string, mod: string) => {
    setOptions((prev) => ({ ...prev, originalText: orig, modifiedText: mod }));
    void handleExecute();
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
          <h2 className="text-lg font-bold text-white">Tool Not Found</h2>
          <p className="mt-2 text-xs text-slate-400">
            {error || `Tool "${currentSlug}" is not registered.`}
          </p>
          <Link
            to="/tools/text-calculators"
            className="mt-6 inline-block rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-brand-400 transition-colors"
          >
            ← Explore Text & Calculator Hub
          </Link>
        </div>
      </div>
    );
  }

  const crumbs: Crumb[] = [
    { label: 'Home', to: '/' },
    { label: 'Tools', to: '/tools' },
    { label: 'Text & Calculators', to: '/tools/text-calculators' },
    { label: tool.name },
  ];

  const metaObj = result?.metadata as Record<string, unknown> | undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6">
      <Breadcrumbs items={crumbs} />

      {/* Hero Header */}
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-brand-950/40 via-slate-900 to-transparent p-6 sm:p-8 backdrop-blur-md">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-500 to-accent-500 p-3 text-white shadow-lg shadow-brand-500/20 ring-1 ring-white/20">
              <CategoryIcon name={tool.icon || 'type'} className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  {tool.name}
                </h1>
                {tool.isFeatured && (
                  <span className="rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/30">
                    ⭐ High Precision
                  </span>
                )}
                <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-brand-300 ring-1 ring-inset ring-brand-500/30">
                  Real-time DSP
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-300 max-w-3xl">
                {tool.tagline || tool.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-1.5 text-right">
              <span className="block text-[10px] uppercase font-semibold text-slate-400">
                Calculation Precision
              </span>
              <span className="font-mono text-xs font-bold text-emerald-400">
                Double Float / Exact
              </span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {tool.tags && tool.tags.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-4">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Tags:</span>
            {tool.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-slate-300"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Interactive Options Bar */}
      {tool.options && tool.options.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-sm">
          <ToolControls options={tool.options} values={options} onChange={handleOptionChange} />
        </div>
      )}

      {/* Diff Checker View Mode */}
      {isDiffTool ? (
        <DiffViewer
          originalText={
            typeof options.originalText === 'string'
              ? options.originalText
              : 'Hello World\nLine two\nLine three'
          }
          modifiedText={
            typeof options.modifiedText === 'string'
              ? options.modifiedText
              : 'Hello World\nLine two modified\nLine three\nLine four added'
          }
          onCompare={handleDiffCompare}
        />
      ) : (
        /* Standard Dual Workbench */
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Input Data */}
          <div className="space-y-4 lg:col-span-6">
            <CodeEditor
              label="Source Text / Parameters"
              value={inputData}
              onChange={setInputData}
              language="text"
              placeholder="Type or paste your text or calculation input..."
              onSampleLoad={() => setInputData(DEFAULT_SAMPLES[currentSlug] || '')}
            />

            <button
              type="button"
              onClick={handleExecute}
              disabled={isProcessing}
              className="w-full rounded-2xl bg-gradient-to-r from-brand-500 to-accent-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-400 hover:to-accent-400 hover:shadow-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? '⚡ Computing...' : '⚡ Calculate & Transform'}
            </button>

            {processError && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
                ⚠️ {processError}
              </div>
            )}
          </div>

          {/* Right Column: Results & Telemetry */}
          <div className="space-y-4 lg:col-span-6">
            {/* Unit Conversion Matrix */}
            {isUnitConverter && metaObj ? (
              <UnitConversionTable
                units={metaObj as Record<string, string>}
                title={`${tool.name} Scales`}
              />
            ) : null}

            {/* Structured Metrics or Financial Output */}
            {metaObj && !isUnitConverter ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Calculation Breakdown
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-400">✓ Exact Computed</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(metaObj).map(([k, v]) => {
                    if (typeof v === 'object' && v !== null) {
                      return (
                        <div
                          key={k}
                          className="col-span-2 rounded-xl bg-white/[0.02] p-3 border border-white/5 space-y-1.5"
                        >
                          <span className="text-[11px] font-semibold uppercase text-brand-400">
                            {k}
                          </span>
                          <pre className="font-mono text-xs text-slate-300 overflow-auto">
                            {JSON.stringify(v, null, 2)}
                          </pre>
                        </div>
                      );
                    }
                    return (
                      <div key={k} className="rounded-xl bg-white/[0.02] p-3 border border-white/5">
                        <span className="text-[10px] font-semibold uppercase text-slate-500">
                          {k.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <p className="mt-1 text-sm font-mono font-bold text-slate-200">
                          {String(v)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Standard Text or Code Output */}
            {result?.content ? (
              <CodeEditor
                label="Transformed Output"
                value={result.content}
                readOnly
                language={tool.defaultOutput || 'text'}
                fileName={result.fileName}
              />
            ) : null}

            {/* Telemetry Bar */}
            {result?.stats && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Output Telemetry
                </h4>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {Object.entries(result.stats).map(([k, v]) => (
                    <span
                      key={k}
                      className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-1.5 text-slate-300 font-mono"
                    >
                      <strong className="text-brand-400 font-normal">{k}:</strong> {String(v)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3-Step Guide */}
      <section className="grid gap-6 rounded-3xl border border-white/10 bg-white/[0.02] p-8 sm:grid-cols-3">
        <div className="space-y-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 font-bold text-brand-400 text-xs">
            1
          </div>
          <h3 className="text-sm font-semibold text-white">Input Values & Text</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Enter articles, financial loan variables, numbers, or measurement scales into the
            workbench.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 font-bold text-brand-400 text-xs">
            2
          </div>
          <h3 className="text-sm font-semibold text-white">Instant Analytical Processing</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Our optimized algorithms calculate formulas and text heuristics with microsecond
            response times.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 font-bold text-brand-400 text-xs">
            3
          </div>
          <h3 className="text-sm font-semibold text-white">Copy or Export Output</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            One-click copy for transformed strings, markdown HTML outputs, or amortization
            breakdowns.
          </p>
        </div>
      </section>

      {/* Related Tools */}
      {relatedTools.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            More Text Utilities & Calculators
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedTools.map((rel) => (
              <Link
                key={rel.slug}
                to={`/tools/text-calculators/${rel.slug}`}
                className="group rounded-2xl border border-white/10 bg-slate-900/40 p-4 transition-all hover:border-brand-400/40 hover:bg-slate-900/80"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-brand-500/10 p-2 text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                    <CategoryIcon name={rel.icon || 'type'} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-xs font-semibold text-slate-200 group-hover:text-white">
                      {rel.name}
                    </h3>
                    <p className="truncate text-[10px] text-slate-400">{rel.tagline}</p>
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
