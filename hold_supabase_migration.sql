-- Hold : structure complète de la base (tables, sécurité RLS, droits, fonctions, trigger).
-- Mode d'emploi :
--   1. Projet supabase.com VIDE -> SQL Editor -> coller tout ce fichier -> Run.
--   2. Authentication -> Providers : activer "Anonymous sign-ins" et "Email".
--   Structure uniquement : aucune donnée ni compte utilisateur.


-- ===== 0000_hold_schema =====
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  language text NOT NULL DEFAULT 'fr',
  last_contact_at timestamptz,
  triggers text[] NOT NULL DEFAULT '{}',
  relationship_duration text CHECK (relationship_duration IN ('lt_6m','6_12m','1_3y','gt_3y')),
  ended_by text CHECK (ended_by IN ('me','them','mutual')),
  first_breakup boolean,
  situation_type text CHECK (situation_type IN ('infidelity_healing','one_sided_love','toxic','blocked_ghosted','divorce_long_term','breakup','situationship_ended','mutual_breakup','ex_moved_on','first_love','on_off','long_relationship_ended')),
  motivation text CHECK (motivation IN ('take_back_control','win_back','move_on','unsure')),
  dominant_emotion text CHECK (dominant_emotion IN ('calm','disgust','joy','anger','fear','sadness')),
  gender text CHECK (gender IN ('woman','man','undisclosed')),
  age int CHECK (age BETWEEN 18 AND 100),
  coach_tone text NOT NULL DEFAULT 'gentle' CHECK (coach_tone IN ('gentle','direct')),
  reasons text[] NOT NULL DEFAULT '{}' CHECK (coalesce(array_length(reasons,1),0) <= 3),
  commitment_at timestamptz,
  reminder_enabled boolean NOT NULL DEFAULT false,
  reminder_time time NOT NULL DEFAULT '21:30',
  onboarding_completed boolean NOT NULL DEFAULT false,
  onboarding_step int NOT NULL DEFAULT 0,
  best_streak_seconds bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own profile delete" ON public.profiles FOR DELETE TO authenticated USING (id = auth.uid());

CREATE TABLE public.contact_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  type text NOT NULL CHECK (type IN ('relapse','resistance')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  trigger text,
  mood int CHECK (mood BETWEEN 1 AND 5),
  previous_streak_seconds bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_events TO authenticated;
GRANT ALL ON public.contact_events TO service_role;
ALTER TABLE public.contact_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own events" ON public.contact_events FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  date date NOT NULL,
  mood int NOT NULL CHECK (mood BETWEEN 1 AND 5),
  urge int NOT NULL CHECK (urge BETWEEN 1 AND 5),
  triggers text[] NOT NULL DEFAULT '{}',
  note text CHECK (char_length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkins TO authenticated;
GRANT ALL ON public.checkins TO service_role;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checkins" ON public.checkins FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.subscriptions (
  user_id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active','inactive')),
  plan text CHECK (plan IN ('monthly','yearly')),
  whop_membership_id text,
  whop_user_id text,
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sub read" ON public.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.ai_usage (
  user_id uuid NOT NULL,
  day date NOT NULL,
  count int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own usage read" ON public.ai_usage FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.increment_ai_usage(_user uuid, _day date) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c int;
BEGIN
  INSERT INTO public.ai_usage(user_id, day, count) VALUES (_user, _day, 1)
  ON CONFLICT (user_id, day) DO UPDATE SET count = ai_usage.count + 1 RETURNING count INTO c;
  RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.increment_ai_usage(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage(uuid, date) TO service_role;

-- ===== 0001_add_profile_name =====
alter table public.profiles add column if not exists name text;

-- ===== 0002_profile_difficulty_score =====
ALTER TABLE public.profiles
 ADD COLUMN difficulty_score integer CHECK (difficulty_score BETWEEN 0 AND 100),
 ADD COLUMN difficulty_level text CHECK (difficulty_level IN ('low', 'moderate', 'high', 'very_high')),
 ADD COLUMN score_factors jsonb,
 ADD COLUMN score_computed_at timestamptz;
COMMENT ON COLUMN public.profiles.difficulty_score IS 'Indicative non-clinical heuristic computed on device; never included in coach context.';

-- ===== 0003_onboarding_v2_answers =====
-- Onboarding v2: six new questions replace the old breakup questions and the indicative score.
-- Old columns (relationship_duration, ended_by, first_breakup, dominant_emotion, triggers, difficulty_*, score_*)
-- are kept for existing rows but are no longer written by the app.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_contact_range text,
  ADD COLUMN IF NOT EXISTS last_contact_feelings text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS current_feelings text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS no_contact_goal text;

-- situation_type and motivation get new values; drop any CHECK constraint that listed the old ones.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND contype = 'c'
      AND (pg_get_constraintdef(oid) ILIKE '%situation_type%' OR pg_get_constraintdef(oid) ILIKE '%motivation%')
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

COMMENT ON COLUMN public.profiles.last_contact_range IS 'Onboarding Q2 bucket: today, week, month, m1_3, m3_6, gt_6m';
COMMENT ON COLUMN public.profiles.last_contact_feelings IS 'Onboarding Q3 multi-select';
COMMENT ON COLUMN public.profiles.current_feelings IS 'Onboarding Q4 multi-select';
COMMENT ON COLUMN public.profiles.no_contact_goal IS 'Onboarding Q6: d7, d14, d30, d60, d90, d180 or open';

-- ===== 0004_apply_no_contact_rules =====
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS no_contact_rules text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.profiles.no_contact_rules IS 'Onboarding "no-contact rules" multi-select: no_texting, no_stalking, no_old_photos, no_meeting, no_reply_except, no_asking_friends, no_running_into';

-- ===== 0005_apply_frank_tone_and_relapse_note =====
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%coach_tone%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_coach_tone_check CHECK (coach_tone IN ('gentle', 'direct', 'frank'));

ALTER TABLE public.contact_events
  ADD COLUMN IF NOT EXISTS note text CHECK (char_length(note) <= 500);

COMMENT ON COLUMN public.contact_events.note IS 'Optional "reset & reflect" note written after a relapse (what the user takes from it).';

-- ===== 0006_acquisition_source =====
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS acquisition_source text
  CHECK (acquisition_source IS NULL OR acquisition_source IN ('tiktok', 'google', 'word_of_mouth', 'quora', 'app_store', 'instagram_facebook', 'reddit', 'other'));

COMMENT ON COLUMN public.profiles.acquisition_source IS 'Onboarding "How did you learn about us?" answer. Owner-only (profile RLS); analytics only, never sent to the coach.';


-- ===== 0007_quarterly_weekly_plans =====
-- The offered plans are now quarterly and weekly. Old values stay allowed so existing rows remain valid.
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_check CHECK (plan IS NULL OR plan IN ('monthly', 'yearly', 'quarterly', 'weekly'));


-- ===== 0008_acquisition_source =====
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS acquisition_source text
  CHECK (acquisition_source IS NULL OR acquisition_source IN ('tiktok', 'google', 'word_of_mouth', 'quora', 'app_store', 'instagram_facebook', 'reddit', 'other'));

COMMENT ON COLUMN public.profiles.acquisition_source IS 'Onboarding "How did you learn about us?" answer. Owner-only (profile RLS); analytics only, never sent to the coach.';
