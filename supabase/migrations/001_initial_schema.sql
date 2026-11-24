-- Janta Check: Complete Supabase PostgreSQL Schema & Row-Level Security Migration
-- Run this migration in your Supabase SQL Editor to provision all 15 tables,
-- spatial helpers, triggers, storage buckets, and strict RLS policies.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Custom Enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('citizen', 'officer', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE issue_category AS ENUM (
    'pothole',
    'garbage',
    'streetlight',
    'water_leakage',
    'drainage',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE issue_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM (
    'Submitted',
    'Under Review',
    'Acknowledged',
    'In Progress',
    'Resolved - Awaiting Verification',
    'Reopened',
    'Closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'citizen',
  locality TEXT DEFAULT 'Central Ward',
  avatar_url TEXT,
  civic_points INTEGER NOT NULL DEFAULT 0 CHECK (civic_points >= 0),
  department TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. reports
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) >= 5 AND char_length(title) <= 160),
  description TEXT NOT NULL CHECK (char_length(description) >= 10),
  category issue_category NOT NULL,
  severity issue_severity NOT NULL DEFAULT 'medium',
  priority_score NUMERIC(5,2) NOT NULL DEFAULT 30.00 CHECK (priority_score >= 0 AND priority_score <= 100),
  priority_label TEXT NOT NULL DEFAULT 'Medium',
  status report_status NOT NULL DEFAULT 'Submitted',
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  location_point GEOGRAPHY(POINT, 4326),
  locality TEXT NOT NULL,
  image_url TEXT NOT NULL,
  resolution_image_url TEXT,
  ai_category issue_category,
  ai_severity issue_severity,
  ai_confidence NUMERIC(4,3) CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1)),
  ai_description TEXT,
  ai_reason TEXT,
  upvote_count INTEGER NOT NULL DEFAULT 0 CHECK (upvote_count >= 0),
  duplicate_count INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON public.reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_locality ON public.reports(locality);
CREATE INDEX IF NOT EXISTS idx_reports_priority ON public.reports(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_reports_geo ON public.reports USING GIST(location_point);

-- Auto-populate PostGIS geography point on insert/update
CREATE OR REPLACE FUNCTION public.sync_report_location_point()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location_point := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_report_geo ON public.reports;
CREATE TRIGGER trg_sync_report_geo
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.sync_report_location_point();

-- 3. report_images
CREATE TABLE IF NOT EXISTS public.report_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type TEXT NOT NULL CHECK (image_type IN ('evidence', 'resolution')),
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. report_votes
CREATE TABLE IF NOT EXISTS public.report_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(report_id, user_id)
);

-- 5. report_comments
CREATE TABLE IF NOT EXISTS public.report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 2 AND char_length(content) <= 1000),
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason TEXT,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. report_status_history
CREATE TABLE IF NOT EXISTS public.report_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  previous_status report_status,
  new_status report_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. duplicate_reports
CREATE TABLE IF NOT EXISTS public.duplicate_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  duplicate_report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
  reported_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  distance_meters DOUBLE PRECISION NOT NULL,
  similarity_score NUMERIC(4,3) NOT NULL,
  resolution_action TEXT NOT NULL CHECK (resolution_action IN ('supported_existing', 'created_separate')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. officer_assignments
CREATE TABLE IF NOT EXISTS public.officer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  officer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(report_id, officer_id)
);

-- 9. resolution_verifications
CREATE TABLE IF NOT EXISTS public.resolution_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  confirmed BOOLEAN NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(report_id, user_id)
);

-- 10. notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);

-- 11. civic_points_transactions
CREATE TABLE IF NOT EXISTS public.civic_points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  points INTEGER NOT NULL,
  dedup_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. badges
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  threshold_points INTEGER NOT NULL DEFAULT 0,
  icon_name TEXT NOT NULL DEFAULT 'Award'
);

-- 13. user_badges
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- 14. infrastructure_projects
CREATE TABLE IF NOT EXISTS public.infrastructure_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  locality TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_cost TEXT,
  start_date DATE,
  expected_completion_date DATE,
  status TEXT NOT NULL,
  official_source TEXT NOT NULL,
  source_url TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. admin_audit_logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper function: Find nearby unresolved reports within radius_meters
CREATE OR REPLACE FUNCTION public.find_nearby_reports(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  category issue_category,
  status report_status,
  image_url TEXT,
  upvote_count INTEGER,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.title,
    r.category,
    r.status,
    r.image_url,
    r.upvote_count,
    ST_Distance(
      r.location_point,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) AS distance_meters
  FROM public.reports r
  WHERE r.is_public = TRUE
    AND r.status NOT IN ('Closed')
    AND ST_DWithin(
      r.location_point,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Prevent self role or points modification by non-admins
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() = OLD.id AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    NEW.role := OLD.role;
    NEW.civic_points := OLD.civic_points;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_cols ON public.profiles;
CREATE TRIGGER trg_protect_profile_cols
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_sensitive_columns();

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolution_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infrastructure_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles: users can view public display info, update own non-privileged info, admins manage all
CREATE POLICY "Public profile read" ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin full profile access" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Reports: public read for public reports; citizens insert own; officers update assigned; admins manage all
CREATE POLICY "Public reports readable" ON public.reports FOR SELECT USING (is_public = TRUE OR auth.uid() = user_id);
CREATE POLICY "Authenticated citizens insert reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Assigned officers update reports" ON public.reports FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.officer_assignments oa
    WHERE oa.report_id = id AND oa.officer_id = auth.uid() AND oa.is_active = TRUE
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Votes: read public, users manage only their own vote
CREATE POLICY "Votes readable" ON public.report_votes FOR SELECT USING (TRUE);
CREATE POLICY "Users insert own vote" ON public.report_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own vote" ON public.report_votes FOR DELETE USING (auth.uid() = user_id);

-- Comments: visible non-hidden comments readable, authenticated insert own
CREATE POLICY "Comments readable" ON public.report_comments FOR SELECT USING (is_hidden = FALSE OR auth.uid() = user_id);
CREATE POLICY "Users insert own comment" ON public.report_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Status history: publicly readable for transparency
CREATE POLICY "Status history readable" ON public.report_status_history FOR SELECT USING (TRUE);

-- Verifications: readable, citizens insert their own once
CREATE POLICY "Verifications readable" ON public.resolution_verifications FOR SELECT USING (TRUE);
CREATE POLICY "Citizens insert own verification" ON public.resolution_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notifications: strictly private to user
CREATE POLICY "Own notifications readable" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own notifications updatable" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Points & Badges: readable for leaderboard, inserts restricted to service role
CREATE POLICY "Points readable" ON public.civic_points_transactions FOR SELECT USING (TRUE);
CREATE POLICY "Badges readable" ON public.badges FOR SELECT USING (TRUE);
CREATE POLICY "User badges readable" ON public.user_badges FOR SELECT USING (TRUE);

-- Infrastructure projects: publicly readable, admin editable
CREATE POLICY "Projects readable" ON public.infrastructure_projects FOR SELECT USING (TRUE);
CREATE POLICY "Admin projects manage" ON public.infrastructure_projects FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Admin audit logs: admin only
CREATE POLICY "Admin audit read" ON public.admin_audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Storage Bucket for civic report evidence & resolution photographs
INSERT INTO storage.buckets (id, name, public)
VALUES ('civic-evidence', 'civic-evidence', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read civic evidence"
ON storage.objects FOR SELECT
USING (bucket_id = 'civic-evidence');

CREATE POLICY "Authenticated upload civic evidence"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'civic-evidence' AND auth.role() = 'authenticated');
