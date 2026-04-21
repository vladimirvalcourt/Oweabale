/**
 * Error handling utilities for production security
 * Prevents leakage of sensitive information in error messages
 */

// Patterns that indicate sensitive information should be masked
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /credential/i,
  /authorization/i,
  /api[_-]?key/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /private/i,
  /internal/i,
  /stack\s*trace/i,
  /at\s+\w+/i, // Stack trace lines
  /\/node_modules\//i,
  /\/src\//i,
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, // IP addresses
  /email.*@/i,
];

// Safe error messages for common error types
const SAFE_ERROR_MESSAGES: Record<string, string> = {
  'Unauthorized': 'Authentication required',
  'Forbidden': 'Access denied',
  'Not Found': 'Resource not found',
  'Internal Server Error': 'An unexpected error occurred',
  'Bad Request': 'Invalid request',
  'Rate Limit Exceeded': 'Too many requests, please try again later',
  'Server misconfiguration': 'Service temporarily unavailable',
  'Missing Authorization header': 'Authentication required',
  'No signatures found': 'Invalid request signature',
  'timestamp': 'Request expired',
};

/**
 * Check if an error message contains sensitive information
 */
function containsSensitiveInfo(message: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Get a safe error message for production
 */
function getSafeErrorMessage(originalMessage: string): string {
  // Check for exact matches first
  for (const [key, safeMsg] of Object.entries(SAFE_ERROR_MESSAGES)) {
    if (originalMessage.toLowerCase().includes(key.toLowerCase())) {
      return safeMsg;
    }
  }

  // If message contains sensitive patterns, return generic message
  if (containsSensitiveInfo(originalMessage)) {
    return 'An error occurred while processing your request';
  }

  // For non-sensitive errors in production, use generic message
  // In development, you might want to return the original message
  const isProduction = Deno.env.get('DENO_ENV')?.toLowerCase() === 'production' ||
                       Deno.env.get('SUPABASE_ENV')?.toLowerCase() === 'production';
  
  if (isProduction) {
    // Only allow through very specific, safe error messages
    const safePatterns = [
      /^Method not allowed$/i,
      /^Invalid request$/i,
      /^Resource not found$/i,
    ];
    
    if (safePatterns.some(pattern => pattern.test(originalMessage))) {
      return originalMessage;
    }
    
    return 'An error occurred while processing your request';
  }

  // In development, return original message for debugging
  return originalMessage;
}

/**
 * Sanitize an error object for logging (removes sensitive fields)
 */
export function sanitizeErrorForLogging(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const sanitized: Record<string, unknown> = {
      name: error.name,
      message: getSafeErrorMessage(error.message),
      timestamp: new Date().toISOString(),
    };

    // Only include stack trace in non-production environments
    const isProduction = Deno.env.get('DENO_ENV')?.toLowerCase() === 'production' ||
                         Deno.env.get('SUPABASE_ENV')?.toLowerCase() === 'production';
    
    if (!isProduction && error.stack) {
      sanitized.stack = error.stack;
    }

    return sanitized;
  }

  return {
    message: getSafeErrorMessage(String(error)),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a safe error response for API endpoints
 */
export function createSafeErrorResponse(
  error: unknown,
  statusCode: number = 500,
  additionalHeaders?: Record<string, string>
): Response {
  const isProduction = Deno.env.get('DENO_ENV')?.toLowerCase() === 'production' ||
                       Deno.env.get('SUPABASE_ENV')?.toLowerCase() === 'production';

  // Log the full error for debugging (sanitized)
  const sanitizedError = sanitizeErrorForLogging(error);
  console.error('[API Error]', JSON.stringify(sanitizedError));

  // Determine appropriate status code
  let finalStatusCode = statusCode;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('unauthorized') || msg.includes('missing authorization')) {
      finalStatusCode = 401;
    } else if (msg.includes('forbidden') || msg.includes('access denied')) {
      finalStatusCode = 403;
    } else if (msg.includes('not found')) {
      finalStatusCode = 404;
    } else if (msg.includes('rate limit')) {
      finalStatusCode = 429;
    } else if (msg.includes('invalid') || msg.includes('bad request')) {
      finalStatusCode = 400;
    }
  }

  // Create safe error body
  const errorBody = {
    error: getSafeErrorMessage(error instanceof Error ? error.message : String(error)),
    code: finalStatusCode,
    timestamp: new Date().toISOString(),
    // Only include request ID in production for support purposes
    ...(isProduction && { requestId: crypto.randomUUID() }),
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };

  return new Response(JSON.stringify(errorBody), {
    status: finalStatusCode,
    headers,
  });
}

/**
 * Wrapper for async handlers that automatically handles errors safely
 */
export function withSafeErrorHandler(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      return createSafeErrorResponse(error);
    }
  };
}

/**
 * Validate that an error message is safe to expose
 * Returns true if the message is safe, false if it should be masked
 */
export function isErrorMessageSafe(message: string): boolean {
  return !containsSensitiveInfo(message);
}
