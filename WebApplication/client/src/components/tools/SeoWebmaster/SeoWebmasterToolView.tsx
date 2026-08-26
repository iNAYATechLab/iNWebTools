import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Breadcrumbs, type Crumb } from '../../categories/Breadcrumbs';
import { CategoryIcon } from '../../categories/CategoryIcon';
import { executeTool, getToolBySlug, getToolsRegistry } from '../../../services/toolsApi';
import type { ToolDefinition, ToolExecutionResult } from '../../../types/tools';
import { ToolControls } from '../DocumentImage/ToolControls';
import { CodeEditor } from '../Developer/CodeEditor';
import { SerpPreviewCard } from './SerpPreviewCard';
import { SocialCardPreview } from './SocialCardPreview';

interface SeoWebmasterToolViewProps {
  slugOverride?: string;
}

const DEFAULT_SAMPLES: Record<string, string> = {
  'xml-sitemap-generator': `https://inwebtools.com\nhttps://inwebtools.com/tools\nhttps://inwebtools.com/tools/developer-code\nhttps://inwebtools.com/tools/security-network\nhttps://inwebtools.com/tools/text-calculators\nhttps://inwebtools.com/docs`,

  'robots-txt-generator': ``,

  'schema-markup-generator': ``,

  'meta-tag-generator': ``,

  'hreflang-tag-generator': `https://inwebtools.com`,

  'canonical-tag-generator': `https://inwebtools.com/tools/developer-code`,

  'serp-snippet-preview': ``,

  'keyword-density-checker': `iNWebTools provides developer tools, security tools, audio transcription, image converters, and network tools. Every tool is designed for high performance, zero latency, and absolute user privacy. With iNWebTools developer tools, you can convert, encode, format, and debug code instantly in your browser.`,

  'htaccess-seo-generator': ``,

  'open-graph-generator': ``,

  'twitter-card-generator': ``,

  'social-image-resizer': ``,

  'youtube-thumbnail-downloader': `https://www.youtube.com/watch?v=dQw4w9WgXcQ`,

  'utm-campaign-builder': ``,
};

