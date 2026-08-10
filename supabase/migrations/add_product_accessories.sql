-- Acessórios compatíveis curados manualmente pelo admin (ex: Apple Pencil Pro
-- pro iPad Pro, mas não pro iPad base) — aparecem como checkbox de "adicionar
-- junto" na página do produto principal. Ver schema.sql seção 8c.

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
