-- Owe-AI feature was removed from product and backend.
-- Keep schema aligned by dropping legacy tables that are no longer read/written.
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.ai_learning_profiles CASCADE;
