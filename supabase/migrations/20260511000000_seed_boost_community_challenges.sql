-- Seed canonical Boost challenge records so enrollment works end-to-end.
-- These are the two permanent challenges users enroll into when they activate
-- the Boost Challenge via BoostChallengeModal or OnboardingWizard.
--
-- challenge_participants.joined_at tracks the per-user start date;
-- the challenge-level start_date / end_date serve as the overall program window.

INSERT INTO public.community_challenges (
  id,
  slug,
  title,
  description,
  start_date,
  end_date,
  xp_reward,
  boosties_reward,
  goal_kind,
  goal_target
)
VALUES
  (
    '00000000-0000-0000-0000-000000000021',
    'boost-21d',
    'Boost Express 21',
    'Reto de 21 días para iniciar tu transformación con el método Sergi Constance.',
    '2026-01-01 00:00:00+00',
    '2031-12-31 23:59:59+00',
    500,
    100,
    'streak',
    21
  ),
  (
    '00000000-0000-0000-0000-000000000090',
    'boost-90d',
    'Boost Challenge 90',
    'Reto oficial de 90 días — transformación documentada con el método Sergi Constance.',
    '2026-01-01 00:00:00+00',
    '2031-12-31 23:59:59+00',
    2000,
    500,
    'streak',
    90
  )
ON CONFLICT (id) DO NOTHING;
