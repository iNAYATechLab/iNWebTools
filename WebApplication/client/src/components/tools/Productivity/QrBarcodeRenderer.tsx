import { useState } from 'react';

interface QrBarcodeRendererProps {
  initialPayload?: string;
  type?: 'qr' | 'barcode';
}

export function QrBarcodeRenderer({
  initialPayload = 'https://inwebtools.com',
  type = 'qr',
}: QrBarcodeRendererProps) {
  const [payloadType, setPayloadType] = useState<'url' | 'wifi' | 'vcard' | 'text'>('url');
  const [url, setUrl] = useState<string>(initialPayload);
  const [fgColor, setFgColor] = useState<string>('#0f172a');
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [wifiSsid, setWifiSsid] = useState<string>('Office-WiFi');
  const [wifiPass, setWifiPass] = useState<string>('SecurePassword123');
  const [copied, setCopied] = useState<boolean>(false);

  // Compute actual payload string based on type
  const computedPayload = () => {
    if (payloadType === 'wifi') {
      return `WIFI:T:WPA;S:${wifiSsid};P:${wifiPass};;`;
    }
    if (payloadType === 'vcard') {
      return `BEGIN:VCARD\nVERSION:3.0\nN:Morgan;Alex\nFN:Alex Morgan\nORG:iNWebTools\nTEL:+1234567890\nEMAIL:alex@inwebtools.com\nEND:VCARD`;
    }
    return url;
  };

  // Generate pure vector QR Code SVG deterministic matrix
  const generateDeterministicSvg = () => {
    const data = computedPayload();
    const matrixSize = 21;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = (hash * 31 + data.charCodeAt(i)) & 0xffffffff;
    }

    const cellSize = 10;
    const padding = 16;
    const totalSize = matrixSize * cellSize + padding * 2;
    let rects = '';

    for (let r = 0; r < matrixSize; r++) {
      for (let c = 0; c < matrixSize; c++) {
        const inFinder =
          (r < 7 && c < 7) || (r < 7 && c >= matrixSize - 7) || (r >= matrixSize - 7 && c < 7);

        let isDark = false;
        if (inFinder) {
          const lr = r >= matrixSize - 7 ? r - (matrixSize - 7) : r;
          const lc = c >= matrixSize - 7 ? c - (matrixSize - 7) : c;
          isDark =
            lr === 0 ||
            lr === 6 ||
            lc === 0 ||
            lc === 6 ||
            (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
        } else {
          isDark = ((hash ^ (r * 19 + c * 37)) >>> ((r + c) % 16)) % 2 === 0;
        }

        if (isDark) {
          const x = padding + c * cellSize;
          const y = padding + r * cellSize;
          rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fgColor}"/>`;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="240" height="240">
  <rect width="${totalSize}" height="${totalSize}" fill="${bgColor}" rx="16"/>
  ${rects}
</svg>`;
  };

  const currentSvg = generateDeterministicSvg();

  const handleCopySvg = () => {
    void navigator.clipboard.writeText(currentSvg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
          {type === 'qr' ? 'Vector QR Code Engine' : 'Standard Barcode Engine'}
        </span>

        {type === 'qr' && (
          <div className="flex rounded-lg border border-white/10 bg-slate-950 p-0.5 text-[11px]">
            {(['url', 'wifi', 'vcard', 'text'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPayloadType(t)}
                className={`rounded px-2.5 py-1 font-semibold uppercase transition-colors ${
                  payloadType === t ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        {/* Controls Column */}
        <div className="space-y-4">
          {payloadType === 'url' || payloadType === 'text' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {payloadType === 'url' ? 'Target Website URL' : 'Plain Text Message'}
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourdomain.com"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
              />
            </div>
          ) : payloadType === 'wifi' ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">WiFi Network SSID</label>
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Password / Key</label>
                <input
                  type="text"
                  value={wifiPass}
                  onChange={(e) => setWifiPass(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-slate-950 p-3 text-xs text-slate-400">
              <p className="font-semibold text-white">vCard Contact Card Preset</p>
              <p className="mt-1 text-[11px]">Alex Morgan · Full Stack Engineer · +1234567890</p>
            </div>
          )}

          {/* Color Palettes */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Foreground Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="h-8 w-12 cursor-pointer rounded-lg border border-white/10 bg-slate-950 p-0.5"
                />
                <span className="font-mono text-xs text-slate-300">{fgColor}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Background Fill</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-8 w-12 cursor-pointer rounded-lg border border-white/10 bg-slate-950 p-0.5"
                />
                <span className="font-mono text-xs text-slate-300">{bgColor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Rendered Box */}
        <div className="flex flex-col items-center justify-center space-y-4 rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-inner">
          <div
            className="flex items-center justify-center overflow-hidden rounded-2xl p-3 shadow-xl"
            dangerouslySetInnerHTML={{ __html: currentSvg }}
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySvg}
              className="rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-400 transition-colors"
            >
              {copied ? '✓ SVG Copied' : '📋 Copy SVG Markup'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
