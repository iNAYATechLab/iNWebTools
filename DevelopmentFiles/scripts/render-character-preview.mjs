#!/usr/bin/env node
/**
 * Render every mood of the auth guide character to a standalone HTML page.
 *
 *   node DevelopmentFiles/scripts/render-character-preview.mjs
 *
 * Why this exists: the character is pure SVG driven by a `mood` prop, and the
 * only way to know a pose actually looks right is to look at it. Mounting the
 * real React component in a browser needs the whole app running; this reads
 * the geometry tables straight out of the component source and lays every
 * state out side by side.
 *
 * It parses AuthCharacter.tsx rather than duplicating the numbers, so the
 * preview cannot silently drift from what ships.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const SOURCE = path.join(root, 'WebApplication/client/src/components/auth/AuthCharacter.tsx');
const OUT = path.join(root, 'DevelopmentFiles/previews/auth-character.html');

const MOODS = ['idle', 'watching', 'hiding', 'peeking', 'cheering', 'sad', 'thinking'];

const LABELS = {
  idle: 'idle — resting',
  watching: 'watching — identifier focused',
  hiding: 'hiding — password focused',
  peeking: 'peeking — password revealed',
  cheering: 'cheering — success',
  sad: 'sad — error',
  thinking: 'thinking — forgot password',
};

/** Pull `name: { x: 1, y: 2 }` pairs out of a named table in the source. */
function parsePoints(source, tableName) {
  const table = source.slice(source.indexOf(`const ${tableName}`));
  const body = table.slice(table.indexOf('{'), table.indexOf('\n};'));
  const out = {};
  for (const mood of MOODS) {
    const row = new RegExp(`${mood}:\\s*\\{([^\\n]*)\\}`).exec(body);
    if (!row) continue;
    const nums = [...row[1].matchAll(/-?\d+(?:\.\d+)?/g)].map(Number);
    out[mood] =
      nums.length >= 4
        ? { left: { x: nums[0], y: nums[1] }, right: { x: nums[2], y: nums[3] } }
        : { x: nums[0], y: nums[1] };
  }
  return out;
}

function svg(mood, pupils, hands) {
  const p = pupils[mood];
  const h = hands[mood];
  const covered = mood === 'hiding';
  const radius = covered || mood === 'peeking' ? 11 : 9.5;
  const ry = mood === 'sad' ? 6 : 10;
  const antenna = mood === 'cheering' ? '#34d399' : '#a5b4fc';

  const eyes = covered
    ? ''
    : `<g class="a2t-eye">
        <ellipse cx="84" cy="86" rx="9" ry="${ry}" fill="#e0e7ff"/>
        <ellipse cx="116" cy="86" rx="9" ry="${ry}" fill="#e0e7ff"/>
        <g class="a2t-pupil" style="transform: translate(${p.x}px, ${p.y}px)">
          <circle cx="84" cy="86" r="4.5" fill="#1e1b4b"/>
          <circle cx="116" cy="86" r="4.5" fill="#1e1b4b"/>
          <circle cx="85.8" cy="84.2" r="1.6" fill="#fff" opacity=".9"/>
          <circle cx="117.8" cy="84.2" r="1.6" fill="#fff" opacity=".9"/>
        </g></g>`;

  const peek =
    mood === 'peeking'
      ? '<g><ellipse cx="116" cy="86" rx="7" ry="8" fill="#e0e7ff"/><circle cx="116" cy="88" r="3.6" fill="#1e1b4b"/></g>'
      : '';

  const mouth =
    mood === 'cheering'
      ? '<path d="M88 102 Q100 114 112 102 Q100 108 88 102 Z" fill="#34d399"/>'
      : mood === 'sad'
        ? '<path d="M90 108 Q100 100 110 108" stroke="#fca5a5" stroke-width="3" fill="none" stroke-linecap="round"/>'
        : '<path d="M91 103 Q100 110 109 103" stroke="#c7d2fe" stroke-width="3" fill="none" stroke-linecap="round"/>';

  const think =
    mood === 'thinking'
      ? `<g>
          <circle class="a2t-dot" cx="150" cy="62" r="4" fill="#a5b4fc" style="animation-delay:0s"/>
          <circle class="a2t-dot" cx="162" cy="50" r="5.5" fill="#a5b4fc" style="animation-delay:.2s"/>
          <circle class="a2t-dot" cx="176" cy="36" r="7" fill="#a5b4fc" style="animation-delay:.4s"/></g>`
      : '';

  return `<svg viewBox="0 0 200 200" width="150" height="150">
    <defs>
      <linearGradient id="s-${mood}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient>
      <linearGradient id="f-${mood}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#0f172a"/></linearGradient>
    </defs>
    <circle class="a2t-glow" cx="100" cy="100" r="72" fill="#6366f1" opacity=".25"/>
    <g class="a2t-body${mood === 'cheering' ? ' a2t-cheer' : ''}">
      <line x1="100" y1="46" x2="100" y2="30" stroke="#818cf8" stroke-width="3" stroke-linecap="round"/>
      <circle cx="100" cy="26" r="6" fill="${antenna}"/>
      <rect x="52" y="46" width="96" height="80" rx="26" fill="url(#s-${mood})"/>
      <rect x="62" y="58" width="76" height="56" rx="20" fill="url(#f-${mood})"/>
      ${eyes}${peek}${mouth}
      <rect x="70" y="130" width="60" height="42" rx="18" fill="url(#s-${mood})" opacity=".9"/>
      <rect x="86" y="142" width="28" height="6" rx="3" fill="#c7d2fe" opacity=".6"/>
      <g class="a2t-hand" style="transform: translate(${h.left.x}px, ${h.left.y}px)"><circle cx="66" cy="150" r="${radius}" fill="#c7d2fe"/></g>
      <g class="a2t-hand" style="transform: translate(${h.right.x}px, ${h.right.y}px)"><circle cx="134" cy="150" r="${radius}" fill="#c7d2fe"/></g>
    </g>${think}</svg>`;
}

const source = await fs.readFile(SOURCE, 'utf8');
const style = /<style>\{`([\s\S]*?)`\}<\/style>/.exec(source)[1];
const pupils = parsePoints(source, 'PUPILS');
const hands = parsePoints(source, 'HANDS');

const cards = MOODS.map(
  (m) =>
    `<figure><div class="box">${svg(m, pupils, hands)}</div><figcaption>${LABELS[m]}</figcaption></figure>`,
).join('\n');

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Auth character moods</title>
<style>
${style}
body{margin:0;padding:32px;background:#0b1020;color:#e2e8f0;font:14px/1.5 system-ui,sans-serif}
h1{font-size:20px;margin:0 0 4px} p.sub{color:#94a3b8;margin:0 0 24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:16px}
figure{margin:0;text-align:center}
.box{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:8px}
figcaption{margin-top:8px;font-size:12px;color:#94a3b8}
</style></head><body>
<h1>Guide character — every mood</h1>
<p class="sub">Pure SVG and CSS, generated from AuthCharacter.tsx.</p>
<div class="grid">${cards}</div></body></html>`;

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, html);
console.log(`Wrote ${path.relative(root, OUT)}`);
