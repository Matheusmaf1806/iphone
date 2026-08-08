-- Migration: Replace home-delivery shipping fields with Orlando pickup info on orders
-- Run this in the Supabase SQL editor before deploying the new checkout flow.
--
-- O checkout deixou de coletar endereço de entrega (não há frete nacional neste
-- modelo) e passou a coletar dados de retirada pessoal em Orlando. As colunas
-- antigas shipping_* são mantidas (nullable) para não quebrar pedidos antigos.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pickup_travel_date DATE,
  ADD COLUMN IF NOT EXISTS pickup_location TEXT,
  ADD COLUMN IF NOT EXISTS pickup_travel_notes TEXT,
  ADD COLUMN IF NOT EXISTS pickup_terms_accepted BOOLEAN DEFAULT FALSE;

-- DROP NOT NULL em cada coluna antiga, ignorando erro se a coluna não existir
-- ou já aceitar NULL (evita que a migration inteira falhe por causa disso).
DO $$
DECLARE
  col TEXT;
BEGIN
  FOREACH col IN ARRAY ARRAY['shipping_cep', 'shipping_street', 'shipping_number', 'shipping_neighborhood', 'shipping_city', 'shipping_state', 'shipping_cost']
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE orders ALTER COLUMN %I DROP NOT NULL', col);
    EXCEPTION WHEN OTHERS THEN
      NULL; -- coluna não existe ou já é nullable, ignora
    END;
  END LOOP;
END $$;
