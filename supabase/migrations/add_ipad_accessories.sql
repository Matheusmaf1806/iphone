-- Acessórios de iPad — Apple Pencil (USB-C), Apple Pencil Pro, Magic
-- Keyboard Folio, Magic Keyboard for iPad Air, Magic Keyboard for iPad Pro.
-- Preços reais em USD (Apple US, verificado ago/2026), imposto 7%,
-- margem 10%, estoque 10 un. Idempotente — pode rodar mais de
-- uma vez sem duplicar. Também cria os vínculos de "acessório compatível"
-- (product_accessories) com os iPads já cadastrados via add_ipad_complete.sql
-- — rode aquele arquivo ANTES deste, senão os vínculos não encontram os
-- iPads e essa parte é ignorada silenciosamente (os produtos de acessório
-- são criados normalmente de qualquer forma).
--
-- Rode o arquivo inteiro de uma vez no SQL Editor do Supabase.

create unique index if not exists ux_product_variants_product_sku
  on product_variants(product_id, sku);

-- Tabela de vínculo "acessório compatível" (ver migrations/add_product_accessories.sql
-- — repetida aqui, idempotente, pra este arquivo não depender de rodar aquele antes).
create table if not exists product_accessories (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  accessory_product_id uuid not null references products(id) on delete cascade,
  is_default_checked boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz default now(),
  unique (product_id, accessory_product_id),
  check (product_id != accessory_product_id)
);

create index if not exists idx_product_accessories_product_id on product_accessories(product_id, display_order);

alter table product_accessories enable row level security;
drop policy if exists "Allow all" on product_accessories;
create policy "Allow all" on product_accessories for all using (true) with check (true);

-- =====================================================================
-- Apple Pencil (USB-C)
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, sku, has_variants, cost_currency, cost_price, import_tax_percentage, supplier_margin_percentage, stock_type, stock_quantity, is_active)
values ('apple-pencil-usb-c', 'Apple Pencil (USB-C)', 'Apple Pencil com conector USB-C.', 'Apple Pencil (USB-C) — precisão de escrita e desenho, imã para fixar e carregar no lado do iPad, conector USB-C pra recarregar ou parear. Compatível com iPad (A16 e 10ª geração), iPad Air (M2, M3, M4) e iPad mini (A17 Pro).', 'acessorios', 'acessorios', 'APPLEPENCIL-USBC', false, 'USD', 79::numeric, 7, 10, 'limited', 10, true)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description,
  sku = excluded.sku,
  cost_currency = excluded.cost_currency,
  cost_price = excluded.cost_price,
  import_tax_percentage = excluded.import_tax_percentage,
  supplier_margin_percentage = excluded.supplier_margin_percentage,
  stock_type = excluded.stock_type,
  stock_quantity = excluded.stock_quantity,
  is_active = true;

-- =====================================================================
-- Apple Pencil Pro
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, sku, has_variants, cost_currency, cost_price, import_tax_percentage, supplier_margin_percentage, stock_type, stock_quantity, is_active)
values ('apple-pencil-pro', 'Apple Pencil Pro', 'Apple Pencil Pro com sensor de pressão e Squeeze.', 'Apple Pencil Pro — sensor de força (barrel roll), Squeeze pra abrir ferramentas rápidas, feedback tátil, Find My e carregamento/pareamento magnético sem fio. Compatível com iPad Pro (M4, M5), iPad Air (M2, M3, M4) e iPad mini (A17 Pro).', 'acessorios', 'acessorios', 'APPLEPENCIL-PRO', false, 'USD', 129::numeric, 7, 10, 'limited', 10, true)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description,
  sku = excluded.sku,
  cost_currency = excluded.cost_currency,
  cost_price = excluded.cost_price,
  import_tax_percentage = excluded.import_tax_percentage,
  supplier_margin_percentage = excluded.supplier_margin_percentage,
  stock_type = excluded.stock_type,
  stock_quantity = excluded.stock_quantity,
  is_active = true;

-- =====================================================================
-- Magic Keyboard Folio for iPad
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, sku, has_variants, cost_currency, cost_price, import_tax_percentage, supplier_margin_percentage, stock_type, stock_quantity, is_active)
values ('magic-keyboard-folio-ipad', 'Magic Keyboard Folio for iPad', 'Teclado e capa destacáveis para iPad (A16).', 'Magic Keyboard Folio — design em duas peças destacáveis (teclado + capa traseira com suporte ajustável), trackpad embutido, fileira de 14 teclas de função, conector inteligente (sem pareamento ou recarga separada). Compatível com iPad (A16 e 10ª geração).', 'acessorios', 'acessorios', 'MAGICKBFOLIO-IPAD', false, 'USD', 249::numeric, 7, 10, 'limited', 10, true)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description,
  sku = excluded.sku,
  cost_currency = excluded.cost_currency,
  cost_price = excluded.cost_price,
  import_tax_percentage = excluded.import_tax_percentage,
  supplier_margin_percentage = excluded.supplier_margin_percentage,
  stock_type = excluded.stock_type,
  stock_quantity = excluded.stock_quantity,
  is_active = true;

