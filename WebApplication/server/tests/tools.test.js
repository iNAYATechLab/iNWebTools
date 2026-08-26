/**
 * Tools Engine Tests — Document, PDF, Image, Media, Developer, and Phase 4 Security & Network Tools.
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
      expect(reg.modules.length).toBe(5);
      expect(Array.isArray(reg.tools)).toBe(true);
      expect(reg.tools.length).toBe(121);
    });

    it('contains all required Phase 1-4 modules without duplicate slugs', () => {
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
      expect(slugs).toContain('password-generator');
      expect(slugs).toContain('password-strength-checker');
      expect(slugs).toContain('rsa-key-generator');
      expect(slugs).toContain('ecdsa-ed25519-generator');
      expect(slugs).toContain('uuid-generator');
      expect(slugs).toContain('jwt-decoder-debugger');
      expect(slugs).toContain('hmac-generator');
      expect(slugs).toContain('pbkdf2-hasher');
      expect(slugs).toContain('text-encrypter-decrypter');

      // Phase 4: Network & Diagnostics
      expect(slugs).toContain('subnet-calculator');
      expect(slugs).toContain('user-agent-parser');
      expect(slugs).toContain('ip-geolocation-lookup');
      expect(slugs).toContain('dns-lookup-records');
      expect(slugs).toContain('http-headers-status-checker');
      expect(slugs).toContain('ssl-certificate-inspector');
      expect(slugs).toContain('csp-security-headers-generator');
    });
  });

  describe('GET /api/tools/registry', () => {
    it('returns the full tools registry', async () => {
      const res = await request(app).get('/api/tools/registry').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(121);
      expect(Array.isArray(res.body.data.tools)).toBe(true);
      expect(res.body.data.modules.length).toBe(5);
    });

    it('filters tools by security-network module', async () => {
      const res = await request(app).get('/api/tools/registry?module=security-network').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tools.every((t) => t.module === 'security-network')).toBe(true);
      expect(res.body.data.total).toBe(18);
    });
  });

  describe('POST /api/tools/execute/:slug', () => {
    // Phase 4 Tests: Cryptography
    it('executes hash-generator-suite computing SHA-256 and MD5 digests', async () => {
      const res = await request(app)
        .post('/api/tools/execute/hash-generator-suite')
        .send({ content: 'Hello iNWebTools Security', options: { algorithm: 'SHA-256' } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.primaryHash).toBeDefined();
      expect(res.body.data.result.metadata.digests.sha256).toBeDefined();
      expect(res.body.data.result.metadata.digests.md5).toBeDefined();
    });

    it('executes aes-encrypt-decrypt roundtrip', async () => {
      const payload = 'Confidential String 2026';
      const encRes = await request(app)
        .post('/api/tools/execute/aes-encrypt-decrypt')
        .send({ content: payload, options: { mode: 'encrypt', secretKey: 'Pass123!' } })
        .expect(200);

      expect(encRes.body.success).toBe(true);
      const cipherText = encRes.body.data.result.content;
      expect(cipherText).toContain(':');

      const decRes = await request(app)
        .post('/api/tools/execute/aes-encrypt-decrypt')
        .send({ content: cipherText, options: { mode: 'decrypt', secretKey: 'Pass123!' } })
        .expect(200);

      expect(decRes.body.success).toBe(true);
      expect(decRes.body.data.result.content).toBe(payload);
    });

    it('executes rsa-key-generator creating PEM keys', async () => {
      const res = await request(app)
        .post('/api/tools/execute/rsa-key-generator')
        .send({ options: { keySize: 2048 } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(res.body.data.result.metadata.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });

    it('executes password-generator with entropy scoring', async () => {
      const res = await request(app)
        .post('/api/tools/execute/password-generator')
        .send({ options: { length: 24, symbols: true } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.password.length).toBe(24);
      expect(res.body.data.result.metadata.entropyBits).toBeGreaterThan(100);
    });

    // Phase 4 Tests: Network
    it('executes subnet-calculator IPv4 analysis', async () => {
      const res = await request(app)
        .post('/api/tools/execute/subnet-calculator')
        .send({ content: '192.168.10.50', options: { cidr: 24 } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.networkAddress).toBe('192.168.10.0');
      expect(res.body.data.result.metadata.broadcastAddress).toBe('192.168.10.255');
      expect(res.body.data.result.metadata.usableHosts).toBe(254);
    });

    it('executes csp-security-headers-generator', async () => {
      const res = await request(app)
        .post('/api/tools/execute/csp-security-headers-generator')
        .send({ content: 'inwebtools.com' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.content).toContain('Content-Security-Policy');
      expect(res.body.data.result.content).toContain("default-src 'self'");
    });
  });
});
