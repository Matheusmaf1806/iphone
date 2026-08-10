-- Arquivo ÚNICO e autossuficiente pra linha de MacBook — cria vocabulário,
-- produtos e as 336 variantes já com custo real (USD), imposto (7%),
-- margem (10%) e estoque (10 un.) da planilha do fornecedor, ativos
-- desde a criação. Substitui add_mac_ipad_catalog.sql + add_mac_ipad_catalog_v2.sql
-- pra linha de MacBook — não precisa rodar aqueles antes, só este aqui.
--
-- MacBook Air (13"/15") e MacBook Pro (14"/16") são 1 produto cada (mesma
-- lição do catálogo de iPad): tamanho e chip (M5/M5 Pro/M5 Max, com núcleos)
-- são eixos de variação, não produtos separados. MacBook Neo não tem opção
-- de tamanho, fica como um produto só (slug igual ao já usado antes).
--
-- Idempotente: pode rodar mais de uma vez sem duplicar nem perder dado.
--
-- Rode o arquivo inteiro de uma vez no SQL Editor do Supabase.

-- Remove produtos de uma versão antiga deste catálogo que separava MacBook
-- Air e MacBook Pro em produtos por tamanho/chip — a versão atual usa 1
-- produto por linha, com tamanho e chip como variação. Se não existirem, no-op.
delete from products
where slug in ('macbook-air-13-m5', 'macbook-air-15-m5', 'macbook-pro-14-m5', 'macbook-pro-14-m5-pro', 'macbook-pro-14-m5-max', 'macbook-pro-16-m5-pro', 'macbook-pro-16-m5-max');

-- Alguma importação anterior (ex: Apple Watch) deixou SKUs duplicados pra um
-- mesmo produto no banco, o que impede criar o índice único abaixo. Remove
-- essas duplicatas primeiro: mantém a linha referenciada em pedidos/estoque
-- (se houver), senão mantém a mais recentemente atualizada.
with referenced as (
  select distinct product_variant_id as id
  from order_items
  where product_variant_id is not null
  union
  select distinct product_variant_id as id
  from stock_movements
  where product_variant_id is not null
),
ranked as (
  select
    pv.id,
    row_number() over (
      partition by pv.product_id, pv.sku
      order by
        (r.id is not null) desc,
        pv.updated_at desc nulls last,
        pv.created_at desc nulls last,
        pv.id
    ) as rn
  from product_variants pv
  left join referenced r on r.id = pv.id
  where pv.sku is not null
) delete from product_variants pv using ranked
where pv.id = ranked.id and ranked.rn > 1;

create unique index if not exists ux_product_variants_product_sku
  on product_variants(product_id, sku);

insert into product_variant_types (name, is_active, display_order) values
  ('Chip', true, 14)
on conflict (name) do nothing;