export function SeoWebmasterToolView({ slugOverride }: SeoWebmasterToolViewProps) {
  const params = useParams<{
    toolSlug?: string;
    categorySlug?: string;
    subcategorySlug?: string;
  }>();

  const currentSlug = slugOverride || params.toolSlug || 'xml-sitemap-generator';

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

  const isSerpTool = currentSlug === 'serp-snippet-preview';
  const isSocialCardTool = ['open-graph-generator', 'twitter-card-generator'].includes(currentSlug);
  const isYouTubeTool = currentSlug === 'youtube-thumbnail-downloader';

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setResult(null);

    const initial = DEFAULT_SAMPLES[currentSlug] ?? 'Sample SEO input data...';
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

        getToolsRegistry({ module: 'seo-webmaster' })
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
            to="/tools/seo-webmaster"
            className="mt-6 inline-block rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-brand-400 transition-colors"
          >
            ← Explore SEO & Webmaster Hub
          </Link>
        </div>
      </div>
    );
  }

  const crumbs: Crumb[] = [
    { label: 'Home', to: '/' },
    { label: 'Tools', to: '/tools' },
    { label: 'SEO & Webmaster', to: '/tools/seo-webmaster' },
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
              <CategoryIcon name={tool.icon || 'globe'} className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  {tool.name}
                </h1>
                {tool.isFeatured && (
                  <span className="rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/30">
                    ⭐ Webmaster Standard
                  </span>
                )}
                <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-brand-300 ring-1 ring-inset ring-brand-500/30">
                  Google & Social Ready
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
                SEO Indexing
              </span>
              <span className="font-mono text-xs font-bold text-emerald-400">
                Schema.org / Open Graph
              </span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {tool.tags && tool.tags.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-4">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Directives:</span>
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

      {/* SERP Simulator Live View */}
      {isSerpTool && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-md">
          <SerpPreviewCard
            title={typeof options.title === 'string' ? options.title : ''}
            description={typeof options.description === 'string' ? options.description : ''}
            url={typeof options.url === 'string' ? options.url : ''}
          />
        </div>
      )}

      {/* Social Card Simulator Live View */}
      {isSocialCardTool && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-md">
          <SocialCardPreview
            title={typeof options.title === 'string' ? options.title : ''}
            description={typeof options.description === 'string' ? options.description : ''}
            imageUrl={typeof options.imageUrl === 'string' ? options.imageUrl : ''}
          />
        </div>
      )}

      {/* Main Dual Workbench */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Input Data */}
        <div className="space-y-4 lg:col-span-6">
          <CodeEditor
            label="Input Parameters / Content"
            value={inputData}
            onChange={setInputData}
            language="text"
            placeholder="Enter URLs, article text, or parameters..."
            onSampleLoad={() => setInputData(DEFAULT_SAMPLES[currentSlug] || '')}
          />

          <button
            type="button"
            onClick={handleExecute}
            disabled={isProcessing}
            className="w-full rounded-2xl bg-gradient-to-r from-brand-500 to-accent-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-400 hover:to-accent-400 hover:shadow-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? '⚡ Generating Tags...' : '⚡ Generate & Validate'}
          </button>

          {processError && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
              ⚠️ {processError}
            </div>
          )}
        </div>

        {/* Right Column: Results & Telemetry */}
        <div className="space-y-4 lg:col-span-6">
          {/* YouTube Thumbnail Results */}
          {isYouTubeTool && metaObj?.thumbnails ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Available Thumbnail Resolutions
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(metaObj.thumbnails as Record<string, string>).map(
                  ([resKey, url]) => (
                    <div
                      key={resKey}
                      className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/60 p-2 space-y-2"
                    >
                      <img
                        src={url}
                        alt={resKey}
                        className="aspect-video w-full rounded-lg object-cover"
                      />
                      <div className="flex items-center justify-between text-[11px] px-1">
                        <span className="font-mono text-slate-400">
                          {resKey.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-brand-400 hover:underline"
                        >
                          View Full HD →
                        </a>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          ) : null}

          {/* Keyword Density Breakdown Table */}
          {currentSlug === 'keyword-density-checker' && metaObj?.topKeywords ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Top Keyword Density Matrix
                </h4>
                <span className="text-[11px] font-mono text-brand-400">
                  {String(metaObj.totalWords)} Total Words
                </span>
              </div>
              <div className="max-h-72 overflow-auto font-mono text-xs divide-y divide-white/5">
                {(
                  metaObj.topKeywords as Array<{ keyword: string; count: number; density: string }>
                ).map((kw) => (
                  <div key={kw.keyword} className="flex items-center justify-between py-2">
                    <span className="font-bold text-slate-200">{kw.keyword}</span>
                    <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                      <span>{kw.count} hits</span>
                      <span className="font-semibold text-brand-400">{kw.density}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Generic Structured Metadata Inspection (Dimensions, SERP, UTM) */}
          {metaObj && !isYouTubeTool && currentSlug !== 'keyword-density-checker' && (
            <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  SEO Audit Telemetry
                </h4>
                <span className="text-[10px] font-mono text-emerald-400">✓ Validated</span>
              </div>
              <pre className="max-h-96 overflow-auto font-mono text-xs text-brand-300 leading-relaxed">
                {JSON.stringify(metaObj, null, 2)}
              </pre>
            </div>
          )}

          {/* Standard Text or Code Output */}
          {result?.content ? (
            <CodeEditor
              label="Generated Code & Markup"
              value={result.content}
              readOnly
              language={tool.defaultOutput || 'html'}
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
                    <strong className="text-brand-400 font-normal">{k}:</strong> {String(v)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3-Step Guide */}
      <section className="grid gap-6 rounded-3xl border border-white/10 bg-white/[0.02] p-8 sm:grid-cols-3">
        <div className="space-y-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 font-bold text-brand-400 text-xs">
            1
          </div>
          <h3 className="text-sm font-semibold text-white">Enter Site Parameters</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Provide page URLs, titles, keywords, schema entities, or campaign tracking values.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 font-bold text-brand-400 text-xs">
            2
          </div>
          <h3 className="text-sm font-semibold text-white">Live Visual Previews</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Preview search engine snippets, Facebook/Twitter cards, and thumbnail resolutions in
            real-time.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 font-bold text-brand-400 text-xs">
            3
          </div>
          <h3 className="text-sm font-semibold text-white">Export Code & Snippets</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Copy clean XML sitemaps, JSON-LD schema tags, or `.htaccess` rules directly into your
            production site.
          </p>
        </div>
      </section>

      {/* Related SEO Tools */}
      {relatedTools.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            More SEO & Social Media Optimization Utilities
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedTools.map((rel) => (
              <Link
                key={rel.slug}
                to={`/tools/seo-webmaster/${rel.slug}`}
                className="group rounded-2xl border border-white/10 bg-slate-900/40 p-4 transition-all hover:border-brand-400/40 hover:bg-slate-900/80"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-brand-500/10 p-2 text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                    <CategoryIcon name={rel.icon || 'globe'} className="h-4 w-4" />
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