-- =====================================================================
-- Magic Keyboard for iPad Air
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('magic-keyboard-ipad-air', 'Magic Keyboard for iPad Air', 'Teclado com trackpad para iPad Air, em 11" e 13".', 'Magic Keyboard for iPad Air — trackpad de vidro, fileira de 14 teclas de função, conector USB-C com passagem de carga, design em balanço flutuante com ângulo de visão ajustável. Compatível com iPad Air (M2, M3, M4) nos tamanhos de 11" e 13".', 'acessorios', 'acessorios', true, 'USD', 10, true)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description,
  is_active = true;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, cost_price, import_tax_percentage, supplier_margin_percentage, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', v.cost_price, 7, 10, 10, true
from products p
join (values
  ('MAGICKEYBOARDIPADAIR-11-PRETO', '{"Tamanho da Tela":"11\"","Cor":"Preto"}'::jsonb, true, 269::numeric),
  ('MAGICKEYBOARDIPADAIR-11-BRANCO', '{"Tamanho da Tela":"11\"","Cor":"Branco"}'::jsonb, false, 269::numeric),
  ('MAGICKEYBOARDIPADAIR-13-PRETO', '{"Tamanho da Tela":"13\"","Cor":"Preto"}'::jsonb, false, 319::numeric),
  ('MAGICKEYBOARDIPADAIR-13-BRANCO', '{"Tamanho da Tela":"13\"","Cor":"Branco"}'::jsonb, false, 319::numeric)
) as v(sku, attributes, is_default, cost_price) on true
where p.slug = 'magic-keyboard-ipad-air'
on conflict (product_id, sku) do update set
  cost_price = excluded.cost_price,
  cost_currency = excluded.cost_currency,
  import_tax_percentage = excluded.import_tax_percentage,
  supplier_margin_percentage = excluded.supplier_margin_percentage,
  stock_quantity = excluded.stock_quantity,
  is_active = true;

-- =====================================================================
-- Magic Keyboard for iPad Pro
-- =====================================================================
insert into products (slug, name, short_description, description, category, category_slug, has_variants, cost_currency, supplier_margin_percentage, is_active)
values ('magic-keyboard-ipad-pro', 'Magic Keyboard for iPad Pro', 'Teclado com trackpad para iPad Pro, em 11" e 13".', 'Magic Keyboard for iPad Pro — trackpad de vidro com feedback tátil, fileira de 14 teclas de função, conector USB-C com passagem de carga, design fino em balanço flutuante. Compatível com iPad Pro (M4, M5) nos tamanhos de 11" e 13".', 'acessorios', 'acessorios', true, 'USD', 10, true)
on conflict (slug) do update set
  short_description = excluded.short_description,
  description = excluded.description,
  is_active = true;

insert into product_variants (product_id, sku, attributes, is_default, cost_currency, cost_price, import_tax_percentage, supplier_margin_percentage, stock_quantity, is_active)
select p.id, v.sku, v.attributes, v.is_default, 'USD', v.cost_price, 7, 10, 10, true
from products p
join (values
  ('MAGICKEYBOARDIPADPRO-11-PRETO', '{"Tamanho da Tela":"11\"","Cor":"Preto"}'::jsonb, true, 299::numeric),
  ('MAGICKEYBOARDIPADPRO-11-BRANCO', '{"Tamanho da Tela":"11\"","Cor":"Branco"}'::jsonb, false, 299::numeric),
  ('MAGICKEYBOARDIPADPRO-13-PRETO', '{"Tamanho da Tela":"13\"","Cor":"Preto"}'::jsonb, false, 349::numeric),
  ('MAGICKEYBOARDIPADPRO-13-BRANCO', '{"Tamanho da Tela":"13\"","Cor":"Branco"}'::jsonb, false, 349::numeric)
) as v(sku, attributes, is_default, cost_price) on true
where p.slug = 'magic-keyboard-ipad-pro'
on conflict (product_id, sku) do update set
  cost_price = excluded.cost_price,
  cost_currency = excluded.cost_currency,
  import_tax_percentage = excluded.import_tax_percentage,
  supplier_margin_percentage = excluded.supplier_margin_percentage,
  stock_quantity = excluded.stock_quantity,
  is_active = true;

-- =====================================================================
-- Vínculos "acessório compatível" com os iPads (product_accessories)
-- =====================================================================
insert into product_accessories (product_id, accessory_product_id, is_default_checked, display_order)
select host.id, acc.id, false, v.display_order
from (values
  ('ipad-11', 'apple-pencil-usb-c', 1),
  ('ipad-11', 'magic-keyboard-folio-ipad', 2),
  ('ipad-mini-7', 'apple-pencil-usb-c', 1),
  ('ipad-mini-7', 'apple-pencil-pro', 2),
  ('ipad-air-m4', 'apple-pencil-pro', 1),
  ('ipad-air-m4', 'apple-pencil-usb-c', 2),
  ('ipad-air-m4', 'magic-keyboard-ipad-air', 3),
  ('ipad-pro-m5', 'apple-pencil-pro', 1),
  ('ipad-pro-m5', 'apple-pencil-usb-c', 2),
  ('ipad-pro-m5', 'magic-keyboard-ipad-pro', 3)
) as v(host_slug, accessory_slug, display_order)
join products host on host.slug = v.host_slug
join products acc on acc.slug = v.accessory_slug
on conflict (product_id, accessory_product_id) do nothing;
