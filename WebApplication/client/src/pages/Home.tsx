import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { CommandPalette } from '../components/search/CommandPalette';
import { useCategories } from '../hooks/useCategories';
import { useLocale } from '../hooks/useLocale';
import { getToolsRegistry } from '../services/toolsApi';
import { TranscribePage } from './TranscribePage';

interface RecentToolItem {
  slug: string;
  name: string;
  nameBn?: string;
  module: string;
  icon: string;
  timestamp: number;
}

const TOP_TRENDING_TOOLS = [
  {
    slug: 'audio-to-text',
    name: 'Audio to Text (Whisper ASR)',
    nameBn: 'অডিও থেকে টেক্সট (হুইসপার এআই)',
    module: 'audio-video',
    icon: 'mic',
    tagline: 'Transcribe spoken audio in 99+ languages with high precision.',
    taglineBn: '৯৯+ ভাষায় অডিও থেকে নির্ভুল টেক্সট রূপান্তর করুন।',
    badge: '🔥 Hot',
    color: 'from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/30',
  },
  {
    slug: 'pdf-to-word',
    name: 'PDF to Word Converter',
    nameBn: 'পিডিএফ থেকে ওয়ার্ড রূপান্তরকারী',
    module: 'document-pdf',
    icon: 'file-text',
    tagline: 'Convert PDF files to editable DOCX documents instantly.',
    taglineBn: 'পিডিএফ ফাইল সরাসরি এডিটেবল ডকএক্সে রূপান্তর করুন।',
    badge: '⚡ Fast',
    color: 'from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-500/30',
  },
  {
    slug: 'remove-background',
    name: 'Background Remover',
    nameBn: 'ছবির ব্যাকগ্রাউন্ড রিমুভার',
    module: 'image-graphics',
    icon: 'image',
    tagline: 'Transparent PNG cutout with AI edge detection.',
    taglineBn: 'এআই প্রযুক্তি দিয়ে নিখুঁত স্বচ্ছ ব্যাকগ্রাউন্ড তৈরি করুন।',
    badge: '⭐ Popular',
    color: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30',
  },
  {
    slug: 'json-to-types',
    name: 'JSON to TypeScript & Schema',
    nameBn: 'জেসন থেকে টাইপস্ক্রিপ্ট রূপান্তরকারী',
    module: 'developer-code',
    icon: 'code',
    tagline: 'Generate clean TypeScript interfaces & JSON schemas.',
    taglineBn: 'জেসন থেকে স্বয়ংক্রিয় টাইপস্ক্রিপ্ট ইন্টারফেস তৈরি করুন।',
    badge: '💻 Dev Pick',
    color: 'from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/30',
  },
  {
    slug: 'image-resizer',
    name: 'Image Resizer & Optimizer',
    nameBn: 'ছবি রিসাইজার ও অপ্টিমাইজার',
    module: 'image-graphics',
    icon: 'aspect-ratio',
    tagline: 'Resize dimensions and compress images with zero quality loss.',
    taglineBn: 'ছবির মান অক্ষুণ্ণ রেখে সাইজ পরিবর্তন ও অপ্টিমাইজ করুন।',
    badge: '🖼️ Graphics',
    color: 'from-sky-500/20 to-indigo-500/20 text-sky-300 border-sky-500/30',
  },
  {
    slug: 'bmi-calculator',
    name: 'BMI & Body Composition Calculator',
    nameBn: 'বিএমআই ও বডি ফ্যাট ক্যালকুলেটর',
    module: 'math-science',
    icon: 'activity',
    tagline: 'Assess body mass index, optimal weight, and health ranges.',
    taglineBn: 'বডি মাস ইনডেক্স ও আদর্শ ওজন হিসাব করুন।',
    badge: '🩺 Health',
    color: 'from-rose-500/20 to-red-500/20 text-rose-300 border-rose-500/30',
  },
  {
    slug: 'qr-code-generator',
    name: 'QR Code Generator & Styling',
    nameBn: 'কিউআর কোড জেনারেটর ও স্টাইলিং',
    module: 'ai-productivity',
    icon: 'qr-code',
    tagline: 'Create custom branded QR codes with logos, colors & formats.',
    taglineBn: 'কাস্টম লোগো ও রং সহ হাই-রেজোলিউশন কিউআর কোড তৈরি করুন।',
    badge: '📱 Tools',
    color: 'from-violet-500/20 to-purple-500/20 text-violet-300 border-violet-500/30',
  },
  {
    slug: 'speed-velocity-acceleration-calculator',
    name: 'Physics Motion & Velocity Suite',
    nameBn: 'পদার্থবিজ্ঞান গতি ও ত্বরণ ক্যালকুলেটর',
    module: 'math-science',
    icon: 'zap',
    tagline: 'Compute velocity, acceleration, distance and kinetic vectors.',
    taglineBn: 'গতি, দূরত্ব, বেগ ও ত্বরণের নিখুঁত হিসাব।',
    badge: '🔬 Science',
    color: 'from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/30',
  },
  {
    slug: 'css-gradient-generator',
    name: 'CSS Gradient & Mesh Studio',
    nameBn: 'সিএসএস গ্রেডিয়েন্ট ও মেশ স্টুডিও',
    module: 'color-design',
    icon: 'palette',
    tagline: 'Craft modern multi-stop gradients with instant CSS/Tailwind code.',
    taglineBn: 'আধুনিক গ্রেডিয়েন্ট ডিজাইন করুন এবং সিএসএস কোড কপি করুন।',
    badge: '🎨 Design',
    color: 'from-pink-500/20 to-rose-500/20 text-pink-300 border-pink-500/30',
  },
  {
    slug: 'word-character-counter',
    name: 'Word, Character & Readability Analyzer',
    nameBn: 'শব্দ ও অক্ষর কাউন্টার এনালাইজার',
    module: 'text-calculators',
    icon: 'align-left',
    tagline: 'Count words, sentences, reading time and Flesch score.',
    taglineBn: 'টেক্সটের মোট শব্দ, বাক্য, পড়ার সময় ও রিডিবিলিটি স্কোর জানুন।',
    badge: '📊 Writing',
    color: 'from-emerald-500/20 to-green-500/20 text-emerald-300 border-emerald-500/30',
  },
  {
    slug: 'aes-encrypt-decrypt',
    name: 'AES-256 Cryptography Suite',
    nameBn: 'এইএস-২৫৬ এনক্রিপশন ও ডিক্রিপশন',
    module: 'security-network',
    icon: 'shield',
    tagline: 'Military-grade end-to-end symmetric encryption in browser.',
    taglineBn: 'ব্রাউজারেই সম্পূর্ণ নিরাপদ ২৫৬-বিট এনক্রিপশন করুন।',
    badge: '🛡️ Security',
    color: 'from-yellow-500/20 to-amber-500/20 text-yellow-300 border-yellow-500/30',
  },
  {
    slug: 'xml-sitemap-generator',
    name: 'Dynamic XML Sitemap Generator',
    nameBn: 'এক্সএমএল সাইটম্যাপ জেনারেটর',
    module: 'seo-webmaster',
    icon: 'globe',
    tagline: 'Create Google-compliant XML sitemaps for fast search indexing.',
    taglineBn: 'সার্চ ইঞ্জিন ইন্ডেক্সিং এর জন্য এক্সএমএল সাইটম্যাপ বানান।',
    badge: '🔍 SEO',
    color: 'from-teal-500/20 to-cyan-500/20 text-teal-300 border-teal-500/30',
  },
];

