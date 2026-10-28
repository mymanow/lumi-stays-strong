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


-- ===== 0009_whop_premium =====
-- Paywall Whop Elements : is_premium est dérivé de status (écrit uniquement par le webhook /api/public/whop-webhook),
-- il ne peut donc jamais le contredire. Les colonnes whop_* permettent d'ignorer les webhooks livrés en retard.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS is_premium boolean GENERATED ALWAYS AS (status = 'active') STORED,
  ADD COLUMN IF NOT EXISTS whop_status text,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whop_synced_at timestamptz;

COMMENT ON COLUMN public.subscriptions.is_premium IS 'true tant que l''abonnement Whop donne accès (active, trialing, past_due, canceling).';
COMMENT ON COLUMN public.subscriptions.whop_status IS 'Statut brut de la membership Whop (active, trialing, past_due, canceling, canceled, expired…).';
COMMENT ON COLUMN public.subscriptions.whop_synced_at IS 'updated_at de la membership Whop du dernier webhook appliqué ; les livraisons plus anciennes sont ignorées.';


-- ===== 0010_revoke_trigger_function_rpc =====
-- handle_new_user est une fonction de trigger SECURITY DEFINER : personne ne doit pouvoir l'appeler via /rest/v1/rpc
-- (alerte Supabase 0028/0029). Le trigger on_auth_user_created continue de fonctionner.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;


-- ===== 0011_rls_auth_uid_initplan =====
-- Performance RLS (alerte Supabase 0003) : (select auth.uid()) est évalué une fois par requête au lieu d'une fois par ligne.
-- Même règle d'accès qu'avant : chacun ne voit et ne modifie que ses propres lignes.
ALTER POLICY "own profile select" ON public.profiles USING (id = (select auth.uid()));
ALTER POLICY "own profile insert" ON public.profiles WITH CHECK (id = (select auth.uid()));
ALTER POLICY "own profile update" ON public.profiles USING (id = (select auth.uid())) WITH CHECK (id = (select auth.uid()));
ALTER POLICY "own profile delete" ON public.profiles USING (id = (select auth.uid()));
ALTER POLICY "own events" ON public.contact_events USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
ALTER POLICY "own checkins" ON public.checkins USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
ALTER POLICY "own sub read" ON public.subscriptions USING (user_id = (select auth.uid()));
ALTER POLICY "own usage read" ON public.ai_usage USING (user_id = (select auth.uid()));


-- ===== 0010_trial_reminder =====
-- Essai gratuit de 3 jours (trimestriel) : rappel par e-mail 2 jours avant la fin, promis sur l'écran de la cloche.
-- trial_ends_at est écrit par le webhook Whop tant que la membership est « trialing » ;
-- trial_reminder_sent_at par /api/public/trial-reminders une fois l'e-mail envoyé (un seul rappel par abonnement).
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_reminder_sent_at timestamptz;

COMMENT ON COLUMN public.subscriptions.trial_ends_at IS 'Fin de l''essai gratuit Whop (renewal_period_end pendant « trialing »).';
COMMENT ON COLUMN public.subscriptions.trial_reminder_sent_at IS 'Envoi du rappel « ton essai se termine dans 2 jours ». Null = pas encore envoyé.';

CREATE INDEX IF NOT EXISTS subscriptions_trial_reminder_idx
  ON public.subscriptions (trial_ends_at)
  WHERE whop_status = 'trialing' AND trial_reminder_sent_at IS NULL;

-- Appel horaire de la route d'envoi (extensions pg_cron et pg_net : Database -> Extensions).
-- Remplacer les deux valeurs entre < > avant d'exécuter ce bloc :
--   <URL_DE_L_APP>  ex. https://hold-no-contact.vercel.app
--   <CRON_SECRET>   la même valeur que la variable d'environnement CRON_SECRET de l'app
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
SELECT cron.unschedule('hold-trial-reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hold-trial-reminders');
SELECT cron.schedule(
  'hold-trial-reminders',
  '7 * * * *',
  $$ SELECT net.http_post(
       url := '<URL_DE_L_APP>/api/public/trial-reminders',
       headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>', 'Content-Type', 'application/json'),
       body := '{}'::jsonb
     ); $$
);


