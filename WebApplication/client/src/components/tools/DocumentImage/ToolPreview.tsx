import { useEffect, useRef, useState } from 'react';

import type {
  ColorSwatch,
  ExifData,
  ToolDefinition,
  ToolExecutionResult,
} from '../../../types/tools';

interface ToolPreviewProps {
  tool: ToolDefinition;
  files: File[];
  rawText?: string;
  result: ToolExecutionResult | null;
  options: Record<string, unknown>;
  loading: boolean;
}

export function ToolPreview({ tool, files, rawText, result, options, loading }: ToolPreviewProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const firstFile = files[0];

  useEffect(() => {
    if (firstFile && firstFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(firstFile);
      setImageSrc(url);
      return () => URL.revokeObjectURL(url);
    }
    setImageSrc(null);
    return undefined;
  }, [firstFile]);

  // Live Canvas Filter Rendering
  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      canvas.width = Math.min(img.width, 800);
      canvas.height = (img.height / img.width) * canvas.width;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const filterType = String(options.filterType || '');
      const intensity = Number(options.intensity || 75) / 100;

      if (filterType === 'vintage') {
        ctx.fillStyle = `rgba(255, 220, 150, ${0.2 * intensity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (filterType === 'vignette') {
        const gradient = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.2,
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.7,
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${0.7 * intensity})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (filterType === 'grayscale') {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const avg = (d[i]! + d[i + 1]! + d[i + 2]!) / 3;
          d[i] = d[i]! + (avg - d[i]!) * intensity;
          d[i + 1] = d[i + 1]! + (avg - d[i + 1]!) * intensity;
          d[i + 2] = d[i + 2]! + (avg - d[i + 2]!) * intensity;
        }
        ctx.putImageData(imgData, 0, 0);
      } else if (filterType === 'sepia') {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i]!;
          const g = d[i + 1]!;
          const b = d[i + 2]!;
          d[i] = Math.min(
            255,
            (r * 0.393 + g * 0.769 + b * 0.189) * intensity + r * (1 - intensity),
          );
          d[i + 1] = Math.min(
            255,
            (r * 0.349 + g * 0.686 + b * 0.168) * intensity + g * (1 - intensity),
          );
          d[i + 2] = Math.min(
            255,
            (r * 0.272 + g * 0.534 + b * 0.131) * intensity + b * (1 - intensity),
          );
        }
        ctx.putImageData(imgData, 0, 0);
      } else if (filterType === 'glitch') {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        const offset = Math.round(15 * intensity) * 4;
        for (let i = 0; i < d.length - offset; i += 4) {
          d[i] = d[i + offset]!;
        }
        ctx.putImageData(imgData, 0, 0);
      }

      // Watermark Overlay preview if applicable
      if (options.watermarkText) {
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = `rgba(255, 255, 255, ${(Number(options.opacity) || 40) / 100})`;
        ctx.textAlign = 'right';
        ctx.fillText(String(options.watermarkText), canvas.width - 20, canvas.height - 20);
      }
    };
  }, [imageSrc, options]);

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedHex(text);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Live Interactive Preview & Output
        </h3>
        {result?.stats?.processingTimeMs !== undefined && (
          <span className="text-[11px] text-brand-400 font-mono">
            ⚡ Processed in {String(result.stats.processingTimeMs)}ms
          </span>
        )}
      </div>

      <div className="relative min-h-[320px] rounded-2xl border border-white/10 bg-slate-950/80 p-5 overflow-hidden flex flex-col justify-center">
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
            <p className="mt-3 text-xs font-medium text-brand-300 animate-pulse">
              Processing {tool.name}...
            </p>
          </div>
        )}

        {/* 1. Palette Result (Color Picker) */}
        {result?.palette && result.palette.length > 0 ? (
          <div className="space-y-4">
            <h4 className="text-xs font-medium text-slate-300">
              Extracted Color Harmony Palette ({result.palette.length} Colors)
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {result.palette.map((color: ColorSwatch) => (
                <div
                  key={color.hex}
                  onClick={() => copyToClipboard(color.hex)}
                  className="group cursor-pointer rounded-xl border border-white/10 bg-white/[0.02] p-3 transition-all hover:border-brand-400/50 hover:bg-white/[0.06]"
                >
                  <div
                    className="h-16 w-full rounded-lg shadow-inner ring-1 ring-white/10 group-hover:scale-[1.02] transition-transform"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-white">{color.hex}</span>
                    <span className="text-[10px] text-slate-400">
                      {copiedHex === color.hex ? '✓ Copied' : `${color.dominance}%`}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">{color.name}</p>
                </div>
              ))}
            </div>
          </div>
        ) : result?.metadata && (result.metadata as ExifData).camera ? (
          /* 2. EXIF Metadata Viewer */
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-slate-300">Camera & Exposure Metadata</h4>
            <div className="max-h-72 overflow-y-auto space-y-2 text-xs">
              {(() => {
                const meta = result.metadata as ExifData;
                return (
                  <>
                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/[0.02] p-3 border border-white/5">
                      <div>
                        <span className="text-slate-400 text-[10px]">Camera Make/Model</span>
                        <p className="text-white font-medium">
                          {meta.camera.make} {meta.camera.model}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Lens</span>
                        <p className="text-white font-medium">{meta.camera.lens}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Aperture / ISO</span>
                        <p className="text-brand-400 font-mono">
                          {meta.exposure.fNumber} · ISO {meta.exposure.iso}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Shutter Speed</span>
                        <p className="text-brand-400 font-mono">{meta.exposure.exposureTime}</p>
                      </div>
                    </div>
                    {meta.gps && (
                      <div className="rounded-xl bg-brand-500/10 p-3 border border-brand-500/20 text-brand-300">
                        <span className="text-[10px] uppercase font-semibold">
                          📍 Geolocation Data
                        </span>
                        <p className="text-xs font-medium text-white">{meta.gps.locationName}</p>
                        <p className="font-mono text-[10px] text-brand-400">
                          Lat: {meta.gps.latitude.toFixed(4)}, Lon: {meta.gps.longitude.toFixed(4)}
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        ) : result?.content ? (
          /* 3. Text / JSON / Markdown / XML output */
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">
                Converted Output ({result.resultType.toUpperCase()})
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(result.content || '')}
                className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/20 transition-colors"
              >
                {copiedHex === result.content ? '✓ Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
            <pre className="max-h-72 overflow-auto rounded-xl bg-slate-900/90 p-3.5 font-mono text-xs text-brand-300 leading-relaxed border border-white/10">
              {result.content}
            </pre>
          </div>
        ) : imageSrc ? (
          /* 4. Canvas Image Preview with Live Filters */
          <div className="space-y-2 flex flex-col items-center">
            <div className="relative overflow-hidden rounded-xl border border-white/10 max-h-72">
              <canvas ref={canvasRef} className="max-h-72 w-auto object-contain" />
            </div>
            <p className="text-[11px] text-slate-400">
              Live canvas preview showing applied adjustments
            </p>
          </div>
        ) : (
          /* 5. Default Placeholder */
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-slate-400 mb-3">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-slate-200">Ready to Process</h4>
            <p className="mt-1 max-w-xs text-xs text-slate-400">
              {rawText
                ? 'Text payload detected. Click "Process & Convert" below.'
                : 'Upload your file or enter content on the left to see live processing preview.'}
            </p>
          </div>
        )}
      </div>

      {/* Stats and metadata footer badge */}
      {result?.stats && (
        <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
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
    </div>
  );
}
