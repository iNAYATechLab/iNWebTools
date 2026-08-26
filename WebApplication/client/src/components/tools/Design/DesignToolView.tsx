import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Breadcrumbs } from '../../categories/Breadcrumbs';
import { executeTool, getToolsRegistry } from '../../../services/toolsApi';
import type { ToolDefinition } from '../../../types/tools';
import { ColorPickerWorkbench } from './ColorPickerWorkbench';
import { CssVisualPreview } from './CssVisualPreview';

interface DesignToolViewProps {
  slugOverride?: string;
}

interface ExecutionResultShape {
  resultType?: string;
  content?: string;
  fileName?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
  stats?: Record<string, unknown>;
}

export function DesignToolView({ slugOverride }: DesignToolViewProps) {
  const { toolSlug: routeSlug } = useParams<{ toolSlug: string }>();
  const toolSlug = slugOverride || routeSlug || 'css-gradient-generator';

  const [tool, setTool] = useState<ToolDefinition | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [executing, setExecuting] = useState<boolean>(false);
  const [result, setResult] = useState<ExecutionResultShape | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Interactive Live State for CSS & Color Controls
  const [primaryColor, setPrimaryColor] = useState<string>('#6366f1');
  const [secondaryColor, setSecondaryColor] = useState<string>('#ec4899');
  const [gradientAngle, setGradientAngle] = useState<string>('135deg');
  const [gradientType, setGradientType] = useState<string>('linear');

  // Shadow controls
  const [shadowX, setShadowX] = useState<number>(0);
  const [shadowY, setShadowY] = useState<number>(10);
  const [shadowBlur, setShadowBlur] = useState<number>(25);
  const [shadowSpread, setShadowSpread] = useState<number>(-5);

  // Border Radius controls
  const [radiusTL, setRadiusTL] = useState<number>(24);
  const [radiusTR, setRadiusTR] = useState<number>(24);
  const [radiusBR, setRadiusBR] = useState<number>(24);
  const [radiusBL, setRadiusBL] = useState<number>(24);

  // Glassmorphism controls
  const [glassBlur, setGlassBlur] = useState<number>(16);
  const [glassOpacity, setGlassOpacity] = useState<number>(0.25);

  // Text/SVG input
  const [rawText, setRawText] = useState<string>('');

  // Fetch registry entry
  useEffect(() => {
    getToolsRegistry({ module: 'color-design' })
      .then((data) => {
        const found = data.tools.find((t) => t.slug === toolSlug);
        setTool(found || null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load tool');
      })
      .finally(() => setLoading(false));
  }, [toolSlug]);

  // Handle server-side tool execution
  const handleExecute = useCallback(async () => {
    setExecuting(true);
    setError(null);
    try {
      const options = {
        hex: primaryColor,
        color1: primaryColor,
        color2: secondaryColor,
        angle: gradientAngle,
        type: gradientType,
        xOffset: shadowX,
        yOffset: shadowY,
        blur: shadowBlur || glassBlur,
        spread: shadowSpread,
        topLeft: radiusTL,
        topRight: radiusTR,
        bottomRight: radiusBR,
        bottomLeft: radiusBL,
        opacity: glassOpacity,
        foreground: primaryColor,
        background: secondaryColor,
      };

      const res = await executeTool(toolSlug, [], options, rawText || primaryColor);

      if (res.result) {
        setResult(res.result as ExecutionResultShape);
      } else {
        throw new Error('No result returned from engine');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to execute design tool');
    } finally {
      setExecuting(false);
    }
  }, [
    toolSlug,
    primaryColor,
    secondaryColor,
    gradientAngle,
    gradientType,
    shadowX,
    shadowY,
    shadowBlur,
    glassBlur,
    shadowSpread,
    radiusTL,
    radiusTR,
    radiusBR,
    radiusBL,
    glassOpacity,
    rawText,
  ]);

  // Run initial calculation when tool changes
  useEffect(() => {
    void handleExecute();
  }, [handleExecute]);

  // Computed Dynamic CSS Style for Live Preview
  const computedCssStyle = useMemo<React.CSSProperties>(() => {
    if (toolSlug === 'css-gradient-generator') {
      if (gradientType === 'radial') {
        return {
          background: `radial-gradient(circle, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          borderRadius: '16px',
        };
      }
      return {
        background: `linear-gradient(${gradientAngle}, ${primaryColor} 0%, ${secondaryColor} 100%)`,
        borderRadius: '16px',
      };
    }

    if (toolSlug === 'css-box-shadow-generator') {
      return {
        backgroundColor: '#1e293b',
        boxShadow: `${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowSpread}px rgba(0, 0, 0, 0.4)`,
        borderRadius: '16px',
      };
    }

    if (toolSlug === 'css-border-radius-generator') {
      return {
        backgroundColor: primaryColor,
        borderRadius: `${radiusTL}px ${radiusTR}px ${radiusBR}px ${radiusBL}px`,
      };
    }

    if (toolSlug === 'css-glassmorphism-generator') {
      return {
        background: `rgba(255, 255, 255, ${glassOpacity})`,
        backdropFilter: `blur(${glassBlur}px)`,
        WebkitBackdropFilter: `blur(${glassBlur}px)`,
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        borderRadius: '16px',
      };
    }

    // Default style
    return {
      backgroundColor: primaryColor,
      borderRadius: '16px',
    };
  }, [
    toolSlug,
    primaryColor,
    secondaryColor,
    gradientAngle,
    gradientType,
    shadowX,
    shadowY,
    shadowBlur,
    shadowSpread,
    radiusTL,
    radiusTR,
    radiusBR,
    radiusBL,
    glassBlur,
    glassOpacity,
  ]);

  // Computed Raw CSS Code String
  const computedRawCss = useMemo(() => {
    if (result?.content) return result.content;

    if (toolSlug === 'css-gradient-generator') {
      return `.gradient-box {\n  background: linear-gradient(${gradientAngle}, ${primaryColor} 0%, ${secondaryColor} 100%);\n}`;
    }
    if (toolSlug === 'css-box-shadow-generator') {
      return `.shadow-box {\n  box-shadow: ${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowSpread}px rgba(0, 0, 0, 0.4);\n}`;
    }
    if (toolSlug === 'css-border-radius-generator') {
      return `.rounded-box {\n  border-radius: ${radiusTL}px ${radiusTR}px ${radiusBR}px ${radiusBL}px;\n}`;
    }
    if (toolSlug === 'css-glassmorphism-generator') {
      return `.glass-card {\n  background: rgba(255, 255, 255, ${glassOpacity});\n  backdrop-filter: blur(${glassBlur}px);\n  -webkit-backdrop-filter: blur(${glassBlur}px);\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);\n  border-radius: 16px;\n}`;
    }
    return '';
  }, [
    result,
    toolSlug,
    primaryColor,
    secondaryColor,
    gradientAngle,
    shadowX,
    shadowY,
    shadowBlur,
    shadowSpread,
    radiusTL,
    radiusTR,
    radiusBR,
    radiusBL,
    glassBlur,
    glassOpacity,
  ]);

  if (loading) {
    return (
      <div className="space-y-4 p-8">
        <div className="h-8 w-1/3 animate-pulse rounded bg-white/5" />
        <div className="h-64 animate-pulse rounded-2xl bg-white/[0.03]" />
      </div>
    );
  }

  const isColorTool =
    toolSlug.includes('converter') ||
    toolSlug.includes('contrast') ||
    toolSlug.includes('palette') ||
    toolSlug.includes('shade') ||
    toolSlug.includes('mixer') ||
    toolSlug.includes('blindness');

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Tools', to: '/tools' },
          { label: 'Color & CSS Design', to: '/tools/color-design' },
          { label: tool?.name || toolSlug },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-400/30 bg-brand-500/10 text-xl font-bold text-brand-400">
              🎨
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {tool?.name || toolSlug}
              </h1>
              <p className="mt-1 text-xs text-brand-300/90 font-medium">
                {tool?.tagline ||
                  'Professional visual CSS & high-precision color engineering engine'}
              </p>
            </div>
          </div>
          {tool?.description && (
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
              {tool.description}
            </p>
          )}
        </div>

        <Link
          to="/tools/color-design"
          className="self-start rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors"
        >
          ← All Design Tools
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
          ⚠️ {error}
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left Column: Interactive Controls Workbench */}
        <div className="space-y-6">
          {/* Color Picker Component */}
          <ColorPickerWorkbench
            initialHex={primaryColor}
            onColorChange={(hex) => setPrimaryColor(hex)}
            showContrastScore={isColorTool}
          />

          {/* Gradient Controls */}
          {toolSlug === 'css-gradient-generator' && (
            <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-md">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Gradient Configuration
              </span>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400">
                    Secondary Stop Color
                  </label>
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-10 w-full cursor-pointer rounded-xl border border-white/10 bg-slate-950 p-1"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400">Gradient Type</label>
                  <select
                    value={gradientType}
                    onChange={(e) => setGradientType(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white"
                  >
                    <option value="linear">Linear Gradient</option>
                    <option value="radial">Radial Gradient</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400">Angle</label>
                  <select
                    value={gradientAngle}
                    onChange={(e) => setGradientAngle(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white"
                  >
                    <option value="90deg">Horizontal (90°)</option>
                    <option value="135deg">Diagonal (135°)</option>
                    <option value="180deg">Vertical (180°)</option>
                    <option value="45deg">Reverse Diagonal (45°)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Glassmorphism Controls */}
          {toolSlug === 'css-glassmorphism-generator' && (
            <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Glass & Backdrop Blur
              </span>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] text-slate-400">Blur: {glassBlur}px</label>
                  <input
                    type="range"
                    min="1"
                    max="40"
                    value={glassBlur}
                    onChange={(e) => setGlassBlur(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Opacity: {glassOpacity}</label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.8"
                    step="0.05"
                    value={glassOpacity}
                    onChange={(e) => setGlassOpacity(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Shadow Controls */}
          {toolSlug === 'css-box-shadow-generator' && (
            <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Shadow Dimensions
              </span>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] text-slate-400">Blur Radius: {shadowBlur}px</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={shadowBlur}
                    onChange={(e) => setShadowBlur(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Spread: {shadowSpread}px</label>
                  <input
                    type="range"
                    min="-20"
                    max="50"
                    value={shadowSpread}
                    onChange={(e) => setShadowSpread(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">X Offset: {shadowX}px</label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={shadowX}
                    onChange={(e) => setShadowX(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Y Offset: {shadowY}px</label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={shadowY}
                    onChange={(e) => setShadowY(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Border Radius Controls */}
          {toolSlug === 'css-border-radius-generator' && (
            <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Corner Radius Sliders
              </span>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] text-slate-400">Top Left: {radiusTL}px</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={radiusTL}
                    onChange={(e) => setRadiusTL(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Top Right: {radiusTR}px</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={radiusTR}
                    onChange={(e) => setRadiusTR(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Bottom Right: {radiusBR}px</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={radiusBR}
                    onChange={(e) => setRadiusBR(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Bottom Left: {radiusBL}px</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={radiusBL}
                    onChange={(e) => setRadiusBL(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SVG / Text Input for vector tools */}
          {(toolSlug.includes('svg') || toolSlug.includes('ratio')) && (
            <div className="space-y-2 rounded-2xl border border-white/10 bg-slate-900/60 p-5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Custom SVG or Dimensions Input
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste SVG markup or enter parameters..."
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 font-mono text-xs text-white focus:border-brand-500 focus:outline-none"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleExecute()}
            disabled={executing}
            className="w-full rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 py-3 text-xs font-bold text-white shadow-lg shadow-brand-500/20 hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {executing ? 'Processing Engine...' : '⚡ Re-compute & Optimize Values'}
          </button>
        </div>

        {/* Right Column: Visual Preview & Live Results */}
        <div className="space-y-6">
          {/* Visual Canvas */}
          <CssVisualPreview
            title={tool?.name || 'Visual CSS Canvas'}
            cssStyle={computedCssStyle}
            rawCss={computedRawCss}
            svgContent={toolSlug.includes('svg') && result?.content ? result.content : undefined}
          />

          {/* Result Metadata / Color Details */}
          {result?.metadata && (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur-md">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Calculated Color & Space Details
              </span>
              <div className="grid gap-2 sm:grid-cols-2 text-xs">
                {Object.entries(result.metadata).map(([key, value]) => {
                  if (typeof value === 'object' && value !== null) {
                    return (
                      <div
                        key={key}
                        className="col-span-full rounded-xl bg-slate-950 p-3 font-mono"
                      >
                        <span className="text-[10px] text-slate-500 uppercase">{key}:</span>
                        <pre className="mt-1 text-[11px] text-brand-300 overflow-x-auto">
                          {JSON.stringify(value, null, 2)}
                        </pre>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-white/5 bg-slate-950 p-2.5 font-mono"
                    >
                      <span className="block text-[10px] text-slate-500 uppercase tracking-wider">
                        {key}
                      </span>
                      <span className="mt-0.5 block font-semibold text-slate-200 truncate">
                        {String(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