insert into product_variant_values (variant_type_id, value, display_order)
select t.id, v.value, v.display_order
from product_variant_types t
join (values
  ('Chip', 'M5 (10-core CPU, 8-core GPU)', 1),
  ('Chip', 'M5 (10-core CPU, 10-core GPU)', 2),
  ('Chip', 'M5 Pro (15-core CPU, 16-core GPU)', 3),
  ('Chip', 'M5 Pro (18-core CPU, 20-core GPU)', 4),
  ('Chip', 'M5 Max (18-core CPU, 32-core GPU)', 5),
  ('Chip', 'M5 Max (18-core CPU, 40-core GPU)', 6)
) as v(type_name, value, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

-- =====================================================================
-- MacBook Neo
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('macbook-neo', 'MacBook Neo', 'O Mac mais acessível da Apple, com chip A18 Pro.', 'MacBook Neo com chip A18 Pro (6-core CPU, 5-core GPU), tela Liquid Retina de 13" (2408x1506, 500 nits), 8GB de memória unificada, bateria de até 16h, Wi-Fi 6E e Bluetooth 6. A versão de 512GB inclui Touch ID no botão de energia; a de 256GB não tem Touch ID. Sem teclado retroiluminado.', 'mac', 'mac', true, 'USD', 10, true)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description,
  is_active = true;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, cost_price, import_tax_percentage, supplier_margin_percentage, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', v.cost_price, 7, 10, 10, true
from products p
join (values
  ('MACBOOKNEO-PRATEADO-256GB', '{"Cor":"Prateado","Armazenamento":"256GB"}'::jsonb, true, 699::numeric),
  ('MACBOOKNEO-PRATEADO-512GB', '{"Cor":"Prateado","Armazenamento":"512GB"}'::jsonb, false, 799::numeric),
  ('MACBOOKNEO-BLUSH-256GB', '{"Cor":"Blush","Armazenamento":"256GB"}'::jsonb, false, 699::numeric),
  ('MACBOOKNEO-BLUSH-512GB', '{"Cor":"Blush","Armazenamento":"512GB"}'::jsonb, false, 799::numeric),
  ('MACBOOKNEO-CITRINO-256GB', '{"Cor":"Citrino","Armazenamento":"256GB"}'::jsonb, false, 699::numeric),
  ('MACBOOKNEO-CITRINO-512GB', '{"Cor":"Citrino","Armazenamento":"512GB"}'::jsonb, false, 799::numeric),
  ('MACBOOKNEO-NDIGO-256GB', '{"Cor":"Índigo","Armazenamento":"256GB"}'::jsonb, false, 699::numeric),
  ('MACBOOKNEO-NDIGO-512GB', '{"Cor":"Índigo","Armazenamento":"512GB"}'::jsonb, false, 799::numeric)
) as v(sku, attributes, is_default, cost_price) on true
where p.slug = 'macbook-neo'
on conflict (product_id, sku) do update set
  cost_price = excluded.cost_price,
  cost_currency = excluded.cost_currency,
  import_tax_percentage = excluded.import_tax_percentage,
  supplier_margin_percentage = excluded.supplier_margin_percentage,
  stock_quantity = excluded.stock_quantity,
  is_active = true;

-- =====================================================================
-- MacBook Air (M5)
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('macbook-air-m5', 'MacBook Air (M5)', 'MacBook Air com chip M5, disponível em 13" e 15".', 'MacBook Air com chip M5 (10-core CPU). Na configuração base (13", 16GB/512GB) o GPU pode ser de 8 ou 10 núcleos; em qualquer outra combinação de memória/armazenamento ou no tamanho de 15" o GPU é sempre de 10 núcleos. Disponível nos tamanhos de 13.6" e 15.3", até 18h de bateria.', 'mac', 'mac', true, 'USD', 10, true)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description,
  is_active = true;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, cost_price, import_tax_percentage, supplier_margin_percentage, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', v.cost_price, 7, 10, 10, true
from products p
join (values
  ('MACBOOKAIRM5-AZULCU-13-M58GPU-16GB-512GB', '{"Cor":"Azul-céu","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 8-core GPU)","Memória":"16GB","Armazenamento":"512GB"}'::jsonb, false, 1299::numeric),
  ('MACBOOKAIRM5-PRATEADO-13-M58GPU-16GB-512GB', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 8-core GPU)","Memória":"16GB","Armazenamento":"512GB"}'::jsonb, true, 1299::numeric),
  ('MACBOOKAIRM5-ESTELAR-13-M58GPU-16GB-512GB', '{"Cor":"Estelar","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 8-core GPU)","Memória":"16GB","Armazenamento":"512GB"}'::jsonb, false, 1299::numeric),
  ('MACBOOKAIRM5-MEIANOITE-13-M58GPU-16GB-512GB', '{"Cor":"Meia-noite","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 8-core GPU)","Memória":"16GB","Armazenamento":"512GB"}'::jsonb, false, 1299::numeric),
  ('MACBOOKAIRM5-AZULCU-13-M510GPU-16GB-512GB', '{"Cor":"Azul-céu","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"512GB"}'::jsonb, false, 1499::numeric),
  ('MACBOOKAIRM5-PRATEADO-13-M510GPU-16GB-512GB', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"512GB"}'::jsonb, false, 1499::numeric),
  ('MACBOOKAIRM5-ESTELAR-13-M510GPU-16GB-512GB', '{"Cor":"Estelar","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"512GB"}'::jsonb, false, 1499::numeric),
  ('MACBOOKAIRM5-MEIANOITE-13-M510GPU-16GB-512GB', '{"Cor":"Meia-noite","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"512GB"}'::jsonb, false, 1499::numeric),
  ('MACBOOKAIRM5-AZULCU-13-M510GPU-16GB-1TB', '{"Cor":"Azul-céu","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"1TB"}'::jsonb, false, 1599::numeric),
  ('MACBOOKAIRM5-PRATEADO-13-M510GPU-16GB-1TB', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"1TB"}'::jsonb, false, 1599::numeric),
  ('MACBOOKAIRM5-ESTELAR-13-M510GPU-16GB-1TB', '{"Cor":"Estelar","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"1TB"}'::jsonb, false, 1599::numeric),
  ('MACBOOKAIRM5-MEIANOITE-13-M510GPU-16GB-1TB', '{"Cor":"Meia-noite","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"1TB"}'::jsonb, false, 1599::numeric),
  ('MACBOOKAIRM5-AZULCU-13-M510GPU-16GB-2TB', '{"Cor":"Azul-céu","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"2TB"}'::jsonb, false, 1999::numeric),
  ('MACBOOKAIRM5-PRATEADO-13-M510GPU-16GB-2TB', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"2TB"}'::jsonb, false, 1999::numeric),
  ('MACBOOKAIRM5-ESTELAR-13-M510GPU-16GB-2TB', '{"Cor":"Estelar","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"2TB"}'::jsonb, false, 1999::numeric),
  ('MACBOOKAIRM5-MEIANOITE-13-M510GPU-16GB-2TB', '{"Cor":"Meia-noite","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"2TB"}'::jsonb, false, 1999::numeric),
  ('MACBOOKAIRM5-AZULCU-13-M510GPU-16GB-4TB', '{"Cor":"Azul-céu","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"4TB"}'::jsonb, false, 2599::numeric),
  ('MACBOOKAIRM5-PRATEADO-13-M510GPU-16GB-4TB', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"4TB"}'::jsonb, false, 2599::numeric),
  ('MACBOOKAIRM5-ESTELAR-13-M510GPU-16GB-4TB', '{"Cor":"Estelar","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"4TB"}'::jsonb, false, 2599::numeric),
  ('MACBOOKAIRM5-MEIANOITE-13-M510GPU-16GB-4TB', '{"Cor":"Meia-noite","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"4TB"}'::jsonb, false, 2599::numeric),
  ('MACBOOKAIRM5-AZULCU-13-M510GPU-24GB-512GB', '{"Cor":"Azul-céu","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"512GB"}'::jsonb, false, 1599::numeric),
  ('MACBOOKAIRM5-PRATEADO-13-M510GPU-24GB-512GB', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"512GB"}'::jsonb, false, 1599::numeric),
  ('MACBOOKAIRM5-ESTELAR-13-M510GPU-24GB-512GB', '{"Cor":"Estelar","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"512GB"}'::jsonb, false, 1599::numeric),
  ('MACBOOKAIRM5-MEIANOITE-13-M510GPU-24GB-512GB', '{"Cor":"Meia-noite","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"512GB"}'::jsonb, false, 1599::numeric),
  ('MACBOOKAIRM5-AZULCU-13-M510GPU-24GB-1TB', '{"Cor":"Azul-céu","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"1TB"}'::jsonb, false, 1699::numeric),
  ('MACBOOKAIRM5-PRATEADO-13-M510GPU-24GB-1TB', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"1TB"}'::jsonb, false, 1699::numeric),
  ('MACBOOKAIRM5-ESTELAR-13-M510GPU-24GB-1TB', '{"Cor":"Estelar","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"1TB"}'::jsonb, false, 1699::numeric),
  ('MACBOOKAIRM5-MEIANOITE-13-M510GPU-24GB-1TB', '{"Cor":"Meia-noite","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"1TB"}'::jsonb, false, 1699::numeric),
  ('MACBOOKAIRM5-AZULCU-13-M510GPU-24GB-2TB', '{"Cor":"Azul-céu","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"2TB"}'::jsonb, false, 2099::numeric),
  ('MACBOOKAIRM5-PRATEADO-13-M510GPU-24GB-2TB', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"2TB"}'::jsonb, false, 2099::numeric),
  ('MACBOOKAIRM5-ESTELAR-13-M510GPU-24GB-2TB', '{"Cor":"Estelar","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"2TB"}'::jsonb, false, 2099::numeric),
  ('MACBOOKAIRM5-MEIANOITE-13-M510GPU-24GB-2TB', '{"Cor":"Meia-noite","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"2TB"}'::jsonb, false, 2099::numeric),
  ('MACBOOKAIRM5-AZULCU-13-M510GPU-24GB-4TB', '{"Cor":"Azul-céu","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"4TB"}'::jsonb, false, 2699::numeric),
  ('MACBOOKAIRM5-PRATEADO-13-M510GPU-24GB-4TB', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"4TB"}'::jsonb, false, 2699::numeric),
  ('MACBOOKAIRM5-ESTELAR-13-M510GPU-24GB-4TB', '{"Cor":"Estelar","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"4TB"}'::jsonb, false, 2699::numeric),
  ('MACBOOKAIRM5-MEIANOITE-13-M510GPU-24GB-4TB', '{"Cor":"Meia-noite","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"4TB"}'::jsonb, false, 2699::numeric),
  ('MACBOOKAIRM5-AZULCU-13-M510GPU-32GB-512GB', '{"Cor":"Azul-céu","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"512GB"}'::jsonb, false, 1799::numeric),
  ('MACBOOKAIRM5-PRATEADO-13-M510GPU-32GB-512GB', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"512GB"}'::jsonb, false, 1799::numeric),
  ('MACBOOKAIRM5-ESTELAR-13-M510GPU-32GB-512GB', '{"Cor":"Estelar","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"512GB"}'::jsonb, false, 1799::numeric),
  ('MACBOOKAIRM5-MEIANOITE-13-M510GPU-32GB-512GB', '{"Cor":"Meia-noite","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"512GB"}'::jsonb, false, 1799::numeric),
  ('MACBOOKAIRM5-AZULCU-13-M510GPU-32GB-1TB', '{"Cor":"Azul-céu","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"1TB"}'::jsonb, false, 1899::numeric),
  ('MACBOOKAIRM5-PRATEADO-13-M510GPU-32GB-1TB', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"1TB"}'::jsonb, false, 1899::numeric),
  ('MACBOOKAIRM5-ESTELAR-13-M510GPU-32GB-1TB', '{"Cor":"Estelar","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"1TB"}'::jsonb, false, 1899::numeric),
  ('MACBOOKAIRM5-MEIANOITE-13-M510GPU-32GB-1TB', '{"Cor":"Meia-noite","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"1TB"}'::jsonb, false, 1899::numeric),
  ('MACBOOKAIRM5-AZULCU-13-M510GPU-32GB-2TB', '{"Cor":"Azul-céu","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"2TB"}'::jsonb, false, 2299::numeric),
  ('MACBOOKAIRM5-PRATEADO-13-M510GPU-32GB-2TB', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"2TB"}'::jsonb, false, 2299::numeric),
  ('MACBOOKAIRM5-ESTELAR-13-M510GPU-32GB-2TB', '{"Cor":"Estelar","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"2TB"}'::jsonb, false, 2299::numeric),
  ('MACBOOKAIRM5-MEIANOITE-13-M510GPU-32GB-2TB', '{"Cor":"Meia-noite","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"2TB"}'::jsonb, false, 2299::numeric),
  ('MACBOOKAIRM5-AZULCU-13-M510GPU-32GB-4TB', '{"Cor":"Azul-céu","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"4TB"}'::jsonb, false, 2899::numeric),
  ('MACBOOKAIRM5-PRATEADO-13-M510GPU-32GB-4TB', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"4TB"}'::jsonb, false, 2899::numeric),
  ('MACBOOKAIRM5-ESTELAR-13-M510GPU-32GB-4TB', '{"Cor":"Estelar","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"4TB"}'::jsonb, false, 2899::numeric),
  ('MACBOOKAIRM5-MEIANOITE-13-M510GPU-32GB-4TB', '{"Cor":"Meia-noite","Tamanho da Tela":"13\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"4TB"}'::jsonb, false, 2899::numeric),
  ('MACBOOKAIRM5-AZULCU-15-M510GPU-16GB-512GB', '{"Cor":"Azul-céu","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"512GB"}'::jsonb, false, 1499::numeric),
  ('MACBOOKAIRM5-PRATEADO-15-M510GPU-16GB-512GB', '{"Cor":"Prateado","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"512GB"}'::jsonb, false, 1499::numeric),
  ('MACBOOKAIRM5-ESTELAR-15-M510GPU-16GB-512GB', '{"Cor":"Estelar","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"512GB"}'::jsonb, false, 1499::numeric),
  ('MACBOOKAIRM5-MEIANOITE-15-M510GPU-16GB-512GB', '{"Cor":"Meia-noite","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"512GB"}'::jsonb, false, 1499::numeric),
  ('MACBOOKAIRM5-AZULCU-15-M510GPU-16GB-1TB', '{"Cor":"Azul-céu","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"1TB"}'::jsonb, false, 1699::numeric),
  ('MACBOOKAIRM5-PRATEADO-15-M510GPU-16GB-1TB', '{"Cor":"Prateado","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"1TB"}'::jsonb, false, 1699::numeric),
  ('MACBOOKAIRM5-ESTELAR-15-M510GPU-16GB-1TB', '{"Cor":"Estelar","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"1TB"}'::jsonb, false, 1699::numeric),
  ('MACBOOKAIRM5-MEIANOITE-15-M510GPU-16GB-1TB', '{"Cor":"Meia-noite","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"1TB"}'::jsonb, false, 1699::numeric),
  ('MACBOOKAIRM5-AZULCU-15-M510GPU-16GB-2TB', '{"Cor":"Azul-céu","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"2TB"}'::jsonb, false, 2099::numeric),
  ('MACBOOKAIRM5-PRATEADO-15-M510GPU-16GB-2TB', '{"Cor":"Prateado","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"2TB"}'::jsonb, false, 2099::numeric),
  ('MACBOOKAIRM5-ESTELAR-15-M510GPU-16GB-2TB', '{"Cor":"Estelar","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"2TB"}'::jsonb, false, 2099::numeric),
  ('MACBOOKAIRM5-MEIANOITE-15-M510GPU-16GB-2TB', '{"Cor":"Meia-noite","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"2TB"}'::jsonb, false, 2099::numeric),
  ('MACBOOKAIRM5-AZULCU-15-M510GPU-16GB-4TB', '{"Cor":"Azul-céu","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"4TB"}'::jsonb, false, 2699::numeric),
  ('MACBOOKAIRM5-PRATEADO-15-M510GPU-16GB-4TB', '{"Cor":"Prateado","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"4TB"}'::jsonb, false, 2699::numeric),
  ('MACBOOKAIRM5-ESTELAR-15-M510GPU-16GB-4TB', '{"Cor":"Estelar","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"4TB"}'::jsonb, false, 2699::numeric),
  ('MACBOOKAIRM5-MEIANOITE-15-M510GPU-16GB-4TB', '{"Cor":"Meia-noite","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"4TB"}'::jsonb, false, 2699::numeric),
  ('MACBOOKAIRM5-AZULCU-15-M510GPU-24GB-512GB', '{"Cor":"Azul-céu","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"512GB"}'::jsonb, false, 1699::numeric),
  ('MACBOOKAIRM5-PRATEADO-15-M510GPU-24GB-512GB', '{"Cor":"Prateado","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"512GB"}'::jsonb, false, 1699::numeric),
  ('MACBOOKAIRM5-ESTELAR-15-M510GPU-24GB-512GB', '{"Cor":"Estelar","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"512GB"}'::jsonb, false, 1699::numeric),
  ('MACBOOKAIRM5-MEIANOITE-15-M510GPU-24GB-512GB', '{"Cor":"Meia-noite","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"512GB"}'::jsonb, false, 1699::numeric),
  ('MACBOOKAIRM5-AZULCU-15-M510GPU-24GB-1TB', '{"Cor":"Azul-céu","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"1TB"}'::jsonb, false, 1899::numeric),
  ('MACBOOKAIRM5-PRATEADO-15-M510GPU-24GB-1TB', '{"Cor":"Prateado","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"1TB"}'::jsonb, false, 1899::numeric),
  ('MACBOOKAIRM5-ESTELAR-15-M510GPU-24GB-1TB', '{"Cor":"Estelar","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"1TB"}'::jsonb, false, 1899::numeric),
  ('MACBOOKAIRM5-MEIANOITE-15-M510GPU-24GB-1TB', '{"Cor":"Meia-noite","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"1TB"}'::jsonb, false, 1899::numeric),
  ('MACBOOKAIRM5-AZULCU-15-M510GPU-24GB-2TB', '{"Cor":"Azul-céu","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"2TB"}'::jsonb, false, 2299::numeric),
  ('MACBOOKAIRM5-PRATEADO-15-M510GPU-24GB-2TB', '{"Cor":"Prateado","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"2TB"}'::jsonb, false, 2299::numeric),
  ('MACBOOKAIRM5-ESTELAR-15-M510GPU-24GB-2TB', '{"Cor":"Estelar","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"2TB"}'::jsonb, false, 2299::numeric),
  ('MACBOOKAIRM5-MEIANOITE-15-M510GPU-24GB-2TB', '{"Cor":"Meia-noite","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"2TB"}'::jsonb, false, 2299::numeric),
  ('MACBOOKAIRM5-AZULCU-15-M510GPU-24GB-4TB', '{"Cor":"Azul-céu","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"4TB"}'::jsonb, false, 2899::numeric),
  ('MACBOOKAIRM5-PRATEADO-15-M510GPU-24GB-4TB', '{"Cor":"Prateado","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"4TB"}'::jsonb, false, 2899::numeric),
  ('MACBOOKAIRM5-ESTELAR-15-M510GPU-24GB-4TB', '{"Cor":"Estelar","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"4TB"}'::jsonb, false, 2899::numeric),
  ('MACBOOKAIRM5-MEIANOITE-15-M510GPU-24GB-4TB', '{"Cor":"Meia-noite","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"4TB"}'::jsonb, false, 2899::numeric),
  ('MACBOOKAIRM5-AZULCU-15-M510GPU-32GB-512GB', '{"Cor":"Azul-céu","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"512GB"}'::jsonb, false, 1899::numeric),
  ('MACBOOKAIRM5-PRATEADO-15-M510GPU-32GB-512GB', '{"Cor":"Prateado","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"512GB"}'::jsonb, false, 1899::numeric),
  ('MACBOOKAIRM5-ESTELAR-15-M510GPU-32GB-512GB', '{"Cor":"Estelar","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"512GB"}'::jsonb, false, 1899::numeric),
  ('MACBOOKAIRM5-MEIANOITE-15-M510GPU-32GB-512GB', '{"Cor":"Meia-noite","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"512GB"}'::jsonb, false, 1899::numeric),
  ('MACBOOKAIRM5-AZULCU-15-M510GPU-32GB-1TB', '{"Cor":"Azul-céu","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"1TB"}'::jsonb, false, 2099::numeric),
  ('MACBOOKAIRM5-PRATEADO-15-M510GPU-32GB-1TB', '{"Cor":"Prateado","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"1TB"}'::jsonb, false, 2099::numeric),
  ('MACBOOKAIRM5-ESTELAR-15-M510GPU-32GB-1TB', '{"Cor":"Estelar","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"1TB"}'::jsonb, false, 2099::numeric),
  ('MACBOOKAIRM5-MEIANOITE-15-M510GPU-32GB-1TB', '{"Cor":"Meia-noite","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"1TB"}'::jsonb, false, 2099::numeric),
  ('MACBOOKAIRM5-AZULCU-15-M510GPU-32GB-2TB', '{"Cor":"Azul-céu","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"2TB"}'::jsonb, false, 2499::numeric),
  ('MACBOOKAIRM5-PRATEADO-15-M510GPU-32GB-2TB', '{"Cor":"Prateado","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"2TB"}'::jsonb, false, 2499::numeric),
  ('MACBOOKAIRM5-ESTELAR-15-M510GPU-32GB-2TB', '{"Cor":"Estelar","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"2TB"}'::jsonb, false, 2499::numeric),
  ('MACBOOKAIRM5-MEIANOITE-15-M510GPU-32GB-2TB', '{"Cor":"Meia-noite","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"2TB"}'::jsonb, false, 2499::numeric),
  ('MACBOOKAIRM5-AZULCU-15-M510GPU-32GB-4TB', '{"Cor":"Azul-céu","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"4TB"}'::jsonb, false, 3099::numeric),
  ('MACBOOKAIRM5-PRATEADO-15-M510GPU-32GB-4TB', '{"Cor":"Prateado","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"4TB"}'::jsonb, false, 3099::numeric),
  ('MACBOOKAIRM5-ESTELAR-15-M510GPU-32GB-4TB', '{"Cor":"Estelar","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"4TB"}'::jsonb, false, 3099::numeric),
  ('MACBOOKAIRM5-MEIANOITE-15-M510GPU-32GB-4TB', '{"Cor":"Meia-noite","Tamanho da Tela":"15\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"4TB"}'::jsonb, false, 3099::numeric)
) as v(sku, attributes, is_default, cost_price) on true
where p.slug = 'macbook-air-m5'
on conflict (product_id, sku) do update set
  cost_price = excluded.cost_price,
  cost_currency = excluded.cost_currency,
  import_tax_percentage = excluded.import_tax_percentage,
  supplier_margin_percentage = excluded.supplier_margin_percentage,
  stock_quantity = excluded.stock_quantity,
  is_active = true;

-- =====================================================================
-- MacBook Pro (M5)
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('macbook-pro-m5', 'MacBook Pro (M5)', 'MacBook Pro com chip M5, M5 Pro ou M5 Max, disponível em 14" e 16".', 'MacBook Pro com chip M5, M5 Pro ou M5 Max, tela Liquid Retina XDR mini-LED. Disponível nos tamanhos de 14.2" e 16.2". Acabamento nano-textura (fosco) disponível em qualquer configuração. O chip M5 base (10-core CPU/10-core GPU) só está disponível no tamanho de 14"; M5 Pro e M5 Max estão disponíveis nos dois tamanhos.', 'mac', 'mac', true, 'USD', 10, true)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description,
  is_active = true;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, cost_price, import_tax_percentage, supplier_margin_percentage, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', v.cost_price, 7, 10, 10, true
from products p
join (values
  ('MACBOOKPROM5-PRETOESPACIAL-14-M510GPU-16GB-1TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 1999::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M510GPU-16GB-1TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, true, 1999::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M510GPU-16GB-1TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2149::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M510GPU-16GB-1TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2149::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M510GPU-16GB-2TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 2399::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M510GPU-16GB-2TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 2399::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M510GPU-16GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2549::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M510GPU-16GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2549::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M510GPU-16GB-4TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 2999::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M510GPU-16GB-4TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 2999::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M510GPU-16GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3149::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M510GPU-16GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"16GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3149::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M510GPU-24GB-1TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 2199::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M510GPU-24GB-1TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 2199::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M510GPU-24GB-1TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2349::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M510GPU-24GB-1TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2349::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M510GPU-24GB-2TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 2599::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M510GPU-24GB-2TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 2599::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M510GPU-24GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2749::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M510GPU-24GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2749::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M510GPU-24GB-4TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3199::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M510GPU-24GB-4TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3199::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M510GPU-24GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3349::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M510GPU-24GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3349::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M510GPU-32GB-1TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 2399::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M510GPU-32GB-1TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 2399::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M510GPU-32GB-1TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2549::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M510GPU-32GB-1TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2549::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M510GPU-32GB-2TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 2799::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M510GPU-32GB-2TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 2799::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M510GPU-32GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2949::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M510GPU-32GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2949::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M510GPU-32GB-4TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3399::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M510GPU-32GB-4TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3399::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M510GPU-32GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3549::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M510GPU-32GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 (10-core CPU, 10-core GPU)","Memória":"32GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3549::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO16GPU-24GB-1TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 2499::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO16GPU-24GB-1TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 2499::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO16GPU-24GB-1TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2649::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO16GPU-24GB-1TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2649::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO16GPU-24GB-2TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 2899::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO16GPU-24GB-2TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 2899::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO16GPU-24GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3049::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO16GPU-24GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3049::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO16GPU-24GB-4TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3499::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO16GPU-24GB-4TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3499::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO16GPU-24GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3649::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO16GPU-24GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3649::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO16GPU-48GB-1TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"48GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 2899::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO16GPU-48GB-1TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"48GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 2899::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO16GPU-48GB-1TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"48GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3049::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO16GPU-48GB-1TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"48GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3049::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO16GPU-48GB-2TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3299::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO16GPU-48GB-2TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3299::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO16GPU-48GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3449::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO16GPU-48GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3449::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO16GPU-48GB-4TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3899::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO16GPU-48GB-4TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3899::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO16GPU-48GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4049::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO16GPU-48GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (15-core CPU, 16-core GPU)","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4049::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO20GPU-24GB-1TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 2699::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO20GPU-24GB-1TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 2699::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO20GPU-24GB-1TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2849::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO20GPU-24GB-1TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2849::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO20GPU-24GB-2TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3099::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO20GPU-24GB-2TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3099::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO20GPU-24GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3249::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO20GPU-24GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3249::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO20GPU-24GB-4TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3699::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO20GPU-24GB-4TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3699::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO20GPU-24GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3849::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO20GPU-24GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3849::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO20GPU-48GB-1TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3099::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO20GPU-48GB-1TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3099::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO20GPU-48GB-1TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3249::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO20GPU-48GB-1TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3249::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO20GPU-48GB-2TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3499::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO20GPU-48GB-2TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3499::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO20GPU-48GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3649::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO20GPU-48GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3649::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO20GPU-48GB-4TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 4099::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO20GPU-48GB-4TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 4099::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO20GPU-48GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4249::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO20GPU-48GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4249::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO20GPU-64GB-1TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3299::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO20GPU-64GB-1TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3299::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO20GPU-64GB-1TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3449::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO20GPU-64GB-1TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3449::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO20GPU-64GB-2TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3699::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO20GPU-64GB-2TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3699::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO20GPU-64GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3849::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO20GPU-64GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3849::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO20GPU-64GB-4TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 4299::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO20GPU-64GB-4TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 4299::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5PRO20GPU-64GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4449::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5PRO20GPU-64GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4449::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX32GPU-36GB-2TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 4099::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX32GPU-36GB-2TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 4099::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX32GPU-36GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4249::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX32GPU-36GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4249::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX32GPU-36GB-4TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 4699::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX32GPU-36GB-4TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 4699::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX32GPU-36GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4849::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX32GPU-36GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4849::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX32GPU-36GB-8TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 5899::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX32GPU-36GB-8TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 5899::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX32GPU-36GB-8TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 6049::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX32GPU-36GB-8TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 6049::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX40GPU-48GB-2TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 4599::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX40GPU-48GB-2TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 4599::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX40GPU-48GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4749::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX40GPU-48GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4749::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX40GPU-48GB-4TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 5199::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX40GPU-48GB-4TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 5199::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX40GPU-48GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 5349::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX40GPU-48GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 5349::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX40GPU-48GB-8TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 6399::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX40GPU-48GB-8TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 6399::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX40GPU-48GB-8TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 6549::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX40GPU-48GB-8TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 6549::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX40GPU-64GB-2TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 4799::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX40GPU-64GB-2TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 4799::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX40GPU-64GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4949::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX40GPU-64GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4949::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX40GPU-64GB-4TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 5399::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX40GPU-64GB-4TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 5399::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX40GPU-64GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 5549::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX40GPU-64GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 5549::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX40GPU-64GB-8TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 6599::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX40GPU-64GB-8TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 6599::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX40GPU-64GB-8TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 6749::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX40GPU-64GB-8TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 6749::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX40GPU-128GB-2TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 5599::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX40GPU-128GB-2TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 5599::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX40GPU-128GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 5749::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX40GPU-128GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 5749::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX40GPU-128GB-4TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 6199::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX40GPU-128GB-4TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 6199::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX40GPU-128GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 6349::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX40GPU-128GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 6349::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX40GPU-128GB-8TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 7399::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX40GPU-128GB-8TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 7399::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-14-M5MAX40GPU-128GB-8TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 7549::numeric),
  ('MACBOOKPROM5-PRATEADO-14-M5MAX40GPU-128GB-8TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"14\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 7549::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5PRO20GPU-24GB-1TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 2999::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5PRO20GPU-24GB-1TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 2999::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5PRO20GPU-24GB-1TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3149::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5PRO20GPU-24GB-1TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3149::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5PRO20GPU-24GB-2TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3399::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5PRO20GPU-24GB-2TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3399::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5PRO20GPU-24GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3549::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5PRO20GPU-24GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3549::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5PRO20GPU-24GB-4TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3999::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5PRO20GPU-24GB-4TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3999::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5PRO20GPU-24GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4149::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5PRO20GPU-24GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"24GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4149::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5PRO20GPU-48GB-1TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3399::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5PRO20GPU-48GB-1TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3399::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5PRO20GPU-48GB-1TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3549::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5PRO20GPU-48GB-1TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3549::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5PRO20GPU-48GB-2TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3799::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5PRO20GPU-48GB-2TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3799::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5PRO20GPU-48GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3949::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5PRO20GPU-48GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3949::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5PRO20GPU-48GB-4TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 4399::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5PRO20GPU-48GB-4TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 4399::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5PRO20GPU-48GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4549::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5PRO20GPU-48GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4549::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5PRO20GPU-64GB-1TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3599::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5PRO20GPU-64GB-1TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"1TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3599::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5PRO20GPU-64GB-1TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3749::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5PRO20GPU-64GB-1TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"1TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 3749::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5PRO20GPU-64GB-2TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3999::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5PRO20GPU-64GB-2TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 3999::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5PRO20GPU-64GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4149::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5PRO20GPU-64GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4149::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5PRO20GPU-64GB-4TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 4599::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5PRO20GPU-64GB-4TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 4599::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5PRO20GPU-64GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4749::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5PRO20GPU-64GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Pro (18-core CPU, 20-core GPU)","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4749::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX32GPU-36GB-2TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 4399::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX32GPU-36GB-2TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 4399::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX32GPU-36GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4549::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX32GPU-36GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 4549::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX32GPU-36GB-4TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 4999::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX32GPU-36GB-4TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 4999::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX32GPU-36GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 5149::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX32GPU-36GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 5149::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX32GPU-36GB-8TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 6199::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX32GPU-36GB-8TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 6199::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX32GPU-36GB-8TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 6349::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX32GPU-36GB-8TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 32-core GPU)","Memória":"36GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 6349::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX40GPU-48GB-2TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 4999::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX40GPU-48GB-2TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 4999::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX40GPU-48GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 5149::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX40GPU-48GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 5149::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX40GPU-48GB-4TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 5599::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX40GPU-48GB-4TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 5599::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX40GPU-48GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 5749::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX40GPU-48GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 5749::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX40GPU-48GB-8TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 6799::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX40GPU-48GB-8TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 6799::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX40GPU-48GB-8TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 6949::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX40GPU-48GB-8TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"48GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 6949::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX40GPU-64GB-2TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 5199::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX40GPU-64GB-2TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 5199::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX40GPU-64GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 5349::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX40GPU-64GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 5349::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX40GPU-64GB-4TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 5799::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX40GPU-64GB-4TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 5799::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX40GPU-64GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 5949::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX40GPU-64GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 5949::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX40GPU-64GB-8TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 6999::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX40GPU-64GB-8TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 6999::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX40GPU-64GB-8TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 7149::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX40GPU-64GB-8TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"64GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 7149::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX40GPU-128GB-2TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 5999::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX40GPU-128GB-2TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"2TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 5999::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX40GPU-128GB-2TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 6149::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX40GPU-128GB-2TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"2TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 6149::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX40GPU-128GB-4TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 6599::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX40GPU-128GB-4TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"4TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 6599::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX40GPU-128GB-4TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 6749::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX40GPU-128GB-4TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"4TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 6749::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX40GPU-128GB-8TB-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 7799::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX40GPU-128GB-8TB-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"8TB","Acabamento da Tela":"Padrão"}'::jsonb, false, 7799::numeric),
  ('MACBOOKPROM5-PRETOESPACIAL-16-M5MAX40GPU-128GB-8TB-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 7949::numeric),
  ('MACBOOKPROM5-PRATEADO-16-M5MAX40GPU-128GB-8TB-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"16\"","Chip":"M5 Max (18-core CPU, 40-core GPU)","Memória":"128GB","Armazenamento":"8TB","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 7949::numeric)
) as v(sku, attributes, is_default, cost_price) on true
where p.slug = 'macbook-pro-m5'
on conflict (product_id, sku) do update set
  cost_price = excluded.cost_price,
  cost_currency = excluded.cost_currency,
  import_tax_percentage = excluded.import_tax_percentage,
  supplier_margin_percentage = excluded.supplier_margin_percentage,
  stock_quantity = excluded.stock_quantity,
  is_active = true;

