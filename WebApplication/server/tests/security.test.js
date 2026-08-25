/**
 * Security regression tests.
 *
 * Each case here corresponds to a finding from the Step 4 security audit. They
 * exist so a future refactor cannot silently reintroduce the vulnerability.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, '__fixtures__security__');

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PE_MAGIC = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00', 'binary');

beforeAll(() => {
  fs.mkdirSync(FIXTURES, { recursive: true });

  // Polyglot attacks: real PNG/EXE bytes wearing an audio extension.
  fs.writeFileSync(
    path.join(FIXTURES, 'disguised.mp3'),
    Buffer.concat([PNG_MAGIC, Buffer.alloc(512)]),
  );
  fs.writeFileSync(
    path.join(FIXTURES, 'disguised.wav'),
    Buffer.concat([PE_MAGIC, Buffer.alloc(512)]),
  );
  fs.writeFileSync(path.join(FIXTURES, 'script.mp3'), '#!/bin/sh\nrm -rf /\n');
  fs.writeFileSync(path.join(FIXTURES, 'image.png'), Buffer.concat([PNG_MAGIC, Buffer.alloc(64)]));
  fs.writeFileSync(path.join(FIXTURES, 'malware.exe'), Buffer.concat([PE_MAGIC, Buffer.alloc(64)]));
  fs.writeFileSync(path.join(FIXTURES, 'tiny.mp3'), Buffer.from([0xff, 0xfb]));
});

afterAll(() => {
  fs.rmSync(FIXTURES, { recursive: true, force: true });
});

describe('trust proxy configuration', () => {
  it('does not trust X-Forwarded-For by default', async () => {
    // If Express trusted the header, an attacker could rotate fake IPs and
    // defeat the per-IP rate limiter on the expensive AI endpoint.
    const { env } = await import('../config/env.js');
    expect(env.TRUST_PROXY).toBe(false);
  });

  // env.js is a singleton evaluated at import time, so the parser itself is
  // re-tested here via a fresh module registry rather than a cache-busted URL.
  it.each([
    ['', false],
    ['false', false],
    ['0', false],
    ['true', true],
    ['1', 1],
    ['2', 2],
    ['10.0.0.1, 10.0.0.2', ['10.0.0.1', '10.0.0.2']],
  ])('parses TRUST_PROXY=%j as %j', async (value, expected) => {
    vi.resetModules();
    const original = process.env.TRUST_PROXY;
    process.env.TRUST_PROXY = value;

    const { env } = await import('../config/env.js');
    expect(env.TRUST_PROXY).toEqual(expected);

    if (original === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = original;
    vi.resetModules();
  });
});

describe('tests never call the real provider', () => {
  it('suppresses any HF token under NODE_ENV=test', async () => {
    // CI supplies a dummy token. Without this guard the server treats it as
    // real, calls api-inference.huggingface.co and hangs until vitest times
    // out — which is exactly how the Step 4 pipeline broke.
    vi.resetModules();
    const original = process.env.HF_FREE_API_TOKEN;
    process.env.HF_FREE_API_TOKEN = 'hf_someTokenThatLooksCompletelyReal123456';

    const { env } = await import('../config/env.js');
    expect(env.HF_TOKEN_CONFIGURED).toBe(false);
    expect(env.HF_FREE_API_TOKEN).toBe('');

    if (original === undefined) delete process.env.HF_FREE_API_TOKEN;
    else process.env.HF_FREE_API_TOKEN = original;
    vi.resetModules();
  });

  it('allows an explicit opt-in for tests that use a local mock', async () => {
    vi.resetModules();
    const originalToken = process.env.HF_FREE_API_TOKEN;
    const originalFlag = process.env.ALLOW_HF_NETWORK_IN_TESTS;
    process.env.HF_FREE_API_TOKEN = 'hf_mockTokenForLocalUpstream1234567890';
    process.env.ALLOW_HF_NETWORK_IN_TESTS = 'true';

    const { env } = await import('../config/env.js');
    expect(env.HF_TOKEN_CONFIGURED).toBe(true);

    if (originalToken === undefined) delete process.env.HF_FREE_API_TOKEN;
    else process.env.HF_FREE_API_TOKEN = originalToken;
    if (originalFlag === undefined) delete process.env.ALLOW_HF_NETWORK_IN_TESTS;
    else process.env.ALLOW_HF_NETWORK_IN_TESTS = originalFlag;
    vi.resetModules();
  });
});

describe('content-type spoofing is rejected', () => {
  let app;

  beforeAll(async () => {
    ({ default: app } = await import('../index.js'));
  });

  it('rejects PNG bytes renamed to .mp3', async () => {
    const res = await request(app)
      .post('/api/transcribe')
      .attach('audio', path.join(FIXTURES, 'disguised.mp3'));

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('rejects a Windows executable renamed to .wav', async () => {
    const res = await request(app)
      .post('/api/transcribe')
      .attach('audio', path.join(FIXTURES, 'disguised.wav'));

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('rejects a shell script renamed to .mp3', async () => {
    const res = await request(app)
      .post('/api/transcribe')
      .attach('audio', path.join(FIXTURES, 'script.mp3'));

    expect(res.status).toBe(415);
  });

  it('rejects files too small to carry a valid signature', async () => {
    const res = await request(app)
      .post('/api/transcribe')
      .attach('audio', path.join(FIXTURES, 'tiny.mp3'));

    expect(res.status).toBe(415);
  });

  it.each([
    ['image.png', 'a PNG'],
    ['malware.exe', 'an executable'],
  ])('rejects %s (%s) on extension alone', async (fixture) => {
    const res = await request(app)
      .post('/api/transcribe')
      .attach('audio', path.join(FIXTURES, fixture));

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });
});

describe('path traversal', () => {
  let app;

  beforeAll(async () => {
    ({ default: app } = await import('../index.js'));
  });

  it('never writes outside the temp directory, whatever the filename claims', async () => {
    const { env } = await import('../config/env.js');
    const before = fs.existsSync(env.UPLOAD_TMP_DIR)
      ? fs.readdirSync(env.UPLOAD_TMP_DIR).length
      : 0;

    await request(app)
      .post('/api/transcribe')
      .attach('audio', Buffer.from([0xff, 0xfb, 0x90, 0x00, ...Buffer.alloc(256)]), {
        filename: '../../../../tmp/pwned.mp3',
        contentType: 'audio/mpeg',
      });

    expect(fs.existsSync('/tmp/pwned.mp3')).toBe(false);
    // And the upload was cleaned up rather than left behind.
    const after = fs.existsSync(env.UPLOAD_TMP_DIR) ? fs.readdirSync(env.UPLOAD_TMP_DIR).length : 0;
    expect(after).toBe(before);
  });
});

describe('information disclosure', () => {
  let app;

  beforeAll(async () => {
    ({ default: app } = await import('../index.js'));
  });

  it('never exposes the HF token through /health or /api/info', async () => {
    const health = await request(app).get('/health');
    const info = await request(app).get('/api/info');

    const combined = JSON.stringify(health.body) + JSON.stringify(info.body);
    expect(combined).not.toMatch(/hf_[A-Za-z0-9]/);
    expect(combined).not.toContain('HF_FREE_API_TOKEN');
    // Readiness is reported as a boolean, not the secret itself.
    expect(typeof health.body.data.transcriptionReady).toBe('boolean');
  });

  it('does not advertise the server technology', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('sets the standard hardening headers', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });
});
