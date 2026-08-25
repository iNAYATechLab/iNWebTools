/**
 * Multer upload middleware — restricted to audio files up to MAX_UPLOAD_SIZE_MB.
 *
 * Defence in depth:
 *   1. Extension allow-list   (.mp3, .wav, .m4a)
 *   2. MIME-type allow-list   (browsers lie, but it filters obvious mistakes)
 *   3. Size cap enforced by multer before the whole body is buffered
 *   4. Magic-byte sniffing after upload (see verifyAudioSignature)
 *   5. Random filenames — the client never controls the path on disk
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import multer from 'multer';

import { MAX_UPLOAD_BYTES, env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/** Extensions the product supports. */
export const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a'];

/**
 * ISO-639-1 codes Whisper recognises.
 *
 * Sent to the model as a decoding hint. An unknown code makes the upstream
 * pipeline fail, so the value is validated here rather than forwarded blindly.
 */
export const SUPPORTED_LANGUAGES = [
  'af',
  'am',
  'ar',
  'as',
  'az',
  'ba',
  'be',
  'bg',
  'bn',
  'bo',
  'br',
  'bs',
  'ca',
  'cs',
  'cy',
  'da',
  'de',
  'el',
  'en',
  'es',
  'et',
  'eu',
  'fa',
  'fi',
  'fo',
  'fr',
  'gl',
  'gu',
  'ha',
  'haw',
  'he',
  'hi',
  'hr',
  'ht',
  'hu',
  'hy',
  'id',
  'is',
  'it',
  'ja',
  'jw',
  'ka',
  'kk',
  'km',
  'kn',
  'ko',
  'la',
  'lb',
  'ln',
  'lo',
  'lt',
  'lv',
  'mg',
  'mi',
  'mk',
  'ml',
  'mn',
  'mr',
  'ms',
  'mt',
  'my',
  'ne',
  'nl',
  'nn',
  'no',
  'oc',
  'pa',
  'pl',
  'ps',
  'pt',
  'ro',
  'ru',
  'sa',
  'sd',
  'si',
  'sk',
  'sl',
  'sn',
  'so',
  'sq',
  'sr',
  'su',
  'sv',
  'sw',
  'ta',
  'te',
  'tg',
  'th',
  'tk',
  'tl',
  'tr',
  'tt',
  'uk',
  'ur',
  'uz',
  'vi',
  'yi',
  'yo',
  'yue',
  'zh',
];

/**
 * Normalise the optional `language` field.
 *
 * @param {unknown} value Raw value from the multipart body.
 * @returns {string|undefined} A supported code, or undefined to auto-detect.
 */
export function normaliseLanguage(value) {
  if (value === undefined || value === null || value === '') return undefined;

  const code = String(value).trim().toLowerCase();
  // 'auto' means "let Whisper decide" — the client should omit it, but accept
  // it defensively so the contract cannot break on a stray value.
  if (code === 'auto') return undefined;

  if (!SUPPORTED_LANGUAGES.includes(code)) {
    throw ApiError.badRequest(
      'UNSUPPORTED_LANGUAGE',
      `Language "${code}" is not supported. Omit the field to auto-detect.`,
      { supportedLanguages: SUPPORTED_LANGUAGES },
    );
  }
  return code;
}

/** MIME types browsers and OSes report for those extensions. */
export const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/vnd.wave',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  // Some clients send a generic type; the extension + magic bytes still gate it.
  'application/octet-stream',
];

// Ensure the temp directory exists before multer needs it.
fs.mkdirSync(env.UPLOAD_TMP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.UPLOAD_TMP_DIR),
  filename: (_req, file, cb) => {
    // Never reuse the client-supplied name: it can contain traversal sequences.
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : '.bin';
    cb(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${safeExt}`);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(
      ApiError.unsupportedMediaType(
        `Unsupported file type "${ext || 'unknown'}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}.`,
        { allowedExtensions: ALLOWED_EXTENSIONS, receivedExtension: ext || null },
      ),
    );
  }

  const mime = (file.mimetype || '').toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    return cb(
      ApiError.unsupportedMediaType(`Unsupported content type "${file.mimetype}".`, {
        allowedMimeTypes: ALLOWED_MIME_TYPES,
        receivedMimeType: file.mimetype,
      }),
    );
  }

  return cb(null, true);
}

export const uploadAudio = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
    fields: 10,
    parts: 15,
  },
}).single('audio');

/**
 * Reads the first bytes of the saved file and confirms the container really is
 * MP3, WAV or MP4/M4A. Stops a renamed executable from reaching the AI provider.
 *
 * @param {string} filePath Absolute path to the uploaded file.
 * @returns {Promise<'mp3'|'wav'|'m4a'>} Detected format.
 */
export async function verifyAudioSignature(filePath) {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(16);
    const { bytesRead } = await handle.read(buffer, 0, 16, 0);
    if (bytesRead < 12) {
      throw ApiError.unsupportedMediaType('File is too small to be valid audio.');
    }

    const ascii = (start, end) => buffer.subarray(start, end).toString('ascii');

    // RIFF....WAVE
    if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return 'wav';

    // ISO-BMFF: ....ftyp  (M4A / MP4 audio)
    if (ascii(4, 8) === 'ftyp') return 'm4a';

    // MP3: ID3 tag, or a raw MPEG frame sync (0xFF Ex/Fx).
    if (ascii(0, 3) === 'ID3') return 'mp3';
    if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return 'mp3';

    throw ApiError.unsupportedMediaType(
      'File content does not match a supported audio format (MP3, WAV or M4A).',
    );
  } finally {
    await handle.close();
  }
}

/** Translates multer's own errors into our stable error contract. */
export function normaliseMulterError(err) {
  if (!(err instanceof multer.MulterError)) return err;

  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      return ApiError.payloadTooLarge(`File exceeds the ${env.MAX_UPLOAD_SIZE_MB} MB limit.`, {
        limitBytes: MAX_UPLOAD_BYTES,
        limitMb: env.MAX_UPLOAD_SIZE_MB,
      });
    case 'LIMIT_FILE_COUNT':
    case 'LIMIT_UNEXPECTED_FILE':
      return ApiError.badRequest(
        'UNEXPECTED_FIELD',
        'Send exactly one file in a field named "audio".',
        { field: err.field },
      );
    default:
      return ApiError.badRequest('UPLOAD_ERROR', err.message, { multerCode: err.code });
  }
}
