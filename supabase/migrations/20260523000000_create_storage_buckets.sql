-- Migration: Create storage buckets for document capture and ingestion
-- Date: 2026-05-23
-- Purpose: Enable mobile QR code uploads and desktop file uploads

-- ─────────────────────────────────────────────────────────────
-- 1. Create 'scans' bucket for mobile QR code captures
-- ─────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'scans',
  'scans',
  false, -- Private bucket
  10485760, -- 10 MB max file size
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE storage.buckets IS 
  'Storage buckets configuration. The "scans" bucket stores mobile-captured documents.';

-- ─────────────────────────────────────────────────────────────
-- 2. Create 'ingestion-files' bucket for desktop uploads
-- ─────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'ingestion-files',
  'ingestion-files',
  false, -- Private bucket
  10485760, -- 10 MB max file size
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 3. RLS Policies for 'scans' bucket
-- ─────────────────────────────────────────────────────────────

-- Allow authenticated users to manage their own scans
-- Path format: incoming/{sessionId}/{filename} or user-specific paths
CREATE POLICY "Authenticated users manage own scans"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'scans'
  AND (
    -- Files in incoming/ folder (mobile uploads before processing)
    (storage.foldername(name))[1] = 'incoming'
    OR
    -- User-specific files (after processing)
    auth.uid()::text = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'scans'
  AND (
    (storage.foldername(name))[1] = 'incoming'
    OR
    auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- Allow anonymous uploads to incoming/ folder (mobile QR captures)
-- Security: Validated by document_capture_sessions token in application layer
CREATE POLICY "Anon mobile capture uploads to incoming"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'scans'
  AND (storage.foldername(name))[1] = 'incoming'
  AND storage.extension(name) IN ('jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf')
);

-- Allow authenticated users to read any scan (needed for OCR processing)
CREATE POLICY "Authenticated users can read scans"
ON storage.objects
FOR SELECT
USING (bucket_id = 'scans');

-- Allow authenticated users to delete scans (cleanup after processing)
CREATE POLICY "Authenticated users can delete scans"
ON storage.objects
FOR DELETE
USING (bucket_id = 'scans');

-- ─────────────────────────────────────────────────────────────
-- 4. RLS Policies for 'ingestion-files' bucket
-- ─────────────────────────────────────────────────────────────

-- Allow authenticated users to manage their own ingestion files
CREATE POLICY "Users manage own ingestion files"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'ingestion-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'ingestion-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow service role to access all ingestion files (for background processing)
-- Note: Service role bypasses RLS anyway, but this documents intent
COMMENT ON POLICY "Users manage own ingestion files" ON storage.objects IS
  'Users can upload/download/delete their own ingestion files. Path must start with user_id.';

-- ─────────────────────────────────────────────────────────────
-- 5. Enable RLS on storage.objects (if not already enabled)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 6. Verification queries (for manual testing)
-- ─────────────────────────────────────────────────────────────

-- Check buckets were created:
-- SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id IN ('scans', 'ingestion-files');

-- Check policies exist:
-- SELECT policyname, tablename FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

COMMENT ON THIS MIGRATION IS
  'Creates storage buckets for document capture system. Enables mobile QR code uploads and desktop file scanning.';
