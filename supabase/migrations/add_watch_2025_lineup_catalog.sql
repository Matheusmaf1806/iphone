-- Migration: cores e pulseiras da linha Apple Watch 2025 (SE 3, Series 11, Ultra 3)
-- Rode este arquivo inteiro no SQL Editor do Supabase antes de rodar o script
-- scripts/import-apple-watch-variants.mjs.
--
-- Só adiciona valores novos ao catálogo global já existente (product_variant_types /
-- product_variant_values, criado em add_watch_airpods_variant_catalog.sql) — nada aqui
-- é obrigatório pro import funcionar (os SKUs guardam o texto direto), mas sem isso as
-- cores aparecem sem o "swatch" colorido na página do produto.

-- Tipos de pulseira novos da linha Ultra 3 (Oceano, Loop Alpina, Loop Trail) + nome
-- usado nas pastas pra Milanês ("Estilo Milanês")
insert into product_variant_values (variant_type_id, value, display_order)
select t.id, v.value, v.display_order
from product_variant_types t
join (values
  ('Tipo de Pulseira', 'Estilo Milanês', 9),
  ('Tipo de Pulseira', 'Estilo Milanês de Titânio', 10),
  ('Tipo de Pulseira', 'Pulseira Oceano', 11),
  ('Tipo de Pulseira', 'Loop Alpina', 12),
  ('Tipo de Pulseira', 'Loop Trail', 13)
) as v(type_name, value, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

-- Cores de caixa da linha 2025 (Cor é compartilhado entre todos os produtos)
insert into product_variant_values (variant_type_id, value, swatch_hex, display_order)
select t.id, v.value, v.swatch_hex, v.display_order
from product_variant_types t
join (values
  ('Cor', 'Preta', '#1D1D1F', 19),
  ('Cor', 'Cinza Espacial', '#4A4A4C', 20),
  ('Cor', 'Cor de Ouro Rosa', '#F4CFC0', 21),
  ('Cor', 'Preta Brilhante', '#0B0B0C', 22),
  ('Cor', 'Ardósia', '#4B4E52', 23),
  ('Cor', 'Dourada', '#D4AF7A', 24),
  ('Cor', 'Natural', '#C8C0B4', 25),
  ('Cor', 'Prateada', '#E3E4E5', 26)
) as v(type_name, value, swatch_hex, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

-- Cores de pulseira da linha 2025
insert into product_variant_values (variant_type_id, value, swatch_hex, display_order)
select t.id, v.value, v.swatch_hex, v.display_order
from product_variant_types t
join (values
  ('Cor da Pulseira', 'Preta', '#1D1D1F', 9),
  ('Cor da Pulseira', 'Blush Clara', '#F2D9D3', 10),
  ('Cor da Pulseira', 'Roxo Névoa', '#B9AFC7', 11),
  ('Cor da Pulseira', 'Cinza Pedra', '#8E8C84', 12),
  ('Cor da Pulseira', 'Azul Clara', '#AEDFF0', 13),
  ('Cor da Pulseira', 'Azul-Âncora', '#1E3A5F', 14),
  ('Cor da Pulseira', 'Azul / Azul Brilhante', '#2E6FBA', 15),
  ('Cor da Pulseira', 'Preta-Carvão', '#2B2B2B', 16),
  ('Cor da Pulseira', 'Dourada', '#D4AF7A', 17),
  ('Cor da Pulseira', 'Natural', '#C8C0B4', 18),
  ('Cor da Pulseira', 'Ardósia', '#4B4E52', 19)
) as v(type_name, value, swatch_hex, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;
