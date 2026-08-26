import { useState, useRef, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react';

interface CodeEditorProps {
  label: string;
  value: string;
  onChange?: (val: string) => void;
  readOnly?: boolean;
  language?: string;
  placeholder?: string;
  onSampleLoad?: () => void;
  fileName?: string;
  onDownload?: () => void;
}

export function CodeEditor({
  label,
  value,
  onChange,
  readOnly = false,
  language = 'javascript',
  placeholder = 'Paste or type your code here...',
  onSampleLoad,
  fileName,
  onDownload,
}: CodeEditorProps) {
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const lines = value ? value.split('\n') : [''];
  const lineCount = lines.length;
  const charCount = value.length;

  const handleCopy = () => {
    if (!value) return;
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(value);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (onChange) onChange('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      if (onChange) onChange(newValue);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onChange) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          onChange(text);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && onChange) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          onChange(text);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden ${
        isDragging
          ? 'border-brand-400 ring-2 ring-brand-400/20 bg-brand-500/5'
          : 'border-white/10 bg-slate-950/80 shadow-xl'
      }`}
    >
      {/* Editor Header Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/10 bg-slate-900/90 px-4 py-2.5 gap-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="ml-2 font-mono text-xs font-bold text-slate-300">{label}</span>
          {language && (
            <span className="rounded bg-brand-500/10 px-2 py-0.5 font-mono text-[10px] text-brand-300 font-medium">
              {language}
            </span>
          )}
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1.5 text-xs">
          {!readOnly && onSampleLoad && (
            <button
              type="button"
              onClick={onSampleLoad}
              className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              💡 Load Sample
            </button>
          )}

          {!readOnly && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                📂 Open File
              </button>
            </>
          )}

          {readOnly && onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-colors"
            >
              📥 Download {fileName ? `(${fileName})` : ''}
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            disabled={!value}
            className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-40 transition-colors"
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>

          {!readOnly && value && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg bg-red-500/10 px-2 py-1 text-[11px] text-red-400 hover:bg-red-500/20 transition-colors"
              title="Clear text"
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Editor Body with Line Numbers */}
      <div className="relative flex min-h-[280px] max-h-[500px] overflow-auto font-mono text-xs">
        {/* Line Numbers Column */}
        <div
          aria-hidden="true"
          className="select-none border-r border-white/5 bg-slate-900/40 px-3 py-3 text-right font-mono text-slate-600"
        >
          {Array.from({ length: Math.max(lineCount, 8) }).map((_, i) => (
            <div key={i} className="leading-6">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={false}
          className="flex-1 resize-none bg-transparent p-3 font-mono text-xs leading-6 text-slate-100 placeholder-slate-600 focus:outline-none selection:bg-brand-500/30"
          style={{ tabSize: 2 }}
        />
      </div>

      {/* Editor Footer Status Bar */}
      <div className="flex items-center justify-between border-t border-white/5 bg-slate-900/60 px-4 py-1.5 text-[10px] font-mono text-slate-500">
        <div>
          <span>{lineCount} lines</span>
          <span className="mx-2">•</span>
          <span>{charCount.toLocaleString()} chars</span>
        </div>
        <div>
          <span>UTF-8</span>
          <span className="mx-2">•</span>
          <span className="text-emerald-400 font-semibold">{readOnly ? 'OUTPUT' : 'INPUT'}</span>
        </div>
      </div>
    </div>
  );
}