const FAQS = [
  {
    q: 'What is iNWebTools and are all tools really 100% free?',
    qBn: 'iNWebTools কি এবং এখানকার সকল টুল কি সম্পূর্ণ বিনামূল্যে ব্যবহার করা যায়?',
    a: 'iNWebTools is an enterprise-grade web utility platform featuring 1,070+ tool definitions across 10 specialized suites. All 242+ live tools are 100% free with zero paywalls or mandatory credit card requirements.',
    aBn: 'iNWebTools হলো একটি শক্তিশালী এন্টারপ্রাইজ ওয়েব টুলস প্ল্যাটফর্ম যাতে ১০টি ক্যাটাগরির ১,০৭০+ টুলস ও কনভার্টার রয়েছে। সকল টুলস ১০০% ফ্রী এবং কোনো সাবস্ক্রিপশন ফি নেই।',
  },
  {
    q: 'How does client-side and server-side privacy work on iNWebTools?',
    qBn: 'iNWebTools-এ আমার ডেটা ও ফাইলের নিরাপত্তা কীভাবে নিশ্চিত করা হয়?',
    a: 'Your privacy is guaranteed by design. Calculators, converters, formatters, and crypto suites run entirely in your local browser using WebAssembly and JavaScript without uploading any text to remote servers. Audio/Video conversions are processed in temporary RAM and destroyed immediately upon generation.',
    aBn: 'আপনার সম্পূর্ণ গোপনীয়তা নিশ্চিত করা হয়। ক্যালকুলেটর, ক্রিপ্টোগ্রাফি, কোড কনভার্টার ইত্যাদি সরাসরি আপনার ব্রাউজারে রান হয়। অডিও ফাইলগুলো মেমোরিতে প্রসেস হওয়ার পর স্বয়ংক্রিয়ভাবে মুছে ফেলা হয়।',
  },
  {
    q: 'Can I use keyboard shortcuts to search and launch tools quickly?',
    qBn: 'কিবোর্ড শর্টকাট ব্যবহার করে কি দ্রুত যেকোনো টুল খুঁজে বের করা যায়?',
    a: 'Yes! Press Ctrl+K on Windows/Linux or ⌘K on macOS from anywhere on the platform to open the Global Command Palette. You can search in English or Bengali and navigate with your arrow keys.',
    aBn: 'হ্যাঁ! কিবোর্ডে Ctrl+K (ম্যাকে ⌘K) প্রেস করলেই গ্লোবাল কমান্ড প্যালেট ওপেন হবে। আপনি বাংলা বা ইংরেজিতে সার্চ করে দ্রুত টুল ওপেন করতে পারবেন।',
  },
  {
    q: 'Is iNWebTools optimized for mobile and desktop screens?',
    qBn: 'iNWebTools কি মোবাইল এবং কম্পিউটারে সমানভাবে কাজ করে?',
    a: 'Yes, the UI is built with a responsive mobile-first Tailwind CSS architecture, supporting ultra-wide monitors, laptops, tablets, and smartphones with high performance and dark mode aesthetics.',
    aBn: 'হ্যাঁ, প্ল্যাটফর্মটি রেসপন্সিভ ডিজাইন ও ডার্ক থিম প্রযুক্তিতে তৈরি, যা যেকোনো মোবাইল, ট্যাবলেট কিংবা পিসিতে দ্রুত কাজ করে।',
  },
];

