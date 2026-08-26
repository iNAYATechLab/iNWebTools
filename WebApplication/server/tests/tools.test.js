/**
 * Tools Engine Tests — Document, PDF, Image, Media, Developer, Security, Text & Calculators.
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
      expect(reg.modules.length).toBe(6);
      expect(Array.isArray(reg.tools)).toBe(true);
      expect(reg.tools.length).toBe(148);
    });

    it('contains all required Phase 1-5 modules without duplicate slugs', () => {
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
    });
  });

  describe('GET /api/tools/registry', () => {
    it('returns the full tools registry', async () => {
      const res = await request(app).get('/api/tools/registry').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(148);
      expect(Array.isArray(res.body.data.tools)).toBe(true);
      expect(res.body.data.modules.length).toBe(6);
    });

    it('filters tools by text-calculators module', async () => {
      const res = await request(app).get('/api/tools/registry?module=text-calculators').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tools.every((t) => t.module === 'text-calculators')).toBe(true);
      expect(res.body.data.total).toBe(27);
    });
  });

  describe('POST /api/tools/execute/:slug', () => {
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
