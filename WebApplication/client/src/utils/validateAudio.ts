/**
 * Client-side upload guard.
 *
 * The server re-validates everything (including magic bytes) — this exists only
 * to fail fast and avoid a pointless 10 MB round trip.
 */

export const MAX_UPLOAD_MB = 10;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
export const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a'] as const;

export const ACCEPT_ATTRIBUTE =
  '.mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a';

export type ValidationFailure =
  | { ok: false; reason: 'type'; fileName: string }
  | { ok: false; reason: 'size'; sizeBytes: number };

export type ValidationResult = { ok: true } | ValidationFailure;

export function validateAudioFile(file: File): ValidationResult {
  const name = file.name.toLowerCase();
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));

  if (!hasAllowedExtension) {
    return { ok: false, reason: 'type', fileName: file.name };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: 'size', sizeBytes: file.size };
  }
  return { ok: true };
}
