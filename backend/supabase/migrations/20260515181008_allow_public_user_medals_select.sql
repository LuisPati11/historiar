-- Permite ver las medallas de usuarios con perfil público.
CREATE POLICY "user_medals: ver medallas de perfiles públicos"
  ON user_medals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = user_medals.user_id AND p.is_public = true
    )
  );
