-- Locais de retirada geridos pelo admin (em vez dos 2 fixos no código) +
-- voucher/QR Code de retirada por pedido, validado dentro do /afiliado.
-- Idempotente — pode rodar mais de uma vez.

-- =====================================================================
-- pickup_locations — locais de retirada (nome, endereço, CEP)
-- =====================================================================
create table if not exists pickup_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  address text,
  city text not null default 'Orlando',
  state text not null default 'FL',
  zip_code text,
  notes text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_pickup_locations_active on pickup_locations(is_active, display_order);

drop trigger if exists trg_pickup_locations_updated_at on pickup_locations;
create trigger trg_pickup_locations_updated_at
  before update on pickup_locations
  for each row execute function set_updated_at();

alter table pickup_locations enable row level security;
drop policy if exists "Allow all" on pickup_locations;
create policy "Allow all" on pickup_locations for all using (true) with check (true);

-- Migra os 2 locais que hoje são fixos no código do checkout — o admin pode
-- editar endereço/CEP/desativar depois pela nova tela. Nomes precisam bater
-- exatamente com os que o checkout já manda, pra pedidos antigos casarem.
insert into pickup_locations (name, display_order) values
  ('International Drive, Orlando', 1),
  ('Orlando International Premium Outlets', 2)
on conflict (name) do nothing;

-- =====================================================================
-- orders — vínculo com o local (novo, estruturado) + voucher de retirada
-- =====================================================================
alter table orders add column if not exists pickup_location_id uuid references pickup_locations(id);
alter table orders add column if not exists pickup_token text default replace(gen_random_uuid()::text, '-', '');
alter table orders add column if not exists delivered_by uuid references affiliate_users(id);

-- Pedidos existentes não têm token — gera um pra cada um não ficar sem
-- (não tem voucher pra mostrar de qualquer forma, mas mantém a coluna
-- consistente caso precise localizar um pedido antigo manualmente).
update orders set pickup_token = replace(gen_random_uuid()::text, '-', '')
where pickup_token is null;

alter table orders alter column pickup_token set not null;
create unique index if not exists idx_orders_pickup_token on orders(pickup_token);
create index if not exists idx_orders_pickup_location_id on orders(pickup_location_id);
