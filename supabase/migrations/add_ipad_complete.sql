-- Arquivo ÚNICO e autossuficiente pra linha de iPad — cria vocabulário,
-- produtos e as 160 variantes já com custo real (USD), imposto (7%),
-- margem (10%) e estoque (10 un.) da planilha do fornecedor, ativos
-- desde a criação. Substitui add_mac_ipad_catalog.sql + add_mac_ipad_catalog_v2.sql
-- + add_ipad_real_pricing_v3.sql pra linha de iPad — não precisa rodar os
-- três em ordem, só este aqui. (MacBook continua nos arquivos antigos, sem
-- preço ainda.)
--
-- iPad Air e iPad Pro são 1 produto cada (não 2 por tamanho): "Tamanho da
-- Tela" (11"/13") é só mais um eixo de variação, igual Cor/Armazenamento.
--
-- Idempotente: pode rodar mais de uma vez sem duplicar nem perder dado.
--
-- Rode o arquivo inteiro de uma vez no SQL Editor do Supabase.

-- Remove produtos de uma versão antiga deste catálogo que separava iPad Air
-- e iPad Pro em 2 produtos por tamanho (11"/13") — a versão atual usa 1
-- produto só com "Tamanho da Tela" como variação. Se não existirem, no-op.
delete from products
where slug in ('ipad-air-11-m4', 'ipad-air-13-m4', 'ipad-pro-11-m5', 'ipad-pro-13-m5');

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
  ('Memória', true, 11),
  ('Acabamento da Tela', true, 12),
  ('Tamanho da Tela', true, 13)
on conflict (name) do nothing;

