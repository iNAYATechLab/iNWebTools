import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Breadcrumbs, type Crumb } from '../../categories/Breadcrumbs';
import { CategoryIcon } from '../../categories/CategoryIcon';
import { executeTool, getToolBySlug, getToolsRegistry } from '../../../services/toolsApi';
import type { ToolDefinition, ToolExecutionResult } from '../../../types/tools';
import { CodeEditor } from '../Developer/CodeEditor';
import { InteractiveTimer } from './InteractiveTimer';
import { KanbanBoard } from './KanbanBoard';
import { MarkdownNotepad } from './MarkdownNotepad';
import { QrBarcodeRenderer } from './QrBarcodeRenderer';

interface ProductivityToolViewProps {
  slugOverride?: string;
}

const DEFAULT_SAMPLES: Record<string, string> = {
  'ai-prompt-enhancer':
    'Write a modern React hook for managing websocket connections with reconnection backoff.',
  'ai-content-rewriter':
    'Our company creates high performance software that is easy for developers to use and saves a lot of time.',
  'ai-summary-generator':
    'iNWebTools provides 218+ online utilities spanning document conversion, audio transcription, image editing, cryptography, SEO audits, CSS generators, and AI assistants. All operations prioritize zero server storage and privacy.',
  'ai-grammar-checker': 'Their is several issues with this sentense that needs fixing immediately.',
  'ai-headline-generator': 'Artificial Intelligence and Developer Workflow Automation in 2026',
  'ai-email-writer':
    'requesting an extension on the project deliverable due to new scope additions',
  'ai-bio-generator': 'Alex Morgan',
  'qr-code-generator': 'https://inwebtools.com/tools/ai-productivity',
  'custom-qr-styling': 'https://inwebtools.com',
  'barcode-generator': '9780201896831',
  'timezone-converter': 'UTC',
  'unix-timestamp-converter': String(Math.floor(Date.now() / 1000)),
  'age-calculator': '2000-01-01',
  'date-difference-calculator': '2026-01-01',
  'working-days-calculator': '2026-01-01',
  'random-choice-wheel':
    'Deploy to Production\nRun Full E2E Test Suite\nRefactor CSS Architecture\nTake a 15-Minute Coffee Break',
};

