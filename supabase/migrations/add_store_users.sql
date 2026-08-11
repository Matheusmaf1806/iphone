-- Login separado do balcão de retirada (/loja) — não é afiliado nem gestão, é só
-- quem confirma a entrega física do aparelho no local. Depende da migration
-- add_pickup_locations_and_qr_voucher.sql já ter rodado (usa a tabela pickup_locations).
-- Idempotente — pode rodar mais de uma vez.

create table if not exists store_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  full_name text not null,
  email text,
  phone text,
  -- Nulo = acesso a retiradas de qualquer local (ex: alguém que cobre vários pontos).
  -- Preenchido = só pode confirmar retiradas daquele local específico.
  pickup_location_id uuid references pickup_locations(id),
  is_active boolean not null default true,
  last_login timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_store_users_pickup_location on store_users(pickup_location_id);

drop trigger if exists trg_store_users_updated_at on store_users;
create trigger trg_store_users_updated_at
  before update on store_users
  for each row execute function set_updated_at();

alter table store_users enable row level security;
drop policy if exists "Allow all" on store_users;
create policy "Allow all" on store_users for all using (true) with check (true);

-- Se add_pickup_locations_and_qr_voucher.sql já rodou antes desta decisão de
-- design (retirada dentro do /afiliado), orders.delivered_by aponta pra
-- affiliate_users — corrige pra apontar pro /loja novo, que é quem confirma
-- de verdade.
alter table orders drop constraint if exists orders_delivered_by_fkey;
alter table orders add column if not exists delivered_by uuid;
alter table orders add constraint orders_delivered_by_fkey foreign key (delivered_by) references store_users(id);
