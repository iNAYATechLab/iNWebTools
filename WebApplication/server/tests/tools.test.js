/**
 * Tools Engine Tests — Document, Spreadsheet, PDF, Image, Audio & Video Processors.
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
      expect(reg.modules.length).toBe(3);
      expect(Array.isArray(reg.tools)).toBe(true);
      expect(reg.tools.length).toBe(72);
    });

    it('contains all required Phase 1 & Phase 2 modules without duplicate slugs', () => {
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
      expect(slugs).toContain('powerpoint-to-pdf');
      expect(slugs).toContain('epub-to-pdf');
      expect(slugs).toContain('html-to-pdf');

      // Phase 1: PDF Editing & Management tools
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

      // Phase 1: Image Tools & Extended Converters
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

      // Phase 2: Audio Converters & Utilities
      expect(slugs).toContain('audio-converter');
      expect(slugs).toContain('audio-to-text');
      expect(slugs).toContain('voice-to-text');
      expect(slugs).toContain('audio-compressor');
      expect(slugs).toContain('audio-cutter');
      expect(slugs).toContain('audio-joiner');
      expect(slugs).toContain('audio-volume-booster');
      expect(slugs).toContain('audio-speed-changer');
      expect(slugs).toContain('voice-recorder');
      expect(slugs).toContain('audio-noise-reduction');
      expect(slugs).toContain('audio-equalizer');
      expect(slugs).toContain('audio-vocal-remover');
      expect(slugs).toContain('audio-bpm-analyzer');

      // Phase 2: Video Converters & Utilities
      expect(slugs).toContain('video-converter');
      expect(slugs).toContain('video-to-audio');
      expect(slugs).toContain('video-compressor');
      expect(slugs).toContain('video-cutter');
      expect(slugs).toContain('video-mute');
      expect(slugs).toContain('video-speed-changer');
      expect(slugs).toContain('video-watermark');
      expect(slugs).toContain('subtitle-converter');
      expect(slugs).toContain('video-frame-extractor');
      expect(slugs).toContain('video-metadata-editor');
      expect(slugs).toContain('video-to-gif');
    });
  });

  describe('GET /api/tools/registry', () => {
    it('returns the full tools registry', async () => {
      const res = await request(app).get('/api/tools/registry').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(72);
      expect(Array.isArray(res.body.data.tools)).toBe(true);
      expect(res.body.data.modules.length).toBe(3);
    });

    it('filters tools by module', async () => {
      const res = await request(app).get('/api/tools/registry?module=audio-video').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tools.every((t) => t.module === 'audio-video')).toBe(true);
      expect(res.body.data.total).toBe(24);
    });

    it('filters tools by search query', async () => {
      const res = await request(app).get('/api/tools/registry?search=compress').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBeGreaterThanOrEqual(4);
      expect(res.body.data.tools.some((t) => t.slug === 'audio-compressor')).toBe(true);
      expect(res.body.data.tools.some((t) => t.slug === 'video-compressor')).toBe(true);
    });
  });

  describe('POST /api/tools/execute/:slug', () => {
    it('executes audio-to-text transcription', async () => {
      const res = await request(app)
        .post('/api/tools/execute/audio-to-text')
        .send({ options: { language: 'en' } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.resultType).toBe('text');
      expect(res.body.data.result.content).toContain('Whisper');
      expect(res.body.data.result.stats.language).toBe('en');
    });

    it('executes subtitle-converter SRT to VTT', async () => {
      const srt = `1\n00:00:01,000 --> 00:00:04,000\nHello world\n`;
      const res = await request(app)
        .post('/api/tools/execute/subtitle-converter')
        .send({ content: srt, options: { targetFormat: 'vtt' } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.content).toContain('WEBVTT');
      expect(res.body.data.result.content).toContain('00:00:01.000');
    });

    it('executes audio-bpm-analyzer', async () => {
      const res = await request(app)
        .post('/api/tools/execute/audio-bpm-analyzer')
        .send({ options: {} })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.resultType).toBe('metadata');
      expect(res.body.data.result.stats.bpm).toBeDefined();
      expect(res.body.data.result.stats.musicalKey).toBeDefined();
    });

    it('executes video-to-audio extraction', async () => {
      const res = await request(app)
        .post('/api/tools/execute/video-to-audio')
        .send({ options: { audioFormat: 'mp3', audioBitrate: '320 kbps' } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.resultType).toBe('file');
      expect(res.body.data.result.fileName).toContain('.mp3');
    });

    it('executes video-to-gif conversion', async () => {
      const res = await request(app)
        .post('/api/tools/execute/video-to-gif')
        .send({ options: { fps: 20 } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.resultType).toBe('file');
      expect(res.body.data.result.fileName).toContain('.gif');
      expect(res.body.data.result.stats.fps).toBe('20 FPS');
    });
  });
});
