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