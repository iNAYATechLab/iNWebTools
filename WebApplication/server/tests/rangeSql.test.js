/**
 * Regression cover for the time-range predicates.
 *
 * `range=yesterday` answered 500 in the live dashboard. The predicate was
 * still SQLite's `date(created_at) = date('now', '-1 day')`, and PostgreSQL's
 * date() takes a single argument, so the query died with
 * "function date(unknown, unknown) does not exist". `today` had survived the
 * engine swap only by luck: date('now') parses in PostgreSQL as a cast of the
 * string 'now', so it returned the right answer for the wrong reason and drew
 * no attention to its neighbour.
 *
 * Requests-level tests could not catch this — the whole admin router is
 * skipped under IS_TEST — so these assertions read the predicates out of the
 * source and check them against the shapes PostgreSQL actually accepts.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  fileURLToPath(new URL('../routes/admin.routes.js', import.meta.url)),
  'utf8',
);

/** Pull the RANGE_SQL object literal out of the router source. */
function rangePredicates() {
  const start = source.indexOf('const RANGE_SQL = {');
  expect(start, 'RANGE_SQL block not found — did it get renamed?').toBeGreaterThan(-1);
  const body = source.slice(start, source.indexOf('};', start));

  const predicates = {};
  for (const line of body.split('\n')) {
    const match = line.match(/^\s*(\w+):\s*(.+?),\s*$/);
    if (match) predicates[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return predicates;
}

describe('RANGE_SQL predicates', () => {
  const predicates = rangePredicates();

  it('covers exactly the six ranges the UI offers', () => {
    // The dashboard renders one button per key; a mismatch means a button
    // that can only ever produce INVALID_RANGE.
    expect(Object.keys(predicates).sort()).toEqual(
      ['alltime', 'last7days', 'monthly', 'today', 'yearly', 'yesterday'].sort(),
    );
  });

  it('has no SQLite date helpers left anywhere', () => {
    for (const [range, sql] of Object.entries(predicates)) {
      expect(sql, `${range} still uses a SQLite date helper`).not.toMatch(
        /date\s*\(\s*'now'|datetime\s*\(|strftime\s*\(|julianday\s*\(/i,
      );
    }
  });

  it('never calls date() with two arguments — PostgreSQL has no such overload', () => {
    for (const [range, sql] of Object.entries(predicates)) {
      expect(sql, `${range} calls date() with two arguments`).not.toMatch(
        /\bdate\s*\([^)]*,[^)]*\)/i,
      );
    }
  });

  it('expresses today and yesterday against CURRENT_DATE', () => {
    expect(predicates.today).toMatch(/CURRENT_DATE/);
    expect(predicates.yesterday).toMatch(/CURRENT_DATE/);
    expect(predicates.yesterday).toMatch(/INTERVAL\s+'1 day'/i);
  });

  it('uses INTERVAL arithmetic for the multi-day windows', () => {
    expect(predicates.last7days).toMatch(/NOW\(\)\s*-\s*INTERVAL\s+'6 days'/i);
    expect(predicates.monthly).toMatch(/NOW\(\)\s*-\s*INTERVAL\s+'29 days'/i);
    expect(predicates.yearly).toMatch(/NOW\(\)\s*-\s*INTERVAL\s+'364 days'/i);
  });

  it('keeps alltime a constant-true predicate', () => {
    expect(predicates.alltime.replace(/\s/g, '')).toBe('1=1');
  });
});

describe('admin router SQL', () => {
  it('contains no SQLite-only constructs', () => {
    // Comments legitimately mention the old syntax while explaining the fix,
    // so strip them before scanning the actual statements.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');

    for (const pattern of [
      /datetime\s*\(\s*'now'/i,
      /date\s*\(\s*'now'/i,
      /strftime\s*\(/i,
      /INSERT\s+OR\s+IGNORE/i,
      /AUTOINCREMENT/i,
    ]) {
      expect(code, `SQLite construct still present: ${pattern}`).not.toMatch(pattern);
    }
  });
});
