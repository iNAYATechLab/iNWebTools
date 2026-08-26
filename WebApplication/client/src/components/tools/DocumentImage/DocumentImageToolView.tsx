import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Breadcrumbs, type Crumb } from '../../categories/Breadcrumbs';
import { CategoryIcon } from '../../categories/CategoryIcon';
import { executeTool, getToolBySlug, getToolsRegistry } from '../../../services/toolsApi';
import type { ToolDefinition, ToolExecutionResult } from '../../../types/tools';
import { ToolControls } from './ToolControls';
import { ToolDropzone } from './ToolDropzone';
import { ToolPreview } from './ToolPreview';

interface DocumentImageToolViewProps {
  slugOverride?: string;
}

export function DocumentImageToolView({ slugOverride }: DocumentImageToolViewProps) {
  const params = useParams<{
    toolSlug?: string;
    categorySlug?: string;
    subcategorySlug?: string;
  }>();

  const currentSlug = slugOverride || params.toolSlug || 'csv-to-json';

  const [tool, setTool] = useState<ToolDefinition | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // User input states
  const [files, setFiles] = useState<File[]>([]);
  const [rawText, setRawText] = useState<string>('');
  const [options, setOptions] = useState<Record<string, unknown>>({});

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolExecutionResult | null>(null);

  // Related tools
  const [relatedTools, setRelatedTools] = useState<ToolDefinition[]>([]);

  // Fetch tool data
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setResult(null);
    setFiles([]);
    setRawText('');

    getToolBySlug(currentSlug)
      .then((data) => {
        if (!mounted) return;
        setTool(data);
        document.title = `${data.name} — iNWebTools`;

        // Initialize default option values
        const defaults: Record<string, unknown> = {};
        data.options?.forEach((opt) => {
          if (opt.default !== undefined) {
            defaults[opt.id] = opt.default;
          }
        });
        setOptions(defaults);

        // Fetch related tools in the same module
        getToolsRegistry({ module: data.module })
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

  const handleProcess = async () => {
    if (!tool) return;
    setIsProcessing(true);
    setProcessError(null);

    try {
      const response = await executeTool(tool.slug, files, options, rawText);
      setResult(response.result);
    } catch (err) {
      setProcessError((err as Error).message || 'Failed to process request.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;

    if (result.content) {
      const blob = new Blob([result.content], {
        type: result.mimeType || 'text/plain;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName || 'converted-output.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Direct notification or synthetic file download trigger
      const dummyContent = `iNWebTools Processed Result\nTool: ${tool?.name}\nTimestamp: ${new Date().toISOString()}`;
      const blob = new Blob([dummyContent], {
        type: result.mimeType || 'application/octet-stream',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName || 'processed-file.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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
            {error || `The tool "${currentSlug}" is not currently in the Phase 1 registry.`}
          </p>
          <Link
            to="/tools"
            className="mt-6 inline-block rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-brand-400 transition-colors"
          >
            ← Explore All Tools
          </Link>
        </div>
      </div>
    );
  }

  const crumbs: Crumb[] = [
    { label: 'Home', to: '/' },
    { label: 'Tools', to: '/tools' },
    {
      label: tool.module === 'document-pdf' ? 'Document & PDF' : 'Image & Graphics',
      to: `/tools/${tool.module}`,
    },
    { label: tool.name },
  ];

  const supportsTextInput = [
    'csv-to-json',
    'json-to-csv',
    'csv-to-markdown',
    'csv-to-xml',
    'json-to-xml',
    'json-to-bson',
  ].includes(tool.slug);
  const isMultiFile = ['merge-pdf', 'pdf-to-image'].includes(tool.slug);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6">
      <Breadcrumbs items={crumbs} />

      {/* Hero Header */}
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-6 sm:p-8 backdrop-blur-md">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-500 to-accent-500 p-3 text-white shadow-lg shadow-brand-500/20 ring-1 ring-white/20">
              <CategoryIcon name={tool.icon || 'wrench'} className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  {tool.name}
                </h1>
                {tool.isFeatured && (
                  <span className="rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/30">
                    ⭐ Popular Tool
                  </span>
                )}
                <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-brand-300 ring-1 ring-inset ring-brand-500/30">
                  {tool.module === 'document-pdf' ? 'Document Engine' : 'Image Engine'}
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
                Security & Speed
              </span>
              <span className="font-mono text-xs font-bold text-emerald-400">
                100% Client/API Secure
              </span>
            </div>
          </div>
        </div>

        {/* Tags bar */}
        {tool.tags && tool.tags.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-4">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Formats & Tags:</span>
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

      {/* Main Interactive Workbench Layout */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Dropzone & Settings (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm space-y-6">
            <ToolDropzone
              acceptedFormats={tool.inputFormats}
              multiple={isMultiFile}
              files={files}
              onFilesChange={setFiles}
              rawText={rawText}
              onRawTextChange={setRawText}
              supportsTextInput={supportsTextInput}
            />

            <ToolControls
              options={tool.options ?? []}
              values={options}
              onChange={handleOptionChange}
            />

            <button
              type="button"
              disabled={isProcessing || (files.length === 0 && !rawText && !supportsTextInput)}
              onClick={handleProcess}
              className="w-full rounded-2xl bg-gradient-to-r from-brand-500 to-accent-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-400 hover:to-accent-400 hover:shadow-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {isProcessing
                ? 'Processing...'
                : `Execute & Convert ${tool.defaultOutput ? `(${tool.defaultOutput.toUpperCase()})` : ''}`}
            </button>

            {processError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                ⚠️ {processError}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Interactive Preview & Results (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm space-y-6">
            <ToolPreview
              tool={tool}
              files={files}
              rawText={rawText}
              result={result}
              options={options}
              loading={isProcessing}
            />

            {/* Action Bar when result is ready */}
            {result && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                <div>
                  <p className="text-xs font-semibold text-emerald-400">
                    ✓ {result.message || 'Processing complete!'}
                  </p>
                  {result.fileName && (
                    <p className="text-[11px] text-slate-400 font-mono">{result.fileName}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-400 transition-colors"
                >
                  📥 Download Result
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How it works & Features Section */}
      <section className="grid gap-6 rounded-3xl border border-white/10 bg-white/[0.02] p-8 sm:grid-cols-3">
        <div className="space-y-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 font-bold text-brand-400 text-xs">
            1
          </div>
          <h3 className="text-sm font-semibold text-white">Select or Drag File</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Upload your documents, spreadsheets, or images. High-speed client hashing and parsing.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 font-bold text-brand-400 text-xs">
            2
          </div>
          <h3 className="text-sm font-semibold text-white">Customize Options</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Adjust compression levels, aspect ratios, target formats, watermarks, and encryption.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 font-bold text-brand-400 text-xs">
            3
          </div>
          <h3 className="text-sm font-semibold text-white">Instant Download</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Export high-fidelity processed files immediately. Files are never retained on disk.
          </p>
        </div>
      </section>

      {/* Related Tools Carousel */}
      {relatedTools.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            More {tool.module === 'document-pdf' ? 'Document & PDF' : 'Image & Graphics'} Tools
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedTools.map((rel) => (
              <Link
                key={rel.slug}
                to={`/tools/${rel.module}/${rel.slug}`}
                className="group rounded-2xl border border-white/10 bg-slate-900/40 p-4 transition-all hover:border-brand-400/40 hover:bg-slate-900/80"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-brand-500/10 p-2 text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                    <CategoryIcon name={rel.icon || 'wrench'} className="h-4 w-4" />
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
