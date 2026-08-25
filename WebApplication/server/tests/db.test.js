/**
 * Placeholder translation.
 *
 * The 33 existing call sites were written for SQLite/MySQL `?` placeholders;
 * PostgreSQL requires `$1, $2, …`. The adapter rewrites them so that SQL was
 * not touched during the engine swap. A naive string replace would corrupt a
 * question mark inside a quoted literal, so those cases are pinned here.
 */

import { describe, expect, it } from 'vitest';

import { toPgPlaceholders } from '../db/index.js';

describe('toPgPlaceholders', () => {
  it('numbers each placeholder in order', () => {
    expect(toPgPlaceholders('SELECT * FROM t WHERE a = ? AND b = ?')).toBe(
      'SELECT * FROM t WHERE a = $1 AND b = $2',
    );
  });

  it('leaves SQL without placeholders untouched', () => {
    expect(toPgPlaceholders('SELECT 1')).toBe('SELECT 1');
  });

  it('passes through SQL already written for pg', () => {
    const sql = 'SELECT * FROM t WHERE id = $1';
    expect(toPgPlaceholders(sql)).toBe(sql);
  });

  it('ignores a question mark inside a single-quoted string', () => {
    expect(toPgPlaceholders("SELECT * FROM t WHERE label = 'why?' AND id = ?")).toBe(
      "SELECT * FROM t WHERE label = 'why?' AND id = $1",
    );
  });

  it('handles the doubled-quote escape', () => {
    expect(toPgPlaceholders("UPDATE t SET a = ?, b = 'it''s ok?' WHERE c = ?")).toBe(
      "UPDATE t SET a = $1, b = 'it''s ok?' WHERE c = $2",
    );
  });

  it('ignores a question mark inside a quoted identifier', () => {
    expect(toPgPlaceholders('SELECT "odd?col" FROM t WHERE id = ?')).toBe(
      'SELECT "odd?col" FROM t WHERE id = $1',
    );
  });

  it('rewrites LIMIT ? OFFSET ? as used by the paginated admin routes', () => {
    expect(
      toPgPlaceholders('SELECT * FROM conversion_logs WHERE status = ? LIMIT ? OFFSET ?'),
    ).toBe('SELECT * FROM conversion_logs WHERE status = $1 LIMIT $2 OFFSET $3');
  });
});
