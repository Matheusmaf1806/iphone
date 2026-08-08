-- Migration: sistema de variações de produto (SKU) — Versão / Cor / Armazenamento etc.
-- Rode este arquivo inteiro no SQL Editor do Supabase.
--
-- Contexto: até aqui, `products` era uma linha única (1 preço, 1 custo, 1 estoque). Esta migration
-- transforma `product_variants` em SKUs de verdade (com custo e margem próprios), cria um catálogo
-- reutilizável de valores de atributo (`product_variant_values` — ex: cores com swatch_hex) e liga
-- pedidos/movimentações de estoque à variante comprada.
--
-- Produtos existentes não são afetados: `has_variants` nasce `false` em todos, então continuam
-- funcionando exatamente como hoje (preço/custo/estoque na própria linha de `products`).

-- =====================================================================
-- 1. products.has_variants
-- =====================================================================

alter table products
  add column if not exists has_variants boolean not null default false;

-- Produtos com has_variants=true não têm custo próprio (o custo vive em cada SKU em
-- product_variants) — o campo é preenchido automaticamente a partir do SKU mais barato
-- assim que a primeira variante é salva, mas até lá precisa aceitar null.
alter table products
  alter column cost_price drop not null;

-- =====================================================================
-- 2. product_variants — custo, margem e SKU padrão por variante
-- =====================================================================

alter table product_variants
  add column if not exists cost_price numeric(10,2),
  add column if not exists supplier_margin_percentage numeric(5,2),
  add column if not exists is_default boolean not null default false;

-- =====================================================================
-- 3. product_variant_values — catálogo global de valores por tipo de atributo
-- (ex: tipo "Cor" -> valores "Titânio Azul" com swatch_hex, "Titânio Natural", etc.)
-- É esta tabela que permite cadastrar uma cor nova uma vez e reusar em qualquer produto.
-- =====================================================================

create table if not exists product_variant_values (
  id uuid primary key default gen_random_uuid(),
  variant_type_id uuid not null references product_variant_types(id) on delete cascade,
  value text not null,
  swatch_hex text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  unique (variant_type_id, value)
);

create index if not exists idx_product_variant_values_type_id on product_variant_values(variant_type_id, display_order);

-- =====================================================================
-- 4. order_items — registrar qual variante foi comprada
-- =====================================================================

alter table order_items
  add column if not exists product_variant_id uuid references product_variants(id),
  add column if not exists variant_attributes jsonb,
  add column if not exists variant_sku text;

create index if not exists idx_order_items_product_variant_id on order_items(product_variant_id);

-- =====================================================================
-- 5. stock_movements — vincular movimentação a uma variante específica
-- =====================================================================

alter table stock_movements
  add column if not exists product_variant_id uuid references product_variants(id);

create index if not exists idx_stock_movements_product_variant_id on stock_movements(product_variant_id, created_at desc);

-- =====================================================================
-- 6. RLS — mesma policy permissiva "Allow all" já usada em todo o projeto
-- (ver nota de segurança em supabase/schema.sql: a proteção real é feita no Next.js)
-- =====================================================================

alter table product_variant_values enable row level security;
drop policy if exists "Allow all" on product_variant_values;
create policy "Allow all" on product_variant_values for all using (true) with check (true);

-- =====================================================================
-- 7. Seed — tipos de atributo e valores comuns de iPhone
-- (idempotente: só insere o que ainda não existe)
-- =====================================================================

insert into product_variant_types (name, is_active, display_order) values
  ('Versão', true, 1),
  ('Cor', true, 2),
  ('Armazenamento', true, 3)
on conflict (name) do nothing;

insert into product_variant_values (variant_type_id, value, display_order)
select t.id, v.value, v.display_order
from product_variant_types t
join (values
  ('Versão', 'Standard', 1),
  ('Versão', 'Plus', 2),
  ('Versão', 'Pro', 3),
  ('Versão', 'Pro Max', 4),
  ('Versão', 'Mini', 5)
) as v(type_name, value, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

insert into product_variant_values (variant_type_id, value, swatch_hex, display_order)
select t.id, v.value, v.swatch_hex, v.display_order
from product_variant_types t
join (values
  ('Cor', 'Titânio Natural', '#8A8A7E', 1),
  ('Cor', 'Titânio Azul', '#3B5473', 2),
  ('Cor', 'Titânio Branco', '#F0EFE7', 3),
  ('Cor', 'Titânio Preto', '#3B3B3D', 4),
  ('Cor', 'Titânio Deserto', '#8C7A63', 5),
  ('Cor', 'Preto', '#1D1D1F', 6),
  ('Cor', 'Branco', '#F5F5F0', 7),
  ('Cor', 'Rosa', '#F4CFDA', 8),
  ('Cor', 'Azul', '#4F6D89', 9),
  ('Cor', 'Verde', '#5C6E58', 10),
  ('Cor', 'Amarelo', '#F0E0A8', 11),
  ('Cor', 'Roxo', '#7D7191', 12)
) as v(type_name, value, swatch_hex, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

insert into product_variant_values (variant_type_id, value, display_order)
select t.id, v.value, v.display_order
from product_variant_types t
join (values
  ('Armazenamento', '64GB', 1),
  ('Armazenamento', '128GB', 2),
  ('Armazenamento', '256GB', 3),
  ('Armazenamento', '512GB', 4),
  ('Armazenamento', '1TB', 5),
  ('Armazenamento', '2TB', 6)
) as v(type_name, value, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;
