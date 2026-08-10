-- Catálogo MacBook (Neo/Air/Pro) e iPad (base/mini/Air/Pro) — linha completa
-- vendida na Apple Store EUA em 2026-08-10, pesquisada e
-- cross-verificada em DUAS rodadas independentes (MacRumors, 9to5Mac, Macworld,
-- EveryMac, Apple Newsroom/Support, listagens de SKU da Best Buy/B&H/Costco).
--
-- Esta é a v2: corrige 2 pontos achados só na segunda rodada de verificação —
--   1. MacBook Pro 14" M5 (base) também vem com 32GB de RAM (faltava).
--   2. Acabamento de tela nano-textura (fosco) agora é uma variante real:
--      MacBook Pro (todos os chips/tamanhos) sem restrição de tier; iPad Pro
--      só nas versões de 1TB/2TB (16GB de RAM).
--
-- IMPORTANTE — o que este arquivo NÃO faz:
--   - Não define cost_price em nenhum SKU (fica null) — é o custo real do
--     fornecedor de vocês, não o preço de tabela da Apple, então só vocês
--     sabem esse número. Preencham em /gestao (Gerenciar Variantes tem
--     "aplicar custo a todas as linhas").
--   - Não define image_url/image_urls — fica pra vocês subirem as fotos.
--   - Insere os produtos com is_active = false de propósito, pra nenhum
--     ficar visível na loja com preço R$ 0,00 antes de vocês colocarem
--     custo e fotos. Depois de revisar, é só marcar "Ativo" em cada um.
--
-- Se você já rodou a v1 (add_mac_ipad_catalog.sql), pode rodar esta v2 por
-- cima sem problema: "on conflict do nothing" em tudo, só adiciona o que
-- faltava (32GB no M5 base, os SKUs de nano-textura) sem duplicar nada.
--
-- Rode este arquivo inteiro de uma vez no SQL Editor do Supabase.

-- Novo tipo de atributo: Memória (RAM) — usado por MacBook Pro/Max e iPad Pro,
-- onde a config de memória é uma escolha real do cliente.
insert into product_variant_types (name, is_active, display_order) values
  ('Memória', true, 11),
  ('Acabamento da Tela', true, 12)
on conflict (name) do nothing;

