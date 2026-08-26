/**
 * Tools Engine Tests — Document, Spreadsheet, PDF & Image Processors.
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
      expect(reg.modules.length).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(reg.tools)).toBe(true);
      expect(reg.tools.length).toBe(48);
    });

    it('contains all required Phase 1 modules without duplicate slugs', () => {
      const reg = readToolsRegistry();
      const slugs = reg.tools.map((t) => t.slug);
      const uniqueSlugs = new Set(slugs);
      expect(slugs.length).toBe(uniqueSlugs.size);

      // Verify Document & Spreadsheet tools
      expect(slugs).toContain('word-to-pdf');
      expect(slugs).toContain('word-to-excel');
      expect(slugs).toContain('excel-to-pdf');
      expect(slugs).toContain('csv-to-json');
      expect(slugs).toContain('json-to-csv');
      expect(slugs).toContain('csv-to-markdown');
      expect(slugs).toContain('powerpoint-to-pdf');
      expect(slugs).toContain('epub-to-pdf');
      expect(slugs).toContain('html-to-pdf');

      // Verify PDF Editing & Management tools
      expect(slugs).toContain('pdf-to-image');
      expect(slugs).toContain('merge-pdf');
      expect(slugs).toContain('split-pdf');
      expect(slugs).toContain('compress-pdf');
      expect(slugs).toContain('rotate-pdf');
      expect(slugs).toContain('crop-pdf');
      expect(slugs).toContain('pdf-extract-text');
      expect(slugs).toContain('protect-pdf');
      expect(slugs).toContain('unlock-pdf');
      expect(slugs).toContain('sign-pdf');
      expect(slugs).toContain('pdf-watermark');
      expect(slugs).toContain('pdf-page-numbering');
      expect(slugs).toContain('redact-pdf');

      // Verify Image Tools & Extended Converters
      expect(slugs).toContain('image-converter');
      expect(slugs).toContain('image-resizer');
      expect(slugs).toContain('image-compressor');
      expect(slugs).toContain('image-cropper');
      expect(slugs).toContain('image-background-remover');
      expect(slugs).toContain('image-color-picker');
      expect(slugs).toContain('image-filters');
      expect(slugs).toContain('image-exif-viewer');
      expect(slugs).toContain('image-exif-eraser');
      expect(slugs).toContain('image-watermark');
      expect(slugs).toContain('image-upscaler');
    });
  });

  describe('GET /api/tools/registry', () => {
    it('returns the full tools registry', async () => {
      const res = await request(app).get('/api/tools/registry').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(48);
      expect(Array.isArray(res.body.data.tools)).toBe(true);
      expect(res.body.data.modules.length).toBe(2);
    });

    it('filters tools by module', async () => {
      const res = await request(app).get('/api/tools/registry?module=image-graphics').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tools.every((t) => t.module === 'image-graphics')).toBe(true);
      expect(res.body.data.total).toBe(11);
    });

    it('filters tools by search query', async () => {
      const res = await request(app).get('/api/tools/registry?search=watermark').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBeGreaterThanOrEqual(2);
      expect(res.body.data.tools.some((t) => t.slug === 'pdf-watermark')).toBe(true);
      expect(res.body.data.tools.some((t) => t.slug === 'image-watermark')).toBe(true);
    });
  });

  describe('GET /api/tools/:slug', () => {
    it('returns single tool definition with options schema', async () => {
      const res = await request(app).get('/api/tools/csv-to-json').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('csv-to-json');
      expect(res.body.data.name).toBe('CSV to JSON Converter');
      expect(Array.isArray(res.body.data.options)).toBe(true);
    });

    it('returns 404 for unknown tool slug', async () => {
      const res = await request(app).get('/api/tools/non-existent-tool').expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TOOL_NOT_FOUND');
    });
  });

  describe('POST /api/tools/execute/:slug', () => {
    it('executes csv-to-json with text payload', async () => {
      const res = await request(app)
        .post('/api/tools/execute/csv-to-json')
        .send({
          data: 'name,role,dept\niNAYA,Architect,TechLab\nJohn,Senior,Eng',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.resultType).toBe('json');
      expect(res.body.data.result.data.length).toBe(2);
      expect(res.body.data.result.data[0].name).toBe('iNAYA');
      expect(res.body.data.result.stats.rows).toBe(2);
    });

    it('executes json-to-csv with JSON payload', async () => {
      const res = await request(app)
        .post('/api/tools/execute/json-to-csv')
        .send({
          data: JSON.stringify([
            { id: 1, title: 'Doc 1' },
            { id: 2, title: 'Doc 2' },
          ]),
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.resultType).toBe('text');
      expect(res.body.data.result.content).toContain('id,title');
      expect(res.body.data.result.content).toContain('1,Doc 1');
    });

    it('executes csv-to-markdown generator', async () => {
      const res = await request(app)
        .post('/api/tools/execute/csv-to-markdown')
        .send({
          data: 'Feature,Status\nOCR,Active\nFilters,Ready',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.content).toContain('| Feature');
      expect(res.body.data.result.content).toContain('| OCR');
    });

    it('executes image-color-picker palette extraction', async () => {
      const res = await request(app)
        .post('/api/tools/execute/image-color-picker')
        .send({ options: { paletteCount: 5 } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.resultType).toBe('palette');
      expect(res.body.data.result.palette.length).toBeGreaterThanOrEqual(4);
    });

    it('executes image-exif-viewer metadata inspection', async () => {
      const res = await request(app)
        .post('/api/tools/execute/image-exif-viewer')
        .send({ options: { showGpsMap: true } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.resultType).toBe('metadata');
      expect(res.body.data.result.metadata.camera).toBeDefined();
    });

    it('executes sign-pdf digital signature stamping', async () => {
      const res = await request(app)
        .post('/api/tools/execute/sign-pdf')
        .send({ options: { signerName: 'Chief Security Officer' } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.resultType).toBe('file');
      expect(res.body.data.result.metadata.signer).toBe('Chief Security Officer');
    });
  });
});
