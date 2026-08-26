/**
 * Tools Engine Tests — Document, PDF, Image, Media, and Phase 3 Developer & Code Tools.
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
      expect(reg.modules.length).toBe(4);
      expect(Array.isArray(reg.tools)).toBe(true);
      expect(reg.tools.length).toBe(103);
    });

    it('contains all required Phase 1, Phase 2 & Phase 3 modules without duplicate slugs', () => {
      const reg = readToolsRegistry();
      const slugs = reg.tools.map((t) => t.slug);
      const uniqueSlugs = new Set(slugs);
      expect(slugs.length).toBe(uniqueSlugs.size);

      // Phase 1: Document & Spreadsheet tools
      expect(slugs).toContain('word-to-pdf');
      expect(slugs).toContain('word-to-excel');
      expect(slugs).toContain('excel-to-pdf');
      expect(slugs).toContain('csv-to-json');
      expect(slugs).toContain('json-to-csv');
      expect(slugs).toContain('csv-to-markdown');

      // Phase 1: PDF Editing & Management tools
      expect(slugs).toContain('pdf-to-image');
      expect(slugs).toContain('merge-pdf');
      expect(slugs).toContain('split-pdf');
      expect(slugs).toContain('compress-pdf');
      expect(slugs).toContain('pdf-extract-text');

      // Phase 1: Image Tools
      expect(slugs).toContain('image-converter');
      expect(slugs).toContain('image-resizer');
      expect(slugs).toContain('image-compressor');

      // Phase 2: Audio & Video
      expect(slugs).toContain('audio-converter');
      expect(slugs).toContain('audio-to-text');
      expect(slugs).toContain('video-converter');
      expect(slugs).toContain('video-to-gif');

      // Phase 3: Developer & Code Converters
      expect(slugs).toContain('curl-to-code');
      expect(slugs).toContain('json-to-types');
      expect(slugs).toContain('json-yaml-converter');
      expect(slugs).toContain('xml-json-converter');
      expect(slugs).toContain('toml-json-converter');
      expect(slugs).toContain('ndjson-converter');
      expect(slugs).toContain('protobuf-json-viewer');
      expect(slugs).toContain('graphql-schema-parser');
      expect(slugs).toContain('hcl-terraform-converter');
      expect(slugs).toContain('php-array-json-converter');
      expect(slugs).toContain('plist-json-converter');
      expect(slugs).toContain('sql-to-json-csv');
      expect(slugs).toContain('csv-to-sql');
      expect(slugs).toContain('msgpack-bencode-converter');

      // Phase 3: Code Minifiers & Beautifiers
      expect(slugs).toContain('html-minifier-beautifier');
      expect(slugs).toContain('css-minifier-beautifier');
      expect(slugs).toContain('js-minifier-beautifier');
      expect(slugs).toContain('sql-formatter-beautifier');
      expect(slugs).toContain('nginx-config-formatter');
      expect(slugs).toContain('apache-htaccess-formatter');
      expect(slugs).toContain('dockerfile-formatter-validator');
      expect(slugs).toContain('graphql-formatter');

      // Phase 3: String Encoders & Radix Converters
      expect(slugs).toContain('base64-encoder-decoder');
      expect(slugs).toContain('base32-base58-converter');
      expect(slugs).toContain('url-encoder-decoder');
      expect(slugs).toContain('html-entity-encoder-decoder');
      expect(slugs).toContain('morse-code-converter');
      expect(slugs).toContain('rot13-caesar-cipher');
      expect(slugs).toContain('punycode-converter');
      expect(slugs).toContain('quoted-printable-uuencode');
      expect(slugs).toContain('number-base-converter');
    });
  });

  describe('GET /api/tools/registry', () => {
    it('returns the full tools registry', async () => {
      const res = await request(app).get('/api/tools/registry').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(103);
      expect(Array.isArray(res.body.data.tools)).toBe(true);
      expect(res.body.data.modules.length).toBe(4);
    });

    it('filters tools by developer-code module', async () => {
      const res = await request(app).get('/api/tools/registry?module=developer-code').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tools.every((t) => t.module === 'developer-code')).toBe(true);
      expect(res.body.data.total).toBe(31);
    });

    it('filters tools by search query', async () => {
      const res = await request(app).get('/api/tools/registry?search=curl').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBeGreaterThanOrEqual(1);
      expect(res.body.data.tools.some((t) => t.slug === 'curl-to-code')).toBe(true);
    });
  });

  describe('POST /api/tools/execute/:slug', () => {
    // Phase 2 Tests
    it('executes audio-to-text transcription', async () => {
      const res = await request(app)
        .post('/api/tools/execute/audio-to-text')
        .send({ options: { language: 'en' } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.resultType).toBe('text');
      expect(res.body.data.result.content).toContain('Whisper');
    });

    // Phase 3 Tests: cURL to Code
    it('executes curl-to-code converter for JavaScript Fetch', async () => {
      const curl =
        'curl -X POST https://api.inwebtools.com/v1/auth/login -H "Content-Type: application/json" -d \'{"email":"test@test.com"}\'';
      const res = await request(app)
        .post('/api/tools/execute/curl-to-code')
        .send({ content: curl, options: { targetLanguage: 'javascript-fetch' } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.resultType).toBe('code');
      expect(res.body.data.result.content).toContain('fetch(');
      expect(res.body.data.result.content).toContain('POST');
    });

    it('executes json-to-types converter for TypeScript interfaces', async () => {
      const json = JSON.stringify({ id: 1, name: 'Alice', active: true });
      const res = await request(app)
        .post('/api/tools/execute/json-to-types')
        .send({ content: json, options: { targetLanguage: 'typescript', typeName: 'User' } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.resultType).toBe('code');
      expect(res.body.data.result.content).toContain('export interface User');
      expect(res.body.data.result.content).toContain('id: number');
      expect(res.body.data.result.content).toContain('name: string');
    });

    it('executes json-yaml-converter', async () => {
      const json = JSON.stringify({ app: 'iNWebTools', port: 5000 });
      const res = await request(app)
        .post('/api/tools/execute/json-yaml-converter')
        .send({ content: json, options: { mode: 'json-to-yaml' } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.content).toContain('app:');
      expect(res.body.data.result.content).toContain('port:');
    });

    it('executes html-minifier-beautifier', async () => {
      const html = '<div>  <h1>Hello World</h1>  </div>';
      const res = await request(app)
        .post('/api/tools/execute/html-minifier-beautifier')
        .send({ content: html, options: { mode: 'minify' } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.content).toBe('<div><h1>Hello World</h1></div>');
    });

    it('executes base64-encoder-decoder', async () => {
      const res = await request(app)
        .post('/api/tools/execute/base64-encoder-decoder')
        .send({ content: 'Hello iNWebTools', options: { mode: 'encode' } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.content).toBe(Buffer.from('Hello iNWebTools').toString('base64'));
    });

    it('executes number-base-converter', async () => {
      const res = await request(app)
        .post('/api/tools/execute/number-base-converter')
        .send({ content: '255' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.hexadecimal).toBe('0xFF');
      expect(res.body.data.result.metadata.binary).toBe('0b11111111');
    });
  });
});