-- Novos valores de Armazenamento (4TB pro MacBook Air, 8TB pro MacBook Pro M5 Max)
insert into product_variant_values (variant_type_id, value, display_order)
select t.id, v.value, v.display_order
from product_variant_types t
join (values
  ('Armazenamento', '4TB', 7),
  ('Armazenamento', '8TB', 8)
) as v(type_name, value, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

-- Valores de Memória (RAM)
insert into product_variant_values (variant_type_id, value, display_order)
select t.id, v.value, v.display_order
from product_variant_types t
join (values
  ('Memória', '12GB', 1),
  ('Memória', '16GB', 2),
  ('Memória', '24GB', 3),
  ('Memória', '32GB', 4),
  ('Memória', '36GB', 5),
  ('Memória', '48GB', 6),
  ('Memória', '64GB', 7),
  ('Memória', '128GB', 8)
) as v(type_name, value, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

-- Valores de Acabamento da Tela (nano-textura = fosco, reduz reflexo)
insert into product_variant_values (variant_type_id, value, display_order)
select t.id, v.value, v.display_order
from product_variant_types t
join (values
  ('Acabamento da Tela', 'Padrão', 1),
  ('Acabamento da Tela', 'Nano-textura', 2)
) as v(type_name, value, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

-- Novos valores de Conectividade (linha iPad usa Wi-Fi, não GPS como o Watch)
insert into product_variant_values (variant_type_id, value, display_order)
select t.id, v.value, v.display_order
from product_variant_types t
join (values
  ('Conectividade', 'Wi-Fi', 3),
  ('Conectividade', 'Wi-Fi + Cellular', 4)
) as v(type_name, value, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

-- Novas cores (MacBook Neo: Índigo/Blush/Citrino; MacBook Pro e iPad Pro: Preto Espacial)
insert into product_variant_values (variant_type_id, value, swatch_hex, display_order)
select t.id, v.value, v.swatch_hex, v.display_order
from product_variant_types t
join (values
  ('Cor', 'Índigo', '#4B4C7A', 27),
  ('Cor', 'Blush', '#E8C4C0', 28),
  ('Cor', 'Citrino', '#F2C572', 29),
  ('Cor', 'Preto Espacial', '#3B3B3D', 30)
) as v(type_name, value, swatch_hex, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

-- Permite rodar este script mais de uma vez sem duplicar SKU
create unique index if not exists ux_product_variants_product_sku
  on product_variants(product_id, sku);

-- =====================================================================
-- MacBook Neo
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('macbook-neo', 'MacBook Neo', 'O Mac mais acessível da Apple, com chip A18 Pro.', 'MacBook Neo com chip A18 Pro (6-core CPU, 5-core GPU), tela Liquid Retina de 13" (2408x1506, 500 nits), 8GB de memória unificada, bateria de até 16h, Wi-Fi 6E e Bluetooth 6. A versão de 512GB inclui Touch ID no botão de energia; a de 256GB não tem Touch ID. Sem teclado retroiluminado.', 'mac', 'mac', true, 'USD', 10, false)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', 0, true
from products p
join (values
  ('MACBOOKNEO-PRATEADO-256GB', '{"Cor":"Prateado","Armazenamento":"256GB"}'::jsonb, true),
  ('MACBOOKNEO-PRATEADO-512GB', '{"Cor":"Prateado","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKNEO-NDIGO-256GB', '{"Cor":"Índigo","Armazenamento":"256GB"}'::jsonb, false),
  ('MACBOOKNEO-NDIGO-512GB', '{"Cor":"Índigo","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKNEO-BLUSH-256GB', '{"Cor":"Blush","Armazenamento":"256GB"}'::jsonb, false),
  ('MACBOOKNEO-BLUSH-512GB', '{"Cor":"Blush","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKNEO-CITRINO-256GB', '{"Cor":"Citrino","Armazenamento":"256GB"}'::jsonb, false),
  ('MACBOOKNEO-CITRINO-512GB', '{"Cor":"Citrino","Armazenamento":"512GB"}'::jsonb, false)
) as v(sku, attributes, is_default) on true
where p.slug = 'macbook-neo'
on conflict (product_id, sku) do nothing;

-- =====================================================================
-- MacBook Air 13" M5
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('macbook-air-13-m5', 'MacBook Air 13" M5', 'MacBook Air de 13" com chip M5.', 'MacBook Air 13" com chip M5 (10-core CPU). Na configuração base (16GB/512GB) o GPU tem 8 núcleos; em qualquer outra combinação de memória/armazenamento o GPU passa a ter 10 núcleos. Tela Liquid Retina de 13.6", até 18h de bateria.', 'mac', 'mac', true, 'USD', 10, false)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', 0, true
from products p
join (values
  ('MACBOOKAIR13M5-PRATEADO-16GB-512GB', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"512GB"}'::jsonb, true),
  ('MACBOOKAIR13M5-PRATEADO-16GB-1TB', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-PRATEADO-16GB-2TB', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-PRATEADO-16GB-4TB', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"4TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-PRATEADO-24GB-512GB', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKAIR13M5-PRATEADO-24GB-1TB', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-PRATEADO-24GB-2TB', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-PRATEADO-24GB-4TB', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"4TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-PRATEADO-32GB-512GB', '{"Cor":"Prateado","Memória":"32GB","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKAIR13M5-PRATEADO-32GB-1TB', '{"Cor":"Prateado","Memória":"32GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-PRATEADO-32GB-2TB', '{"Cor":"Prateado","Memória":"32GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-PRATEADO-32GB-4TB', '{"Cor":"Prateado","Memória":"32GB","Armazenamento":"4TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-MEIANOITE-16GB-512GB', '{"Cor":"Meia-noite","Memória":"16GB","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKAIR13M5-MEIANOITE-16GB-1TB', '{"Cor":"Meia-noite","Memória":"16GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-MEIANOITE-16GB-2TB', '{"Cor":"Meia-noite","Memória":"16GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-MEIANOITE-16GB-4TB', '{"Cor":"Meia-noite","Memória":"16GB","Armazenamento":"4TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-MEIANOITE-24GB-512GB', '{"Cor":"Meia-noite","Memória":"24GB","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKAIR13M5-MEIANOITE-24GB-1TB', '{"Cor":"Meia-noite","Memória":"24GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-MEIANOITE-24GB-2TB', '{"Cor":"Meia-noite","Memória":"24GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-MEIANOITE-24GB-4TB', '{"Cor":"Meia-noite","Memória":"24GB","Armazenamento":"4TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-MEIANOITE-32GB-512GB', '{"Cor":"Meia-noite","Memória":"32GB","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKAIR13M5-MEIANOITE-32GB-1TB', '{"Cor":"Meia-noite","Memória":"32GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-MEIANOITE-32GB-2TB', '{"Cor":"Meia-noite","Memória":"32GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-MEIANOITE-32GB-4TB', '{"Cor":"Meia-noite","Memória":"32GB","Armazenamento":"4TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-ESTELAR-16GB-512GB', '{"Cor":"Estelar","Memória":"16GB","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKAIR13M5-ESTELAR-16GB-1TB', '{"Cor":"Estelar","Memória":"16GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-ESTELAR-16GB-2TB', '{"Cor":"Estelar","Memória":"16GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-ESTELAR-16GB-4TB', '{"Cor":"Estelar","Memória":"16GB","Armazenamento":"4TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-ESTELAR-24GB-512GB', '{"Cor":"Estelar","Memória":"24GB","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKAIR13M5-ESTELAR-24GB-1TB', '{"Cor":"Estelar","Memória":"24GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-ESTELAR-24GB-2TB', '{"Cor":"Estelar","Memória":"24GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-ESTELAR-24GB-4TB', '{"Cor":"Estelar","Memória":"24GB","Armazenamento":"4TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-ESTELAR-32GB-512GB', '{"Cor":"Estelar","Memória":"32GB","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKAIR13M5-ESTELAR-32GB-1TB', '{"Cor":"Estelar","Memória":"32GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-ESTELAR-32GB-2TB', '{"Cor":"Estelar","Memória":"32GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-ESTELAR-32GB-4TB', '{"Cor":"Estelar","Memória":"32GB","Armazenamento":"4TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-AZULCU-16GB-512GB', '{"Cor":"Azul-céu","Memória":"16GB","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKAIR13M5-AZULCU-16GB-1TB', '{"Cor":"Azul-céu","Memória":"16GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-AZULCU-16GB-2TB', '{"Cor":"Azul-céu","Memória":"16GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-AZULCU-16GB-4TB', '{"Cor":"Azul-céu","Memória":"16GB","Armazenamento":"4TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-AZULCU-24GB-512GB', '{"Cor":"Azul-céu","Memória":"24GB","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKAIR13M5-AZULCU-24GB-1TB', '{"Cor":"Azul-céu","Memória":"24GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-AZULCU-24GB-2TB', '{"Cor":"Azul-céu","Memória":"24GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-AZULCU-24GB-4TB', '{"Cor":"Azul-céu","Memória":"24GB","Armazenamento":"4TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-AZULCU-32GB-512GB', '{"Cor":"Azul-céu","Memória":"32GB","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKAIR13M5-AZULCU-32GB-1TB', '{"Cor":"Azul-céu","Memória":"32GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-AZULCU-32GB-2TB', '{"Cor":"Azul-céu","Memória":"32GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR13M5-AZULCU-32GB-4TB', '{"Cor":"Azul-céu","Memória":"32GB","Armazenamento":"4TB"}'::jsonb, false)
) as v(sku, attributes, is_default) on true
where p.slug = 'macbook-air-13-m5'
on conflict (product_id, sku) do nothing;

-- =====================================================================
-- MacBook Air 15" M5
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('macbook-air-15-m5', 'MacBook Air 15" M5', 'MacBook Air de 15" com chip M5.', 'MacBook Air 15" com chip M5 (10-core CPU). Na configuração base (16GB/512GB) o GPU tem 8 núcleos; em qualquer outra combinação de memória/armazenamento o GPU passa a ter 10 núcleos. Tela Liquid Retina de 15.3", até 18h de bateria.', 'mac', 'mac', true, 'USD', 10, false)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', 0, true
from products p
join (values
  ('MACBOOKAIR15M5-PRATEADO-16GB-512GB', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"512GB"}'::jsonb, true),
  ('MACBOOKAIR15M5-PRATEADO-16GB-1TB', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-PRATEADO-16GB-2TB', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-PRATEADO-16GB-4TB', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"4TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-PRATEADO-24GB-512GB', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKAIR15M5-PRATEADO-24GB-1TB', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-PRATEADO-24GB-2TB', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-PRATEADO-24GB-4TB', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"4TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-PRATEADO-32GB-512GB', '{"Cor":"Prateado","Memória":"32GB","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKAIR15M5-PRATEADO-32GB-1TB', '{"Cor":"Prateado","Memória":"32GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-PRATEADO-32GB-2TB', '{"Cor":"Prateado","Memória":"32GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-PRATEADO-32GB-4TB', '{"Cor":"Prateado","Memória":"32GB","Armazenamento":"4TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-MEIANOITE-16GB-512GB', '{"Cor":"Meia-noite","Memória":"16GB","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKAIR15M5-MEIANOITE-16GB-1TB', '{"Cor":"Meia-noite","Memória":"16GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-MEIANOITE-16GB-2TB', '{"Cor":"Meia-noite","Memória":"16GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-MEIANOITE-16GB-4TB', '{"Cor":"Meia-noite","Memória":"16GB","Armazenamento":"4TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-MEIANOITE-24GB-512GB', '{"Cor":"Meia-noite","Memória":"24GB","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKAIR15M5-MEIANOITE-24GB-1TB', '{"Cor":"Meia-noite","Memória":"24GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-MEIANOITE-24GB-2TB', '{"Cor":"Meia-noite","Memória":"24GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-MEIANOITE-24GB-4TB', '{"Cor":"Meia-noite","Memória":"24GB","Armazenamento":"4TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-MEIANOITE-32GB-512GB', '{"Cor":"Meia-noite","Memória":"32GB","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKAIR15M5-MEIANOITE-32GB-1TB', '{"Cor":"Meia-noite","Memória":"32GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-MEIANOITE-32GB-2TB', '{"Cor":"Meia-noite","Memória":"32GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-MEIANOITE-32GB-4TB', '{"Cor":"Meia-noite","Memória":"32GB","Armazenamento":"4TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-ESTELAR-16GB-512GB', '{"Cor":"Estelar","Memória":"16GB","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKAIR15M5-ESTELAR-16GB-1TB', '{"Cor":"Estelar","Memória":"16GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-ESTELAR-16GB-2TB', '{"Cor":"Estelar","Memória":"16GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-ESTELAR-16GB-4TB', '{"Cor":"Estelar","Memória":"16GB","Armazenamento":"4TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-ESTELAR-24GB-512GB', '{"Cor":"Estelar","Memória":"24GB","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKAIR15M5-ESTELAR-24GB-1TB', '{"Cor":"Estelar","Memória":"24GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-ESTELAR-24GB-2TB', '{"Cor":"Estelar","Memória":"24GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-ESTELAR-24GB-4TB', '{"Cor":"Estelar","Memória":"24GB","Armazenamento":"4TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-ESTELAR-32GB-512GB', '{"Cor":"Estelar","Memória":"32GB","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKAIR15M5-ESTELAR-32GB-1TB', '{"Cor":"Estelar","Memória":"32GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-ESTELAR-32GB-2TB', '{"Cor":"Estelar","Memória":"32GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-ESTELAR-32GB-4TB', '{"Cor":"Estelar","Memória":"32GB","Armazenamento":"4TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-AZULCU-16GB-512GB', '{"Cor":"Azul-céu","Memória":"16GB","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKAIR15M5-AZULCU-16GB-1TB', '{"Cor":"Azul-céu","Memória":"16GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-AZULCU-16GB-2TB', '{"Cor":"Azul-céu","Memória":"16GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-AZULCU-16GB-4TB', '{"Cor":"Azul-céu","Memória":"16GB","Armazenamento":"4TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-AZULCU-24GB-512GB', '{"Cor":"Azul-céu","Memória":"24GB","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKAIR15M5-AZULCU-24GB-1TB', '{"Cor":"Azul-céu","Memória":"24GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-AZULCU-24GB-2TB', '{"Cor":"Azul-céu","Memória":"24GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-AZULCU-24GB-4TB', '{"Cor":"Azul-céu","Memória":"24GB","Armazenamento":"4TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-AZULCU-32GB-512GB', '{"Cor":"Azul-céu","Memória":"32GB","Armazenamento":"512GB"}'::jsonb, false),
  ('MACBOOKAIR15M5-AZULCU-32GB-1TB', '{"Cor":"Azul-céu","Memória":"32GB","Armazenamento":"1TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-AZULCU-32GB-2TB', '{"Cor":"Azul-céu","Memória":"32GB","Armazenamento":"2TB"}'::jsonb, false),
  ('MACBOOKAIR15M5-AZULCU-32GB-4TB', '{"Cor":"Azul-céu","Memória":"32GB","Armazenamento":"4TB"}'::jsonb, false)
) as v(sku, attributes, is_default) on true
where p.slug = 'macbook-air-15-m5'
on conflict (product_id, sku) do nothing;

-- =====================================================================
-- MacBook Pro 14" M5
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('macbook-pro-14-m5', 'MacBook Pro 14" M5', 'MacBook Pro de 14" com chip M5.', 'MacBook Pro 14" com chip M5 (10-core CPU, 10-core GPU). Tela Liquid Retina XDR mini-LED de 14.2", com opção de acabamento nano-textura (fosco, reduz reflexo).', 'mac', 'mac', true, 'USD', 10, false)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', 0, true
from products p
join (values
  ('MACBOOKPRO14M5-PRETOESPACIAL-16GB-1TB-PADRO', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, true),
  ('MACBOOKPRO14M5-PRETOESPACIAL-16GB-1TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRETOESPACIAL-16GB-2TB-PADRO', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRETOESPACIAL-16GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRETOESPACIAL-16GB-4TB-PADRO', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRETOESPACIAL-16GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRETOESPACIAL-24GB-1TB-PADRO', '{"Cor":"Preto Espacial","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRETOESPACIAL-24GB-1TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRETOESPACIAL-24GB-2TB-PADRO', '{"Cor":"Preto Espacial","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRETOESPACIAL-24GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRETOESPACIAL-24GB-4TB-PADRO', '{"Cor":"Preto Espacial","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRETOESPACIAL-24GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRETOESPACIAL-32GB-1TB-PADRO', '{"Cor":"Preto Espacial","Memória":"32GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRETOESPACIAL-32GB-1TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"32GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRETOESPACIAL-32GB-2TB-PADRO', '{"Cor":"Preto Espacial","Memória":"32GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRETOESPACIAL-32GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"32GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRETOESPACIAL-32GB-4TB-PADRO', '{"Cor":"Preto Espacial","Memória":"32GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRETOESPACIAL-32GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"32GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRATEADO-16GB-1TB-PADRO', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRATEADO-16GB-1TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRATEADO-16GB-2TB-PADRO', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRATEADO-16GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRATEADO-16GB-4TB-PADRO', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRATEADO-16GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRATEADO-24GB-1TB-PADRO', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRATEADO-24GB-1TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRATEADO-24GB-2TB-PADRO', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRATEADO-24GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRATEADO-24GB-4TB-PADRO', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRATEADO-24GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRATEADO-32GB-1TB-PADRO', '{"Cor":"Prateado","Memória":"32GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRATEADO-32GB-1TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"32GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRATEADO-32GB-2TB-PADRO', '{"Cor":"Prateado","Memória":"32GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRATEADO-32GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"32GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRATEADO-32GB-4TB-PADRO', '{"Cor":"Prateado","Memória":"32GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5-PRATEADO-32GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"32GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false)
) as v(sku, attributes, is_default) on true
where p.slug = 'macbook-pro-14-m5'
on conflict (product_id, sku) do nothing;

-- =====================================================================
-- MacBook Pro 14" M5 Pro
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('macbook-pro-14-m5-pro', 'MacBook Pro 14" M5 Pro', 'MacBook Pro de 14" com chip M5 Pro.', 'MacBook Pro 14" com chip M5 Pro (15-core CPU). GPU de 16 núcleos nas versões de 24GB/48GB de memória; 20 núcleos na versão de 64GB (18-core CPU). Tela Liquid Retina XDR mini-LED de 14.2", com opção de acabamento nano-textura (fosco, reduz reflexo).', 'mac', 'mac', true, 'USD', 10, false)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', 0, true
from products p
join (values
  ('MACBOOKPRO14M5PRO-PRETOESPACIAL-24GB-1TB-PADRO', '{"Cor":"Preto Espacial","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, true),
  ('MACBOOKPRO14M5PRO-PRETOESPACIAL-24GB-1TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRETOESPACIAL-24GB-2TB-PADRO', '{"Cor":"Preto Espacial","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRETOESPACIAL-24GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRETOESPACIAL-24GB-4TB-PADRO', '{"Cor":"Preto Espacial","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRETOESPACIAL-24GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRETOESPACIAL-48GB-1TB-PADRO', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRETOESPACIAL-48GB-1TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRETOESPACIAL-48GB-2TB-PADRO', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRETOESPACIAL-48GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRETOESPACIAL-48GB-4TB-PADRO', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRETOESPACIAL-48GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRETOESPACIAL-64GB-1TB-PADRO', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRETOESPACIAL-64GB-1TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRETOESPACIAL-64GB-2TB-PADRO', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRETOESPACIAL-64GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRETOESPACIAL-64GB-4TB-PADRO', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRETOESPACIAL-64GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRATEADO-24GB-1TB-PADRO', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRATEADO-24GB-1TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRATEADO-24GB-2TB-PADRO', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRATEADO-24GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRATEADO-24GB-4TB-PADRO', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRATEADO-24GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRATEADO-48GB-1TB-PADRO', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRATEADO-48GB-1TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRATEADO-48GB-2TB-PADRO', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRATEADO-48GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRATEADO-48GB-4TB-PADRO', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRATEADO-48GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRATEADO-64GB-1TB-PADRO', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRATEADO-64GB-1TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRATEADO-64GB-2TB-PADRO', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRATEADO-64GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRATEADO-64GB-4TB-PADRO', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5PRO-PRATEADO-64GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false)
) as v(sku, attributes, is_default) on true
where p.slug = 'macbook-pro-14-m5-pro'
on conflict (product_id, sku) do nothing;

-- =====================================================================
-- MacBook Pro 14" M5 Max
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('macbook-pro-14-m5-max', 'MacBook Pro 14" M5 Max', 'MacBook Pro de 14" com chip M5 Max.', 'MacBook Pro 14" com chip M5 Max (18-core CPU). GPU de 32 núcleos na versão de 36GB de memória; 40 núcleos nas versões de 48GB/64GB/128GB. Tela Liquid Retina XDR mini-LED de 14.2", com opção de acabamento nano-textura (fosco, reduz reflexo).', 'mac', 'mac', true, 'USD', 10, false)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', 0, true
from products p
join (values
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-36GB-2TB-PADRO', '{"Cor":"Preto Espacial","Memória":"36GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, true),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-36GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"36GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-36GB-4TB-PADRO', '{"Cor":"Preto Espacial","Memória":"36GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-36GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"36GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-36GB-8TB-PADRO', '{"Cor":"Preto Espacial","Memória":"36GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-36GB-8TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"36GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-48GB-2TB-PADRO', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-48GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-48GB-4TB-PADRO', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-48GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-48GB-8TB-PADRO', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-48GB-8TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-64GB-2TB-PADRO', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-64GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-64GB-4TB-PADRO', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-64GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-64GB-8TB-PADRO', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-64GB-8TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-128GB-2TB-PADRO', '{"Cor":"Preto Espacial","Memória":"128GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-128GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"128GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-128GB-4TB-PADRO', '{"Cor":"Preto Espacial","Memória":"128GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-128GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"128GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-128GB-8TB-PADRO', '{"Cor":"Preto Espacial","Memória":"128GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRETOESPACIAL-128GB-8TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"128GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-36GB-2TB-PADRO', '{"Cor":"Prateado","Memória":"36GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-36GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"36GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-36GB-4TB-PADRO', '{"Cor":"Prateado","Memória":"36GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-36GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"36GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-36GB-8TB-PADRO', '{"Cor":"Prateado","Memória":"36GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-36GB-8TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"36GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-48GB-2TB-PADRO', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-48GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-48GB-4TB-PADRO', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-48GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-48GB-8TB-PADRO', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-48GB-8TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-64GB-2TB-PADRO', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-64GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-64GB-4TB-PADRO', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-64GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-64GB-8TB-PADRO', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-64GB-8TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-128GB-2TB-PADRO', '{"Cor":"Prateado","Memória":"128GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-128GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"128GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-128GB-4TB-PADRO', '{"Cor":"Prateado","Memória":"128GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-128GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"128GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-128GB-8TB-PADRO', '{"Cor":"Prateado","Memória":"128GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO14M5MAX-PRATEADO-128GB-8TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"128GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false)
) as v(sku, attributes, is_default) on true
where p.slug = 'macbook-pro-14-m5-max'
on conflict (product_id, sku) do nothing;

-- =====================================================================
-- MacBook Pro 16" M5 Pro
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('macbook-pro-16-m5-pro', 'MacBook Pro 16" M5 Pro', 'MacBook Pro de 16" com chip M5 Pro.', 'MacBook Pro 16" com chip M5 Pro (15-core CPU). GPU de 16 núcleos nas versões de 24GB/48GB de memória; 20 núcleos na versão de 64GB (18-core CPU). Tela Liquid Retina XDR mini-LED de 16.2", com opção de acabamento nano-textura (fosco, reduz reflexo).', 'mac', 'mac', true, 'USD', 10, false)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', 0, true
from products p
join (values
  ('MACBOOKPRO16M5PRO-PRETOESPACIAL-24GB-1TB-PADRO', '{"Cor":"Preto Espacial","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, true),
  ('MACBOOKPRO16M5PRO-PRETOESPACIAL-24GB-1TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRETOESPACIAL-24GB-2TB-PADRO', '{"Cor":"Preto Espacial","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRETOESPACIAL-24GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRETOESPACIAL-24GB-4TB-PADRO', '{"Cor":"Preto Espacial","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRETOESPACIAL-24GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRETOESPACIAL-48GB-1TB-PADRO', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRETOESPACIAL-48GB-1TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRETOESPACIAL-48GB-2TB-PADRO', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRETOESPACIAL-48GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRETOESPACIAL-48GB-4TB-PADRO', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRETOESPACIAL-48GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRETOESPACIAL-64GB-1TB-PADRO', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRETOESPACIAL-64GB-1TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRETOESPACIAL-64GB-2TB-PADRO', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRETOESPACIAL-64GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRETOESPACIAL-64GB-4TB-PADRO', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRETOESPACIAL-64GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRATEADO-24GB-1TB-PADRO', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRATEADO-24GB-1TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRATEADO-24GB-2TB-PADRO', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRATEADO-24GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRATEADO-24GB-4TB-PADRO', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRATEADO-24GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRATEADO-48GB-1TB-PADRO', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRATEADO-48GB-1TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRATEADO-48GB-2TB-PADRO', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRATEADO-48GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRATEADO-48GB-4TB-PADRO', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRATEADO-48GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRATEADO-64GB-1TB-PADRO', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRATEADO-64GB-1TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRATEADO-64GB-2TB-PADRO', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRATEADO-64GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRATEADO-64GB-4TB-PADRO', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5PRO-PRATEADO-64GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false)
) as v(sku, attributes, is_default) on true
where p.slug = 'macbook-pro-16-m5-pro'
on conflict (product_id, sku) do nothing;

-- =====================================================================
-- MacBook Pro 16" M5 Max
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('macbook-pro-16-m5-max', 'MacBook Pro 16" M5 Max', 'MacBook Pro de 16" com chip M5 Max.', 'MacBook Pro 16" com chip M5 Max (18-core CPU). GPU de 32 núcleos na versão de 36GB de memória; 40 núcleos nas versões de 48GB/64GB/128GB. Tela Liquid Retina XDR mini-LED de 16.2", com opção de acabamento nano-textura (fosco, reduz reflexo).', 'mac', 'mac', true, 'USD', 10, false)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', 0, true
from products p
join (values
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-36GB-2TB-PADRO', '{"Cor":"Preto Espacial","Memória":"36GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, true),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-36GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"36GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-36GB-4TB-PADRO', '{"Cor":"Preto Espacial","Memória":"36GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-36GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"36GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-36GB-8TB-PADRO', '{"Cor":"Preto Espacial","Memória":"36GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-36GB-8TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"36GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-48GB-2TB-PADRO', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-48GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-48GB-4TB-PADRO', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-48GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-48GB-8TB-PADRO', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-48GB-8TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"48GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-64GB-2TB-PADRO', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-64GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-64GB-4TB-PADRO', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-64GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-64GB-8TB-PADRO', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-64GB-8TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"64GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-128GB-2TB-PADRO', '{"Cor":"Preto Espacial","Memória":"128GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-128GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"128GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-128GB-4TB-PADRO', '{"Cor":"Preto Espacial","Memória":"128GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-128GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"128GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-128GB-8TB-PADRO', '{"Cor":"Preto Espacial","Memória":"128GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRETOESPACIAL-128GB-8TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"128GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-36GB-2TB-PADRO', '{"Cor":"Prateado","Memória":"36GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-36GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"36GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-36GB-4TB-PADRO', '{"Cor":"Prateado","Memória":"36GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-36GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"36GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-36GB-8TB-PADRO', '{"Cor":"Prateado","Memória":"36GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-36GB-8TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"36GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-48GB-2TB-PADRO', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-48GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-48GB-4TB-PADRO', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-48GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-48GB-8TB-PADRO', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-48GB-8TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"48GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-64GB-2TB-PADRO', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-64GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-64GB-4TB-PADRO', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-64GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-64GB-8TB-PADRO', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-64GB-8TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"64GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-128GB-2TB-PADRO', '{"Cor":"Prateado","Memória":"128GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-128GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"128GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-128GB-4TB-PADRO', '{"Cor":"Prateado","Memória":"128GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-128GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"128GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-128GB-8TB-PADRO', '{"Cor":"Prateado","Memória":"128GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('MACBOOKPRO16M5MAX-PRATEADO-128GB-8TB-NANOTEXTURA', '{"Cor":"Prateado","Memória":"128GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false)
) as v(sku, attributes, is_default) on true
where p.slug = 'macbook-pro-16-m5-max'
on conflict (product_id, sku) do nothing;

-- =====================================================================
-- iPad (A16)
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('ipad-11', 'iPad (A16)', 'iPad com chip A16.', 'iPad com chip A16 (5-core CPU, 4-core GPU), 6GB de memória unificada, tela Liquid Retina de 11". Compatível com Apple Pencil (USB-C) e Apple Pencil (1ª geração).', 'ipad', 'ipad', true, 'USD', 10, false)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', 0, true
from products p
join (values
  ('IPAD11-PRATEADO-128GB-WIFI', '{"Cor":"Prateado","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, true),
  ('IPAD11-PRATEADO-128GB-WIFICELLULAR', '{"Cor":"Prateado","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPAD11-PRATEADO-256GB-WIFI', '{"Cor":"Prateado","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPAD11-PRATEADO-256GB-WIFICELLULAR', '{"Cor":"Prateado","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPAD11-PRATEADO-512GB-WIFI', '{"Cor":"Prateado","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPAD11-PRATEADO-512GB-WIFICELLULAR', '{"Cor":"Prateado","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPAD11-AZULCU-128GB-WIFI', '{"Cor":"Azul-céu","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPAD11-AZULCU-128GB-WIFICELLULAR', '{"Cor":"Azul-céu","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPAD11-AZULCU-256GB-WIFI', '{"Cor":"Azul-céu","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPAD11-AZULCU-256GB-WIFICELLULAR', '{"Cor":"Azul-céu","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPAD11-AZULCU-512GB-WIFI', '{"Cor":"Azul-céu","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPAD11-AZULCU-512GB-WIFICELLULAR', '{"Cor":"Azul-céu","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPAD11-AMARELO-128GB-WIFI', '{"Cor":"Amarelo","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPAD11-AMARELO-128GB-WIFICELLULAR', '{"Cor":"Amarelo","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPAD11-AMARELO-256GB-WIFI', '{"Cor":"Amarelo","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPAD11-AMARELO-256GB-WIFICELLULAR', '{"Cor":"Amarelo","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPAD11-AMARELO-512GB-WIFI', '{"Cor":"Amarelo","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPAD11-AMARELO-512GB-WIFICELLULAR', '{"Cor":"Amarelo","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPAD11-ROSA-128GB-WIFI', '{"Cor":"Rosa","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPAD11-ROSA-128GB-WIFICELLULAR', '{"Cor":"Rosa","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPAD11-ROSA-256GB-WIFI', '{"Cor":"Rosa","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPAD11-ROSA-256GB-WIFICELLULAR', '{"Cor":"Rosa","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPAD11-ROSA-512GB-WIFI', '{"Cor":"Rosa","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPAD11-ROSA-512GB-WIFICELLULAR', '{"Cor":"Rosa","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false)
) as v(sku, attributes, is_default) on true
where p.slug = 'ipad-11'
on conflict (product_id, sku) do nothing;

-- =====================================================================
-- iPad mini (A17 Pro)
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('ipad-mini-7', 'iPad mini (A17 Pro)', 'iPad mini com chip A17 Pro.', 'iPad mini com chip A17 Pro, 8GB de memória unificada, tela Liquid Retina de 8.3". Compatível com Apple Pencil Pro e Apple Pencil (USB-C).', 'ipad', 'ipad', true, 'USD', 10, false)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', 0, true
from products p
join (values
  ('IPADMINI7-GRAFITE-128GB-WIFI', '{"Cor":"Grafite","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADMINI7-GRAFITE-128GB-WIFICELLULAR', '{"Cor":"Grafite","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADMINI7-GRAFITE-256GB-WIFI', '{"Cor":"Grafite","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADMINI7-GRAFITE-256GB-WIFICELLULAR', '{"Cor":"Grafite","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADMINI7-GRAFITE-512GB-WIFI', '{"Cor":"Grafite","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADMINI7-GRAFITE-512GB-WIFICELLULAR', '{"Cor":"Grafite","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADMINI7-ESTELAR-128GB-WIFI', '{"Cor":"Estelar","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, true),
  ('IPADMINI7-ESTELAR-128GB-WIFICELLULAR', '{"Cor":"Estelar","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADMINI7-ESTELAR-256GB-WIFI', '{"Cor":"Estelar","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADMINI7-ESTELAR-256GB-WIFICELLULAR', '{"Cor":"Estelar","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADMINI7-ESTELAR-512GB-WIFI', '{"Cor":"Estelar","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADMINI7-ESTELAR-512GB-WIFICELLULAR', '{"Cor":"Estelar","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADMINI7-AZULCU-128GB-WIFI', '{"Cor":"Azul-céu","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADMINI7-AZULCU-128GB-WIFICELLULAR', '{"Cor":"Azul-céu","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADMINI7-AZULCU-256GB-WIFI', '{"Cor":"Azul-céu","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADMINI7-AZULCU-256GB-WIFICELLULAR', '{"Cor":"Azul-céu","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADMINI7-AZULCU-512GB-WIFI', '{"Cor":"Azul-céu","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADMINI7-AZULCU-512GB-WIFICELLULAR', '{"Cor":"Azul-céu","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADMINI7-ROXO-128GB-WIFI', '{"Cor":"Roxo","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADMINI7-ROXO-128GB-WIFICELLULAR', '{"Cor":"Roxo","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADMINI7-ROXO-256GB-WIFI', '{"Cor":"Roxo","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADMINI7-ROXO-256GB-WIFICELLULAR', '{"Cor":"Roxo","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADMINI7-ROXO-512GB-WIFI', '{"Cor":"Roxo","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADMINI7-ROXO-512GB-WIFICELLULAR', '{"Cor":"Roxo","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false)
) as v(sku, attributes, is_default) on true
where p.slug = 'ipad-mini-7'
on conflict (product_id, sku) do nothing;

-- =====================================================================
-- iPad Air 11" (M4)
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('ipad-air-11-m4', 'iPad Air 11" (M4)', 'iPad Air de 11" com chip M4.', 'iPad Air 11" com chip M4 (8-core CPU, 9-core GPU), 12GB de memória unificada, Wi-Fi 7. Compatível com Apple Pencil Pro e Apple Pencil (USB-C).', 'ipad', 'ipad', true, 'USD', 10, false)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', 0, true
from products p
join (values
  ('IPADAIR11M4-GRAFITE-128GB-WIFI', '{"Cor":"Grafite","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, true),
  ('IPADAIR11M4-GRAFITE-128GB-WIFICELLULAR', '{"Cor":"Grafite","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR11M4-GRAFITE-256GB-WIFI', '{"Cor":"Grafite","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR11M4-GRAFITE-256GB-WIFICELLULAR', '{"Cor":"Grafite","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR11M4-GRAFITE-512GB-WIFI', '{"Cor":"Grafite","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR11M4-GRAFITE-512GB-WIFICELLULAR', '{"Cor":"Grafite","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR11M4-GRAFITE-1TB-WIFI', '{"Cor":"Grafite","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR11M4-GRAFITE-1TB-WIFICELLULAR', '{"Cor":"Grafite","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR11M4-AZUL-128GB-WIFI', '{"Cor":"Azul","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR11M4-AZUL-128GB-WIFICELLULAR', '{"Cor":"Azul","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR11M4-AZUL-256GB-WIFI', '{"Cor":"Azul","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR11M4-AZUL-256GB-WIFICELLULAR', '{"Cor":"Azul","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR11M4-AZUL-512GB-WIFI', '{"Cor":"Azul","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR11M4-AZUL-512GB-WIFICELLULAR', '{"Cor":"Azul","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR11M4-AZUL-1TB-WIFI', '{"Cor":"Azul","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR11M4-AZUL-1TB-WIFICELLULAR', '{"Cor":"Azul","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR11M4-ROXO-128GB-WIFI', '{"Cor":"Roxo","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR11M4-ROXO-128GB-WIFICELLULAR', '{"Cor":"Roxo","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR11M4-ROXO-256GB-WIFI', '{"Cor":"Roxo","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR11M4-ROXO-256GB-WIFICELLULAR', '{"Cor":"Roxo","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR11M4-ROXO-512GB-WIFI', '{"Cor":"Roxo","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR11M4-ROXO-512GB-WIFICELLULAR', '{"Cor":"Roxo","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR11M4-ROXO-1TB-WIFI', '{"Cor":"Roxo","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR11M4-ROXO-1TB-WIFICELLULAR', '{"Cor":"Roxo","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR11M4-ESTELAR-128GB-WIFI', '{"Cor":"Estelar","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR11M4-ESTELAR-128GB-WIFICELLULAR', '{"Cor":"Estelar","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR11M4-ESTELAR-256GB-WIFI', '{"Cor":"Estelar","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR11M4-ESTELAR-256GB-WIFICELLULAR', '{"Cor":"Estelar","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR11M4-ESTELAR-512GB-WIFI', '{"Cor":"Estelar","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR11M4-ESTELAR-512GB-WIFICELLULAR', '{"Cor":"Estelar","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR11M4-ESTELAR-1TB-WIFI', '{"Cor":"Estelar","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR11M4-ESTELAR-1TB-WIFICELLULAR', '{"Cor":"Estelar","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false)
) as v(sku, attributes, is_default) on true
where p.slug = 'ipad-air-11-m4'
on conflict (product_id, sku) do nothing;

-- =====================================================================
-- iPad Air 13" (M4)
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('ipad-air-13-m4', 'iPad Air 13" (M4)', 'iPad Air de 13" com chip M4.', 'iPad Air 13" com chip M4 (8-core CPU, 9-core GPU), 12GB de memória unificada, Wi-Fi 7. Compatível com Apple Pencil Pro e Apple Pencil (USB-C).', 'ipad', 'ipad', true, 'USD', 10, false)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', 0, true
from products p
join (values
  ('IPADAIR13M4-GRAFITE-128GB-WIFI', '{"Cor":"Grafite","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, true),
  ('IPADAIR13M4-GRAFITE-128GB-WIFICELLULAR', '{"Cor":"Grafite","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR13M4-GRAFITE-256GB-WIFI', '{"Cor":"Grafite","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR13M4-GRAFITE-256GB-WIFICELLULAR', '{"Cor":"Grafite","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR13M4-GRAFITE-512GB-WIFI', '{"Cor":"Grafite","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR13M4-GRAFITE-512GB-WIFICELLULAR', '{"Cor":"Grafite","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR13M4-GRAFITE-1TB-WIFI', '{"Cor":"Grafite","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR13M4-GRAFITE-1TB-WIFICELLULAR', '{"Cor":"Grafite","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR13M4-AZUL-128GB-WIFI', '{"Cor":"Azul","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR13M4-AZUL-128GB-WIFICELLULAR', '{"Cor":"Azul","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR13M4-AZUL-256GB-WIFI', '{"Cor":"Azul","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR13M4-AZUL-256GB-WIFICELLULAR', '{"Cor":"Azul","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR13M4-AZUL-512GB-WIFI', '{"Cor":"Azul","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR13M4-AZUL-512GB-WIFICELLULAR', '{"Cor":"Azul","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR13M4-AZUL-1TB-WIFI', '{"Cor":"Azul","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR13M4-AZUL-1TB-WIFICELLULAR', '{"Cor":"Azul","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR13M4-ROXO-128GB-WIFI', '{"Cor":"Roxo","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR13M4-ROXO-128GB-WIFICELLULAR', '{"Cor":"Roxo","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR13M4-ROXO-256GB-WIFI', '{"Cor":"Roxo","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR13M4-ROXO-256GB-WIFICELLULAR', '{"Cor":"Roxo","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR13M4-ROXO-512GB-WIFI', '{"Cor":"Roxo","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR13M4-ROXO-512GB-WIFICELLULAR', '{"Cor":"Roxo","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR13M4-ROXO-1TB-WIFI', '{"Cor":"Roxo","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR13M4-ROXO-1TB-WIFICELLULAR', '{"Cor":"Roxo","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR13M4-ESTELAR-128GB-WIFI', '{"Cor":"Estelar","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR13M4-ESTELAR-128GB-WIFICELLULAR', '{"Cor":"Estelar","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR13M4-ESTELAR-256GB-WIFI', '{"Cor":"Estelar","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR13M4-ESTELAR-256GB-WIFICELLULAR', '{"Cor":"Estelar","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR13M4-ESTELAR-512GB-WIFI', '{"Cor":"Estelar","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR13M4-ESTELAR-512GB-WIFICELLULAR', '{"Cor":"Estelar","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false),
  ('IPADAIR13M4-ESTELAR-1TB-WIFI', '{"Cor":"Estelar","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false),
  ('IPADAIR13M4-ESTELAR-1TB-WIFICELLULAR', '{"Cor":"Estelar","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false)
) as v(sku, attributes, is_default) on true
where p.slug = 'ipad-air-13-m4'
on conflict (product_id, sku) do nothing;

-- =====================================================================
-- iPad Pro 11" M5
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('ipad-pro-11-m5', 'iPad Pro 11" M5', 'iPad Pro de 11" com chip M5.', 'iPad Pro 11" com chip M5, tela Tandem OLED Ultra Retina XDR, Wi-Fi 7. 12GB de memória unificada nas versões de 256GB/512GB (CPU de 9 núcleos); 16GB nas versões de 1TB/2TB (CPU de 10 núcleos). Acabamento nano-textura (fosco) disponível só nas versões de 1TB/2TB. Compatível com Apple Pencil Pro e Apple Pencil (USB-C).', 'ipad', 'ipad', true, 'USD', 10, false)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', 0, true
from products p
join (values
  ('IPADPRO11M5-PRATEADO-12GB-256GB-WIFI-PADRO', '{"Cor":"Prateado","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, true),
  ('IPADPRO11M5-PRATEADO-12GB-256GB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO11M5-PRATEADO-12GB-512GB-WIFI-PADRO', '{"Cor":"Prateado","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO11M5-PRATEADO-12GB-512GB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO11M5-PRATEADO-16GB-1TB-WIFI-PADRO', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO11M5-PRATEADO-16GB-1TB-WIFI-NANOTEXTURA', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('IPADPRO11M5-PRATEADO-16GB-1TB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO11M5-PRATEADO-16GB-1TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('IPADPRO11M5-PRATEADO-16GB-2TB-WIFI-PADRO', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO11M5-PRATEADO-16GB-2TB-WIFI-NANOTEXTURA', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('IPADPRO11M5-PRATEADO-16GB-2TB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO11M5-PRATEADO-16GB-2TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('IPADPRO11M5-PRETOESPACIAL-12GB-256GB-WIFI-PADRO', '{"Cor":"Preto Espacial","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO11M5-PRETOESPACIAL-12GB-256GB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO11M5-PRETOESPACIAL-12GB-512GB-WIFI-PADRO', '{"Cor":"Preto Espacial","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO11M5-PRETOESPACIAL-12GB-512GB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-1TB-WIFI-PADRO', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-1TB-WIFI-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-1TB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-1TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-2TB-WIFI-PADRO', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-2TB-WIFI-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-2TB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-2TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false)
) as v(sku, attributes, is_default) on true
where p.slug = 'ipad-pro-11-m5'
on conflict (product_id, sku) do nothing;

-- =====================================================================
-- iPad Pro 13" M5
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('ipad-pro-13-m5', 'iPad Pro 13" M5', 'iPad Pro de 13" com chip M5.', 'iPad Pro 13" com chip M5, tela Tandem OLED Ultra Retina XDR, Wi-Fi 7. 12GB de memória unificada nas versões de 256GB/512GB (CPU de 9 núcleos); 16GB nas versões de 1TB/2TB (CPU de 10 núcleos). Acabamento nano-textura (fosco) disponível só nas versões de 1TB/2TB. Compatível com Apple Pencil Pro e Apple Pencil (USB-C).', 'ipad', 'ipad', true, 'USD', 10, false)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', 0, true
from products p
join (values
  ('IPADPRO13M5-PRATEADO-12GB-256GB-WIFI-PADRO', '{"Cor":"Prateado","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, true),
  ('IPADPRO13M5-PRATEADO-12GB-256GB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO13M5-PRATEADO-12GB-512GB-WIFI-PADRO', '{"Cor":"Prateado","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO13M5-PRATEADO-12GB-512GB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO13M5-PRATEADO-16GB-1TB-WIFI-PADRO', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO13M5-PRATEADO-16GB-1TB-WIFI-NANOTEXTURA', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('IPADPRO13M5-PRATEADO-16GB-1TB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO13M5-PRATEADO-16GB-1TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('IPADPRO13M5-PRATEADO-16GB-2TB-WIFI-PADRO', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO13M5-PRATEADO-16GB-2TB-WIFI-NANOTEXTURA', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('IPADPRO13M5-PRATEADO-16GB-2TB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO13M5-PRATEADO-16GB-2TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('IPADPRO13M5-PRETOESPACIAL-12GB-256GB-WIFI-PADRO', '{"Cor":"Preto Espacial","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO13M5-PRETOESPACIAL-12GB-256GB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO13M5-PRETOESPACIAL-12GB-512GB-WIFI-PADRO', '{"Cor":"Preto Espacial","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO13M5-PRETOESPACIAL-12GB-512GB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-1TB-WIFI-PADRO', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-1TB-WIFI-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-1TB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-1TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-2TB-WIFI-PADRO', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-2TB-WIFI-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-2TB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-2TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false)
) as v(sku, attributes, is_default) on true
where p.slug = 'ipad-pro-13-m5'
on conflict (product_id, sku) do nothing;

