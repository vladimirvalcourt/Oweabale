/**
 * Security utilities: URL validation and file validation.
 * All input that comes from users or external data sources must pass
 * through these helpers before being used in DOM or storage operations.
 */

// ── URL validation ─────────────────────────────────────────────────────────

/**
 * Validates a URL is safe to use as an href.
 * Blocks javascript:, data:, vbscript:, and other non-https schemes.
 * Returns the safe URL string or null if unsafe/invalid.
 */
export function sanitizeUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    // Only allow https — no http, javascript, data, blob, vbscript, etc.
    if (parsed.protocol !== 'https:') return null;
    return trimmed;
  } catch {
    return null;
  }
}

// ── File validation ────────────────────────────────────────────────────────

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;   // 5 MB
const MAX_PDF_BYTES   = 10 * 1024 * 1024;  // 10 MB
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;  // 2 MB

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const ALLOWED_INGESTION_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const SAFE_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp']);

export interface FileValidationResult {
  ok: boolean;
  error?: string;
}

export function validateIngestionFile(file: File): FileValidationResult {
  if (!ALLOWED_INGESTION_TYPES.has(file.type)) {
    return { ok: false, error: `Unsupported file type: ${file.type}. Use PDF or image files.` };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!SAFE_EXTENSIONS.has(ext)) {
    return { ok: false, error: `Unsupported file extension ".${ext}". Use PDF, JPG, PNG, or WEBP.` };
  }

  const limit = file.type === 'application/pdf' ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    const mb = (limit / 1024 / 1024).toFixed(0);
    return { ok: false, error: `File too large. Maximum size is ${mb} MB.` };
  }

  return { ok: true };
}

export function validatePdfFile(file: File): FileValidationResult {
  if (file.type !== 'application/pdf') {
    return { ok: false, error: 'Only PDF files are supported.' };
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext !== 'pdf') {
    return { ok: false, error: 'File extension must be .pdf.' };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { ok: false, error: `PDF too large. Maximum size is ${MAX_PDF_BYTES / 1024 / 1024} MB.` };
  }
  return { ok: true };
}

const AVATAR_TYPES = new Set(['image/jpeg', 'image/png']);

export function validateAvatarFile(file: File): FileValidationResult {
  if (!AVATAR_TYPES.has(file.type)) {
    return { ok: false, error: 'Avatar must be a JPG or PNG image (max 2 MB).' };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, error: 'Avatar image must be smaller than 2 MB.' };
  }
  return { ok: true };
}

/**
 * Returns a safe file extension derived from the MIME type,
 * ignoring the potentially malicious user-supplied filename.
 */
export function safeExtFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg':      'jpg',
    'image/png':       'png',
    'image/gif':       'gif',
    'image/webp':      'webp',
  };
  return map[mimeType] ?? 'bin';
}
