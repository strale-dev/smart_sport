-- Merge duplicate venues that share the same display name (ingestion fallback vs provider_id upsert).
WITH ranked AS (
  SELECT
    id,
    name,
    ROW_NUMBER() OVER (
      PARTITION BY name
      ORDER BY
        (provider_id IS NOT NULL AND provider_id > 0) DESC,
        provider_id NULLS LAST,
        created_at ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY name
      ORDER BY
        (provider_id IS NOT NULL AND provider_id > 0) DESC,
        provider_id NULLS LAST,
        created_at ASC
    ) AS keep_id
  FROM public.venues
),
dupes AS (
  SELECT id AS drop_id, keep_id
  FROM ranked
  WHERE rn > 1
)
UPDATE public.fixtures AS f
SET venue_id = d.keep_id
FROM dupes AS d
WHERE f.venue_id = d.drop_id;

WITH ranked AS (
  SELECT
    id,
    name,
    ROW_NUMBER() OVER (
      PARTITION BY name
      ORDER BY
        (provider_id IS NOT NULL AND provider_id > 0) DESC,
        provider_id NULLS LAST,
        created_at ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY name
      ORDER BY
        (provider_id IS NOT NULL AND provider_id > 0) DESC,
        provider_id NULLS LAST,
        created_at ASC
    ) AS keep_id
  FROM public.venues
),
dupes AS (
  SELECT id AS drop_id, keep_id
  FROM ranked
  WHERE rn > 1
)
UPDATE public.teams AS t
SET venue_id = d.keep_id
FROM dupes AS d
WHERE t.venue_id = d.drop_id;

WITH ranked AS (
  SELECT
    id,
    name,
    ROW_NUMBER() OVER (
      PARTITION BY name
      ORDER BY
        (provider_id IS NOT NULL AND provider_id > 0) DESC,
        provider_id NULLS LAST,
        created_at ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY name
      ORDER BY
        (provider_id IS NOT NULL AND provider_id > 0) DESC,
        provider_id NULLS LAST,
        created_at ASC
    ) AS keep_id
  FROM public.venues
),
dupes AS (
  SELECT id AS drop_id
  FROM ranked
  WHERE rn > 1
)
DELETE FROM public.venues AS v
USING dupes AS d
WHERE v.id = d.drop_id;
