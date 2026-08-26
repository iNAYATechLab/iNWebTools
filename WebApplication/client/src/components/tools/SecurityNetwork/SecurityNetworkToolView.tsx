import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Breadcrumbs, type Crumb } from '../../categories/Breadcrumbs';
import { CategoryIcon } from '../../categories/CategoryIcon';
import { executeTool, getToolBySlug, getToolsRegistry } from '../../../services/toolsApi';
import type { ToolDefinition, ToolExecutionResult } from '../../../types/tools';
import { ToolControls } from '../DocumentImage/ToolControls';
import { CodeEditor } from '../Developer/CodeEditor';
import { DigestTable } from './DigestTable';
import { KeyViewer } from './KeyViewer';

interface SecurityNetworkToolViewProps {
  slugOverride?: string;
}

const DEFAULT_SECURITY_SAMPLES: Record<string, string> = {
  'hash-generator-suite': `iNWebTools Enterprise Cryptography Suite 2026`,
  'aes-encrypt-decrypt': `Highly Confidential Enterprise Data Payload`,
  'password-generator': ``,
  'password-strength-checker': `iNWebTools#2026Master!Secure`,
  'rsa-key-generator': ``,
  'ecdsa-ed25519-generator': ``,
  'uuid-generator': ``,
  'jwt-decoder-debugger': `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsaWNlIEFyY2hpdGVjdCIsImlhdCI6MTUxNjIzOTAyMn0.4fH7Jz7hZ5E`,
  'hmac-generator': `Webhook Payload Event: payment.success`,
  'pbkdf2-hasher': `P@ssw0rd2026!`,
  'text-encrypter-decrypter': `Private internal memo for engineering leadership`,
  'subnet-calculator': `192.168.1.100`,
  'user-agent-parser': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36`,
  'ip-geolocation-lookup': `8.8.8.8`,
  'dns-lookup-records': `inwebtools.com`,
  'http-headers-status-checker': `https://api.inwebtools.com`,
  'ssl-certificate-inspector': `inwebtools.com`,
  'csp-security-headers-generator': `inwebtools.com`,
};

