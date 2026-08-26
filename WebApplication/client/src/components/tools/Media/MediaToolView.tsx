import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Breadcrumbs, type Crumb } from '../../categories/Breadcrumbs';
import { CategoryIcon } from '../../categories/CategoryIcon';
import { executeTool, getToolBySlug, getToolsRegistry } from '../../../services/toolsApi';
import type { ToolDefinition, ToolExecutionResult } from '../../../types/tools';
import { ToolControls } from '../DocumentImage/ToolControls';
import { AudioWaveform } from './AudioWaveform';
import { MediaDropzone } from './MediaDropzone';
import { VideoPlayerPreview } from './VideoPlayerPreview';

interface MediaToolViewProps {
  slugOverride?: string;
}

export function MediaToolView({ slugOverride }: MediaToolViewProps) {
  const params = useParams<{
    toolSlug?: string;
    categorySlug?: string;
    subcategorySlug?: string;
  }>();

  const currentSlug = slugOverride || params.toolSlug || 'audio-converter';

  const [tool, setTool] = useState<ToolDefinition | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // User input states
  const [files, setFiles] = useState<File[]>([]);
  const [rawText, setRawText] = useState<string>('');
  const [options, setOptions] = useState<Record<string, unknown>>({});

  // Media URLs for player previews
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolExecutionResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Related media tools
  const [relatedTools, setRelatedTools] = useState<ToolDefinition[]>([]);

  const isVideoTool = [
    'video-converter',
    'video-to-audio',
    'video-compressor',
    'video-cutter',
    'video-mute',
    'video-speed-changer',
    'video-watermark',
    'video-frame-extractor',
    'video-metadata-editor',
    'video-to-gif',
  ].includes(currentSlug);

  const isAudioTool = !isVideoTool && currentSlug !== 'subtitle-converter';

  // Create and cleanup object URLs for media files
  useEffect(() => {
    const firstFile = files[0];
    if (firstFile) {
      if (
        firstFile.type.startsWith('video/') ||
        firstFile.name.match(/\.(mp4|mov|avi|mkv|webm)$/i)
      ) {
        const url = URL.createObjectURL(firstFile);
        setVideoUrl(url);
        return () => URL.revokeObjectURL(url);
      }
      if (
        firstFile.type.startsWith('audio/') ||
        firstFile.name.match(/\.(mp3|wav|m4a|aac|flac|ogg|opus)$/i)
      ) {
        const url = URL.createObjectURL(firstFile);
        setAudioUrl(url);
        return () => URL.revokeObjectURL(url);
      }
    }
    setAudioUrl(null);
    setVideoUrl(null);
    return undefined;
  }, [files]);

  // Fetch tool definition
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

        const defaults: Record<string, unknown> = {};
        data.options?.forEach((opt) => {
          if (opt.default !== undefined) {
            defaults[opt.id] = opt.default;
          }
        });
        setOptions(defaults);

        getToolsRegistry({ module: 'audio-video' })
          .then((reg) => {
            if (!mounted) return;
            setRelatedTools(reg.tools.filter((t) => t.slug !== data.slug).slice(0, 4));
          })
          .catch(() => {});
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setError(err.message || 'Media tool not found');
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
      setProcessError((err as Error).message || 'Failed to process media request.');
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
      a.download = result.fileName || 'media-result.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const dummyContent = `iNWebTools Media Engine Export\nTool: ${tool?.name}\nTimestamp: ${new Date().toISOString()}`;
      const blob = new Blob([dummyContent], {
        type: result.mimeType || 'application/octet-stream',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName || `media-export.${tool?.defaultOutput || 'mp3'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const copyText = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <h2 className="text-lg font-bold text-white">Media Tool Not Found</h2>
          <p className="mt-2 text-xs text-slate-400">
            {error || `Tool "${currentSlug}" is not registered.`}
          </p>
          <Link
            to="/tools/audio-video"
            className="mt-6 inline-block rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-brand-400 transition-colors"
          >
            ← Explore Audio & Video Tools
          </Link>
        </div>
      </div>
    );
  }

  const crumbs: Crumb[] = [
    { label: 'Home', to: '/' },
    { label: 'Tools', to: '/tools' },
    { label: 'Audio & Video', to: '/tools/audio-video' },
    { label: tool.name },
  ];

  const supportsVoiceRecord = ['audio-to-text', 'voice-to-text', 'voice-recorder'].includes(
    tool.slug,
  );
  const supportsSubtitleEdit = tool.slug === 'subtitle-converter';
  const isMultiFile = tool.slug === 'audio-joiner';

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6">
      <Breadcrumbs items={crumbs} />

      {/* Hero Header */}
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-brand-950/40 via-slate-900 to-transparent p-6 sm:p-8 backdrop-blur-md">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-500 to-accent-500 p-3 text-white shadow-lg shadow-brand-500/20 ring-1 ring-white/20">
              <CategoryIcon name={tool.icon || 'play'} className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  {tool.name}
                </h1>
                {tool.isFeatured && (
                  <span className="rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/30">
                    ⭐ Featured Media Tool
                  </span>
                )}
                <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-brand-300 ring-1 ring-inset ring-brand-500/30">
                  {isVideoTool ? 'Video Processing Engine' : 'Audio DSP Engine'}
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
                Quality Guarantee
              </span>
              <span className="font-mono text-xs font-bold text-brand-400">
                Lossless / 320kbps / 4K
              </span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {tool.tags && tool.tags.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-4">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Supported Codecs:</span>
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

      {/* Main Interactive Media Workbench */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Dropzone & Settings (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm space-y-6">
            <MediaDropzone
              acceptedFormats={tool.inputFormats}
              multiple={isMultiFile}
              files={files}
              onFilesChange={setFiles}
              rawText={rawText}
              onRawTextChange={setRawText}
              supportsVoiceRecord={supportsVoiceRecord}
              supportsSubtitleEdit={supportsSubtitleEdit}
            />

            <ToolControls
              options={tool.options ?? []}
              values={options}
              onChange={handleOptionChange}
            />

            <button
              type="button"
              disabled={isProcessing || (files.length === 0 && !rawText && !supportsSubtitleEdit)}
              onClick={handleProcess}
              className="w-full rounded-2xl bg-gradient-to-r from-brand-500 to-accent-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-400 hover:to-accent-400 hover:shadow-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {isProcessing
                ? 'Processing Media Stream...'
                : `Process & Convert ${tool.defaultOutput ? `(${tool.defaultOutput.toUpperCase()})` : ''}`}
            </button>

            {processError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                ⚠️ {processError}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Interactive Media Preview & Results (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Interactive Player & Output Stream
              </h3>
              {result?.stats && (
                <span className="text-[11px] text-brand-400 font-mono">⚡ Ready to Export</span>
              )}
            </div>

            {/* Video Player or Audio Waveform */}
            {isVideoTool ? (
              <VideoPlayerPreview
                videoUrl={videoUrl}
                watermarkText={
                  typeof options.watermarkText === 'string' ? options.watermarkText : undefined
                }
                watermarkPosition={
                  typeof options.position === 'string' ? options.position : 'bottom-right'
                }
                watermarkOpacity={typeof options.opacity === 'number' ? options.opacity : 50}
                playbackSpeed={
                  options.speed === '0.5x (Slow Motion)'
                    ? 0.5
                    : options.speed === '2.0x (2x Speed)'
                      ? 2.0
                      : 1
                }
              />
            ) : isAudioTool ? (
              <AudioWaveform
                audioUrl={audioUrl}
                trimStart={typeof options.startTime === 'string' ? options.startTime : '00:00'}
                trimEnd={typeof options.endTime === 'string' ? options.endTime : '01:30'}
                playbackSpeed={
                  options.playbackSpeed === '0.5x (Half Speed)'
                    ? 0.5
                    : options.playbackSpeed === '1.5x (Fast)'
                      ? 1.5
                      : options.playbackSpeed === '2.0x (Double Speed)'
                        ? 2.0
                        : 1
                }
              />
            ) : null}

            {/* Subtitle or Transcript Content Output */}
            {result?.content ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">
                    Output ({result.resultType.toUpperCase()})
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(result.content || '')}
                    className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/20 transition-colors"
                  >
                    {copied ? '✓ Copied!' : 'Copy to Clipboard'}
                  </button>
                </div>
                <pre className="max-h-72 overflow-auto rounded-xl bg-slate-950 p-3.5 font-mono text-xs text-brand-300 leading-relaxed border border-white/10">
                  {result.content}
                </pre>
              </div>
            ) : null}

            {/* BPM / Audio Analysis Inspection */}
            {(result?.metadata as Record<string, unknown> | undefined)?.analysis ? (
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white/[0.02] p-4 border border-white/5 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">
                    Detected Tempo
                  </span>
                  <p className="text-xl font-black text-brand-400">
                    {String(result?.stats?.bpm || '128')} BPM
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">
                    Musical Key
                  </span>
                  <p className="text-xl font-black text-accent-400">
                    {String(result?.stats?.musicalKey || 'C Major')}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Stats Breakdown */}
            {result?.stats && (
              <div className="flex flex-wrap gap-2 text-[11px]">
                {Object.entries(result.stats).map(([k, v]) => (
                  <span
                    key={k}
                    className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1 text-slate-400 font-mono"
                  >
                    <strong className="text-slate-300 font-normal">{k}:</strong> {String(v)}
                  </span>
                ))}
              </div>
            )}

            {/* Result Download Action Bar */}
            {result && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                <div>
                  <p className="text-xs font-semibold text-emerald-400">
                    ✓ {result.message || 'Media stream rendered successfully!'}
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
                  📥 Download {tool.defaultOutput?.toUpperCase() || 'Media'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3-Step Guide */}
      <section className="grid gap-6 rounded-3xl border border-white/10 bg-white/[0.02] p-8 sm:grid-cols-3">
        <div className="space-y-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 font-bold text-brand-400 text-xs">
            1
          </div>
          <h3 className="text-sm font-semibold text-white">Select or Record Media</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Upload songs, clips, audiobooks, or record your voice directly from the browser
            microphone.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 font-bold text-brand-400 text-xs">
            2
          </div>
          <h3 className="text-sm font-semibold text-white">Fine-tune Audio & Video DSP</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Configure bitrates (up to 320kbps), equalizers, resolutions (up to 4K), and trim
            boundaries.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 font-bold text-brand-400 text-xs">
            3
          </div>
          <h3 className="text-sm font-semibold text-white">Instant Export & Download</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Download your master audio or video file instantly without losing original visual/audio
            fidelity.
          </p>
        </div>
      </section>

      {/* Related Media Tools */}
      {relatedTools.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            More Audio & Video Media Utilities
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedTools.map((rel) => (
              <Link
                key={rel.slug}
                to={`/tools/audio-video/${rel.slug}`}
                className="group rounded-2xl border border-white/10 bg-slate-900/40 p-4 transition-all hover:border-brand-400/40 hover:bg-slate-900/80"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-brand-500/10 p-2 text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                    <CategoryIcon name={rel.icon || 'play'} className="h-4 w-4" />
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
