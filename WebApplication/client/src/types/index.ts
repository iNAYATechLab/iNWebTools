/** Shared types mirroring the server's response envelope. */

export type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, unknown> };
  meta?: { requestId?: string; durationMs?: number; timestamp?: string };
};

export type TranscriptionResult = {
  text: string;
  model: string;
  characters: number;
  words: number;
  file: { name: string; sizeBytes: number; format: string };
};

export type ServerInfo = {
  project: string;
  model: string;
  maxUploadSizeMb: number;
  allowedExtensions: string[];
  supportedLanguages?: string[];
  languageCount?: number;
  rateLimit: { maxRequests: number; windowMinutes: number };
};

export type HealthStatus = {
  status: string;
  project: string;
  version: string;
  environment: string;
  uptimeSeconds: number;
  model: string;
  transcriptionReady: boolean;
};

/** Phases the UI reports while a transcription is in flight. */
export type TranscriptionPhase = 'idle' | 'uploading' | 'processing' | 'finalizing' | 'done';

/**
 * Spoken-language hint sent to the model.
 *
 * 'auto' lets Whisper detect the language; any other value is an ISO-639-1
 * code from the server's supported list (see /api/info).
 */
export type AudioLanguage = string;
