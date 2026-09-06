-- 0020_seed_model_version_1_0_0.sql
-- Seed active cold-start model coefficients for the prediction engine.

insert into public.model_versions (version, description, coefficients, is_active)
values (
  '1.0.0',
  'Cold-start Elo + logistic + Poisson',
  '{
    "elo": {
      "defaultRating": 1500,
      "homeAdvantageRating": 65,
      "kFactorTopTier": 32,
      "kFactorDefault": 24,
      "topTierLeagueProviderIds": [39, 140, 135, 78, 61, 2]
    },
    "logistic": {
      "intercept": { "home": 0.35, "draw": 0.05, "away": -0.35 },
      "weights": {
        "eloDiffNorm": 1.15,
        "form5PpgDiff": 0.55,
        "form10PpgDiff": 0.35,
        "h2hHomeWinRate": 0.45,
        "leaguePositionDiffNorm": 0.4,
        "restDaysDiffNorm": 0.15,
        "goalsForAvgDiff": 0.25,
        "xgForAvgDiff": 0.35,
        "homeAdvantage": 0.55
      },
      "temperature": 1.05
    },
    "poisson": {
      "baseHomeGoals": 1.45,
      "baseAwayGoals": 1.15,
      "eloScale": 0.0018,
      "formScale": 0.22,
      "homeAdvantageGoals": 0.28
    }
  }'::jsonb,
  true
)
on conflict (version) do update
set
  description = excluded.description,
  coefficients = excluded.coefficients,
  is_active = true;

update public.model_versions
set is_active = false
where version <> '1.0.0';
