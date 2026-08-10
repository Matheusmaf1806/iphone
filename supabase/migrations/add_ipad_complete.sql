-- Arquivo ÚNICO e autossuficiente pra linha de iPad — cria vocabulário,
-- produtos e as 160 variantes já com custo real (USD), imposto (7%),
-- margem (10%) e estoque (10 un.) da planilha do fornecedor, ativos
-- desde a criação. Substitui add_mac_ipad_catalog.sql + add_mac_ipad_catalog_v2.sql
-- + add_ipad_real_pricing_v3.sql pra linha de iPad — não precisa rodar os
-- três em ordem, só este aqui. (MacBook continua nos arquivos antigos, sem
-- preço ainda.)
--
-- Idempotente: pode rodar mais de uma vez sem duplicar nem perder dado.
--
-- Rode o arquivo inteiro de uma vez no SQL Editor do Supabase.

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
  ('Acabamento da Tela', true, 12)
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
  ('Acabamento da Tela', 'Nano-textura', 2)
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
-- iPad Air 11" (M4)
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('ipad-air-11-m4', 'iPad Air 11" (M4)', 'iPad Air de 11" com chip M4.', 'iPad Air 11" com chip M4 (8-core CPU, 9-core GPU), 12GB de memória unificada, Wi-Fi 7. Compatível com Apple Pencil Pro e Apple Pencil (USB-C).', 'ipad', 'ipad', true, 'USD', 10, true)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description,
  is_active = true;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, cost_price, import_tax_percentage, supplier_margin_percentage, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', v.cost_price, 7, 10, 10, true
