/**
 * Minimal structured logger — no dependency, JSON in production, colourised
 * and human-readable in development.
 */

import { env } from '../config/env.js';

const COLOURS = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  reset: '\x1b[0m',
};

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL = LEVELS[env.IS_PRODUCTION ? 'info' : 'debug'];

function emit(level, message, meta) {
  if (LEVELS[level] < MIN_LEVEL) return;
  if (env.IS_TEST) return;

  const timestamp = new Date().toISOString();

  if (env.IS_PRODUCTION) {
    const line = JSON.stringify({ timestamp, level, message, ...meta });
    (level === 'error' ? console.error : console.info)(line);
    return;
  }

  const colour = COLOURS[level] ?? '';
  const extras =
    meta && Object.keys(meta).length > 0
      ? ` ${COLOURS.debug}${JSON.stringify(meta)}${COLOURS.reset}`
      : '';
  const line = `${COLOURS.debug}${timestamp}${COLOURS.reset} ${colour}${level.toUpperCase().padEnd(5)}${COLOURS.reset} ${message}${extras}`;
  (level === 'error' ? console.error : console.info)(line);
}

export const logger = {
  debug: (message, meta) => emit('debug', message, meta),
  info: (message, meta) => emit('info', message, meta),
  warn: (message, meta) => emit('warn', message, meta),
  error: (message, meta) => emit('error', message, meta),
};