export function SecurityNetworkToolView({ slugOverride }: SecurityNetworkToolViewProps) {
  const params = useParams<{
    toolSlug?: string;
    categorySlug?: string;
    subcategorySlug?: string;
  }>();

  const currentSlug = slugOverride || params.toolSlug || 'hash-generator-suite';

  const [tool, setTool] = useState<ToolDefinition | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Inputs & Outputs
  const [inputData, setInputData] = useState<string>('');
  const [options, setOptions] = useState<Record<string, unknown>>({});

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolExecutionResult | null>(null);

  // Related tools
  const [relatedTools, setRelatedTools] = useState<ToolDefinition[]>([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setResult(null);

    const initial = DEFAULT_SECURITY_SAMPLES[currentSlug] ?? 'Sample security input text...';
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

        getToolsRegistry({ module: 'security-network' })
          .then((reg) => {
            if (!mounted) return;
            setRelatedTools(reg.tools.filter((t) => t.slug !== data.slug).slice(0, 4));
          })
          .catch(() => {});
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setError(err.message || 'Security tool not found');
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
          <h2 className="text-lg font-bold text-white">Security Tool Not Found</h2>
          <p className="mt-2 text-xs text-slate-400">
            {error || `Tool "${currentSlug}" is not registered.`}
          </p>
          <Link
            to="/tools/security-network"
            className="mt-6 inline-block rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-brand-400 transition-colors"
          >
            ← Explore Security & Network Hub
          </Link>
        </div>
      </div>
    );
  }

  const crumbs: Crumb[] = [
    { label: 'Home', to: '/' },
    { label: 'Tools', to: '/tools' },
    { label: 'Security & Network', to: '/tools/security-network' },
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
              <CategoryIcon name={tool.icon || 'shield'} className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  {tool.name}
                </h1>
                {tool.isFeatured && (
                  <span className="rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/30">
                    ⭐ Security Certified
                  </span>
                )}
                <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-brand-300 ring-1 ring-inset ring-brand-500/30">
                  Zero-Knowledge Sandbox
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
                Security Standard
              </span>
              <span className="font-mono text-xs font-bold text-emerald-400">
                CSPRNG / FIPS / NIST
              </span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {tool.tags && tool.tags.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-4">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Standards:</span>
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

      {/* Main Security Workbench */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Input Data / Trigger */}
        <div className="space-y-4 lg:col-span-5">
          <CodeEditor
            label="Input Parameters / Payload"
            value={inputData}
            onChange={setInputData}
            language="text"
            placeholder="Enter plain text, secret key, IP address, or token..."
            onSampleLoad={() => setInputData(DEFAULT_SECURITY_SAMPLES[currentSlug] || '')}
          />

          <button
            type="button"
            onClick={handleExecute}
            disabled={isProcessing}
            className="w-full rounded-2xl bg-gradient-to-r from-brand-500 to-accent-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-400 hover:to-accent-400 hover:shadow-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? '🛡️ Executing Cryptographic Operation...' : '🛡️ Execute & Generate'}
          </button>

          {processError && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
              ⚠️ {processError}
            </div>
          )}
        </div>

        {/* Right Column: Output / Keys / Tables / Inspection */}
        <div className="space-y-4 lg:col-span-7">
          {/* Key Generation Results */}
          {typeof metaObj?.publicKey === 'string' || typeof metaObj?.privateKey === 'string' ? (
            <div className="space-y-3">
              {typeof metaObj.publicKey === 'string' && (
                <KeyViewer label="Public Key (SPKI PEM)" value={metaObj.publicKey} badge="PUBLIC" />
              )}
              {typeof metaObj.privateKey === 'string' && (
                <KeyViewer
                  label="Private Key (PKCS#8 PEM)"
                  value={metaObj.privateKey}
                  badge="SECRET"
                  isSecret={true}
                  onRegenerate={handleExecute}
                />
              )}
            </div>
          ) : null}

          {/* Hash Matrix Result */}
          {metaObj?.digests ? (
            <DigestTable
              digests={metaObj.digests as Record<string, string>}
              primaryAlgorithm={String(options.algorithm || 'SHA-256')}
            />
          ) : null}

          {/* Password Analysis Box */}
          {metaObj?.strengthLevel ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-semibold text-slate-400">
                    Strength Rating
                  </span>
                  <p className="text-xl font-black text-emerald-400">
                    {String(metaObj.strengthLevel)} ({String(metaObj.score)} / 5)
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase font-semibold text-slate-400">Entropy</span>
                  <p className="text-xl font-mono font-bold text-brand-400">
                    {String(metaObj.entropyBits)} bits
                  </p>
                </div>
              </div>

              {typeof metaObj.password === 'string' && (
                <KeyViewer
                  label="Generated Secure Password"
                  value={metaObj.password}
                  badge="CSPRNG"
                  onRegenerate={handleExecute}
                />
              )}

              {Array.isArray(metaObj.recommendations) && metaObj.recommendations.length > 0 && (
                <div className="space-y-1 text-xs text-amber-300 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                  <span className="font-bold">Recommendations:</span>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {metaObj.recommendations.map((rec, i) => (
                      <li key={i}>{String(rec)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}

          {/* Generic Structured Metadata Inspection (Subnet, IP Geo, Headers, JWT, SSL) */}
          {metaObj && !metaObj.digests && !metaObj.publicKey && !metaObj.strengthLevel && (
            <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Inspection Telemetry
                </h4>
                <span className="text-[10px] font-mono text-emerald-400">
                  ✓ Parsed Successfully
                </span>
              </div>
              <pre className="max-h-96 overflow-auto font-mono text-xs text-brand-300 leading-relaxed">
                {JSON.stringify(metaObj, null, 2)}
              </pre>
            </div>
          )}

          {/* Standard Text or Code Output */}
          {result?.content ? (
            <CodeEditor
              label="Generated Output"
              value={result.content}
              readOnly
              language={tool.defaultOutput || 'text'}
              fileName={result.fileName}
            />
          ) : null}

          {/* Stats Breakdown Bar */}
          {result?.stats && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Cryptographic Telemetry
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
          <h3 className="text-sm font-semibold text-white">Client-Side Privacy</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sensitive keys and passwords can be processed locally inside your browser sandbox
            without logging.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 font-bold text-brand-400 text-xs">
            2
          </div>
          <h3 className="text-sm font-semibold text-white">FIPS & NIST Standards</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            All cryptographic operations use industry standard algorithms (AES-256, RSA-4096, SHA-3,
            Ed25519).
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 font-bold text-brand-400 text-xs">
            3
          </div>
          <h3 className="text-sm font-semibold text-white">Instant PEM / JSON Export</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Download standard `.pem` certificates, `.conf` CSP rules, and copy digests with one
            click.
          </p>
        </div>
      </section>

      {/* Related Security Tools */}
      {relatedTools.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            More Security & Cryptography Utilities
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedTools.map((rel) => (
              <Link
                key={rel.slug}
                to={`/tools/security-network/${rel.slug}`}
                className="group rounded-2xl border border-white/10 bg-slate-900/40 p-4 transition-all hover:border-brand-400/40 hover:bg-slate-900/80"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-brand-500/10 p-2 text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                    <CategoryIcon name={rel.icon || 'shield'} className="h-4 w-4" />
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
