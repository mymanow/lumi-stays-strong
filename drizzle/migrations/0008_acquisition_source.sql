ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS acquisition_source text
  CHECK (acquisition_source IS NULL OR acquisition_source IN ('tiktok', 'google', 'word_of_mouth', 'quora', 'app_store', 'instagram_facebook', 'reddit', 'other'));

COMMENT ON COLUMN public.profiles.acquisition_source IS 'Onboarding "How did you learn about us?" answer. Owner-only (profile RLS); analytics only, never sent to the coach.';