import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Breadcrumbs, type Crumb } from '../../categories/Breadcrumbs';
import { CategoryIcon } from '../../categories/CategoryIcon';
import { executeTool, getToolBySlug, getToolsRegistry } from '../../../services/toolsApi';
import type { ToolDefinition, ToolExecutionResult } from '../../../types/tools';
import { ToolControls } from '../DocumentImage/ToolControls';
import { CodeEditor } from './CodeEditor';

interface DeveloperToolViewProps {
  slugOverride?: string;
}

const DEFAULT_SAMPLES: Record<string, string> = {
  'curl-to-code': `curl -X POST https://api.inwebtools.com/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer my_jwt_token_2026" \\
  -d '{"email": "developer@inwebtools.com", "role": "admin"}'`,

  'json-to-types': `{
  "id": 1024,
  "username": "inayatechlab",
  "email": "inayatechlab@gmail.com",
  "isActive": true,
  "roles": ["architect", "developer"],
  "stats": {
    "totalTools": 1070,
    "rating": 4.98
  }
}`,

  'json-yaml-converter': `{
  "server": {
    "name": "iNWebTools Core Engine",
    "port": 5000,
    "ssl": true
  },
  "database": {
    "type": "postgres",
    "poolSize": 10
  },
  "features": ["audio-dsp", "whisper-asr", "code-generator"]
}`,

  'xml-json-converter': `<?xml version="1.0" encoding="UTF-8"?>
<application>
  <name>iNWebTools Enterprise</name>
  <version>1.0.0</version>
  <modules>
    <module name="developer" active="true"/>
    <module name="media" active="true"/>
  </modules>
</application>`,

  'toml-json-converter': `[package]
name = "inwebtools-core"
version = "0.1.0"
edition = "2024"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1.0", features = ["full"] }`,

  'ndjson-converter': `{"timestamp": "2026-08-26T12:00:00Z", "level": "INFO", "message": "Server started"}
{"timestamp": "2026-08-26T12:00:01Z", "level": "DEBUG", "message": "Database connected pool=10"}
{"timestamp": "2026-08-26T12:00:02Z", "level": "INFO", "message": "Listening on port 5000"}`,

  'protobuf-json-viewer': `syntax = "proto3";
package inwebtools.v1;

message AudioTranscribeRequest {
  bytes audio_stream = 1;
  string target_language = 2;
  bool timestamps = 3;
}`,

  'graphql-schema-parser': `type Query {
  getTool(slug: String!): ToolDefinition
  listCategories(limit: Int): [Category!]!
}

type ToolDefinition {
  id: ID!
  slug: String!
  name: String!
  isFeatured: Boolean
}`,

  'hcl-terraform-converter': `resource "aws_s3_bucket" "tools_storage" {
  bucket = "inwebtools-production-storage"
  acl    = "private"

  tags = {
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}`,

  'php-array-json-converter': `[
  'app_name' => 'iNWebTools',
  'debug' => false,
  'providers' => [
    'DatabaseServiceProvider',
    'AuthServiceProvider'
  ]
]`,

  'plist-json-converter': `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>iNWebTools</string>
  <key>CFBundleVersion</key>
  <string>1.0.0</string>
</dict>
</plist>`,

  'sql-to-json-csv': `INSERT INTO users (id, name, role, is_active) VALUES (1, 'Alice', 'Principal Architect', true);
INSERT INTO users (id, name, role, is_active) VALUES (2, 'Bob', 'Senior Full-Stack Engineer', true);`,

  'csv-to-sql': `id,name,role,salary,department
101,Alice,Principal Architect,140000,Engineering
102,Bob,Senior Full-Stack,110000,Engineering
103,Charlie,Product Designer,95000,Design`,

  'html-minifier-beautifier': `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>iNWebTools Platform</title>
    <!-- Core Metas -->
    <meta charset="utf-8">
  </head>
  <body>
    <div class="container">
      <h1>Developer Suite 2026</h1>
      <p>High performance utilities in real-time.</p>
    </div>
  </body>
</html>`,

  'css-minifier-beautifier': `.card-container {
  display: flex;
  background-color: #0f172a;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}`,

  'js-minifier-beautifier': `function computeMetrics(items) {
  const sum = items.reduce((acc, curr) => acc + curr.value, 0);
  const average = sum / items.length;
  return { sum, average };
}`,

  'sql-formatter-beautifier': `SELECT u.id, u.username, count(t.id) as total_tools FROM users u LEFT JOIN user_tools t ON t.user_id = u.id WHERE u.is_active = TRUE GROUP BY u.id, u.username HAVING count(t.id) > 5 ORDER BY total_tools DESC LIMIT 20;`,

  'nginx-config-formatter': `server {
listen 80;
server_name inwebtools.com;
location / {
proxy_pass http://127.0.0.1:5000;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
}
}`,

  'apache-htaccess-formatter': `RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.html [L,QSA]`,

  'dockerfile-formatter-validator': `from node:20-alpine
workdir /app
copy package*.json ./
run npm ci --omit=dev
copy . .
expose 5000
cmd ["node", "server/index.js"]`,

  'graphql-formatter': `query GetUserTransactions($userId: ID!, $limit: Int = 10) {
  user(id: $userId) {
    id
    name
    transactions(limit: $limit) {
      id
      amount
      currency
      created_at
    }
  }
}`,

  'base64-encoder-decoder': `iNWebTools Enterprise Developer Platform — Fast, Secure & Open Source`,

  'base32-base58-converter': `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa`,

  'url-encoder-decoder': `https://inwebtools.com/search?category=developer-code&query=cURL to Python & Axios Transpiler!`,

  'html-entity-encoder-decoder': `<div class="code-block" data-lang="ts">
  <span>iNWebTools & "High Speed" Transpilers © 2026</span>
</div>`,

  'morse-code-converter': `SOS INWEBTOOLS 2026`,

  'rot13-caesar-cipher': `iNWebTools Enterprise Cryptography Suite`,

  'punycode-converter': `münchen-café.de`,

  'quoted-printable-uuencode': `High-Priority Message = 2026 iNWebTools Release`,

  'number-base-converter': `255`,
};

