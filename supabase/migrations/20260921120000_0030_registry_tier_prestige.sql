-- Phase D: re-assert legacy allowlist prestige (0019 + 0028). Tier defaults for expanded
-- registry leagues are applied via scripts/sync-league-prestige-from-registry.ts (registry tier → score).

update public.leagues
set prestige_score = case provider_id
  when 2 then 100
  when 39 then 95
  when 140 then 90
  when 135 then 88
  when 78 then 87
  when 61 then 85
  when 3 then 78
  when 848 then 62
  when 94 then 68
  when 88 then 66
  when 286 then 55
  else prestige_score
end
where provider_id in (2, 39, 140, 135, 78, 61, 3, 848, 94, 88, 286);
