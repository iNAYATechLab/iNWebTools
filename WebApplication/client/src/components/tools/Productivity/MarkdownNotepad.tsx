import { useState } from 'react';

const DEFAULT_MARKDOWN = `# 🚀 iNWebTools Enterprise Smart Notepad

Welcome to the **distraction-free**, client-side markdown workspace.

### Key Capabilities:
- **Instant Live Parsing:** View formatted rich text immediately side-by-side.
- **Privacy-First:** Stored locally in your browser session without tracking.
- **Code Highlighting:** Clean monospace blocks for TypeScript, JSON, SQL, and CSS.

\`\`\`typescript
const platform = "iNWebTools";
const toolsCount = 218;
console.log(\`Running \${toolsCount}+ high performance tools on \${platform}!\`);
\`\`\`

> *"Simplicity is prerequisite for reliability."* — Edsger W. Dijkstra
`;

export function MarkdownNotepad() {
  const [markdown, setMarkdown] = useState<string>(DEFAULT_MARKDOWN);
  const [copied, setCopied] = useState<boolean>(false);

  const wordCount = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  const charCount = markdown.length;

  const handleCopy = () => {
    void navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Convert basic markdown to safe HTML preview for side-by-side view
  const renderSimpleMarkdown = (md: string) => {
    return md
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold text-white mb-2">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-slate-100 mb-2">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold text-brand-400 mb-1">$1</h3>')
      .replace(
        /^> (.*$)/gim,
        '<blockquote class="border-l-4 border-brand-500 pl-3 italic text-slate-400 my-2">$1</blockquote>',
      )
      .replace(/\*\*(.*)\*\*/gim, '<strong class="text-white font-bold">$1</strong>')
      .replace(/\*(.*)\*/gim, '<em class="italic text-slate-300">$1</em>')
      .replace(
        /```([\s\S]*?)```/gim,
        '<pre class="bg-slate-950 p-3 rounded-xl font-mono text-xs text-brand-300 overflow-x-auto my-2">$1</pre>',
      )
      .replace(
        /`([^`]+)`/gim,
        '<code class="bg-white/10 px-1 py-0.5 rounded font-mono text-xs text-pink-300">$1</code>',
      )
      .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-slate-300 text-xs my-0.5">$1</li>')
      .replace(/\n$/gim, '<br />');
  };

  return (
    <div className="space-y-4">
      {/* Top Bar with Word Stats & Copy */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <span>{wordCount} Words</span>
          <span>·</span>
          <span>{charCount} Characters</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMarkdown(DEFAULT_MARKDOWN)}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10 transition-colors"
          >
            ↺ Reset Template
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-brand-400 transition-colors"
          >
            {copied ? '✓ Copied' : '📋 Copy Markdown'}
          </button>
        </div>
      </div>

      {/* Side by side editor and preview */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Editor Area */}
        <div className="flex flex-col space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Markdown Source Editor
          </span>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            rows={16}
            placeholder="Write your markdown notes here..."
            className="w-full flex-1 rounded-2xl border border-white/10 bg-slate-950 p-4 font-mono text-xs text-slate-200 leading-relaxed focus:border-brand-500 focus:outline-none"
          />
        </div>

        {/* Live Preview Area */}
        <div className="flex flex-col space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Formatted Live Preview
          </span>
          <div
            className="w-full flex-1 overflow-auto rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-inner leading-relaxed min-h-[340px]"
            dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(markdown) }}
          />
        </div>
      </div>
    </div>
  );
}
