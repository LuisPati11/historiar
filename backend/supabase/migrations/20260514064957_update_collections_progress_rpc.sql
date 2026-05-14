-- Actualiza get_collections_progress para contar progreso basado en medallas
-- individuales ganadas (no visitas). Una colección es un conjunto de medallas,
-- y un monumento cuenta como visitado si el usuario tiene alguna medalla que
-- lo requiera. Las visitas se usan como fallback adicional.
CREATE OR REPLACE FUNCTION get_collections_progress()
RETURNS TABLE (
  collection_id          uuid,
  collection_name        text,
  collection_description text,
  medal_id               uuid,
  medal_name             text,
  medal_tier             text,
  points_reward          int,
  total_monuments        bigint,
  visited_monuments      bigint,
  earned_at              timestamptz
) LANGUAGE sql AS $$
  WITH user_touched_monuments AS (
    SELECT mr.monument_id
    FROM medal_requirements mr
    JOIN user_medals um ON um.medal_id = mr.medal_id AND um.user_id = auth.uid()
    UNION
    SELECT monument_id FROM visits WHERE user_id = auth.uid()
  )
  SELECT
    mc.id,
    mc.name,
    mc.description,
    m.id,
    m.name,
    m.tier,
    m.points_reward,
    COUNT(DISTINCT mr.monument_id)::bigint,
    COUNT(DISTINCT CASE WHEN utm.monument_id IS NOT NULL THEN mr.monument_id END)::bigint,
    um_coll.earned_at
  FROM medal_collections mc
  JOIN collection_medals cm   ON cm.collection_id = mc.id
  JOIN medals m               ON m.id = cm.medal_id
  JOIN medal_requirements mr  ON mr.medal_id = m.id
  LEFT JOIN user_touched_monuments utm ON utm.monument_id = mr.monument_id
  LEFT JOIN user_medals um_coll ON um_coll.medal_id = m.id AND um_coll.user_id = auth.uid()
  GROUP BY mc.id, mc.name, mc.description, m.id, m.name, m.tier, m.points_reward, um_coll.earned_at
  ORDER BY um_coll.earned_at DESC NULLS LAST, mc.name;
$$;