export function ProductivityToolView({ slugOverride }: ProductivityToolViewProps) {
  const params = useParams<{
    toolSlug?: string;
    categorySlug?: string;
    subcategorySlug?: string;
  }>();

  const currentSlug = slugOverride || params.toolSlug || 'ai-prompt-enhancer';

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

  // Specialized view checks
  const isTimerTool = ['pomodoro-timer', 'countdown-timer', 'stopwatch-timer'].includes(
    currentSlug,
  );
  const isQrBarcodeTool = ['qr-code-generator', 'custom-qr-styling', 'barcode-generator'].includes(
    currentSlug,
  );
  const isKanbanTool = currentSlug === 'kanban-task-board';
  const isMarkdownTool = currentSlug === 'markdown-notepad';

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setResult(null);

    const initial = DEFAULT_SAMPLES[currentSlug] ?? 'Sample productivity data...';
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

        getToolsRegistry({ module: 'ai-productivity' })
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

  const handleExecute = async () => {
    if (!tool) return;
    setIsProcessing(true);
    setProcessError(null);

    try {
      const response = await executeTool(tool.slug, [], options, inputData);
      setResult(response.result);
    } catch (err) {
      setProcessError((err as Error).message || 'Execution failed.');
    } finally {
      setIsProcessing(false);
    }
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
            to="/tools/ai-productivity"
            className="mt-6 inline-block rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-brand-400 transition-colors"
          >
            ← Explore AI & Productivity Hub
          </Link>
        </div>
      </div>
    );
  }

  const crumbs: Crumb[] = [
    { label: 'Home', to: '/' },
    { label: 'Tools', to: '/tools' },
    { label: 'AI & Productivity', to: '/tools/ai-productivity' },
    { label: tool.name },
  ];

  const metaObj = result?.metadata as Record<string, unknown> | undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6">
      <Breadcrumbs items={crumbs} />

      {/* Hero Header */}
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-purple-950/40 via-slate-900 to-transparent p-6 sm:p-8 backdrop-blur-md">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-500 to-brand-500 p-3 text-white shadow-lg shadow-purple-500/20 ring-1 ring-white/20">
              <CategoryIcon name={tool.icon || 'zap'} className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  {tool.name}
                </h1>
                {tool.isFeatured && (
                  <span className="rounded-full bg-purple-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-purple-300 ring-1 ring-inset ring-purple-400/30">
                    ★ Smart Utility
                  </span>
                )}
                <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-brand-300 ring-1 ring-inset ring-brand-500/30">
                  Instant Client Execution
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-300 max-w-3xl">
                {tool.tagline || tool.description}
              </p>
            </div>
          </div>

          <Link
            to="/tools/ai-productivity"
            className="self-start rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors"
          >
            ← All Productivity Tools
          </Link>
        </div>
      </header>

      {/* Render Specialized Dedicated App Widgets */}
      {isTimerTool && (
        <div className="max-w-xl mx-auto">
          <InteractiveTimer
            initialMode={currentSlug === 'stopwatch-timer' ? 'stopwatch' : 'pomodoro'}
          />
        </div>
      )}

      {isQrBarcodeTool && (
        <QrBarcodeRenderer
          initialPayload={inputData}
          type={currentSlug.includes('barcode') ? 'barcode' : 'qr'}
        />
      )}

      {isKanbanTool && <KanbanBoard />}

      {isMarkdownTool && <MarkdownNotepad />}

      {/* Standard Dual Workbench for AI and Calculation Tools */}
      {!isTimerTool && !isKanbanTool && !isMarkdownTool && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Input Data */}
          <div className="space-y-4 lg:col-span-6">
            <CodeEditor
              label="Input Prompt / Text / Parameters"
              value={inputData}
              onChange={setInputData}
              language="text"
              placeholder="Enter your text, dates, or parameters..."
              onSampleLoad={() => setInputData(DEFAULT_SAMPLES[currentSlug] || '')}
            />

            <button
              type="button"
              onClick={handleExecute}
              disabled={isProcessing}
              className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-brand-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-500/25 transition-all duration-200 hover:from-purple-400 hover:to-brand-400 hover:shadow-purple-500/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? '⚡ Computing Engine...' : '⚡ Process & Generate'}
            </button>

            {processError && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
                ⚠️ {processError}
              </div>
            )}
          </div>

          {/* Right Column: Output & Metadata */}
          <div className="space-y-4 lg:col-span-6">
            {/* World Times List */}
            {Array.isArray(metaObj?.worldTimes) && (
              <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 pb-2">
                  Live Global Time Zones
                </h4>
                <div className="space-y-2">
                  {(metaObj.worldTimes as Array<{ city: string; time: string; date: string }>).map(
                    (z) => (
                      <div
                        key={z.city}
                        className="flex items-center justify-between rounded-xl bg-slate-900/60 p-2.5 font-mono text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-200">{z.city}</span>
                          <span className="block text-[10px] text-slate-500">{z.date}</span>
                        </div>
                        <span className="font-bold text-brand-400">{z.time}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* General Metadata Inspection */}
            {Boolean(metaObj && !metaObj.worldTimes) && (
              <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Productivity Telemetry
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-400">✓ Computed</span>
                </div>
                <pre className="max-h-80 overflow-auto font-mono text-xs text-purple-300 leading-relaxed">
                  {JSON.stringify(metaObj, null, 2)}
                </pre>
              </div>
            )}

            {/* Standard Text or Code Output */}
            {result?.content ? (
              <CodeEditor
                label="Generated Output & Content"
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
                  Execution Telemetry
                </h4>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {Object.entries(result.stats).map(([k, v]) => (
                    <span
                      key={k}
                      className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-1.5 text-slate-300 font-mono"
                    >
                      <strong className="text-purple-400 font-normal">{k}:</strong> {String(v)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Related Tools */}
      {relatedTools.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            More AI & Productivity Utilities
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedTools.map((rel) => (
              <Link
                key={rel.slug}
                to={`/tools/ai-productivity/${rel.slug}`}
                className="group rounded-2xl border border-white/10 bg-slate-900/40 p-4 transition-all hover:border-purple-400/40 hover:bg-slate-900/80"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-purple-500/10 p-2 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <CategoryIcon name={rel.icon || 'zap'} className="h-4 w-4" />
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
