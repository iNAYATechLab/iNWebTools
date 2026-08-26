/**
 * Tools Engine Tests — Document, PDF, Image, Media, Developer, Security, Text, Calculators, SEO, Webmaster, Design, CSS, AI, Productivity & Math/Science.
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
      expect(reg.modules.length).toBe(10);
      expect(Array.isArray(reg.tools)).toBe(true);
      expect(reg.tools.length).toBe(242);
    });

    it('contains all required Phase 1-9 modules without duplicate slugs', () => {
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

      // Phase 7: CSS & Color Design Utilities
      expect(slugs).toContain('css-gradient-generator');
      expect(slugs).toContain('rgb-hex-converter');
      expect(slugs).toContain('wcag-contrast-checker');

      // Phase 8: AI & Productivity Utilities
      expect(slugs).toContain('ai-prompt-enhancer');
      expect(slugs).toContain('qr-code-generator');
      expect(slugs).toContain('pomodoro-timer');
      expect(slugs).toContain('kanban-task-board');

      // Phase 9: Health, Math & Science Suite
      expect(slugs).toContain('bmi-calculator');
      expect(slugs).toContain('bmr-calculator');
      expect(slugs).toContain('body-fat-percentage-calculator');
      expect(slugs).toContain('ideal-body-weight-calculator');
      expect(slugs).toContain('waist-to-height-hip-ratio-calculator');
      expect(slugs).toContain('daily-calorie-intake-calculator');
      expect(slugs).toContain('water-intake-calculator');
      expect(slugs).toContain('target-heart-rate-calculator');
      expect(slugs).toContain('pregnancy-due-date-calculator');
      expect(slugs).toContain('macro-nutrient-calculator');
      expect(slugs).toContain('matrix-calculator');
      expect(slugs).toContain('fraction-calculator');
      expect(slugs).toContain('prime-factorization-tool');
      expect(slugs).toContain('gcd-lcm-calculator');
      expect(slugs).toContain('quadratic-equation-solver');
      expect(slugs).toContain('exponential-logarithm-calculator');
      expect(slugs).toContain('scientific-calculator-online');
      expect(slugs).toContain('geometry-area-volume-calculator');
      expect(slugs).toContain('speed-velocity-acceleration-calculator');
      expect(slugs).toContain('force-newton-calculator');
      expect(slugs).toContain('work-energy-calculator');
      expect(slugs).toContain('ohms-law-calculator');
      expect(slugs).toContain('power-energy-cost-calculator');
      expect(slugs).toContain('frequency-wavelength-converter');
    });
  });

  describe('GET /api/tools/registry', () => {
    it('returns the full tools registry', async () => {
      const res = await request(app).get('/api/tools/registry').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(242);
      expect(Array.isArray(res.body.data.tools)).toBe(true);
      expect(res.body.data.modules.length).toBe(10);
    });

    it('filters tools by math-science module', async () => {
      const res = await request(app).get('/api/tools/registry?module=math-science').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tools.every((t) => t.module === 'math-science')).toBe(true);
      expect(res.body.data.total).toBe(24);
    });
  });

  describe('POST /api/tools/execute/:slug', () => {
    // Phase 9 Tests: Health & Fitness
    it('executes bmi-calculator and returns correct classification', async () => {
      const res = await request(app)
        .post('/api/tools/execute/bmi-calculator')
        .send({ options: { weight: 70, height: 175 } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.bmi).toBe(22.86);
      expect(res.body.data.result.metadata.category).toBe('Normal Weight');
    });

    it('executes bmr-calculator with Mifflin-St Jeor and Harris-Benedict formulas', async () => {
      const res = await request(app)
        .post('/api/tools/execute/bmr-calculator')
        .send({ options: { gender: 'male', weight: 75, height: 180, age: 30 } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.bmr).toBeGreaterThan(1600);
      expect(res.body.data.result.metadata.dailyCalorieBurn.sedentary).toBeDefined();
    });

    it('executes body-fat-percentage-calculator via US Navy method', async () => {
      const res = await request(app)
        .post('/api/tools/execute/body-fat-percentage-calculator')
        .send({
          options: { gender: 'male', height: 175, waist: 82, neck: 38, weight: 72 },
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.bodyFatPercentage).toBeDefined();
      expect(res.body.data.result.metadata.leanMass).toBeDefined();
    });

    it('executes ideal-body-weight-calculator across Devine and Robinson equations', async () => {
      const res = await request(app)
        .post('/api/tools/execute/ideal-body-weight-calculator')
        .send({ options: { gender: 'male', height: 178 } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.devineFormula).toBeDefined();
      expect(res.body.data.result.metadata.averageIdealWeight).toBeDefined();
    });

    // Phase 9 Tests: Pure Mathematics & Geometry
    it('executes matrix-calculator for determinant and inversion', async () => {
      const res = await request(app)
        .post('/api/tools/execute/matrix-calculator')
        .send({
          options: {
            operation: 'determinant',
            matrixA: [
              [4, 2],
              [1, 3],
            ],
          },
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.determinant).toBe(10);
    });

    it('executes fraction-calculator arithmetic and simplification', async () => {
      const res = await request(app)
        .post('/api/tools/execute/fraction-calculator')
        .send({
          options: { num1: 1, den1: 2, operator: '+', num2: 1, den2: 3 },
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.simplifiedFraction).toBe('5/6');
    });

    it('executes prime-factorization-tool', async () => {
      const res = await request(app)
        .post('/api/tools/execute/prime-factorization-tool')
        .send({ options: { number: 360 } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.primeFactorization).toBe('2^3 × 3^2 × 5');
      expect(res.body.data.result.metadata.divisorsCount).toBe(24);
    });

    it('executes quadratic-equation-solver with real roots', async () => {
      const res = await request(app)
        .post('/api/tools/execute/quadratic-equation-solver')
        .send({ options: { a: 1, b: -5, c: 6 } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.discriminant).toBe(1);
      expect(res.body.data.result.metadata.roots).toEqual([3, 2]);
    });

    it('executes geometry-area-volume-calculator for sphere', async () => {
      const res = await request(app)
        .post('/api/tools/execute/geometry-area-volume-calculator')
        .send({ options: { shape: 'sphere', radius: 5 } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.area).toBeGreaterThan(300);
      expect(res.body.data.result.metadata.volume).toBeGreaterThan(500);
    });

    // Phase 9 Tests: Physics & Science
    it('executes speed-velocity-acceleration-calculator', async () => {
      const res = await request(app)
        .post('/api/tools/execute/speed-velocity-acceleration-calculator')
        .send({ options: { initialVelocity: 0, acceleration: 9.8, time: 4 } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.finalVelocity).toBe('39.2 m/s');
      expect(res.body.data.result.metadata.distanceTraveled).toBe('78.4 meters');
    });

    it('executes ohms-law-calculator', async () => {
      const res = await request(app)
        .post('/api/tools/execute/ohms-law-calculator')
        .send({ options: { voltage: 24, resistance: 8 } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.current).toBe('3 A');
      expect(res.body.data.result.metadata.power).toBe('72 W');
    });

    it('executes work-energy-calculator for kinetic and potential energy', async () => {
      const res = await request(app)
        .post('/api/tools/execute/work-energy-calculator')
        .send({ options: { mass: 10, velocity: 20, height: 15 } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.kineticEnergy).toBe('2000 Joules');
      expect(res.body.data.result.metadata.potentialEnergy).toContain('Joules');
    });

    it('executes frequency-wavelength-converter for 2.4 GHz WiFi band', async () => {
      const res = await request(app)
        .post('/api/tools/execute/frequency-wavelength-converter')
        .send({ options: { frequencyHz: 2400000000 } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.spectrumBand).toBe('UHF Radio / WiFi / Bluetooth');
      expect(res.body.data.result.metadata.wavelengthMeters).toBe('0.124914 m (12.49 cm)');
    });

    // Phase 8 Tests: AI & Productivity
    it('executes ai-prompt-enhancer and returns structured prompt', async () => {
      const res = await request(app)
        .post('/api/tools/execute/ai-prompt-enhancer')
        .send({ content: 'Create a responsive web audio synthesizer' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.content).toContain('Core Objective:');
    });

    it('executes qr-code-generator and returns SVG markup', async () => {
      const res = await request(app)
        .post('/api/tools/execute/qr-code-generator')
        .send({ content: 'https://inwebtools.com', options: { size: 256 } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.content).toContain('<svg');
    });

    // Phase 7 Tests: Color & Design
    it('executes rgb-hex-converter and returns rgb and rgba strings', async () => {
      const res = await request(app)
        .post('/api/tools/execute/rgb-hex-converter')
        .send({ content: '#3b82f6' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.result.metadata.rgb).toBe('rgb(59, 130, 246)');
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
    });
  });
});
