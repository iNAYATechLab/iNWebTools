/**
 * Hugging Face Free Inference API client.
 *
 * The free tier has two behaviours a naive fetch() gets wrong:
 *
 *   1. Cold starts — the first call to an idle model returns 503 with
 *      {"error": "Model ... is currently loading", "estimated_time": 27.5}.
 *      Retrying after a backoff succeeds; failing immediately does not.
 *   2. Throttling — bursts return 429. The same backoff handles it.
 *
 * Every request is bounded by an AbortController so a hung upstream cannot pin
 * a Node socket open forever.
 */

import fs from 'node:fs';

import fetch from 'node-fetch';

import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

const CONTENT_TYPE_BY_FORMAT = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Transcribe an audio file with the configured Whisper model.
 *
 * @param {object} params
 * @param {string} params.filePath  Absolute path to the audio file.
 * @param {'mp3'|'wav'|'m4a'} params.format  Verified container format.
 * @param {string} [params.requestId]  Correlation id for logs.
 * @returns {Promise<{text: string, model: string, attempts: number}>}
 */
export async function transcribeAudio({ filePath, format, language, requestId }) {
  if (!env.HF_TOKEN_CONFIGURED) {
    throw new ApiError(
      503,
      'HF_TOKEN_MISSING',
      'The transcription service is not configured. Set HF_FREE_API_TOKEN in the server environment.',
    );
  }

  const url = `${env.HF_API_BASE_URL}/${env.HF_MODEL}`;
  const contentType = CONTENT_TYPE_BY_FORMAT[format] ?? 'application/octet-stream';
  const audio = await fs.promises.readFile(filePath);

  // Two request shapes:
  //   - No language hint  -> raw binary body (smaller and faster).
  //   - Language forced   -> JSON body, because parameters can only travel
  //     alongside a base64 payload.
  //
  // Whisper needs the hint under `generate_kwargs`; passing `language` at the
  // top level is rejected outright by the ASR pipeline:
  //   "_sanitize_parameters() got an unexpected keyword argument 'language'"
  const useJsonBody = Boolean(language);
  const body = useJsonBody
    ? JSON.stringify({
        inputs: audio.toString('base64'),
        parameters: { generate_kwargs: { language } },
      })
    : audio;
  const requestContentType = useJsonBody ? 'application/json' : contentType;

  let lastError;

  for (let attempt = 1; attempt <= env.HF_MAX_RETRIES + 1; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.HF_REQUEST_TIMEOUT_MS);

    try {
      logger.debug('Calling Hugging Face', { requestId, model: env.HF_MODEL, attempt });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.HF_FREE_API_TOKEN}`,
          'Content-Type': requestContentType,
          Accept: 'application/json',
        },
        body,
        signal: controller.signal,
      });

      const raw = await response.text();

      if (response.ok) {
        const text = extractText(raw);
        return { text, model: env.HF_MODEL, attempts: attempt };
      }

      // ---- Non-2xx: decide whether it is worth retrying -------------------
      const payload = safeJson(raw);
      const upstreamMessage = payload?.error ?? raw.slice(0, 300);

      if (response.status === 401 || response.status === 403) {
        throw new ApiError(
          502,
          'HF_AUTH_FAILED',
          'Hugging Face rejected the API token. Check HF_FREE_API_TOKEN.',
        );
      }

      if (response.status === 404) {
        throw new ApiError(502, 'HF_MODEL_NOT_FOUND', `Model "${env.HF_MODEL}" was not found.`);
      }

      const retryable =
        response.status === 503 || response.status === 429 || response.status >= 500;

      if (!retryable || attempt > env.HF_MAX_RETRIES) {
        throw new ApiError(
          response.status === 503 ? 503 : 502,
          response.status === 503 ? 'UPSTREAM_UNAVAILABLE' : 'UPSTREAM_ERROR',
          typeof upstreamMessage === 'string'
            ? upstreamMessage
            : 'The transcription provider returned an error.',
          { status: response.status },
        );
      }

      // The API tells us how long the cold start will take — respect it.
      const estimated = Number(payload?.estimated_time);
      const backoff = Number.isFinite(estimated)
        ? Math.min(estimated * 1000, 30_000)
        : env.HF_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);

      logger.warn('Hugging Face not ready — retrying', {
        requestId,
        attempt,
        status: response.status,
        waitMs: Math.round(backoff),
      });

      lastError = new ApiError(503, 'UPSTREAM_UNAVAILABLE', String(upstreamMessage));
      await sleep(backoff);
    } catch (error) {
      if (error instanceof ApiError) throw error;

      if (error.name === 'AbortError') {
        throw new ApiError(
          504,
          'UPSTREAM_TIMEOUT',
          `Transcription timed out after ${Math.round(env.HF_REQUEST_TIMEOUT_MS / 1000)}s. Try a shorter clip.`,
        );
      }

      // Network-level failure: retry if we still have budget.
      lastError = error;
      if (attempt > env.HF_MAX_RETRIES) {
        throw new ApiError(502, 'UPSTREAM_ERROR', `Could not reach Hugging Face: ${error.message}`);
      }

      const backoff = env.HF_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      logger.warn('Network error calling Hugging Face — retrying', {
        requestId,
        attempt,
        error: error.message,
        waitMs: backoff,
      });
      await sleep(backoff);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new ApiError(
    503,
    'UPSTREAM_UNAVAILABLE',
    'The model is still loading after several attempts. Please try again shortly.',
    { lastError: lastError?.message },
  );
}

/** The ASR endpoint may answer with an object, an array of chunks, or plain text. */
function extractText(raw) {
  const payload = safeJson(raw);

  if (payload === null) return raw.trim();
  if (typeof payload === 'string') return payload.trim();
  if (typeof payload.text === 'string') return payload.text.trim();

  if (Array.isArray(payload)) {
    return payload
      .map((chunk) => (typeof chunk === 'string' ? chunk : (chunk?.text ?? '')))
      .join(' ')
      .trim();
  }

  return '';
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