from products p
join (values
  ('IPADAIR11M4-GRAFITE-128GB-WIFI', '{"Cor":"Grafite","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, true, 749::numeric),
  ('IPADAIR11M4-GRAFITE-128GB-WIFICELLULAR', '{"Cor":"Grafite","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 899::numeric),
  ('IPADAIR11M4-GRAFITE-256GB-WIFI', '{"Cor":"Grafite","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 849::numeric),
  ('IPADAIR11M4-GRAFITE-256GB-WIFICELLULAR', '{"Cor":"Grafite","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 999::numeric),
  ('IPADAIR11M4-GRAFITE-512GB-WIFI', '{"Cor":"Grafite","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1049::numeric),
  ('IPADAIR11M4-GRAFITE-512GB-WIFICELLULAR', '{"Cor":"Grafite","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1199::numeric),
  ('IPADAIR11M4-GRAFITE-1TB-WIFI', '{"Cor":"Grafite","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false, 1349::numeric),
  ('IPADAIR11M4-GRAFITE-1TB-WIFICELLULAR', '{"Cor":"Grafite","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1499::numeric),
  ('IPADAIR11M4-AZUL-128GB-WIFI', '{"Cor":"Azul","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false, 749::numeric),
  ('IPADAIR11M4-AZUL-128GB-WIFICELLULAR', '{"Cor":"Azul","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 899::numeric),
  ('IPADAIR11M4-AZUL-256GB-WIFI', '{"Cor":"Azul","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 849::numeric),
  ('IPADAIR11M4-AZUL-256GB-WIFICELLULAR', '{"Cor":"Azul","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 999::numeric),
  ('IPADAIR11M4-AZUL-512GB-WIFI', '{"Cor":"Azul","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1049::numeric),
  ('IPADAIR11M4-AZUL-512GB-WIFICELLULAR', '{"Cor":"Azul","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1199::numeric),
  ('IPADAIR11M4-AZUL-1TB-WIFI', '{"Cor":"Azul","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false, 1349::numeric),
  ('IPADAIR11M4-AZUL-1TB-WIFICELLULAR', '{"Cor":"Azul","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1499::numeric),
  ('IPADAIR11M4-ROXO-128GB-WIFI', '{"Cor":"Roxo","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false, 749::numeric),
  ('IPADAIR11M4-ROXO-128GB-WIFICELLULAR', '{"Cor":"Roxo","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 899::numeric),
  ('IPADAIR11M4-ROXO-256GB-WIFI', '{"Cor":"Roxo","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 849::numeric),
  ('IPADAIR11M4-ROXO-256GB-WIFICELLULAR', '{"Cor":"Roxo","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 999::numeric),
  ('IPADAIR11M4-ROXO-512GB-WIFI', '{"Cor":"Roxo","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1049::numeric),
  ('IPADAIR11M4-ROXO-512GB-WIFICELLULAR', '{"Cor":"Roxo","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1199::numeric),
  ('IPADAIR11M4-ROXO-1TB-WIFI', '{"Cor":"Roxo","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false, 1349::numeric),
  ('IPADAIR11M4-ROXO-1TB-WIFICELLULAR', '{"Cor":"Roxo","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1499::numeric),
  ('IPADAIR11M4-ESTELAR-128GB-WIFI', '{"Cor":"Estelar","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false, 749::numeric),
  ('IPADAIR11M4-ESTELAR-128GB-WIFICELLULAR', '{"Cor":"Estelar","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 899::numeric),
  ('IPADAIR11M4-ESTELAR-256GB-WIFI', '{"Cor":"Estelar","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 849::numeric),
  ('IPADAIR11M4-ESTELAR-256GB-WIFICELLULAR', '{"Cor":"Estelar","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 999::numeric),
  ('IPADAIR11M4-ESTELAR-512GB-WIFI', '{"Cor":"Estelar","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1049::numeric),
  ('IPADAIR11M4-ESTELAR-512GB-WIFICELLULAR', '{"Cor":"Estelar","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1199::numeric),
  ('IPADAIR11M4-ESTELAR-1TB-WIFI', '{"Cor":"Estelar","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false, 1349::numeric),
  ('IPADAIR11M4-ESTELAR-1TB-WIFICELLULAR', '{"Cor":"Estelar","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1499::numeric)
) as v(sku, attributes, is_default, cost_price) on true
where p.slug = 'ipad-air-11-m4'
on conflict (product_id, sku) do update set
  cost_price = excluded.cost_price,
  cost_currency = excluded.cost_currency,
  import_tax_percentage = excluded.import_tax_percentage,
  supplier_margin_percentage = excluded.supplier_margin_percentage,
  stock_quantity = excluded.stock_quantity,
  is_active = true;

-- =====================================================================
-- iPad Air 13" (M4)
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('ipad-air-13-m4', 'iPad Air 13" (M4)', 'iPad Air de 13" com chip M4.', 'iPad Air 13" com chip M4 (8-core CPU, 9-core GPU), 12GB de memória unificada, Wi-Fi 7. Compatível com Apple Pencil Pro e Apple Pencil (USB-C).', 'ipad', 'ipad', true, 'USD', 10, true)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description,
  is_active = true;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, cost_price, import_tax_percentage, supplier_margin_percentage, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', v.cost_price, 7, 10, 10, true
from products p
join (values
  ('IPADAIR13M4-GRAFITE-128GB-WIFI', '{"Cor":"Grafite","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, true, 949::numeric),
  ('IPADAIR13M4-GRAFITE-128GB-WIFICELLULAR', '{"Cor":"Grafite","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1099::numeric),
  ('IPADAIR13M4-GRAFITE-256GB-WIFI', '{"Cor":"Grafite","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1049::numeric),
  ('IPADAIR13M4-GRAFITE-256GB-WIFICELLULAR', '{"Cor":"Grafite","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1199::numeric),
  ('IPADAIR13M4-GRAFITE-512GB-WIFI', '{"Cor":"Grafite","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1249::numeric),
  ('IPADAIR13M4-GRAFITE-512GB-WIFICELLULAR', '{"Cor":"Grafite","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1399::numeric),
  ('IPADAIR13M4-GRAFITE-1TB-WIFI', '{"Cor":"Grafite","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false, 1549::numeric),
  ('IPADAIR13M4-GRAFITE-1TB-WIFICELLULAR', '{"Cor":"Grafite","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1699::numeric),
  ('IPADAIR13M4-AZUL-128GB-WIFI', '{"Cor":"Azul","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false, 949::numeric),
  ('IPADAIR13M4-AZUL-128GB-WIFICELLULAR', '{"Cor":"Azul","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1099::numeric),
  ('IPADAIR13M4-AZUL-256GB-WIFI', '{"Cor":"Azul","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1049::numeric),
  ('IPADAIR13M4-AZUL-256GB-WIFICELLULAR', '{"Cor":"Azul","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1199::numeric),
  ('IPADAIR13M4-AZUL-512GB-WIFI', '{"Cor":"Azul","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1249::numeric),
  ('IPADAIR13M4-AZUL-512GB-WIFICELLULAR', '{"Cor":"Azul","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1399::numeric),
  ('IPADAIR13M4-AZUL-1TB-WIFI', '{"Cor":"Azul","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false, 1549::numeric),
  ('IPADAIR13M4-AZUL-1TB-WIFICELLULAR', '{"Cor":"Azul","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1699::numeric),
  ('IPADAIR13M4-ROXO-128GB-WIFI', '{"Cor":"Roxo","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false, 949::numeric),
  ('IPADAIR13M4-ROXO-128GB-WIFICELLULAR', '{"Cor":"Roxo","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1099::numeric),
  ('IPADAIR13M4-ROXO-256GB-WIFI', '{"Cor":"Roxo","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1049::numeric),
  ('IPADAIR13M4-ROXO-256GB-WIFICELLULAR', '{"Cor":"Roxo","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1199::numeric),
  ('IPADAIR13M4-ROXO-512GB-WIFI', '{"Cor":"Roxo","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1249::numeric),
  ('IPADAIR13M4-ROXO-512GB-WIFICELLULAR', '{"Cor":"Roxo","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1399::numeric),
  ('IPADAIR13M4-ROXO-1TB-WIFI', '{"Cor":"Roxo","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false, 1549::numeric),
  ('IPADAIR13M4-ROXO-1TB-WIFICELLULAR', '{"Cor":"Roxo","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1699::numeric),
  ('IPADAIR13M4-ESTELAR-128GB-WIFI', '{"Cor":"Estelar","Armazenamento":"128GB","Conectividade":"Wi-Fi"}'::jsonb, false, 949::numeric),
  ('IPADAIR13M4-ESTELAR-128GB-WIFICELLULAR', '{"Cor":"Estelar","Armazenamento":"128GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1099::numeric),
  ('IPADAIR13M4-ESTELAR-256GB-WIFI', '{"Cor":"Estelar","Armazenamento":"256GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1049::numeric),
  ('IPADAIR13M4-ESTELAR-256GB-WIFICELLULAR', '{"Cor":"Estelar","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1199::numeric),
  ('IPADAIR13M4-ESTELAR-512GB-WIFI', '{"Cor":"Estelar","Armazenamento":"512GB","Conectividade":"Wi-Fi"}'::jsonb, false, 1249::numeric),
  ('IPADAIR13M4-ESTELAR-512GB-WIFICELLULAR', '{"Cor":"Estelar","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1399::numeric),
  ('IPADAIR13M4-ESTELAR-1TB-WIFI', '{"Cor":"Estelar","Armazenamento":"1TB","Conectividade":"Wi-Fi"}'::jsonb, false, 1549::numeric),
  ('IPADAIR13M4-ESTELAR-1TB-WIFICELLULAR', '{"Cor":"Estelar","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular"}'::jsonb, false, 1699::numeric)
) as v(sku, attributes, is_default, cost_price) on true
where p.slug = 'ipad-air-13-m4'
on conflict (product_id, sku) do update set
  cost_price = excluded.cost_price,
  cost_currency = excluded.cost_currency,
  import_tax_percentage = excluded.import_tax_percentage,
  supplier_margin_percentage = excluded.supplier_margin_percentage,
  stock_quantity = excluded.stock_quantity,
  is_active = true;

-- =====================================================================
-- iPad Pro 11" M5
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('ipad-pro-11-m5', 'iPad Pro 11" M5', 'iPad Pro de 11" com chip M5.', 'iPad Pro 11" com chip M5, tela Tandem OLED Ultra Retina XDR, Wi-Fi 7. 12GB de memória unificada nas versões de 256GB/512GB (CPU de 9 núcleos); 16GB nas versões de 1TB/2TB (CPU de 10 núcleos). Acabamento nano-textura (fosco) disponível só nas versões de 1TB/2TB. Compatível com Apple Pencil Pro e Apple Pencil (USB-C).', 'ipad', 'ipad', true, 'USD', 10, true)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description,
  is_active = true;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, cost_price, import_tax_percentage, supplier_margin_percentage, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', v.cost_price, 7, 10, 10, true
from products p
join (values
  ('IPADPRO11M5-PRATEADO-12GB-256GB-WIFI-PADRO', '{"Cor":"Prateado","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, true, 1199::numeric),
  ('IPADPRO11M5-PRATEADO-12GB-256GB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 1399::numeric),
  ('IPADPRO11M5-PRATEADO-12GB-512GB-WIFI-PADRO', '{"Cor":"Prateado","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 1399::numeric),
  ('IPADPRO11M5-PRATEADO-12GB-512GB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 1599::numeric),
  ('IPADPRO11M5-PRATEADO-16GB-1TB-WIFI-PADRO', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 1799::numeric),
  ('IPADPRO11M5-PRATEADO-16GB-1TB-WIFI-NANOTEXTURA', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 1899::numeric),
  ('IPADPRO11M5-PRATEADO-16GB-1TB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 1999::numeric),
  ('IPADPRO11M5-PRATEADO-16GB-1TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2099::numeric),
  ('IPADPRO11M5-PRATEADO-16GB-2TB-WIFI-PADRO', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 2299::numeric),
  ('IPADPRO11M5-PRATEADO-16GB-2TB-WIFI-NANOTEXTURA', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2399::numeric),
  ('IPADPRO11M5-PRATEADO-16GB-2TB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 2499::numeric),
  ('IPADPRO11M5-PRATEADO-16GB-2TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2599::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-12GB-256GB-WIFI-PADRO', '{"Cor":"Preto Espacial","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 1199::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-12GB-256GB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 1399::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-12GB-512GB-WIFI-PADRO', '{"Cor":"Preto Espacial","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 1399::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-12GB-512GB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 1599::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-1TB-WIFI-PADRO', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 1799::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-1TB-WIFI-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 1899::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-1TB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 1999::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-1TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2099::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-2TB-WIFI-PADRO', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 2299::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-2TB-WIFI-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2399::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-2TB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 2499::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-2TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2599::numeric)
) as v(sku, attributes, is_default, cost_price) on true
where p.slug = 'ipad-pro-11-m5'
on conflict (product_id, sku) do update set
  cost_price = excluded.cost_price,
  cost_currency = excluded.cost_currency,
  import_tax_percentage = excluded.import_tax_percentage,
  supplier_margin_percentage = excluded.supplier_margin_percentage,
  stock_quantity = excluded.stock_quantity,
  is_active = true;

-- =====================================================================
-- iPad Pro 13" M5
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('ipad-pro-13-m5', 'iPad Pro 13" M5', 'iPad Pro de 13" com chip M5.', 'iPad Pro 13" com chip M5, tela Tandem OLED Ultra Retina XDR, Wi-Fi 7. 12GB de memória unificada nas versões de 256GB/512GB (CPU de 9 núcleos); 16GB nas versões de 1TB/2TB (CPU de 10 núcleos). Acabamento nano-textura (fosco) disponível só nas versões de 1TB/2TB. Compatível com Apple Pencil Pro e Apple Pencil (USB-C).', 'ipad', 'ipad', true, 'USD', 10, true)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description,
  is_active = true;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, cost_price, import_tax_percentage, supplier_margin_percentage, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', v.cost_price, 7, 10, 10, true
from products p
join (values
  ('IPADPRO13M5-PRATEADO-12GB-256GB-WIFI-PADRO', '{"Cor":"Prateado","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, true, 1499::numeric),
  ('IPADPRO13M5-PRATEADO-12GB-256GB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 1699::numeric),
  ('IPADPRO13M5-PRATEADO-12GB-512GB-WIFI-PADRO', '{"Cor":"Prateado","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 1699::numeric),
  ('IPADPRO13M5-PRATEADO-12GB-512GB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 1899::numeric),
  ('IPADPRO13M5-PRATEADO-16GB-1TB-WIFI-PADRO', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 2099::numeric),
  ('IPADPRO13M5-PRATEADO-16GB-1TB-WIFI-NANOTEXTURA', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2199::numeric),
  ('IPADPRO13M5-PRATEADO-16GB-1TB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 2299::numeric),
  ('IPADPRO13M5-PRATEADO-16GB-1TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2399::numeric),
  ('IPADPRO13M5-PRATEADO-16GB-2TB-WIFI-PADRO', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 2599::numeric),
  ('IPADPRO13M5-PRATEADO-16GB-2TB-WIFI-NANOTEXTURA', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2699::numeric),
  ('IPADPRO13M5-PRATEADO-16GB-2TB-WIFICELLULAR-PADRO', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 2799::numeric),
  ('IPADPRO13M5-PRATEADO-16GB-2TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Prateado","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2899::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-12GB-256GB-WIFI-PADRO', '{"Cor":"Preto Espacial","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 1499::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-12GB-256GB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Memória":"12GB","Armazenamento":"256GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 1699::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-12GB-512GB-WIFI-PADRO', '{"Cor":"Preto Espacial","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 1699::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-12GB-512GB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Memória":"12GB","Armazenamento":"512GB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 1899::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-1TB-WIFI-PADRO', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 2099::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-1TB-WIFI-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2199::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-1TB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 2299::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-1TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"1TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2399::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-2TB-WIFI-PADRO', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Padrão"}'::jsonb, false, 2599::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-2TB-WIFI-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2699::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-2TB-WIFICELLULAR-PADRO', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Padrão"}'::jsonb, false, 2799::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-2TB-WIFICELLULAR-NANOTEXTURA', '{"Cor":"Preto Espacial","Memória":"16GB","Armazenamento":"2TB","Conectividade":"Wi-Fi + Cellular","Acabamento da Tela":"Nano-textura"}'::jsonb, false, 2899::numeric)
) as v(sku, attributes, is_default, cost_price) on true
where p.slug = 'ipad-pro-13-m5'
on conflict (product_id, sku) do update set
  cost_price = excluded.cost_price,
  cost_currency = excluded.cost_currency,
  import_tax_percentage = excluded.import_tax_percentage,
  supplier_margin_percentage = excluded.supplier_margin_percentage,
  stock_quantity = excluded.stock_quantity,
  is_active = true;