insert into product_variant_values (variant_type_id, value, display_order)
select t.id, v.value, v.display_order
from product_variant_types t
join (values
  ('Memória', '12GB', 1),
  ('Memória', '16GB', 2),
  ('Conectividade', 'Wi-Fi', 3),
  ('Conectividade', 'Wi-Fi + Cellular', 4),
  ('Acabamento da Tela', 'Padrão', 1),
  ('Acabamento da Tela', 'Nano-textura', 2),
  ('Tamanho da Tela', '11"', 1),
  ('Tamanho da Tela', '13"', 2)
) as v(type_name, value, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

insert into product_variant_values (variant_type_id, value, swatch_hex, display_order)
select t.id, v.value, v.swatch_hex, v.display_order
from product_variant_types t
join (values
  ('Cor', 'Preto Espacial', '#3B3B3D', 30)
) as v(type_name, value, swatch_hex, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

-- =====================================================================
-- iPad (A16)
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('ipad-11', 'iPad (A16)', 'iPad com chip A16.', 'iPad com chip A16 (5-core CPU, 4-core GPU), 6GB de memória unificada, tela Liquid Retina de 11". Compatível com Apple Pencil (USB-C) e Apple Pencil (1ª geração).', 'ipad', 'ipad', true, 'USD', 10, true)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description,
  is_active = true;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, cost_price, import_tax_percentage, supplier_margin_percentage, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', v.cost_price, 7, 10, 10, true
from products p
join (values
  ('IPAD11-PRATEADO-128GB-WIFI', '{"Cor":"Prateado","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, true, 449::numeric),
  ('IPAD11-PRATEADO-128GB-WIFICELLULAR', '{"Cor":"Prateado","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 599::numeric),
  ('IPAD11-PRATEADO-256GB-WIFI', '{"Cor":"Prateado","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 549::numeric),
  ('IPAD11-PRATEADO-256GB-WIFICELLULAR', '{"Cor":"Prateado","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 699::numeric),
  ('IPAD11-PRATEADO-512GB-WIFI', '{"Cor":"Prateado","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 749::numeric),
  ('IPAD11-PRATEADO-512GB-WIFICELLULAR', '{"Cor":"Prateado","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 899::numeric),
  ('IPAD11-AZULCU-128GB-WIFI', '{"Cor":"Azul-céu","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false, 449::numeric),
  ('IPAD11-AZULCU-128GB-WIFICELLULAR', '{"Cor":"Azul-céu","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 599::numeric),
  ('IPAD11-AZULCU-256GB-WIFI', '{"Cor":"Azul-céu","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 549::numeric),
  ('IPAD11-AZULCU-256GB-WIFICELLULAR', '{"Cor":"Azul-céu","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 699::numeric),
  ('IPAD11-AZULCU-512GB-WIFI', '{"Cor":"Azul-céu","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 749::numeric),
  ('IPAD11-AZULCU-512GB-WIFICELLULAR', '{"Cor":"Azul-céu","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 899::numeric),
  ('IPAD11-AMARELO-128GB-WIFI', '{"Cor":"Amarelo","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false, 449::numeric),
  ('IPAD11-AMARELO-128GB-WIFICELLULAR', '{"Cor":"Amarelo","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 599::numeric),
  ('IPAD11-AMARELO-256GB-WIFI', '{"Cor":"Amarelo","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 549::numeric),
  ('IPAD11-AMARELO-256GB-WIFICELLULAR', '{"Cor":"Amarelo","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 699::numeric),
  ('IPAD11-AMARELO-512GB-WIFI', '{"Cor":"Amarelo","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 749::numeric),
  ('IPAD11-AMARELO-512GB-WIFICELLULAR', '{"Cor":"Amarelo","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 899::numeric),
  ('IPAD11-ROSA-128GB-WIFI', '{"Cor":"Rosa","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false, 449::numeric),
  ('IPAD11-ROSA-128GB-WIFICELLULAR', '{"Cor":"Rosa","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 599::numeric),
  ('IPAD11-ROSA-256GB-WIFI', '{"Cor":"Rosa","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 549::numeric),
  ('IPAD11-ROSA-256GB-WIFICELLULAR', '{"Cor":"Rosa","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 699::numeric),
  ('IPAD11-ROSA-512GB-WIFI', '{"Cor":"Rosa","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 749::numeric),
  ('IPAD11-ROSA-512GB-WIFICELLULAR', '{"Cor":"Rosa","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 899::numeric)
) as v(sku, attributes, is_default, cost_price) on true
where p.slug = 'ipad-11'
on conflict (product_id, sku) do update set
  cost_price = excluded.cost_price,
  cost_currency = excluded.cost_currency,
  import_tax_percentage = excluded.import_tax_percentage,
  supplier_margin_percentage = excluded.supplier_margin_percentage,
  stock_quantity = excluded.stock_quantity,
  is_active = true;

-- =====================================================================
-- iPad mini (A17 Pro)
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('ipad-mini-7', 'iPad mini (A17 Pro)', 'iPad mini com chip A17 Pro.', 'iPad mini com chip A17 Pro, 8GB de memória unificada, tela Liquid Retina de 8.3". Compatível com Apple Pencil Pro e Apple Pencil (USB-C).', 'ipad', 'ipad', true, 'USD', 10, true)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description,
  is_active = true;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, cost_price, import_tax_percentage, supplier_margin_percentage, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', v.cost_price, 7, 10, 10, true
from products p
join (values
  ('IPADMINI7-GRAFITE-128GB-WIFI', '{"Cor":"Grafite","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false, 599::numeric),
  ('IPADMINI7-GRAFITE-128GB-WIFICELLULAR', '{"Cor":"Grafite","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 749::numeric),
  ('IPADMINI7-GRAFITE-256GB-WIFI', '{"Cor":"Grafite","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 699::numeric),
  ('IPADMINI7-GRAFITE-256GB-WIFICELLULAR', '{"Cor":"Grafite","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 849::numeric),
  ('IPADMINI7-GRAFITE-512GB-WIFI', '{"Cor":"Grafite","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 899::numeric),
  ('IPADMINI7-GRAFITE-512GB-WIFICELLULAR', '{"Cor":"Grafite","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1049::numeric),
  ('IPADMINI7-ESTELAR-128GB-WIFI', '{"Cor":"Estelar","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, true, 599::numeric),
  ('IPADMINI7-ESTELAR-128GB-WIFICELLULAR', '{"Cor":"Estelar","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 749::numeric),
  ('IPADMINI7-ESTELAR-256GB-WIFI', '{"Cor":"Estelar","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 699::numeric),
  ('IPADMINI7-ESTELAR-256GB-WIFICELLULAR', '{"Cor":"Estelar","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 849::numeric),
  ('IPADMINI7-ESTELAR-512GB-WIFI', '{"Cor":"Estelar","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 899::numeric),
  ('IPADMINI7-ESTELAR-512GB-WIFICELLULAR', '{"Cor":"Estelar","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1049::numeric),
  ('IPADMINI7-AZULCU-128GB-WIFI', '{"Cor":"Azul-céu","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false, 599::numeric),
  ('IPADMINI7-AZULCU-128GB-WIFICELLULAR', '{"Cor":"Azul-céu","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 749::numeric),
  ('IPADMINI7-AZULCU-256GB-WIFI', '{"Cor":"Azul-céu","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 699::numeric),
  ('IPADMINI7-AZULCU-256GB-WIFICELLULAR', '{"Cor":"Azul-céu","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 849::numeric),
  ('IPADMINI7-AZULCU-512GB-WIFI', '{"Cor":"Azul-céu","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 899::numeric),
  ('IPADMINI7-AZULCU-512GB-WIFICELLULAR', '{"Cor":"Azul-céu","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1049::numeric),
  ('IPADMINI7-ROXO-128GB-WIFI', '{"Cor":"Roxo","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false, 599::numeric),
  ('IPADMINI7-ROXO-128GB-WIFICELLULAR', '{"Cor":"Roxo","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 749::numeric),
  ('IPADMINI7-ROXO-256GB-WIFI', '{"Cor":"Roxo","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 699::numeric),
  ('IPADMINI7-ROXO-256GB-WIFICELLULAR', '{"Cor":"Roxo","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 849::numeric),
  ('IPADMINI7-ROXO-512GB-WIFI', '{"Cor":"Roxo","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 899::numeric),
  ('IPADMINI7-ROXO-512GB-WIFICELLULAR', '{"Cor":"Roxo","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1049::numeric)
) as v(sku, attributes, is_default, cost_price) on true
where p.slug = 'ipad-mini-7'
on conflict (product_id, sku) do update set
  cost_price = excluded.cost_price,
  cost_currency = excluded.cost_currency,
  import_tax_percentage = excluded.import_tax_percentage,
  supplier_margin_percentage = excluded.supplier_margin_percentage,
  stock_quantity = excluded.stock_quantity,
  is_active = true;

-- =====================================================================
-- iPad Air (M4)
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('ipad-air-m4', 'iPad Air (M4)', 'iPad Air com chip M4, disponível em 11" e 13".', 'iPad Air com chip M4 (8-core CPU, 9-core GPU), 12GB de memória unificada, Wi-Fi 7. Disponível nos tamanhos de 11" e 13". Compatível com Apple Pencil Pro e Apple Pencil (USB-C).', 'ipad', 'ipad', true, 'USD', 10, true)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description,
  is_active = true;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, cost_price, import_tax_percentage, supplier_margin_percentage, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', v.cost_price, 7, 10, 10, true
from products p
join (values
  ('IPADAIRM4-GRAFITE-11-128GB-WIFI', '{"Cor":"Grafite","Tamanho da Tela":"11\"","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, true, 749::numeric),
  ('IPADAIRM4-GRAFITE-11-128GB-WIFICELLULAR', '{"Cor":"Grafite","Tamanho da Tela":"11\"","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 899::numeric),
  ('IPADAIRM4-GRAFITE-11-256GB-WIFI', '{"Cor":"Grafite","Tamanho da Tela":"11\"","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 849::numeric),
  ('IPADAIRM4-GRAFITE-11-256GB-WIFICELLULAR', '{"Cor":"Grafite","Tamanho da Tela":"11\"","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 999::numeric),
  ('IPADAIRM4-GRAFITE-11-512GB-WIFI', '{"Cor":"Grafite","Tamanho da Tela":"11\"","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1049::numeric),
  ('IPADAIRM4-GRAFITE-11-512GB-WIFICELLULAR', '{"Cor":"Grafite","Tamanho da Tela":"11\"","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1199::numeric),
  ('IPADAIRM4-GRAFITE-11-1TB-WIFI', '{"Cor":"Grafite","Tamanho da Tela":"11\"","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false, 1349::numeric),
  ('IPADAIRM4-GRAFITE-11-1TB-WIFICELLULAR', '{"Cor":"Grafite","Tamanho da Tela":"11\"","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1499::numeric),
  ('IPADAIRM4-AZUL-11-128GB-WIFI', '{"Cor":"Azul","Tamanho da Tela":"11\"","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false, 749::numeric),
  ('IPADAIRM4-AZUL-11-128GB-WIFICELLULAR', '{"Cor":"Azul","Tamanho da Tela":"11\"","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 899::numeric),
  ('IPADAIRM4-AZUL-11-256GB-WIFI', '{"Cor":"Azul","Tamanho da Tela":"11\"","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 849::numeric),
  ('IPADAIRM4-AZUL-11-256GB-WIFICELLULAR', '{"Cor":"Azul","Tamanho da Tela":"11\"","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 999::numeric),
  ('IPADAIRM4-AZUL-11-512GB-WIFI', '{"Cor":"Azul","Tamanho da Tela":"11\"","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1049::numeric),
  ('IPADAIRM4-AZUL-11-512GB-WIFICELLULAR', '{"Cor":"Azul","Tamanho da Tela":"11\"","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1199::numeric),
  ('IPADAIRM4-AZUL-11-1TB-WIFI', '{"Cor":"Azul","Tamanho da Tela":"11\"","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false, 1349::numeric),
  ('IPADAIRM4-AZUL-11-1TB-WIFICELLULAR', '{"Cor":"Azul","Tamanho da Tela":"11\"","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1499::numeric),
  ('IPADAIRM4-ROXO-11-128GB-WIFI', '{"Cor":"Roxo","Tamanho da Tela":"11\"","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false, 749::numeric),
  ('IPADAIRM4-ROXO-11-128GB-WIFICELLULAR', '{"Cor":"Roxo","Tamanho da Tela":"11\"","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 899::numeric),
  ('IPADAIRM4-ROXO-11-256GB-WIFI', '{"Cor":"Roxo","Tamanho da Tela":"11\"","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 849::numeric),
  ('IPADAIRM4-ROXO-11-256GB-WIFICELLULAR', '{"Cor":"Roxo","Tamanho da Tela":"11\"","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 999::numeric),
  ('IPADAIRM4-ROXO-11-512GB-WIFI', '{"Cor":"Roxo","Tamanho da Tela":"11\"","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1049::numeric),
  ('IPADAIRM4-ROXO-11-512GB-WIFICELLULAR', '{"Cor":"Roxo","Tamanho da Tela":"11\"","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1199::numeric),
  ('IPADAIRM4-ROXO-11-1TB-WIFI', '{"Cor":"Roxo","Tamanho da Tela":"11\"","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false, 1349::numeric),
  ('IPADAIRM4-ROXO-11-1TB-WIFICELLULAR', '{"Cor":"Roxo","Tamanho da Tela":"11\"","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1499::numeric),
  ('IPADAIRM4-ESTELAR-11-128GB-WIFI', '{"Cor":"Estelar","Tamanho da Tela":"11\"","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false, 749::numeric),
  ('IPADAIRM4-ESTELAR-11-128GB-WIFICELLULAR', '{"Cor":"Estelar","Tamanho da Tela":"11\"","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 899::numeric),
  ('IPADAIRM4-ESTELAR-11-256GB-WIFI', '{"Cor":"Estelar","Tamanho da Tela":"11\"","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 849::numeric),
  ('IPADAIRM4-ESTELAR-11-256GB-WIFICELLULAR', '{"Cor":"Estelar","Tamanho da Tela":"11\"","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 999::numeric),
  ('IPADAIRM4-ESTELAR-11-512GB-WIFI', '{"Cor":"Estelar","Tamanho da Tela":"11\"","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1049::numeric),
  ('IPADAIRM4-ESTELAR-11-512GB-WIFICELLULAR', '{"Cor":"Estelar","Tamanho da Tela":"11\"","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1199::numeric),
  ('IPADAIRM4-ESTELAR-11-1TB-WIFI', '{"Cor":"Estelar","Tamanho da Tela":"11\"","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false, 1349::numeric),
  ('IPADAIRM4-ESTELAR-11-1TB-WIFICELLULAR', '{"Cor":"Estelar","Tamanho da Tela":"11\"","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1499::numeric),
  ('IPADAIRM4-GRAFITE-13-128GB-WIFI', '{"Cor":"Grafite","Tamanho da Tela":"13\"","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false, 949::numeric),
  ('IPADAIRM4-GRAFITE-13-128GB-WIFICELLULAR', '{"Cor":"Grafite","Tamanho da Tela":"13\"","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1099::numeric),
  ('IPADAIRM4-GRAFITE-13-256GB-WIFI', '{"Cor":"Grafite","Tamanho da Tela":"13\"","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1049::numeric),
  ('IPADAIRM4-GRAFITE-13-256GB-WIFICELLULAR', '{"Cor":"Grafite","Tamanho da Tela":"13\"","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1199::numeric),
  ('IPADAIRM4-GRAFITE-13-512GB-WIFI', '{"Cor":"Grafite","Tamanho da Tela":"13\"","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1249::numeric),
  ('IPADAIRM4-GRAFITE-13-512GB-WIFICELLULAR', '{"Cor":"Grafite","Tamanho da Tela":"13\"","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1399::numeric),
  ('IPADAIRM4-GRAFITE-13-1TB-WIFI', '{"Cor":"Grafite","Tamanho da Tela":"13\"","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false, 1549::numeric),
  ('IPADAIRM4-GRAFITE-13-1TB-WIFICELLULAR', '{"Cor":"Grafite","Tamanho da Tela":"13\"","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1699::numeric),
  ('IPADAIRM4-AZUL-13-128GB-WIFI', '{"Cor":"Azul","Tamanho da Tela":"13\"","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false, 949::numeric),
  ('IPADAIRM4-AZUL-13-128GB-WIFICELLULAR', '{"Cor":"Azul","Tamanho da Tela":"13\"","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1099::numeric),
  ('IPADAIRM4-AZUL-13-256GB-WIFI', '{"Cor":"Azul","Tamanho da Tela":"13\"","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1049::numeric),
  ('IPADAIRM4-AZUL-13-256GB-WIFICELLULAR', '{"Cor":"Azul","Tamanho da Tela":"13\"","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1199::numeric),
  ('IPADAIRM4-AZUL-13-512GB-WIFI', '{"Cor":"Azul","Tamanho da Tela":"13\"","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1249::numeric),
  ('IPADAIRM4-AZUL-13-512GB-WIFICELLULAR', '{"Cor":"Azul","Tamanho da Tela":"13\"","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1399::numeric),
  ('IPADAIRM4-AZUL-13-1TB-WIFI', '{"Cor":"Azul","Tamanho da Tela":"13\"","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false, 1549::numeric),
  ('IPADAIRM4-AZUL-13-1TB-WIFICELLULAR', '{"Cor":"Azul","Tamanho da Tela":"13\"","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1699::numeric),
  ('IPADAIRM4-ROXO-13-128GB-WIFI', '{"Cor":"Roxo","Tamanho da Tela":"13\"","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false, 949::numeric),
  ('IPADAIRM4-ROXO-13-128GB-WIFICELLULAR', '{"Cor":"Roxo","Tamanho da Tela":"13\"","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1099::numeric),
  ('IPADAIRM4-ROXO-13-256GB-WIFI', '{"Cor":"Roxo","Tamanho da Tela":"13\"","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1049::numeric),
  ('IPADAIRM4-ROXO-13-256GB-WIFICELLULAR', '{"Cor":"Roxo","Tamanho da Tela":"13\"","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1199::numeric),
  ('IPADAIRM4-ROXO-13-512GB-WIFI', '{"Cor":"Roxo","Tamanho da Tela":"13\"","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1249::numeric),
  ('IPADAIRM4-ROXO-13-512GB-WIFICELLULAR', '{"Cor":"Roxo","Tamanho da Tela":"13\"","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1399::numeric),
  ('IPADAIRM4-ROXO-13-1TB-WIFI', '{"Cor":"Roxo","Tamanho da Tela":"13\"","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false, 1549::numeric),
  ('IPADAIRM4-ROXO-13-1TB-WIFICELLULAR', '{"Cor":"Roxo","Tamanho da Tela":"13\"","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1699::numeric),
  ('IPADAIRM4-ESTELAR-13-128GB-WIFI', '{"Cor":"Estelar","Tamanho da Tela":"13\"","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false, 949::numeric),
  ('IPADAIRM4-ESTELAR-13-128GB-WIFICELLULAR', '{"Cor":"Estelar","Tamanho da Tela":"13\"","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1099::numeric),
  ('IPADAIRM4-ESTELAR-13-256GB-WIFI', '{"Cor":"Estelar","Tamanho da Tela":"13\"","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1049::numeric),
  ('IPADAIRM4-ESTELAR-13-256GB-WIFICELLULAR', '{"Cor":"Estelar","Tamanho da Tela":"13\"","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1199::numeric),
  ('IPADAIRM4-ESTELAR-13-512GB-WIFI', '{"Cor":"Estelar","Tamanho da Tela":"13\"","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1249::numeric),
  ('IPADAIRM4-ESTELAR-13-512GB-WIFICELLULAR', '{"Cor":"Estelar","Tamanho da Tela":"13\"","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1399::numeric),
  ('IPADAIRM4-ESTELAR-13-1TB-WIFI', '{"Cor":"Estelar","Tamanho da Tela":"13\"","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false, 1549::numeric),
  ('IPADAIRM4-ESTELAR-13-1TB-WIFICELLULAR', '{"Cor":"Estelar","Tamanho da Tela":"13\"","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1699::numeric)
) as v(sku, attributes, is_default, cost_price) on true
where p.slug = 'ipad-air-m4'
on conflict (product_id, sku) do update set
  cost_price = excluded.cost_price,
  cost_currency = excluded.cost_currency,
  import_tax_percentage = excluded.import_tax_percentage,
  supplier_margin_percentage = excluded.supplier_margin_percentage,
  stock_quantity = excluded.stock_quantity,
  is_active = true;

-- =====================================================================
-- iPad Pro (M5)
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('ipad-pro-m5', 'iPad Pro (M5)', 'iPad Pro com chip M5, disponível em 11" e 13".', 'iPad Pro com chip M5, tela Tandem OLED Ultra Retina XDR, Wi-Fi 7. Disponível nos tamanhos de 11" e 13". 12GB de memória unificada nas versões de 256GB/512GB (CPU de 9 núcleos); 16GB nas versões de 1TB/2TB (CPU de 10 núcleos). Acabamento nano-textura (fosco) disponível só nas versões de 1TB/2TB. Compatível com Apple Pencil Pro e Apple Pencil (USB-C).', 'ipad', 'ipad', true, 'USD', 10, true)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description,
  is_active = true;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, cost_price, import_tax_percentage, supplier_margin_percentage, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', v.cost_price, 7, 10, 10, true
from products p
join (values
  ('IPADPROM5-PRATEADO-11-12GB-256GB-WIFI-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"11\"","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, true, 1199::numeric),
  ('IPADPROM5-PRATEADO-11-12GB-256GB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"11\"","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 1399::numeric),
  ('IPADPROM5-PRATEADO-11-12GB-512GB-WIFI-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"11\"","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 1399::numeric),
  ('IPADPROM5-PRATEADO-11-12GB-512GB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"11\"","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 1599::numeric),
  ('IPADPROM5-PRATEADO-11-16GB-1TB-WIFI-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"11\"","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 1799::numeric),
  ('IPADPROM5-PRATEADO-11-16GB-1TB-WIFI-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"11\"","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 1899::numeric),
  ('IPADPROM5-PRATEADO-11-16GB-1TB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"11\"","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 1999::numeric),
  ('IPADPROM5-PRATEADO-11-16GB-1TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"11\"","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2099::numeric),
  ('IPADPROM5-PRATEADO-11-16GB-2TB-WIFI-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"11\"","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 2299::numeric),
  ('IPADPROM5-PRATEADO-11-16GB-2TB-WIFI-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"11\"","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2399::numeric),
  ('IPADPROM5-PRATEADO-11-16GB-2TB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"11\"","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 2499::numeric),
  ('IPADPROM5-PRATEADO-11-16GB-2TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"11\"","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2599::numeric),
  ('IPADPROM5-PRETOESPACIAL-11-12GB-256GB-WIFI-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"11\"","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 1199::numeric),
  ('IPADPROM5-PRETOESPACIAL-11-12GB-256GB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"11\"","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 1399::numeric),
  ('IPADPROM5-PRETOESPACIAL-11-12GB-512GB-WIFI-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"11\"","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 1399::numeric),
  ('IPADPROM5-PRETOESPACIAL-11-12GB-512GB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"11\"","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 1599::numeric),
  ('IPADPROM5-PRETOESPACIAL-11-16GB-1TB-WIFI-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"11\"","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 1799::numeric),
  ('IPADPROM5-PRETOESPACIAL-11-16GB-1TB-WIFI-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"11\"","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 1899::numeric),
  ('IPADPROM5-PRETOESPACIAL-11-16GB-1TB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"11\"","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 1999::numeric),
  ('IPADPROM5-PRETOESPACIAL-11-16GB-1TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"11\"","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2099::numeric),
  ('IPADPROM5-PRETOESPACIAL-11-16GB-2TB-WIFI-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"11\"","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 2299::numeric),
  ('IPADPROM5-PRETOESPACIAL-11-16GB-2TB-WIFI-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"11\"","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2399::numeric),
  ('IPADPROM5-PRETOESPACIAL-11-16GB-2TB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"11\"","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 2499::numeric),
  ('IPADPROM5-PRETOESPACIAL-11-16GB-2TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"11\"","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2599::numeric),
  ('IPADPROM5-PRATEADO-13-12GB-256GB-WIFI-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 1499::numeric),
  ('IPADPROM5-PRATEADO-13-12GB-256GB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 1699::numeric),
  ('IPADPROM5-PRATEADO-13-12GB-512GB-WIFI-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 1699::numeric),
  ('IPADPROM5-PRATEADO-13-12GB-512GB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 1899::numeric),
  ('IPADPROM5-PRATEADO-13-16GB-1TB-WIFI-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 2099::numeric),
  ('IPADPROM5-PRATEADO-13-16GB-1TB-WIFI-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2199::numeric),
  ('IPADPROM5-PRATEADO-13-16GB-1TB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 2299::numeric),
  ('IPADPROM5-PRATEADO-13-16GB-1TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2399::numeric),
  ('IPADPROM5-PRATEADO-13-16GB-2TB-WIFI-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 2599::numeric),
  ('IPADPROM5-PRATEADO-13-16GB-2TB-WIFI-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2699::numeric),
  ('IPADPROM5-PRATEADO-13-16GB-2TB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 2799::numeric),
  ('IPADPROM5-PRATEADO-13-16GB-2TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Prateado","Tamanho da Tela":"13\"","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2899::numeric),
  ('IPADPROM5-PRETOESPACIAL-13-12GB-256GB-WIFI-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"13\"","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 1499::numeric),
  ('IPADPROM5-PRETOESPACIAL-13-12GB-256GB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"13\"","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 1699::numeric),
  ('IPADPROM5-PRETOESPACIAL-13-12GB-512GB-WIFI-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"13\"","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 1699::numeric),
  ('IPADPROM5-PRETOESPACIAL-13-12GB-512GB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"13\"","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 1899::numeric),
  ('IPADPROM5-PRETOESPACIAL-13-16GB-1TB-WIFI-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"13\"","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 2099::numeric),
  ('IPADPROM5-PRETOESPACIAL-13-16GB-1TB-WIFI-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"13\"","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2199::numeric),
  ('IPADPROM5-PRETOESPACIAL-13-16GB-1TB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"13\"","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 2299::numeric),
  ('IPADPROM5-PRETOESPACIAL-13-16GB-1TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"13\"","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2399::numeric),
  ('IPADPROM5-PRETOESPACIAL-13-16GB-2TB-WIFI-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"13\"","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 2599::numeric),
  ('IPADPROM5-PRETOESPACIAL-13-16GB-2TB-WIFI-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"13\"","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2699::numeric),
  ('IPADPROM5-PRETOESPACIAL-13-16GB-2TB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Tamanho da Tela":"13\"","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 2799::numeric),
  ('IPADPROM5-PRETOESPACIAL-13-16GB-2TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Preto Espacial","Tamanho da Tela":"13\"","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2899::numeric)
) as v(sku, attributes, is_default, cost_price) on true
where p.slug = 'ipad-pro-m5'
on conflict (product_id, sku) do update set
  cost_price = excluded.cost_price,
  cost_currency = excluded.cost_currency,
  import_tax_percentage = excluded.import_tax_percentage,
  supplier_margin_percentage = excluded.supplier_margin_percentage,
  stock_quantity = excluded.stock_quantity,
  is_active = true;

