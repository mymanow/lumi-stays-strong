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