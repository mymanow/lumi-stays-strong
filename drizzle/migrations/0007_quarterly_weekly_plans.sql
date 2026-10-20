-- The offered plans are now quarterly and weekly. Old values stay allowed so existing rows remain valid.
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_check CHECK (plan IS NULL OR plan IN ('monthly', 'yearly', 'quarterly', 'weekly'));
