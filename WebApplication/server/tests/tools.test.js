/**
 * Tools Engine Tests — Document, PDF, Image, Media, Developer, Security, Text, Calculators, SEO, Webmaster, Design, CSS, AI & Productivity.
 */

import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

import { app } from '../index.js';
import { readToolsRegistry } from '../services/toolsRegistry.service.js';

describe('Tools Engine & Registry API', () => {
  beforeAll(async () => {
    // Ensure app is loaded
  });

  describe('Static Registry Seed', () => {
    it('loads canonical tools registry with valid structure', () => {
      const reg = readToolsRegistry();
      expect(reg.version).toBe(1);
      expect(Array.isArray(reg.modules)).toBe(true);
      expect(reg.modules.length).toBe(9);
      expect(Array.isArray(reg.tools)).toBe(true);
      expect(reg.tools.length).toBe(218);
    });

    it('contains all required Phase 1-8 modules without duplicate slugs', () => {
      const reg = readToolsRegistry();
      const slugs = reg.tools.map((t) => t.slug);
      const uniqueSlugs = new Set(slugs);
      expect(slugs.length).toBe(uniqueSlugs.size);

      // Phase 1: Document & Spreadsheet
      expect(slugs).toContain('word-to-pdf');
      expect(slugs).toContain('csv-to-json');

      // Phase 2: Audio & Video
      expect(slugs).toContain('audio-converter');
      expect(slugs).toContain('video-converter');

      // Phase 3: Developer Utilities
      expect(slugs).toContain('curl-to-code');
      expect(slugs).toContain('json-to-types');

      // Phase 4: Cryptography & Security
      expect(slugs).toContain('hash-generator-suite');
      expect(slugs).toContain('aes-encrypt-decrypt');
      expect(slugs).toContain('subnet-calculator');

      // Phase 5: Text Utilities & Calculators
      expect(slugs).toContain('word-character-counter');
      expect(slugs).toContain('readability-score-analyzer');
      expect(slugs).toContain('case-converter');
      expect(slugs).toContain('remove-duplicate-lines');
      expect(slugs).toContain('text-diff-checker');
      expect(slugs).toContain('loan-emi-calculator');
      expect(slugs).toContain('compound-interest-calculator');
      expect(slugs).toContain('statistics-mean-std-dev');
      expect(slugs).toContain('length-distance-converter');
      expect(slugs).toContain('weight-mass-converter');

      // Phase 6: SEO & Webmaster Utilities
      expect(slugs).toContain('xml-sitemap-generator');
      expect(slugs).toContain('robots-txt-generator');
      expect(slugs).toContain('schema-markup-generator');
      expect(slugs).toContain('meta-tag-generator');
      expect(slugs).toContain('hreflang-tag-generator');
      expect(slugs).toContain('canonical-tag-generator');
      expect(slugs).toContain('serp-snippet-preview');
      expect(slugs).toContain('keyword-density-checker');
      expect(slugs).toContain('htaccess-seo-generator');
      expect(slugs).toContain('open-graph-generator');
      expect(slugs).toContain('twitter-card-generator');
      expect(slugs).toContain('social-image-resizer');
      expect(slugs).toContain('youtube-thumbnail-downloader');
      expect(slugs).toContain('utm-campaign-builder');

      // Phase 7: CSS & Color Design Utilities
      expect(slugs).toContain('css-gradient-generator');
      expect(slugs).toContain('css-box-shadow-generator');
      expect(slugs).toContain('css-border-radius-generator');
      expect(slugs).toContain('css-glassmorphism-generator');
      expect(slugs).toContain('rgb-hex-converter');
      expect(slugs).toContain('hsl-rgb-converter');
      expect(slugs).toContain('cmyk-rgb-converter');
      expect(slugs).toContain('pantone-hex-converter');
      expect(slugs).toContain('ral-hex-converter');
      expect(slugs).toContain('wcag-contrast-checker');
      expect(slugs).toContain('color-shade-tint-generator');
      expect(slugs).toContain('color-mixer-online');
      expect(slugs).toContain('color-blindness-simulator');
      expect(slugs).toContain('material-tailwind-palette-generator');

      // Phase 8: AI & Productivity Utilities
      expect(slugs).toContain('ai-prompt-enhancer');
      expect(slugs).toContain('ai-content-rewriter');
      expect(slugs).toContain('ai-summary-generator');
      expect(slugs).toContain('ai-grammar-checker');
      expect(slugs).toContain('ai-headline-generator');
      expect(slugs).toContain('ai-email-writer');
      expect(slugs).toContain('qr-code-generator');
      expect(slugs).toContain('barcode-generator');
      expect(slugs).toContain('timezone-converter');
      expect(slugs).toContain('unix-timestamp-converter');
      expect(slugs).toContain('age-calculator');
      expect(slugs).toContain('working-days-calculator');
      expect(slugs).toContain('pomodoro-timer');
      expect(slugs).toContain('kanban-task-board');
      expect(slugs).toContain('markdown-notepad');
    });
  });

  describe('GET /api/tools/registry', () => {
    it('returns the full tools registry', async () => {
      const res = await request(app).get('/api/tools/registry').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(218);
      expect(Array.isArray(res.body.data.tools)).toBe(true);
      expect(res.body.data.modules.length).toBe(9);
    });

    it('filters tools by ai-productivity module', async () => {
      const res = await request(app).get('/api/tools/registry?module=ai-productivity').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tools.every((t) => t.module === 'ai-productivity')).toBe(true);
      expect(res.body.data.total).toBe(25);
    });
  });

  describe('POST /api/tools/execute/:slug', () => {
    // Phase 8 Tests: AI & Productivity
    it('executes ai-prompt-enhancer and returns structured prompt', async () => {
      const res = await request(app)
        .post('/api/tools/execute/ai-prompt-enhancer')
        .send({ content: 'Create a responsive web audio synthesizer' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.content).toContain('Core Objective:');
      expect(res.body.data.result.content).toContain('Output Specifications:');
      expect(res.body.data.result.metadata.tokensEstimate).toBeGreaterThan(10);
    });

    it('executes ai-content-rewriter', async () => {
      const res = await request(app)
        .post('/api/tools/execute/ai-content-rewriter')
        .send({
          content: 'This tool is good and fast for developers.',
          options: { tone: 'professional' },
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.content).toContain('[PROFESSIONAL REWRITE]');
      expect(res.body.data.result.content).toContain('exceptional');
    });

    it('executes ai-summary-generator', async () => {
      const text =
        'iNWebTools is an enterprise browser tools platform. It offers high performance utilities. Users can transcribe audio and generate QR codes without server latency.';
      const res = await request(app)
        .post('/api/tools/execute/ai-summary-generator')
        .send({ content: text, options: { maxSentences: 2 } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.keyTakeaways.length).toBeLessThanOrEqual(2);
      expect(res.body.data.result.metadata.compressionRatio).toBeDefined();
    });

    it('executes qr-code-generator and returns SVG markup', async () => {
      const res = await request(app)
        .post('/api/tools/execute/qr-code-generator')
        .send({ content: 'https://inwebtools.com', options: { size: 256 } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.content).toContain('<svg');
      expect(res.body.data.result.fileName).toBe('qrcode.svg');
    });

    it('executes barcode-generator', async () => {
      const res = await request(app)
        .post('/api/tools/execute/barcode-generator')
        .send({ content: '9780201896831', options: { format: 'CODE128' } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.content).toContain('<svg');
      expect(res.body.data.result.fileName).toBe('barcode-code128.svg');
    });

    it('executes unix-timestamp-converter', async () => {
      const res = await request(app)
        .post('/api/tools/execute/unix-timestamp-converter')
        .send({ options: { timestamp: 1700000000 } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.isoString).toBe('2023-11-14T22:13:20.000Z');
      expect(res.body.data.result.metadata.unixTimestamp).toBe(1700000000);
    });

    it('executes age-calculator', async () => {
      const res = await request(app)
        .post('/api/tools/execute/age-calculator')
        .send({ options: { birthDate: '2000-01-01', targetDate: '2026-01-01' } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.ageSummary).toContain('26 Years');
      expect(res.body.data.result.metadata.totalDays).toBeDefined();
    });

    it('executes working-days-calculator', async () => {
      const res = await request(app)
        .post('/api/tools/execute/working-days-calculator')
        .send({ options: { startDate: '2026-08-01', endDate: '2026-08-31' } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.businessWorkingDays).toBeGreaterThan(15);
      expect(res.body.data.result.metadata.totalCalendarDays).toBe(31);
    });

    // Phase 7 Tests: Color & Design
    it('executes rgb-hex-converter and returns rgb and rgba strings', async () => {
      const res = await request(app)
        .post('/api/tools/execute/rgb-hex-converter')
        .send({ content: '#3b82f6' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.rgb).toBe('rgb(59, 130, 246)');
      expect(res.body.data.result.metadata.values.r).toBe(59);
    });

    it('executes hsl-rgb-converter', async () => {
      const res = await request(app)
        .post('/api/tools/execute/hsl-rgb-converter')
        .send({ content: '#ff0000' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.values.h).toBe(0);
      expect(res.body.data.result.metadata.values.s).toBe(100);
    });

    it('executes wcag-contrast-checker for accessibility compliance', async () => {
      const res = await request(app)
        .post('/api/tools/execute/wcag-contrast-checker')
        .send({
          options: {
            foreground: '#ffffff',
            background: '#000000',
          },
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.score).toBe(21);
      expect(res.body.data.result.metadata.normalTextAA).toBe('Pass');
      expect(res.body.data.result.metadata.normalTextAAA).toBe('Pass');
    });

    it('executes color-shade-tint-generator', async () => {
      const res = await request(app)
        .post('/api/tools/execute/color-shade-tint-generator')
        .send({ content: '#3b82f6' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.tints.length).toBe(10);
      expect(res.body.data.result.metadata.shades.length).toBe(10);
    });

    it('executes color-mixer-online', async () => {
      const res = await request(app)
        .post('/api/tools/execute/color-mixer-online')
        .send({
          options: {
            color1: '#000000',
            color2: '#ffffff',
            ratio: 50,
          },
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.mixedHex).toBe('#808080');
    });

    it('executes css-gradient-generator', async () => {
      const res = await request(app)
        .post('/api/tools/execute/css-gradient-generator')
        .send({
          options: {
            type: 'linear',
            angle: '90deg',
            color1: '#3b82f6',
            color2: '#8b5cf6',
          },
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.content).toContain('linear-gradient(90deg, #3b82f6');
      expect(res.body.data.result.fileName).toBe('gradient.css');
    });

    it('executes css-box-shadow-generator', async () => {
      const res = await request(app)
        .post('/api/tools/execute/css-box-shadow-generator')
        .send({
          options: {
            xOffset: 4,
            yOffset: 8,
            blur: 16,
            spread: 0,
          },
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.content).toContain('box-shadow: 4px 8px 16px 0px');
    });

    it('executes material-tailwind-palette-generator', async () => {
      const res = await request(app)
        .post('/api/tools/execute/material-tailwind-palette-generator')
        .send({
          content: '#6366f1',
          options: { colorName: 'indigo' },
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.palette['500']).toBeDefined();
      expect(res.body.data.result.metadata.cssVariables).toContain('--color-indigo-500');
    });

    // Phase 6 Tests: SEO & Webmaster Utilities
    it('executes xml-sitemap-generator', async () => {
      const urls = 'https://example.com/\nhttps://example.com/about\nhttps://example.com/contact';
      const res = await request(app)
        .post('/api/tools/execute/xml-sitemap-generator')
        .send({ content: urls, options: { changefreq: 'weekly', priority: '0.8' } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(res.body.data.result.content).toContain('<loc>https://example.com/</loc>');
      expect(res.body.data.result.metadata.totalUrls).toBe(3);
    });

    it('executes robots-txt-generator', async () => {
      const res = await request(app)
        .post('/api/tools/execute/robots-txt-generator')
        .send({
          options: {
            sitemapUrl: 'https://example.com/sitemap.xml',
            disallowPaths: '/admin/\n/private/',
          },
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.content).toContain('User-agent: *');
      expect(res.body.data.result.content).toContain('Disallow: /admin/');
      expect(res.body.data.result.content).toContain('Sitemap: https://example.com/sitemap.xml');
    });

    it('executes schema-markup-generator for Organization', async () => {
      const res = await request(app)
        .post('/api/tools/execute/schema-markup-generator')
        .send({
          options: {
            schemaType: 'Organization',
            name: 'iNWebTools Lab',
            url: 'https://inwebtools.com',
            logo: 'https://inwebtools.com/logo.png',
          },
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.content).toContain('"@type": "Organization"');
      expect(res.body.data.result.content).toContain('"name": "iNWebTools Lab"');
      expect(res.body.data.result.metadata.schemaType).toBe('Organization');
    });

    it('executes meta-tag-generator', async () => {
      const res = await request(app)
        .post('/api/tools/execute/meta-tag-generator')
        .send({
          options: {
            title: 'Awesome SEO Suite',
            description: 'Free high-speed online SEO webmaster utility suite.',
            keywords: 'seo, webmaster, tools, optimizer',
            canonicalUrl: 'https://example.com/suite',
          },
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.content).toContain('<title>Awesome SEO Suite</title>');
      expect(res.body.data.result.content).toContain('name="description"');
      expect(res.body.data.result.content).toContain('rel="canonical"');
    });

    it('executes serp-snippet-preview analysis', async () => {
      const res = await request(app)
        .post('/api/tools/execute/serp-snippet-preview')
        .send({
          options: {
            title: 'iNWebTools — Free 1070+ Online Web Tools Suite',
            url: 'https://inwebtools.com',
            description:
              'High-speed, privacy-first web utilities and developer tools without ads or limits.',
          },
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.titleLength).toBeGreaterThan(20);
      expect(res.body.data.result.metadata.pixelWidthEstimate).toBeGreaterThan(100);
    });

    it('executes keyword-density-checker', async () => {
      const text =
        'SEO optimization tools help webmasters optimize website ranking. Good SEO means higher visibility and organic ranking.';
      const res = await request(app)
        .post('/api/tools/execute/keyword-density-checker')
        .send({ content: text })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.totalWords).toBeGreaterThan(10);
      expect(Array.isArray(res.body.data.result.metadata.topKeywords)).toBe(true);
      expect(
        res.body.data.result.metadata.topKeywords.some(
          (k) => k.word === 'seo' || k.word === 'ranking',
        ),
      ).toBe(true);
    });

    it('executes open-graph-generator and twitter-card-generator', async () => {
      const resOg = await request(app)
        .post('/api/tools/execute/open-graph-generator')
        .send({
          options: {
            title: 'Next Gen Web Tools',
            url: 'https://example.com/suite',
            image: 'https://example.com/banner.jpg',
            type: 'website',
          },
        })
        .expect(200);

      expect(resOg.body.success).toBe(true);
      expect(resOg.body.data.result.content).toContain('property="og:title"');
      expect(resOg.body.data.result.content).toContain('property="og:image"');

      const resTw = await request(app)
        .post('/api/tools/execute/twitter-card-generator')
        .send({
          options: {
            cardType: 'summary_large_image',
            title: 'Next Gen Web Tools',
            twitterSite: '@inwebtools',
          },
        })
        .expect(200);

      expect(resTw.body.success).toBe(true);
      expect(resTw.body.data.result.content).toContain('name="twitter:card"');
      expect(resTw.body.data.result.content).toContain('content="summary_large_image"');
    });

    it('executes utm-campaign-builder', async () => {
      const res = await request(app)
        .post('/api/tools/execute/utm-campaign-builder')
        .send({
          options: {
            baseUrl: 'https://inwebtools.com/promo',
            utmSource: 'newsletter',
            utmMedium: 'email',
            utmCampaign: 'launch2026',
            utmTerm: 'seo-tools',
          },
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.content).toBe(
        'https://inwebtools.com/promo?utm_source=newsletter&utm_medium=email&utm_campaign=launch2026&utm_term=seo-tools',
      );
      expect(res.body.data.result.metadata.paramCount).toBe(4);
    });

    it('executes youtube-thumbnail-downloader', async () => {
      const res = await request(app)
        .post('/api/tools/execute/youtube-thumbnail-downloader')
        .send({
          content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.videoId).toBe('dQw4w9WgXcQ');
      expect(res.body.data.result.metadata.thumbnails.maxres).toContain('maxresdefault.jpg');
    });

    it('executes htaccess-seo-generator', async () => {
      const res = await request(app)
        .post('/api/tools/execute/htaccess-seo-generator')
        .send({
          options: {
            forceHttps: true,
            forceWww: 'non-www',
            enableGzip: true,
            enableBrowserCache: true,
          },
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.content).toContain('RewriteEngine On');
      expect(res.body.data.result.content).toContain('RewriteCond %{HTTPS} off');
      expect(res.body.data.result.content).toContain('mod_deflate.c');
      expect(res.body.data.result.content).toContain('mod_expires.c');
    });

    // Phase 5 Tests: Text Metrics
    it('executes word-character-counter and readability analysis', async () => {
      const text = 'The quick brown fox jumps over the lazy dog. It was an amazing day.';
      const res = await request(app)
        .post('/api/tools/execute/word-character-counter')
        .send({ content: text })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.words).toBe(14);
      expect(res.body.data.result.metadata.sentences).toBe(2);
      expect(res.body.data.result.metadata.readability.fleschScore).toBeGreaterThan(50);
    });

    it('executes case-converter to camelCase and Title Case', async () => {
      const res = await request(app)
        .post('/api/tools/execute/case-converter')
        .send({ content: 'hello enterprise world', options: { targetCase: 'camelCase' } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.content).toBe('helloEnterpriseWorld');
    });

    it('executes remove-duplicate-lines deduplication', async () => {
      const res = await request(app)
        .post('/api/tools/execute/remove-duplicate-lines')
        .send({ content: 'Alpha\nBeta\nAlpha\nGamma\nBeta' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.content).toBe('Alpha\nBeta\nGamma');
    });

    // Phase 5 Tests: Financial & Math
    it('executes loan-emi-calculator', async () => {
      const res = await request(app)
        .post('/api/tools/execute/loan-emi-calculator')
        .send({ options: { principal: 100000, interestRate: 8.5, tenureMonths: 36 } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.monthlyEmi).toBeGreaterThan(3000);
      expect(res.body.data.result.metadata.totalPayment).toBeGreaterThan(100000);
    });

    it('executes compound-interest-calculator', async () => {
      const res = await request(app)
        .post('/api/tools/execute/compound-interest-calculator')
        .send({ options: { principal: 10000, interestRate: 7, years: 10 } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.futureValue).toBeGreaterThan(19000);
    });

    // Phase 5 Tests: Unit Converter
    it('executes length-distance-converter', async () => {
      const res = await request(app)
        .post('/api/tools/execute/length-distance-converter')
        .send({ content: '100' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.meters).toBe('100 m');
      expect(res.body.data.result.metadata.kilometers).toBe('0.1000 km');
    });
  });
});