-- ===== 0011_whop_signin =====
-- Connexion avec Whop (/api/public/whop-oauth/callback) : retrouver un compte Hold par son e-mail sans le créer.
-- Réservée au service role (la route serveur) ; jamais exposée aux utilisateurs.
CREATE OR REPLACE FUNCTION public.hold_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.hold_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hold_user_id_by_email(text) TO service_role;

CREATE INDEX IF NOT EXISTS subscriptions_whop_user_id_idx ON public.subscriptions (whop_user_id);


-- ===== 0012_post_login_pages =====
-- Pages après connexion (accueil en cartes, SOS, check-in E/R/P, coach à crédits, réglages).

-- Réglages : fuseau horaire IANA (ex. Europe/Paris), rempli depuis le navigateur puis modifiable.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone text CHECK (timezone IS NULL OR char_length(timezone) <= 64);

-- Check-in en 3 étapes : É(motionnel), R(elationnel), P(hysique). Des clés courtes, les libellés sont dans src/i18n.
-- Humeur et envie restent (graphique de progrès).
ALTER TABLE public.checkins
  ADD COLUMN IF NOT EXISTS emotions text[] NOT NULL DEFAULT '{}' CHECK (coalesce(array_length(emotions, 1), 0) <= 12),
  ADD COLUMN IF NOT EXISTS relational text[] NOT NULL DEFAULT '{}' CHECK (coalesce(array_length(relational, 1), 0) <= 12),
  ADD COLUMN IF NOT EXISTS physical text[] NOT NULL DEFAULT '{}' CHECK (coalesce(array_length(physical, 1), 0) <= 12);

