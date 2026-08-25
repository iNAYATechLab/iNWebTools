/**
 * Integration tests for the iNWebTools API.
 *
 * These run without a Hugging Face token: they exercise routing, validation,
 * limits and cleanup. The upstream call itself is covered by the negative-path
 * assertion that an unconfigured token yields 503 HF_TOKEN_MISSING.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP_DIR = path.resolve(__dirname, '..', 'tmp');

const { default: app } = await import('../index.js');

/* ----------------------------- fixtures ------------------------------ */

const FIXTURES = path.join(__dirname, '__fixtures__');

/** Minimal but structurally valid WAV (44-byte header + silence). */
function makeWav(file, dataBytes = 128) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(8000, 24);
  header.writeUInt32LE(8000, 28);
  header.writeUInt16LE(1, 32);
  header.writeUInt16LE(8, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataBytes, 40);
  fs.writeFileSync(file, Buffer.concat([header, Buffer.alloc(dataBytes)]));
}

/** MP3 with an ID3 tag so the magic-byte check passes. */
function makeMp3(file) {
  const id3 = Buffer.from('ID3\x03\x00\x00\x00\x00\x00\x00', 'binary');
  fs.writeFileSync(file, Buffer.concat([id3, Buffer.alloc(256)]));
}

beforeAll(() => {
  fs.mkdirSync(FIXTURES, { recursive: true });
  makeWav(path.join(FIXTURES, 'sample.wav'));
  makeMp3(path.join(FIXTURES, 'sample.mp3'));
  // A .mp3 name whose bytes are plain text — must be rejected by signature check.
  fs.writeFileSync(path.join(FIXTURES, 'fake.mp3'), 'this is not audio, it is text');
  fs.writeFileSync(path.join(FIXTURES, 'notes.txt'), 'plain text');
});

afterAll(() => {
  fs.rmSync(FIXTURES, { recursive: true, force: true });
});

const fixture = (name) => path.join(FIXTURES, name);

/* ------------------------------- tests -------------------------------- */

describe('GET /health', () => {
  it('reports service status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.project).toBe('iNWebTools');
    expect(res.body.data.model).toBe('openai/whisper-large-v3');
    expect(typeof res.body.data.transcriptionReady).toBe('boolean');
  });

  it('returns a correlation id', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('does not leak the API token', async () => {
    const res = await request(app).get('/health');
    expect(JSON.stringify(res.body)).not.toMatch(/hf_|HF_FREE_API_TOKEN/);
  });
});

describe('GET /api/info', () => {
  it('exposes upload limits for the client', async () => {
    const res = await request(app).get('/api/info');
    expect(res.status).toBe(200);
    expect(res.body.data.maxUploadSizeMb).toBe(10);
    expect(res.body.data.allowedExtensions).toEqual(['.mp3', '.wav', '.m4a']);
    expect(res.body.data.rateLimit.maxRequests).toBe(20);
    expect(res.body.data.rateLimit.windowMinutes).toBe(15);
  });
});

describe('POST /api/transcribe — validation', () => {
  it('rejects a request with no file', async () => {
    const res = await request(app).post('/api/transcribe');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NO_FILE');
  });

  it('rejects a disallowed extension', async () => {
    const res = await request(app).post('/api/transcribe').attach('audio', fixture('notes.txt'));
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('rejects a file whose bytes are not real audio', async () => {
    const res = await request(app)
      .post('/api/transcribe')
      .attach('audio', fixture('fake.mp3'), { contentType: 'audio/mpeg' });
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('rejects a file larger than the 10 MB limit', async () => {
    const big = path.join(FIXTURES, 'big.wav');
    makeWav(big, 11 * 1024 * 1024);
    const res = await request(app)
      .post('/api/transcribe')
      .attach('audio', big, { contentType: 'audio/wav' });
    fs.rmSync(big, { force: true });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('rejects an unexpected field name', async () => {
    const res = await request(app)
      .post('/api/transcribe')
      .attach('file', fixture('sample.wav'), { contentType: 'audio/wav' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNEXPECTED_FIELD');
  });
});

describe('POST /api/transcribe — accepted formats reach the provider', () => {
  // Without a token the service short-circuits with 503 HF_TOKEN_MISSING,
  // which proves validation passed and the request got as far as the client.
  for (const [name, type] of [
    ['sample.wav', 'audio/wav'],
    ['sample.mp3', 'audio/mpeg'],
  ]) {
    it(`accepts ${name}`, async () => {
      const res = await request(app)
        .post('/api/transcribe')
        .attach('audio', fixture(name), { contentType: type });

      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('HF_TOKEN_MISSING');
    });
  }
});

describe('POST /api/transcribe — language hint', () => {
  // A 503 HF_TOKEN_MISSING means validation passed and the request reached the
  // provider client; a 400 means the hint itself was rejected.
  for (const code of ['bn', 'en', 'ja', 'yue']) {
    it(`accepts the supported code "${code}"`, async () => {
      const res = await request(app)
        .post('/api/transcribe')
        .field('language', code)
        .attach('audio', fixture('sample.wav'), { contentType: 'audio/wav' });

      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('HF_TOKEN_MISSING');
    });
  }

  it('treats "auto" as no hint', async () => {
    const res = await request(app)
      .post('/api/transcribe')
      .field('language', 'auto')
      .attach('audio', fixture('sample.wav'), { contentType: 'audio/wav' });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('HF_TOKEN_MISSING');
  });

  it('normalises case and surrounding whitespace', async () => {
    const res = await request(app)
      .post('/api/transcribe')
      .field('language', '  EN ')
      .attach('audio', fixture('sample.wav'), { contentType: 'audio/wav' });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('HF_TOKEN_MISSING');
  });

  it('rejects an unsupported code before calling the provider', async () => {
    const res = await request(app)
      .post('/api/transcribe')
      .field('language', 'klingon')
      .attach('audio', fixture('sample.wav'), { contentType: 'audio/wav' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNSUPPORTED_LANGUAGE');
    expect(res.body.error.details.supportedLanguages).toContain('bn');
  });

  it('advertises the supported languages via /api/info', async () => {
    const res = await request(app).get('/api/info');

    expect(res.status).toBe(200);
    expect(res.body.data.languageCount).toBe(res.body.data.supportedLanguages.length);
    expect(res.body.data.supportedLanguages).toEqual(expect.arrayContaining(['bn', 'en', 'yue']));
  });
});

describe('temporary file cleanup', () => {
  it('leaves no uploads behind after any outcome', async () => {
    const before = fs.existsSync(TMP_DIR)
      ? fs.readdirSync(TMP_DIR).filter((f) => f !== '.gitkeep')
      : [];

    await request(app).post('/api/transcribe').attach('audio', fixture('sample.wav'), {
      contentType: 'audio/wav',
    });
    await request(app).post('/api/transcribe').attach('audio', fixture('fake.mp3'), {
      contentType: 'audio/mpeg',
    });

    // Cleanup happens in a finally block; give the event loop a tick.
    await new Promise((r) => setTimeout(r, 150));

    const after = fs.readdirSync(TMP_DIR).filter((f) => f !== '.gitkeep');
    expect(after).toEqual(before);
  });
});

describe('unknown routes', () => {
  it('returns a structured 404', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
