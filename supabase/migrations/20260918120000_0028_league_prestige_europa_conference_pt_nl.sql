-- Extend league prestige for newly ingested competitions (API-Football provider IDs).
update public.leagues
set prestige_score = case provider_id
  when 3 then 78
  when 848 then 62
  when 94 then 68
  when 88 then 66
  else prestige_score
end
where provider_id in (3, 848, 94, 88);
