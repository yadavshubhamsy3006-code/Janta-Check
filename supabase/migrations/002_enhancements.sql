-- Janta Check: Enhancement Migration 002 (Safe Idempotent Additions)
-- Adds language preferences, notification settings, escalation tracking,
-- ward metadata, completion timestamps, and duplicate link moderation status.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en'
    CHECK (preferred_language IN ('en', 'hi', 'kn')),
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{"status_updates": true, "community_replies": true, "nearby_alerts": true}'::jsonb;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS ward_name TEXT,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.duplicate_reports
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'confirmed', 'dismissed'));
