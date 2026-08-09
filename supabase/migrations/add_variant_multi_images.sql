-- Migration: até 4 fotos por variante (SKU)
-- Rode este arquivo inteiro no SQL Editor do Supabase.
--
-- Contexto: product_variants.image_url só guardava 1 foto por SKU. Agora cada SKU
-- pode ter até 4 (mesmo limite já usado pro produto base em ProductModal). O campo
-- image_url antigo é mantido (não é removido) como "primeira foto" de fallback pra
-- variantes que só tinham 1 foto cadastrada antes desta migration.

alter table product_variants
  add column if not exists image_urls jsonb not null default '[]'::jsonb;