export function DeveloperToolView({ slugOverride }: DeveloperToolViewProps) {
  const params = useParams<{
    toolSlug?: string;
    categorySlug?: string;
    subcategorySlug?: string;
  }>();

  const currentSlug = slugOverride || params.toolSlug || 'curl-to-code';

  const [tool, setTool] = useState<ToolDefinition | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Input & Output states
  const [inputCode, setInputCode] = useState<string>('');
  const [outputCode, setOutputCode] = useState<string>('');
  const [options, setOptions] = useState<Record<string, unknown>>({});

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolExecutionResult | null>(null);

  // Related developer tools
  const [relatedTools, setRelatedTools] = useState<ToolDefinition[]>([]);

  // Fetch tool definition
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setResult(null);

    const initialSample = DEFAULT_SAMPLES[currentSlug] || 'Sample input data for conversion...';
    setInputCode(initialSample);
    setOutputCode('');

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

        // Fetch related developer tools
        getToolsRegistry({ module: 'developer-code' })
          .then((reg) => {
            if (!mounted) return;
            setRelatedTools(reg.tools.filter((t) => t.slug !== data.slug).slice(0, 4));
          })
          .catch(() => {});
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setError(err.message || 'Developer tool not found');
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

  const handleConvert = async () => {
    if (!tool) return;
    setIsProcessing(true);
    setProcessError(null);

    try {
      const response = await executeTool(tool.slug, [], options, inputCode);
      setResult(response.result);
      if (response.result.content) {
        setOutputCode(response.result.content);
      } else if (response.result.metadata) {
        setOutputCode(JSON.stringify(response.result.metadata, null, 2));
      }
    } catch (err) {
      setProcessError((err as Error).message || 'Conversion failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadOutput = () => {
    if (!outputCode) return;
    const blob = new Blob([outputCode], { type: result?.mimeType || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result?.fileName || `${tool?.slug || 'result'}.${tool?.defaultOutput || 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
          <h2 className="text-lg font-bold text-white">Developer Tool Not Found</h2>
          <p className="mt-2 text-xs text-slate-400">
            {error || `Tool "${currentSlug}" is not registered.`}
          </p>
          <Link
            to="/tools/developer-code"
            className="mt-6 inline-block rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-brand-400 transition-colors"
          >
            ← Explore Developer Tools Hub
          </Link>
        </div>
      </div>
    );
  }

  const crumbs: Crumb[] = [
    { label: 'Home', to: '/' },
    { label: 'Tools', to: '/tools' },
    { label: 'Developer & Code', to: '/tools/developer-code' },
    { label: tool.name },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6">
      <Breadcrumbs items={crumbs} />

      {/* Hero Header */}
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-brand-950/40 via-slate-900 to-transparent p-6 sm:p-8 backdrop-blur-md">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-500 to-accent-500 p-3 text-white shadow-lg shadow-brand-500/20 ring-1 ring-white/20">
              <CategoryIcon name={tool.icon || 'code'} className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  {tool.name}
                </h1>
                {tool.isFeatured && (
                  <span className="rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/30">
                    ⭐ Developer Pick
                  </span>
                )}
                <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-brand-300 ring-1 ring-inset ring-brand-500/30">
                  Real-time Transpiler
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
                Performance
              </span>
              <span className="font-mono text-xs font-bold text-emerald-400">
                0ms Latency / In-Memory
              </span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {tool.tags && tool.tags.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-4">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Tags:</span>
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

      {/* Interactive Options Bar (if tool has options) */}
      {tool.options && tool.options.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-sm">
          <ToolControls options={tool.options} values={options} onChange={handleOptionChange} />
        </div>
      )}

      {/* Main Dual Code Editor Workbench */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Code Editor */}
        <div className="space-y-3">
          <CodeEditor
            label="Source Input"
            value={inputCode}
            onChange={setInputCode}
            language={tool.inputFormats?.[0]?.replace('.', '') || 'text'}
            placeholder="Enter source code or data here..."
            onSampleLoad={() => setInputCode(DEFAULT_SAMPLES[currentSlug] || '')}
          />
        </div>

        {/* Output Code Editor */}
        <div className="space-y-3">
          <CodeEditor
            label="Transpiled Output"
            value={outputCode}
            readOnly
            language={tool.defaultOutput || 'text'}
            placeholder="Click 'Convert & Transpile' below to generate output..."
            fileName={result?.fileName}
            onDownload={handleDownloadOutput}
          />
        </div>
      </div>

      {/* Execution Trigger Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-md shadow-xl">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-sm font-bold text-white">Execute Transformation</h3>
          <p className="text-xs text-slate-400">
            Convert, format, or transpile instantly in your browser sandbox.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleConvert}
            disabled={isProcessing || !inputCode.trim()}
            className="flex-1 sm:flex-none rounded-2xl bg-gradient-to-r from-brand-500 to-accent-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-400 hover:to-accent-400 hover:shadow-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? '⚡ Transpiling...' : '⚡ Convert & Transpile'}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {processError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
          ⚠️ {processError}
        </div>
      )}

      {/* Stats Breakdown Bar */}
      {result?.stats && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Execution Telemetry & Stats
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

      {/* 3-Step Guide */}
      <section className="grid gap-6 rounded-3xl border border-white/10 bg-white/[0.02] p-8 sm:grid-cols-3">
        <div className="space-y-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 font-bold text-brand-400 text-xs">
            1
          </div>
          <h3 className="text-sm font-semibold text-white">Paste or Open File</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Paste cURL requests, JSON payloads, SQL scripts, or drop source files directly into the
            editor.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 font-bold text-brand-400 text-xs">
            2
          </div>
          <h3 className="text-sm font-semibold text-white">Select Language & Target</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Choose target client libraries (Axios, Fetch, Requests), typing models, or minification
            modes.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 font-bold text-brand-400 text-xs">
            3
          </div>
          <h3 className="text-sm font-semibold text-white">Copy or Download</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Instantly copy clean transpiled code or export as standard typed definitions and config
            files.
          </p>
        </div>
      </section>

      {/* Related Developer Tools */}
      {relatedTools.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            More Developer Utilities & Converters
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedTools.map((rel) => (
              <Link
                key={rel.slug}
                to={`/tools/developer-code/${rel.slug}`}
                className="group rounded-2xl border border-white/10 bg-slate-900/40 p-4 transition-all hover:border-brand-400/40 hover:bg-slate-900/80"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-brand-500/10 p-2 text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                    <CategoryIcon name={rel.icon || 'code'} className="h-4 w-4" />
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
