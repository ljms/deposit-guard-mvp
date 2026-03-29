-- Product walkthrough (3 screens); shown once before dashboard for new users.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_seen_onboarding boolean NOT NULL DEFAULT false;

-- Existing accounts: treat as already completed so only new signups see the walkthrough.
UPDATE public.profiles SET has_seen_onboarding = true WHERE has_seen_onboarding = false;
