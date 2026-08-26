import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";

interface PgError extends Error {
  code?: string;
  detail?: string;
  constraint?: string;
}

const NOT_FOUND_PATTERN = /not found$/i;

const VALIDATION_PATTERNS = [
  /^Request body must be/,
  /^Invalid request body$/,
  /^Invalid /,
  / must be /,
  / is required$/,
  / cannot exceed /,
];

function isPgUniqueViolation(err: PgError): boolean {
  return err.code === "23505";
}

function isPgForeignKeyViolation(err: PgError): boolean {
  return err.code === "23503";
}

function isPgInvalidValue(err: PgError): boolean {
  return (
    err.code === "22P02" ||
    err.code === "22007" ||
    err.code === "22008" ||
    err.code === "23502" ||
    err.code === "23514"
  );
}

export function notFoundHandler(
  req: Request,
  res: Response,
): void {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) {
    return;
  }

  const pgErr = err as PgError;

  // Malformed JSON bodies from express.json()
  if (
    typeof pgErr === "object" &&
    pgErr !== null &&
    "type" in pgErr &&
    (pgErr as { type?: string }).type === "entity.parse.failed"
  ) {
    res.status(400).json({
      success: false,
      error: "Request body must be valid JSON",
    });
    return;
  }

  console.error("[api] Unhandled error:", err);

  let status = 500;
  let message = "Internal server error";

  if (pgErr instanceof Error) {
    if (isPgUniqueViolation(pgErr)) {
      status = 409;
      message = "Resource already exists";
    } else if (isPgForeignKeyViolation(pgErr)) {
      status = 400;
      message = "Referenced resource does not exist";
    } else if (isPgInvalidValue(pgErr)) {
      status = 400;
      message = "Invalid value supplied";
    } else {
      const raw = pgErr.message;

      if (NOT_FOUND_PATTERN.test(raw) || /^Failed to update/.test(raw)) {
        // Services raise "Failed to update X" when no row matched.
        status = 404;
        message = NOT_FOUND_PATTERN.test(raw) ? raw : `${raw.replace(/^Failed to update /i, "")} not found`;
      } else if (VALIDATION_PATTERNS.some((p) => p.test(raw))) {
        status = 400;
        message = raw;
      }
    }
  }

  res.status(status).json({
    success: false,
    error: message,
  });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
