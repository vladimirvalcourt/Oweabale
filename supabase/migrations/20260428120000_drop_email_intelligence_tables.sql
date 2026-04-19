-- Remove Email Intelligence feature (tables unused after product removal).

DROP TABLE IF EXISTS public.email_scan_findings CASCADE;
DROP TABLE IF EXISTS public.email_connections CASCADE;
