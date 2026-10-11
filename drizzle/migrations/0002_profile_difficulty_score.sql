ALTER TABLE public.profiles
 ADD COLUMN difficulty_score integer CHECK (difficulty_score BETWEEN 0 AND 100),
 ADD COLUMN difficulty_level text CHECK (difficulty_level IN ('low', 'moderate', 'high', 'very_high')),
 ADD COLUMN score_factors jsonb,
 ADD COLUMN score_computed_at timestamptz;
COMMENT ON COLUMN public.profiles.difficulty_score IS 'Indicative non-clinical heuristic computed on device; never included in coach context.';