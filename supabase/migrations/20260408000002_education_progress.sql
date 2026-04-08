-- Migration: education lesson completion tracking
-- Stores an array of completed lesson IDs on the user's profile.
-- Each lesson ID is a string like '1-1', '2-3', etc.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS completed_lessons TEXT[] NOT NULL DEFAULT '{}';
