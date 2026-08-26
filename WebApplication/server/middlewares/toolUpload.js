/**
 * Tool upload middleware — handles single and multi-file uploads for document,
 * spreadsheet, PDF, and image processing engines.
 *
 * Guarantees:
 *   1. Clean file size bounds (up to 25MB per file)
 *   2. Support for documents, spreadsheets, data payloads, PDFs, and images
 *   3. Random safe temp filenames
 *   4. Clean error contracts
 */

import crypto from 'node:crypto';
import path from 'node:path';

import multer from 'multer';

import { env } from '../config/env.js';

export const MAX_TOOL_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.UPLOAD_TMP_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = /^[a-z0-9.]+$/.test(ext) ? ext : '.bin';
    cb(null, `tool-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${safeExt}`);
  },
});

export const uploadToolFiles = multer({
  storage,
  limits: {
    fileSize: MAX_TOOL_UPLOAD_BYTES,
    files: 10,
    fields: 30,
  },
}).any();
