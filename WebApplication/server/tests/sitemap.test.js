import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../index.js';

describe('Sitemap & Robots API Tests', () => {
  it('GET /sitemap.xml returns valid XML sitemap with all categories and tools', async () => {
    const res = await request(app).get('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/xml/);
    expect(res.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(res.text).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(res.text).toContain('/tools</loc>');
    expect(res.text).toContain('bmi-calculator</loc>');
    expect(res.text).toContain('word-character-counter</loc>');
  });

  it('GET /api/sitemap.xml returns the same XML sitemap', async () => {
    const res = await request(app).get('/api/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/xml/);
    expect(res.text).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  });

  it('GET /robots.txt returns valid robots.txt with sitemap directive', async () => {
    const res = await request(app).get('/robots.txt');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toContain('User-agent: *');
    expect(res.text).toContain('Allow: /');
    expect(res.text).toContain('Sitemap:');
    expect(res.text).toContain('/sitemap.xml');
  });
});
