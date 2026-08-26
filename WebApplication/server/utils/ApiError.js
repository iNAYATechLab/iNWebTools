/**
 * Operational error carrying an HTTP status and a stable machine-readable code.
 *
 * Clients switch on `code` (never on the message text), which lets the UI
 * translate errors into বাংলা or English without parsing strings.
 */
export class ApiError extends Error {
  /**
   * @param {number} status   HTTP status code.
   * @param {string} code     Stable error code, e.g. 'FILE_TOO_LARGE'.
   * @param {string} message  Human-readable explanation.
   * @param {object} [details] Optional structured context.
   */
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(code, message, details) {
    return new ApiError(400, code, message, details);
  }

  static notFound(code = 'NOT_FOUND', message = 'Resource not found.', details) {
    return new ApiError(404, code, message, details);
  }

  static payloadTooLarge(message, details) {
    return new ApiError(413, 'FILE_TOO_LARGE', message, details);
  }

  static unsupportedMediaType(message, details) {
    return new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', message, details);
  }

  static tooManyRequests(message, details) {
    return new ApiError(429, 'RATE_LIMITED', message, details);
  }

  static internal(message = 'An unexpected error occurred.', details) {
    return new ApiError(500, 'INTERNAL_ERROR', message, details);
  }
}

/** Wraps an async route handler so rejections reach the error middleware. */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
