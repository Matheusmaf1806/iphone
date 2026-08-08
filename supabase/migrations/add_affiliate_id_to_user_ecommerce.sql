-- Adiciona vínculo entre usuário e afiliado
-- affiliates.id é serial (integer), então a FK deve ser integer

-- Remove a coluna caso tenha sido criada com tipo errado (uuid) em tentativa anterior
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_ecommerce'
      AND column_name = 'affiliate_id'
      AND data_type <> 'integer'
  ) THEN
    ALTER TABLE user_ecommerce DROP COLUMN affiliate_id;
  END IF;
END $$;

ALTER TABLE user_ecommerce
  ADD COLUMN IF NOT EXISTS affiliate_id integer REFERENCES affiliates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_ecommerce_affiliate_id ON user_ecommerce(affiliate_id);
