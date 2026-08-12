-- Rede de Heads — camada opcional entre iShop e Afiliado. Um afiliado pode ser
-- direto da iShop (head_id nulo) ou pertencer à carteira de um Head, que ganha uma
-- fatia recorrente (25% por padrão) da margem que seria da iShop em toda venda
-- desse afiliado, enquanto o vínculo durar. Vínculo expira sozinho depois de 90
-- dias sem venda (ver app/api/cron/release-inactive-heads).
-- Idempotente — pode rodar mais de uma vez.

-- =====================================================================
-- heads — donos de rede (podem também vender diretamente, via own_affiliate_id)
-- =====================================================================
create table if not exists heads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  own_affiliate_id bigint references affiliates(id),
  commission_percentage numeric(5,2) not null default 25.00, -- % da margem da iShop
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_heads_own_affiliate on heads(own_affiliate_id);

drop trigger if exists trg_heads_updated_at on heads;
create trigger trg_heads_updated_at
  before update on heads
  for each row execute function set_updated_at();

-- =====================================================================
-- head_users — login separado do Head (não é afiliado, não é gestão)
-- =====================================================================
create table if not exists head_users (
  id uuid primary key default gen_random_uuid(),
  head_id uuid not null references heads(id) on delete cascade,
  username text not null unique,
  email text,
  password_hash text not null,
  full_name text not null,
  role text not null default 'owner',
  is_active boolean not null default true,
  last_login timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_head_users_head_id on head_users(head_id);

drop trigger if exists trg_head_users_updated_at on head_users;
create trigger trg_head_users_updated_at
  before update on head_users
  for each row execute function set_updated_at();

-- =====================================================================
-- affiliates — vínculo com o Head (carteira) + rastro de última venda
-- =====================================================================
alter table affiliates add column if not exists head_id uuid references heads(id);
alter table affiliates add column if not exists head_joined_at timestamptz;
alter table affiliates add column if not exists last_sale_at timestamptz;

create index if not exists idx_affiliates_head_id on affiliates(head_id);

-- =====================================================================
-- head_wallet_events — histórico de entrada/saída de afiliado na carteira de
-- um Head (pra avisar no painel do Head quando alguém sai por inatividade)
-- =====================================================================
create table if not exists head_wallet_events (
  id uuid primary key default gen_random_uuid(),
  head_id uuid not null references heads(id) on delete cascade,
  affiliate_id bigint not null references affiliates(id) on delete cascade,
  event text not null, -- assigned | released_inactive | released_manual
  created_at timestamptz default now()
);

create index if not exists idx_head_wallet_events_head_id on head_wallet_events(head_id, created_at);

-- =====================================================================
-- orders — retrato de quanto o Head ganhou nessa venda específica (não muda
-- retroativamente se o afiliado sair da carteira depois)
-- =====================================================================
alter table orders add column if not exists head_id uuid references heads(id);
alter table orders add column if not exists head_commission_amount numeric(10,2) not null default 0;

create index if not exists idx_orders_head_id on orders(head_id);

-- =====================================================================
-- head_withdrawals — solicitações de saque do Head (mesmo padrão de
-- affiliate_withdrawals)
-- =====================================================================
create table if not exists head_withdrawals (
  id uuid primary key default gen_random_uuid(),
  head_id uuid not null references heads(id) on delete cascade,
  amount numeric(10,2) not null,
  pix_key text not null,
  status text not null default 'pending', -- pending | processing | paid | cancelled
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  paid_at timestamptz
);

create index if not exists idx_head_withdrawals_head_id on head_withdrawals(head_id);
create index if not exists idx_head_withdrawals_status on head_withdrawals(status);

-- =====================================================================
-- RLS — mesmo padrão permissivo já usado no resto do banco (proteção real é
-- feita no Next.js, não no Postgres, porque o app usa a ANON KEY)
-- =====================================================================
do $$
declare
  t text;
begin
  foreach t in array array['heads', 'head_users', 'head_wallet_events', 'head_withdrawals']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "Allow all" on %I', t);
    execute format('create policy "Allow all" on %I for all using (true) with check (true)', t);
  end loop;
end $$;
