-- Onboarding: the user's own no-contact rules (multi-select, owner-only like the rest of profiles).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS no_contact_rules text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.profiles.no_contact_rules IS 'Onboarding "no-contact rules" multi-select: no_texting, no_stalking, no_old_photos, no_meeting, no_reply_except, no_asking_friends, no_running_into';
