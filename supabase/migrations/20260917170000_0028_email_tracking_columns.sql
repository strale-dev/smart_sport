-- Phase 6 transactional email idempotency (Resend)

alter table public.profiles
  add column if not exists welcome_email_sent_at timestamptz;

comment on column public.profiles.welcome_email_sent_at is
  'Set after WelcomeEmail is sent via Resend (once per user).';

alter table public.subscriptions
  add column if not exists trial_ending_email_sent_at timestamptz;

comment on column public.subscriptions.trial_ending_email_sent_at is
  'Set after TrialEndingEmail is sent (3 days before trial_ends_at, UTC).';
