-- Seed league prestige scores for dashboard featured-match ranking.
update public.leagues
set prestige_score = case provider_id
  when 2 then 100
  when 39 then 95
  when 140 then 90
  when 135 then 88
  when 78 then 87
  when 61 then 85
  when 286 then 55
  else prestige_score
end
where provider_id in (2, 39, 140, 135, 78, 61, 286);