-- Coach à crédits. 1 message envoyé = 1 crédit. Les règles se changent ici, sans redéployer l'app :
--   welcome          crédits offerts une seule fois, au premier passage sur le coach ;
--   premium_monthly  tant que l'abonnement est actif, le solde remonte à ce niveau tous les 30 jours (sans cumul au-delà).
-- Les textes du paywall citent ces montants (src/i18n) : les garder alignés.
CREATE TABLE IF NOT EXISTS public.coach_credit_rules (
  key text PRIMARY KEY CHECK (key IN ('welcome', 'premium_monthly')),
  amount int NOT NULL CHECK (amount >= 0),
  description text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.coach_credit_rules (key, amount, description) VALUES
  ('welcome', 12, 'Crédits offerts une seule fois à chaque compte, au premier passage sur le coach.'),
  ('premium_monthly', 300, 'Tant que l''abonnement est actif, le solde remonte à ce niveau tous les 30 jours.')
ON CONFLICT (key) DO NOTHING;
GRANT SELECT ON public.coach_credit_rules TO anon, authenticated;
GRANT ALL ON public.coach_credit_rules TO service_role;
ALTER TABLE public.coach_credit_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "credit rules read" ON public.coach_credit_rules;
CREATE POLICY "credit rules read" ON public.coach_credit_rules FOR SELECT TO anon, authenticated USING (true);

-- Solde par compte : lisible par son propriétaire, modifiable seulement par les fonctions ci-dessous (service role).
CREATE TABLE IF NOT EXISTS public.coach_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance int NOT NULL DEFAULT 0 CHECK (balance >= 0),
  welcome_granted_at timestamptz,
  premium_refill_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coach_credits TO authenticated;
GRANT ALL ON public.coach_credits TO service_role;
ALTER TABLE public.coach_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own credits read" ON public.coach_credits;
CREATE POLICY "own credits read" ON public.coach_credits FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

-- Journal des mouvements (cadeau de bienvenue, recharge mensuelle, message, remboursement si le coach n'a pas répondu, achat, ajustement manuel).
CREATE TABLE IF NOT EXISTS public.coach_credit_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta int NOT NULL,
  reason text NOT NULL CHECK (reason IN ('welcome', 'premium_refill', 'message', 'refund', 'purchase', 'admin')),
  balance_after int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coach_credit_ledger_user_idx ON public.coach_credit_ledger (user_id, created_at DESC);
GRANT SELECT ON public.coach_credit_ledger TO authenticated;
GRANT ALL ON public.coach_credit_ledger TO service_role;
ALTER TABLE public.coach_credit_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own ledger read" ON public.coach_credit_ledger;
CREATE POLICY "own ledger read" ON public.coach_credit_ledger FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

-- Crée le solde au premier passage (cadeau de bienvenue) et applique la recharge mensuelle des abonnés. Renvoie le solde.
CREATE OR REPLACE FUNCTION public.coach_credits_sync(_user uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  welcome int := coalesce((SELECT amount FROM public.coach_credit_rules WHERE key = 'welcome'), 0);
  monthly int := coalesce((SELECT amount FROM public.coach_credit_rules WHERE key = 'premium_monthly'), 0);
  r public.coach_credits%ROWTYPE;
  target int;
BEGIN
  INSERT INTO public.coach_credits (user_id, balance, welcome_granted_at) VALUES (_user, welcome, now())
  ON CONFLICT (user_id) DO NOTHING;
  IF FOUND AND welcome > 0 THEN
    INSERT INTO public.coach_credit_ledger (user_id, delta, reason, balance_after) VALUES (_user, welcome, 'welcome', welcome);
  END IF;
  SELECT * INTO r FROM public.coach_credits WHERE user_id = _user FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = _user AND s.status = 'active')
     AND (r.premium_refill_at IS NULL OR r.premium_refill_at <= now() - interval '30 days') THEN
    target := greatest(r.balance, monthly);
    UPDATE public.coach_credits SET balance = target, premium_refill_at = now(), updated_at = now() WHERE user_id = _user;
    IF target > r.balance THEN
      INSERT INTO public.coach_credit_ledger (user_id, delta, reason, balance_after) VALUES (_user, target - r.balance, 'premium_refill', target);
    END IF;
    RETURN target;
  END IF;
  RETURN r.balance;
END $$;

-- Débite 1 crédit pour un message. Renvoie le nouveau solde, ou -1 si le solde est vide (rien n'est débité).
CREATE OR REPLACE FUNCTION public.coach_credit_spend(_user uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE b int;
BEGIN
  PERFORM public.coach_credits_sync(_user);
  UPDATE public.coach_credits SET balance = balance - 1, updated_at = now() WHERE user_id = _user AND balance > 0 RETURNING balance INTO b;
  IF NOT FOUND THEN RETURN -1; END IF;
  INSERT INTO public.coach_credit_ledger (user_id, delta, reason, balance_after) VALUES (_user, -1, 'message', b);
  RETURN b;
END $$;

-- Rend le crédit quand le coach n'a pas pu répondre.
CREATE OR REPLACE FUNCTION public.coach_credit_refund(_user uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE b int;
BEGIN
  UPDATE public.coach_credits SET balance = balance + 1, updated_at = now() WHERE user_id = _user RETURNING balance INTO b;
  IF NOT FOUND THEN RETURN -1; END IF;
  INSERT INTO public.coach_credit_ledger (user_id, delta, reason, balance_after) VALUES (_user, 1, 'refund', b);
  RETURN b;
END $$;

-- Réservées à la route serveur /api/coach (service role) : un utilisateur ne peut jamais se créditer lui-même.
REVOKE ALL ON FUNCTION public.coach_credits_sync(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.coach_credit_spend(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.coach_credit_refund(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.coach_credits_sync(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.coach_credit_spend(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.coach_credit_refund(uuid) TO service_role;
