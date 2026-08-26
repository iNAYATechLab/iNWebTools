import React, { useRef, useState } from 'react';

interface ToolDropzoneProps {
  acceptedFormats?: string[];
  multiple?: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
  rawText?: string;
  onRawTextChange?: (text: string) => void;
  supportsTextInput?: boolean;
}

export function ToolDropzone({
  acceptedFormats = ['.pdf', '.png', '.jpg', '.docx', '.csv', '.json'],
  multiple = false,
  files,
  onFilesChange,
  rawText = '',
  onRawTextChange,
  supportsTextInput = false,
}: ToolDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (multiple) {
        onFilesChange([...files, ...droppedFiles]);
      } else {
        onFilesChange([droppedFiles[0]!]);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      if (multiple) {
        onFilesChange([...files, ...selected]);
      } else {
        onFilesChange([selected[0]!]);
      }
    }
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    onFilesChange(updated);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-4">
      {supportsTextInput && (
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Input Method
          </span>
          <div className="flex rounded-lg bg-white/5 p-1 text-xs">
            <button
              type="button"
              onClick={() => setInputMode('file')}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                inputMode === 'file'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Upload Files
            </button>
            <button
              type="button"
              onClick={() => setInputMode('text')}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                inputMode === 'text'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Direct Code / Text
            </button>
          </div>
        </div>
      )}

      {inputMode === 'file' ? (
        <>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
              isDragOver
                ? 'border-brand-400 bg-brand-500/10 scale-[1.01]'
                : 'border-white/15 bg-white/[0.02] hover:border-brand-400/50 hover:bg-white/[0.04]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple={multiple}
              accept={acceptedFormats.join(',')}
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600/30 to-brand-400/20 text-brand-400 ring-1 ring-brand-400/30 group-hover:scale-110 group-hover:text-brand-300 transition-transform">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>

            <p className="text-sm font-semibold text-white">
              <span className="text-brand-400 underline decoration-brand-400/40 underline-offset-4 group-hover:decoration-brand-400">
                Click to upload
              </span>{' '}
              or drag and drop
            </p>

            <p className="mt-1.5 text-xs text-slate-400">
              Supports {acceptedFormats.slice(0, 6).join(', ')}
              {acceptedFormats.length > 6 ? ` +${acceptedFormats.length - 6} more` : ''} (Up to 25
              MB)
            </p>

            {multiple && (
              <span className="mt-3 inline-flex items-center rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[11px] font-medium text-brand-300 ring-1 ring-inset ring-brand-500/20">
                Multi-file batch mode enabled
              </span>
            )}
          </div>

          {/* Uploaded File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Selected {files.length === 1 ? 'file' : `${files.length} files`}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFilesChange([]);
                  }}
                  className="text-slate-400 hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              </div>

              <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                {files.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 p-2.5 text-xs text-slate-200"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="rounded bg-brand-500/20 p-1.5 text-brand-400 font-mono text-[10px] uppercase">
                        {file.name.split('.').pop() || 'FILE'}
                      </span>
                      <div className="truncate">
                        <p className="truncate font-medium text-slate-200">{file.name}</p>
                        <p className="text-[10px] text-slate-400">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <textarea
            rows={8}
            value={rawText}
            onChange={(e) => onRawTextChange?.(e.target.value)}
            placeholder="Paste your raw text, CSV data, or JSON document here..."
            className="w-full rounded-xl border border-white/15 bg-slate-950/80 p-3.5 font-mono text-xs text-slate-200 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
          <p className="text-[11px] text-slate-400">
            Paste structured content directly without uploading a file.
          </p>
        </div>
      )}
    </div>
  );
}