export function Home() {
  const { locale } = useLocale();
  const isBn = locale === 'bn';
  const { categories, loading: categoriesLoading } = useCategories();
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'matrix' | 'transcriber'>('matrix');
  const [recentTools, setRecentTools] = useState<RecentToolItem[]>([]);
  const [totalToolsCount, setTotalToolsCount] = useState<number>(242);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Load recently used tools from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('inwebtools_recent_tools');
      if (stored) {
        setRecentTools(JSON.parse(stored).slice(0, 6));
      }
    } catch {
      // safe fallback
    }

    getToolsRegistry()
      .then((data) => {
        if (data?.total) setTotalToolsCount(data.total);
      })
      .catch(() => {});
  }, []);

  const handleToolClick = (tool: {
    slug: string;
    name: string;
    nameBn?: string;
    module: string;
    icon?: string;
  }) => {
    try {
      const existing: RecentToolItem[] = JSON.parse(
        localStorage.getItem('inwebtools_recent_tools') || '[]',
      );
      const filtered = existing.filter((t) => t.slug !== tool.slug);
      const updated = [
        {
          slug: tool.slug,
          name: tool.name,
          nameBn: tool.nameBn,
          module: tool.module,
          icon: tool.icon || 'wrench',
          timestamp: Date.now(),
        },
        ...filtered,
      ].slice(0, 10);
      localStorage.setItem('inwebtools_recent_tools', JSON.stringify(updated));
      setRecentTools(updated.slice(0, 6));
    } catch {
      // ignore storage error
    }
  };

  const clearRecentTools = () => {
    localStorage.removeItem('inwebtools_recent_tools');
    setRecentTools([]);
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      {/* Dynamic Command Palette Modal */}
      {searchOpen && <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />}

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        {/* Glow backdrop decorative elements */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[550px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-brand-600/20 via-purple-600/15 to-accent-500/20 blur-[130px]" />
        <div className="pointer-events-none absolute top-1/2 -right-48 -z-10 h-[450px] w-[500px] rounded-full bg-cyan-500/10 blur-[140px]" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Top Live Badge */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-brand-400/30 bg-brand-500/10 px-4 py-1.5 text-xs font-semibold text-brand-300 backdrop-blur-md shadow-lg shadow-brand-500/10 mb-6 transition-all hover:scale-105">
            <span className="flex h-2 w-2 rounded-full bg-brand-400 animate-ping" />
            <span>
              {isBn
                ? `⚡ ২৪২+ লাইভ টুলস ও ১,০৭০+ ক্যাটালগ সক্রিয়`
                : `⚡ 242+ Live Interactive Tools & 1,070+ Catalog Active`}
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="mx-auto max-w-5xl text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            <span className="block text-white">
              {isBn ? 'সব ডিজিটাল কাজের জন্য' : 'One Single Platform for'}
            </span>
            <span className="bg-gradient-to-r from-brand-300 via-accent-300 to-purple-400 bg-clip-text text-transparent">
              {isBn ? '১,০৭০+ ফ্রী অনলাইন ওয়েব টুলস' : '1,070+ Free Online Web Tools'}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base sm:text-lg leading-relaxed text-slate-400">
            {isBn
              ? 'অডিও টু টেক্সট, পিডিএফ এডিটর, ইমেজ কনভার্টার, ডেভেলপার ইউটিলিটি, সাইবার সিকিউরিটি, গণিত ও স্বাস্থ্য ক্যালকুলেটর — কোনো রেজিস্ট্রেশন বা পেমেন্ট ছাড়াই ১টি মাত্র প্ল্যাটফর্মে।'
              : 'Enterprise-grade audio transcription, document conversion, developer code formatters, image editing, security ciphers, and scientific calculators. 100% Free, Secure & Private.'}
          </p>

          {/* Global Search Bar CTA */}
          <div className="mx-auto mt-10 max-w-2xl">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="group flex w-full items-center justify-between rounded-2xl border border-white/15 bg-slate-900/80 p-3.5 sm:p-4 text-left shadow-2xl backdrop-blur-xl transition-all hover:border-brand-400/60 hover:bg-slate-900 hover:shadow-brand-500/10 focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <svg
                  className="h-6 w-6 text-brand-400 transition-transform group-hover:scale-110"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span className="truncate text-sm sm:text-base text-slate-400 group-hover:text-slate-200">
                  {isBn
                    ? 'যেকোনো টুল বা ফর্মুলা খুঁজুন (যেমন: অডিও টু টেক্সট, পিডিএফ, বিএমআই)...'
                    : `Search ${totalToolsCount}+ tools, formulas, converters (e.g. Audio to Text, PDF, BMI, QR)...`}
                </span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-800/90 px-2.5 py-1 text-xs font-mono text-slate-400 shadow-inner group-hover:border-brand-400/40 group-hover:text-brand-300">
                <span>Ctrl</span> + <span>K</span>
              </kbd>
            </button>

            {/* Quick Search Badges */}
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
              <span className="font-medium text-slate-500">{isBn ? 'জনপ্রিয়:' : 'Trending:'}</span>
              {[
                { name: 'Audio to Text', slug: 'audio-to-text', mod: 'audio-video' },
                { name: 'PDF to Word', slug: 'pdf-to-word', mod: 'document-pdf' },
                { name: 'Remove BG', slug: 'remove-background', mod: 'image-graphics' },
                { name: 'JSON Types', slug: 'json-to-types', mod: 'developer-code' },
                { name: 'BMI Calc', slug: 'bmi-calculator', mod: 'math-science' },
                { name: 'QR Code', slug: 'qr-code-generator', mod: 'ai-productivity' },
              ].map((pill) => (
                <Link
                  key={pill.slug}
                  to={`/tools/${pill.mod}/${pill.slug}`}
                  onClick={() =>
                    handleToolClick({ slug: pill.slug, name: pill.name, module: pill.mod })
                  }
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 transition-colors hover:border-brand-400/40 hover:bg-brand-500/10 hover:text-brand-300"
                >
                  {pill.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Telemetry Counter Pills */}
          <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 backdrop-blur">
              <p className="text-2xl sm:text-3xl font-extrabold text-white">242+</p>
              <p className="mt-1 text-xs text-slate-400">
                {isBn ? 'লাইভ অ্যাক্টিভ টুলস' : 'Active Live Tools'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 backdrop-blur">
              <p className="text-2xl sm:text-3xl font-extrabold text-brand-400">10</p>
              <p className="mt-1 text-xs text-slate-400">
                {isBn ? 'মডিউল সুইট' : 'Enterprise Suites'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 backdrop-blur">
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400">100%</p>
              <p className="mt-1 text-xs text-slate-400">
                {isBn ? 'জিরো ডেটা লগিং' : 'Client Privacy First'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 backdrop-blur">
              <p className="text-2xl sm:text-3xl font-extrabold text-accent-400">0$</p>
              <p className="mt-1 text-xs text-slate-400">
                {isBn ? 'আজীবন সম্পূর্ণ ফ্রী' : 'Free Forever & No Ads'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recently Used Tools (if present) */}
      {recentTools.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-16">
          <div className="rounded-3xl border border-brand-500/20 bg-brand-950/20 p-6 backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🕒</span>
                <h2 className="text-base font-bold text-white">
                  {isBn ? 'আপনার সম্প্রতি ব্যবহৃত টুলসমূহ' : 'Recently Used Tools'}
                </h2>
              </div>
              <button
                type="button"
                onClick={clearRecentTools}
                className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
              >
                {isBn ? 'হিস্ট্রি মুছুন' : 'Clear History'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {recentTools.map((t) => (
                <Link
                  key={t.slug}
                  to={`/tools/${t.module}/${t.slug}`}
                  className="flex flex-col justify-between rounded-xl border border-white/10 bg-slate-900/60 p-3 hover:border-brand-400/40 hover:bg-slate-900 transition-all"
                >
                  <p className="text-xs font-semibold text-slate-200 line-clamp-1">
                    {isBn && t.nameBn ? t.nameBn : t.name}
                  </p>
                  <span className="mt-2 text-[10px] text-brand-400 font-medium">Launch →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trending / Top 12 Popular Tools Ribbon */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/20 mb-2">
              ⭐ {isBn ? 'জনপ্রিয় টুলস' : 'Trending Utilities'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              {isBn ? 'শীর্ষ ১২টি সর্বাধিক ব্যবহৃত টুল' : 'Top 12 Most Popular Tools'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {isBn
                ? 'লক্ষাধিক ব্যবহারকারীর পছন্দের প্রয়োজনীয় টুলস যা সরাসরি এক ক্লিকে কাজ করে।'
                : 'Instant access to high-demand web converters, generators and utilities.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-brand-300 hover:text-brand-200"
          >
            {isBn ? 'সব ২৪২+ টুল ব্রাউজ করুন →' : 'Browse all 242+ tools →'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {TOP_TRENDING_TOOLS.map((tool) => (
            <Link
              key={tool.slug}
              to={`/tools/${tool.module}/${tool.slug}`}
              onClick={() => handleToolClick(tool)}
              className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/40 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-400/40 hover:bg-slate-900/90 hover:shadow-xl hover:shadow-brand-500/5"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`rounded-xl border px-2.5 py-1 text-[11px] font-semibold bg-gradient-to-r ${tool.color}`}
                  >
                    {tool.badge}
                  </span>
                  <span className="text-xs font-mono text-slate-500 capitalize">
                    {tool.module.replace('-', ' ')}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-brand-300 transition-colors">
                  {isBn ? tool.nameBn : tool.name}
                </h3>
                <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {isBn ? tool.taglineBn : tool.tagline}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-3 text-xs">
                <span className="text-slate-500 text-[11px] font-mono">100% Free • Web</span>
                <span className="font-semibold text-brand-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  {isBn ? 'চালু করুন' : 'Launch'} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Switcher: Category Matrix vs Instant Audio Transcriber */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center mb-10">
          <div className="inline-flex rounded-2xl border border-white/10 bg-slate-900 p-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'matrix'
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📂 {isBn ? 'ক্যাটাগরি ম্যাট্রিক্স (৮টি বিভাগ)' : 'All 8 Category Suites'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('transcriber')}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'transcriber'
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🎙️ {isBn ? 'ইনস্ট্যান্ট অডিও ট্রান্সক্রাইবার' : 'Instant Voice Transcriber'}
            </button>
          </div>
        </div>

        {activeTab === 'matrix' ? (
          <div>
            <div className="text-center max-w-3xl mx-auto mb-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                {isBn ? 'সম্পূর্ণ টুলস ক্যাটাগরি ম্যাট্রিক্স' : 'Complete Tool Suites & Categories'}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                {isBn
                  ? 'আমাদের ৮টি মূল ক্যাটাগরি ও ২৫টি সাব-ক্যাটাগরির বিস্তৃত ক্যাটালগ এক্সপ্লোর করুন।'
                  : 'Structured catalogue of 8 primary categories and 25 subcategories.'}
              </p>
            </div>

            {categoriesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-64 rounded-3xl bg-white/[0.02]" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/50 p-6 transition-all hover:border-brand-400/40 hover:bg-slate-900/80 hover:shadow-2xl hover:shadow-brand-500/5"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-400/20 bg-brand-500/10 text-brand-300 font-bold text-xl">
                          {cat.icon === 'file-text'
                            ? '📄'
                            : cat.icon === 'image'
                              ? '🖼️'
                              : cat.icon === 'play'
                                ? '🎬'
                                : cat.icon === 'code'
                                  ? '💻'
                                  : cat.icon === 'shield'
                                    ? '🛡️'
                                    : cat.icon === 'calculator'
                                      ? '📊'
                                      : cat.icon === 'sparkle'
                                        ? '⚡'
                                        : '🔬'}
                        </span>
                        <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-mono text-slate-400">
                          {cat.subcategories?.length || 0} Sub-categories
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-white">{cat.name}</h3>
                      <p className="mt-2 text-xs text-slate-400 leading-relaxed line-clamp-2">
                        {cat.description || 'Explore rich suite of specialized tools.'}
                      </p>

                      {/* Subcategory Pills */}
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {cat.subcategories?.slice(0, 3).map((sub) => (
                          <Link
                            key={sub.id}
                            to={`/tools/${cat.slug}/${sub.slug}`}
                            className="rounded-lg bg-white/5 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-brand-500/20 hover:text-brand-300 transition-colors"
                          >
                            {sub.name}
                          </Link>
                        ))}
                        {cat.subcategories?.length > 3 && (
                          <span className="rounded-lg bg-white/5 px-2 py-0.5 text-[11px] text-slate-500">
                            +{cat.subcategories.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 border-t border-white/5 pt-4">
                      <Link
                        to={`/tools/${cat.slug}`}
                        className="flex items-center justify-between text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                      >
                        <span>{isBn ? 'ক্যাটাগরি ওপেন করুন' : 'Explore Category'}</span>
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur">
            <div className="max-w-4xl mx-auto">
              <TranscribePage embedded />
            </div>
          </div>
        )}
      </section>

      {/* Enterprise Platform Feature Highlights */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 border-t border-white/5">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            {isBn ? 'কেন iNWebTools অনন্য ও সেরা?' : 'Engineered for Performance, Privacy & Scale'}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {isBn
              ? 'নিরাপত্তা, আধুনিক প্রযুক্তি এবং সর্বোচ্চ পারফরম্যান্সের সমন্বয়ে নির্মিত।'
              : 'Built with cutting-edge WebAssembly, high-concurrency Node.js, and zero data storage.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 hover:border-brand-400/30 transition-colors">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-400 text-2xl mb-6">
              ⚡
            </div>
            <h3 className="text-lg font-bold text-white">
              {isBn ? 'আল্ট্রা ফাস্ট প্রসেসিং' : 'Ultra-Fast Browser & Edge Compute'}
            </h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              {isBn
                ? 'ওয়েব অ্যাসেম্বলি (WASM) ও অপটিমাইজড ইঞ্জিন ব্যবহারের ফলে কনভার্সন ও হিসাব মিলি-সেকেন্ডে সম্পন্ন হয়।'
                : 'Heavy calculations and data formatters execute client-side via optimized WebAssembly algorithms in milliseconds.'}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 hover:border-emerald-400/30 transition-colors">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 text-2xl mb-6">
              🔒
            </div>
            <h3 className="text-lg font-bold text-white">
              {isBn ? 'জিরো ডেটা লগিং ও পূর্ণ নিরাপত্তা' : 'Zero Data Retention & Privacy First'}
            </h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              {isBn
                ? 'আপনার ফাইল বা টেক্সট কোনো সার্ভারে সেভ হয় না। গোপনীয়তা ও সিকিউরিটি আমাদের সর্বোচ্চ অগ্রাধিকার।'
                : 'No uploaded media or processed texts are stored or shared. Temporary operations are wiped from RAM instantly.'}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 hover:border-purple-400/30 transition-colors">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 text-2xl mb-6">
              🌐
            </div>
            <h3 className="text-lg font-bold text-white">
              {isBn ? 'দ্বিভাষিক ও মোবাইল ফ্রেন্ডলি' : 'Bilingual & Mobile-First Architecture'}
            </h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              {isBn
                ? 'বাংলা ও ইংরেজি উভয় ভাষায় নিখুঁত কাজ করার সুবিধা সহ ডার্ক থিম সমৃদ্ধ আধুনিক ইউজার ইন্টারফেস।'
                : 'Seamless toggle between English and Bengali, optimized for smartphones, tablets, and desktop workstations.'}
            </p>
          </div>
        </div>
      </section>

      {/* SEO Rich Text FAQ Section */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 border-t border-white/5">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            {isBn ? 'সচরাচর জিজ্ঞাসিত প্রশ্নোত্তর (FAQ)' : 'Frequently Asked Questions'}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {isBn
              ? 'প্ল্যাটফর্মের ব্যবহারবিধি ও কার্যকারিতা সম্পর্কিত সাধারণ প্রশ্নের উত্তর।'
              : 'Everything you need to know about iNWebTools tools, API, and privacy.'}
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between p-5 text-left font-semibold text-slate-200 hover:text-white"
                >
                  <span className="text-sm sm:text-base">{isBn ? faq.qBn : faq.q}</span>
                  <span className="ml-4 text-brand-400 font-bold">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-white/5">
                    {isBn ? faq.aBn : faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
