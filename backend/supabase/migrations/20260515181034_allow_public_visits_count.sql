-- Permite ver las visitas de usuarios con perfil público.
CREATE POLICY "visits: ver visitas de perfiles públicos"
  ON visits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = visits.user_id AND p.is_public = true
    )
  );
