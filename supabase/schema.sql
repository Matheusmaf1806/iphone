-- =====================================================================
-- SCHEMA COMPLETO — reconstruído a partir do código-fonte em produção
-- (o schema.sql original foi perdido; este arquivo foi montado lendo
-- TODAS as queries Supabase do repositório, não é o schema original).
--
-- Rode este arquivo inteiro no SQL Editor do Supabase, em um projeto
-- novo/zerado. Depois disso, rode também (nesta ordem, embora já estejam
-- embutidas aqui — não tem problema rodar de novo):
--   1. supabase/migrations/add_affiliate_id_to_user_ecommerce.sql
--   2. supabase/migrations/add_pickup_info_to_orders.sql
--   3. supabase/migrations/add_product_variant_system.sql
--   4. supabase/migrations/add_currency_and_import_tax.sql
--   5. supabase/migrations/add_variant_multi_images.sql
--   6. supabase/migrations/add_watch_airpods_variant_catalog.sql
--
-- IMPORTANTE — leia antes de rodar:
-- 1. Toda tabela tem RLS habilitado com uma policy permissiva ("allow all").
--    Isso NÃO é aleatório: é o padrão que já existia no projeto (ver
--    supabase/create_user_ecommerce.sql original) porque o app usa a
--    ANON KEY do Supabase em quase todas as rotas server-side (não usa
--    Supabase Auth). Sem essa policy, TUDO no site quebra (RLS bloqueia
--    por padrão). Ou seja: a segurança real do sistema é 100% feita no
--    código Next.js (sessões via cookie), não no banco. Ciente disso.
-- 2. `affiliates.id` é INTEGER (não UUID) — confirmado pela migration
--    original de user_ecommerce, que corrige explicitamente um erro
--    anterior de tê-lo criado como uuid. Todas as outras tabelas de
--    "entidade" (products, orders, admin_users etc.) usam UUID. Essa
--    inconsistência já existia no projeto original — mantive por ser
--    o que o código realmente espera hoje.
-- 3. Ao final tem um usuário admin padrão (admin / admin123) e um
--    afiliado "default" pré-cadastrados — troque a senha do admin no
--    primeiro login.
-- =====================================================================

create extension if not exists pgcrypto;

-- =====================================================================
-- FUNÇÕES AUXILIARES (triggers reutilizados por várias tabelas)
-- =====================================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create sequence if not exists order_number_seq start 1;

create or replace function set_order_number()
returns trigger as $$
begin
  if new.order_number is null then
    new.order_number := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('order_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create or replace function increment_coupon_usage(coupon_id uuid)
returns void as $$
begin
  update coupons set usage_count = usage_count + 1 where id = coupon_id;
end;
$$ language plpgsql;

-- =====================================================================
-- 1. admin_users — login do painel /gestao (equipe interna)
-- =====================================================================

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text not null unique,
  password_hash text not null,           -- bcrypt (bcryptjs, cost 10)
  full_name text not null,
  role text not null default 'admin',    -- super_admin | admin | editor | viewer
  is_active boolean not null default true,
  last_login timestamptz,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 2. affiliates — lojas white-label (integer PK, ver nota no topo)
-- =====================================================================

create table if not exists affiliates (
  id bigserial primary key,
  slug text not null unique,
  name text not null,
  domain text,
  subdomain text,
  custom_domain text,
  logo_url text,
  favicon_url text,
  primary_color text default '#0043f7',
  background_color text default '#ebf0f6',
  button_color text default '#0043f7',
  button_text_color text default '#ffffff',
  button_hover text default '#0036c6',
  instagram_handle text,
  whatsapp_number text,
  commission_rate numeric(5,2) not null default 10.00, -- percentual (0-100), não fração
  cnpj text,
  tax text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_affiliates_domain on affiliates(domain);
create index if not exists idx_affiliates_subdomain on affiliates(subdomain);
create index if not exists idx_affiliates_custom_domain on affiliates(custom_domain);
create index if not exists idx_affiliates_is_active on affiliates(is_active);

drop trigger if exists trg_affiliates_updated_at on affiliates;
create trigger trg_affiliates_updated_at
  before update on affiliates
  for each row execute function set_updated_at();

-- =====================================================================
-- 3. affiliate_users — usuários (login) de cada loja de afiliado
-- =====================================================================

create table if not exists affiliate_users (
  id uuid primary key default gen_random_uuid(),
  affiliate_id bigint not null references affiliates(id) on delete cascade,
  username text not null unique,
  email text not null unique,
  password_hash text not null,
  full_name text not null,
  cpf text,
  phone text,
  pix_key text,
  role text not null default 'viewer', -- owner | admin | editor | viewer
  is_active boolean not null default true,
  email_verified boolean not null default false,
  last_login timestamptz,
  profile_photo_url text,
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_state text,
  address_zip text,
  created_at timestamptz not null default now()
);

create index if not exists idx_affiliate_users_affiliate_id on affiliate_users(affiliate_id);

-- =====================================================================
-- 4. user_ecommerce — clientes finais (compradores da loja)
-- (mantém a estrutura do supabase/create_user_ecommerce.sql original,
-- + affiliate_id, já adicionado antes pela migration correspondente)
-- =====================================================================

create table if not exists user_ecommerce (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  email varchar(255) not null unique,
  password_hash varchar(255) not null,
  phone varchar(20),
  cpf varchar(14),
  address_street varchar(255),
  address_number varchar(20),
  address_complement varchar(100),
  address_neighborhood varchar(100),
  address_city varchar(100),
  address_state varchar(2),
  address_zipcode varchar(10),
  affiliate_id bigint references affiliates(id) on delete set null,
  is_active boolean default true,
  last_login timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_user_ecommerce_email on user_ecommerce(email);
create index if not exists idx_user_ecommerce_affiliate_id on user_ecommerce(affiliate_id);

drop trigger if exists trg_user_ecommerce_updated_at on user_ecommerce;
create trigger trg_user_ecommerce_updated_at
  before update on user_ecommerce
  for each row execute function set_updated_at();

-- =====================================================================
-- 5. products — catálogo (UUID PK)
-- =====================================================================

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  short_description text,
  meta_title text,
  meta_description text,
  category text,
  category_slug text,
  image_url text,
  price numeric(10,2),
  cost_price numeric(10,2), -- pode ser null quando has_variants=true (custo vive em cada SKU)
  cost_currency text not null default 'BRL' check (cost_currency in ('BRL', 'USD')),
  import_tax_percentage numeric(5,2), -- null = usa platform_config.default_import_tax_percentage
  supplier_margin_percentage numeric(5,2) not null default 10,
  compare_at_price numeric(10,2),
  sku text,
  barcode text,
  stock_type text default 'unlimited',   -- unlimited | limited
  stock_quantity integer default 0,      -- -1 = ilimitado
  stock_status text,
  low_stock_threshold integer default 10,
  manage_stock boolean default true,
  allow_backorders boolean default false,
  installments integer default 21,
  installment_value numeric(10,2),
  weight numeric,
  height numeric,
  width numeric,
  depth numeric,
  rating numeric(3,2) default 0,
  reviews_count integer default 0,
  tags jsonb default '[]'::jsonb,
  featured_order integer,
  is_active boolean default true,
  is_featured boolean default false,
  has_variants boolean not null default false, -- true = preço/custo/estoque vêm de product_variants
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_products_category_slug on products(category_slug);
create index if not exists idx_products_is_active on products(is_active);
create index if not exists idx_products_is_featured on products(is_featured);

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

-- =====================================================================
-- 6. product_images — galeria de imagens por produto
-- =====================================================================

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  alt_text text,
  position integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists idx_product_images_product_id on product_images(product_id, position);

-- =====================================================================
-- 7. product_details — especificações customizadas (chave/valor)
-- =====================================================================

create table if not exists product_details (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  key text not null,
  value text not null,
  display_order integer not null default 1
);

create index if not exists idx_product_details_product_id on product_details(product_id);

-- =====================================================================
-- 8. product_variant_types e product_variants
-- =====================================================================

create table if not exists product_variant_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,   -- ex: "Tamanho", "Cor"
  is_active boolean not null default true,
  display_order integer not null default 0
);

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  sku text,
  attributes jsonb not null default '{}'::jsonb, -- ex: {"Cor":"Titânio Azul","Armazenamento":"256GB"}
  cost_price numeric(10,2),                      -- custo real do SKU (cada capacidade custa diferente)
  cost_currency text not null default 'BRL' check (cost_currency in ('BRL', 'USD')),
  import_tax_percentage numeric(5,2),            -- null = usa platform_config.default_import_tax_percentage
  supplier_margin_percentage numeric(5,2),        -- opcional: se nulo, herda a margem do produto
  price_adjustment numeric(10,2) default 0,       -- legado, não usado por produtos com has_variants
  price_adjustment_type text default 'fixed',     -- fixed | percentage
  stock_quantity integer default 0,
  low_stock_threshold integer default 10,
  weight numeric,
  height numeric,
  width numeric,
  depth numeric,
  image_url text,                                 -- legado, mantido como fallback da 1ª foto
  image_urls jsonb not null default '[]'::jsonb,  -- até 4 fotos do SKU
  is_default boolean not null default false,      -- variante pré-selecionada na página do produto
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_product_variants_product_id on product_variants(product_id);

drop trigger if exists trg_product_variants_updated_at on product_variants;
create trigger trg_product_variants_updated_at
  before update on product_variants
  for each row execute function set_updated_at();

-- =====================================================================
-- 8b. product_variant_values — catálogo global reutilizável de valores por
-- tipo de atributo (ex: tipo "Cor" -> valor "Titânio Azul" com swatch_hex).
-- Cadastrar um valor aqui uma vez o torna disponível para qualquer produto.
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
-- 9. stock_movements — histórico de entradas/saídas de estoque
-- =====================================================================

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  product_variant_id uuid references product_variants(id), -- null = movimentação do produto simples
  quantity integer not null,
  movement_type text not null,  -- in | out | return | adjustment
  reason text,
  reference text,
  previous_quantity integer not null,
  new_quantity integer not null,
  created_by uuid references admin_users(id),
  created_at timestamptz default now()
);

create index if not exists idx_stock_movements_product_id on stock_movements(product_id, created_at desc);
create index if not exists idx_stock_movements_product_variant_id on stock_movements(product_variant_id, created_at desc);

-- =====================================================================
-- 11. affiliate_product_commissions — comissão customizada por produto
-- =====================================================================

create table if not exists affiliate_product_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id bigint not null references affiliates(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  custom_commission_rate numeric(5,2) not null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (affiliate_id, product_id)
);

drop trigger if exists trg_affiliate_product_commissions_updated_at on affiliate_product_commissions;
create trigger trg_affiliate_product_commissions_updated_at
  before update on affiliate_product_commissions
  for each row execute function set_updated_at();

-- =====================================================================
-- 12. orders — pedidos (com retirada em Orlando, não entrega nacional)
-- =====================================================================

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique,             -- gerado automaticamente (trigger abaixo)
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_cpf text not null,

  -- Retirada em Orlando (fluxo atual)
  pickup_travel_date date not null,
  pickup_location text not null,
  pickup_travel_notes text,
  pickup_terms_accepted boolean not null default false,

  -- Campos legados de entrega nacional (mantidos nullable por compatibilidade;
  -- não são mais preenchidos pelo checkout atual)
  shipping_cep text,
  shipping_street text,
  shipping_number text,
  shipping_complement text,
  shipping_neighborhood text,
  shipping_city text,
  shipping_state text,
  shipping_cost numeric(10,2),

  payment_method text not null,          -- pix | credit-card | paypal
  subtotal numeric(10,2) not null,
  coupon_discount numeric(10,2) not null default 0,
  pix_discount numeric(10,2) not null default 0,
  total numeric(10,2) not null,

  affiliate_id bigint references affiliates(id),
  affiliate_commission numeric(10,2) not null default 0,
  affiliate_amount numeric(10,2) not null default 0,   -- mantido em sincronia com affiliate_commission no código
  supplier_amount numeric(10,2) default 0,
  card_fee_amount numeric(10,2) default 0,

  status text not null default 'pending',         -- pending | paid | processing | shipped | delivered | cancelled
  payment_status text not null default 'pending', -- pending | paid  (mantido em sincronia com status no código)
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_affiliate_id on orders(affiliate_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_payment_status on orders(payment_status);
create index if not exists idx_orders_created_at on orders(created_at desc);

drop trigger if exists trg_orders_order_number on orders;
create trigger trg_orders_order_number
  before insert on orders
  for each row execute function set_order_number();

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- =====================================================================
-- 13. order_items — itens do pedido (com breakdown financeiro completo)
-- =====================================================================

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_variant_id uuid references product_variants(id),
  variant_attributes jsonb,      -- retrato da variante no momento da compra, ex: {"Cor":"Azul"}
  variant_sku text,
  product_name text not null default '',
  product_image_url text,
  quantity integer not null,
  cost_price numeric(10,2) not null,
  supplier_margin_percentage numeric(5,2) not null,
  affiliate_margin_percentage numeric(5,2) not null,
  card_fee_percentage numeric(5,2) not null default 0,
  net_price numeric(10,2) not null,
  pix_price numeric(10,2) not null,
  final_price numeric(10,2) not null,
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null,
  supplier_amount_unit numeric(10,2) not null,
  affiliate_amount_unit numeric(10,2) not null,
  card_fee_amount_unit numeric(10,2) not null default 0,
  exchange_rate_used numeric(10,4),        -- cotação USD->BRL usada, quando o custo era em dólar
  import_tax_percentage_used numeric(5,2), -- imposto (%) efetivamente aplicado neste item
  created_at timestamptz default now()
);

create index if not exists idx_order_items_order_id on order_items(order_id);
create index if not exists idx_order_items_product_id on order_items(product_id);

-- =====================================================================
-- 14. payments — registro de pagamento por pedido (PIX / cartão / PayPal)
-- =====================================================================

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  method text not null,           -- pix | credit-card | paypal
  amount numeric(10,2) not null,
  status text not null default 'pending', -- pending | completed
  transaction_id text,            -- chargeId (Asaas) ou order id (PayPal)
  created_at timestamptz default now()
);

create index if not exists idx_payments_order_id on payments(order_id);
create index if not exists idx_payments_transaction_id on payments(transaction_id);

-- =====================================================================
-- 15. coupons e coupon_usage
-- =====================================================================

create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_percentage numeric(5,2) not null,
  discount_source text not null,     -- admin | affiliate
  created_by_type text not null,     -- admin | affiliate
  created_by_id uuid not null,       -- referência polimórfica (admin_users.id OU affiliate_users.id) — sem FK formal
  affiliate_id bigint references affiliates(id),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  usage_limit integer,
  usage_count integer not null default 0,
  min_order_value numeric(10,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_coupons_affiliate_id on coupons(affiliate_id);
create index if not exists idx_coupons_is_active on coupons(is_active);

create table if not exists coupon_usage (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  discount_amount numeric(10,2) not null,
  created_at timestamptz default now()
);

create index if not exists idx_coupon_usage_coupon_id on coupon_usage(coupon_id);
create index if not exists idx_coupon_usage_order_id on coupon_usage(order_id);

-- =====================================================================
-- 16. affiliate_sales — tracking paralelo de vendas por afiliado
-- (usado por lib/affiliate.js; hoje o painel de vendas real usa
-- orders/order_items, mas o código desta tabela ainda existe e é
-- chamado por trackAffiliateSale — mantida por segurança)
-- =====================================================================

create table if not exists affiliate_sales (
  id uuid primary key default gen_random_uuid(),
  affiliate_id bigint not null references affiliates(id) on delete cascade,
  product_id uuid references products(id),
  order_id uuid references orders(id),
  quantity integer not null,
  product_price numeric(10,2) not null,
  total_amount numeric(10,2) not null,
  commission_rate numeric(5,2) not null,
  commission_amount numeric(10,2) not null,
  customer_email text,
  status text not null default 'pending', -- pending | paid
  tracking_id text not null unique,
  created_at timestamptz default now()
);

create index if not exists idx_affiliate_sales_affiliate_id on affiliate_sales(affiliate_id, created_at);

-- =====================================================================
-- 17. affiliate_withdrawals — solicitações de saque
-- =====================================================================

create table if not exists affiliate_withdrawals (
  id uuid primary key default gen_random_uuid(),
  affiliate_id bigint not null references affiliates(id) on delete cascade,
  amount numeric(10,2) not null,
  pix_key text not null,
  status text not null default 'pending', -- pending | processing | paid | cancelled
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  paid_at timestamptz
);

create index if not exists idx_affiliate_withdrawals_affiliate_id on affiliate_withdrawals(affiliate_id);
create index if not exists idx_affiliate_withdrawals_status on affiliate_withdrawals(status);

-- =====================================================================
-- 18. platform_config — configuração global (tabela chave/valor)
-- Nenhuma rota do código grava aqui hoje (só lê) — se quiser mudar
-- esses valores depois, é via UPDATE direto no banco ou criando uma
-- tela de configuração (ainda não existe).
-- =====================================================================

create table if not exists platform_config (
  key text primary key,
  value text not null,
  description text
);

insert into platform_config (key, value, description) values
  ('card_fee_percentage', '9.68', 'Taxa de custo do cartão de crédito (%)'),
  ('pix_discount_percentage', '5', 'Desconto oferecido para pagamento via PIX (%)'),
  ('default_affiliate_margin', '10', 'Margem padrão de afiliado quando não configurada (%)'),
  ('usd_brl_rate', '5.50', 'Cotação USD -> BRL usada para converter custos cadastrados em dólar'),
  ('default_import_tax_percentage', '0', 'Imposto de importação padrão (%) aplicado sobre o custo, quando o produto/SKU não tiver um valor próprio')
on conflict (key) do nothing;

-- =====================================================================
-- 18.1 installment_fees — taxa do cartão por número de parcelas (1 a 21x)
-- Usada onde o número de parcelas já é conhecido (ex: assistente de compra da
-- home). O resto do site continua usando o card_fee_percentage único acima.
-- =====================================================================

create table if not exists installment_fees (
  installments integer primary key check (installments between 1 and 21),
  fee_percentage numeric(5,2) not null default 0
);

insert into installment_fees (installments, fee_percentage) values
  (1, 7.60), (2, 10.39), (3, 11.60), (4, 12.84), (5, 14.10),
  (6, 15.39), (7, 17.23), (8, 18.59), (9, 19.99), (10, 21.42),
  (11, 22.88), (12, 24.38), (13, 26.70), (14, 28.29), (15, 29.92),
  (16, 31.60), (17, 33.32), (18, 35.09), (19, 36.90), (20, 38.76),
  (21, 40.68)
on conflict (installments) do nothing;

-- =====================================================================
-- SEED — dados mínimos para o site funcionar no primeiro acesso
-- =====================================================================

-- Afiliado "default": usado pelo domínio principal (sem sublojista)
insert into affiliates (slug, name, subdomain, commission_rate, is_active)
values ('default', 'Loja Principal', 'default', 10.00, true)
on conflict (slug) do nothing;

-- Admin padrão: usuário "admin", senha "admin123"
-- ATENÇÃO: troque a senha assim que fizer o primeiro login em /gestao/login
-- (hash gerado e verificado com bcryptjs cost 10, igual ao que o código usa)
insert into admin_users (username, email, password_hash, full_name, role, is_active)
values (
  'admin',
  'admin@example.com',
  '$2b$10$mKGRu8m52mKUgIiSGDCZne6XgL4.FK3g/TxaQHGD3Nui6bo0zNGlm',
  'Administrador',
  'super_admin',
  true
)
on conflict (username) do nothing;

-- Tipos de atributo de variação + valores comuns de iPhone (catálogo inicial,
-- editável depois pelo admin em /gestao)
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

-- Catálogo inicial de atributos pra Apple Watch e AirPods (mesmo padrão do iPhone)
insert into product_variant_types (name, is_active, display_order) values
  ('Tamanho da Caixa', true, 4),
  ('Material da Caixa', true, 5),
  ('Conectividade', true, 6),
  ('Tipo de Pulseira', true, 7),
  ('Cor da Pulseira', true, 8),
  ('Tamanho da Pulseira', true, 9),
  ('Modelo', true, 10)
on conflict (name) do nothing;

insert into product_variant_values (variant_type_id, value, display_order)
select t.id, v.value, v.display_order
from product_variant_types t
join (values
  ('Tamanho da Caixa', '38mm', 1),
  ('Tamanho da Caixa', '40mm', 2),
  ('Tamanho da Caixa', '41mm', 3),
  ('Tamanho da Caixa', '42mm', 4),
  ('Tamanho da Caixa', '44mm', 5),
  ('Tamanho da Caixa', '45mm', 6),
  ('Tamanho da Caixa', '46mm', 7),
  ('Tamanho da Caixa', '49mm', 8),
  ('Material da Caixa', 'Alumínio', 1),
  ('Material da Caixa', 'Aço Inoxidável', 2),
  ('Material da Caixa', 'Titânio', 3),
  ('Conectividade', 'GPS', 1),
  ('Conectividade', 'GPS + Cellular', 2),
  ('Tipo de Pulseira', 'Pulseira Esportiva', 1),
  ('Tipo de Pulseira', 'Loop Esportiva', 2),
  ('Tipo de Pulseira', 'Loop Trançada Solo', 3),
  ('Tipo de Pulseira', 'Nike Sport Band', 4),
  ('Tipo de Pulseira', 'Nike Sport Loop', 5),
  ('Tipo de Pulseira', 'Milanese Loop', 6),
  ('Tipo de Pulseira', 'Pulseira de Elo', 7),
  ('Tipo de Pulseira', 'Pulseira Hermès', 8),
  ('Tamanho da Pulseira', 'S/M', 1),
  ('Tamanho da Pulseira', 'M/L', 2),
  ('Tamanho da Pulseira', 'Único', 3),
  ('Modelo', 'AirPods 4', 1),
  ('Modelo', 'AirPods 4 (Cancelamento de Ruído)', 2),
  ('Modelo', 'AirPods Pro 2', 3),
  ('Modelo', 'AirPods Max', 4)
) as v(type_name, value, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

insert into product_variant_values (variant_type_id, value, swatch_hex, display_order)
select t.id, v.value, v.swatch_hex, v.display_order
from product_variant_types t
join (values
  ('Cor da Pulseira', 'Preto', '#1D1D1F', 1),
  ('Cor da Pulseira', 'Meia-noite', '#2B3441', 2),
  ('Cor da Pulseira', 'Estelar', '#E5DFD3', 3),
  ('Cor da Pulseira', 'Azul-tempestade', '#4A5D7A', 4),
  ('Cor da Pulseira', 'Rosa', '#F4CFDA', 5),
  ('Cor da Pulseira', 'Vermelho-produto', '#B1281F', 6),
  ('Cor da Pulseira', 'Verde', '#5C6E58', 7),
  ('Cor da Pulseira', 'Roxo', '#7D7191', 8),
  ('Cor', 'Meia-noite', '#2B3441', 13),
  ('Cor', 'Estelar', '#E5DFD3', 14),
  ('Cor', 'Prateado', '#E3E4E5', 15),
  ('Cor', 'Grafite', '#54524F', 16),
  ('Cor', 'Azul-céu', '#B9D3E0', 17),
  ('Cor', 'Vermelho-produto', '#B1281F', 18)
) as v(type_name, value, swatch_hex, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

-- Linha Apple Watch 2025 (SE 3 / Series 11 / Ultra 3) — ver
-- migrations/add_watch_2025_lineup_catalog.sql
insert into product_variant_values (variant_type_id, value, display_order)
select t.id, v.value, v.display_order
from product_variant_types t
join (values
  ('Tipo de Pulseira', 'Estilo Milanês', 9),
  ('Tipo de Pulseira', 'Estilo Milanês de Titânio', 10),
  ('Tipo de Pulseira', 'Pulseira Oceano', 11),
  ('Tipo de Pulseira', 'Loop Alpina', 12),
  ('Tipo de Pulseira', 'Loop Trail', 13)
) as v(type_name, value, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

insert into product_variant_values (variant_type_id, value, swatch_hex, display_order)
select t.id, v.value, v.swatch_hex, v.display_order
from product_variant_types t
join (values
  ('Cor', 'Preta', '#1D1D1F', 19),
  ('Cor', 'Cinza Espacial', '#4A4A4C', 20),
  ('Cor', 'Cor de Ouro Rosa', '#F4CFC0', 21),
  ('Cor', 'Preta Brilhante', '#0B0B0C', 22),
  ('Cor', 'Ardósia', '#4B4E52', 23),
  ('Cor', 'Dourada', '#D4AF7A', 24),
  ('Cor', 'Natural', '#C8C0B4', 25),
  ('Cor', 'Prateada', '#E3E4E5', 26)
) as v(type_name, value, swatch_hex, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

insert into product_variant_values (variant_type_id, value, swatch_hex, display_order)
select t.id, v.value, v.swatch_hex, v.display_order
from product_variant_types t
join (values
  ('Cor da Pulseira', 'Preta', '#1D1D1F', 9),
  ('Cor da Pulseira', 'Blush Clara', '#F2D9D3', 10),
  ('Cor da Pulseira', 'Roxo Névoa', '#B9AFC7', 11),
  ('Cor da Pulseira', 'Cinza Pedra', '#8E8C84', 12),
  ('Cor da Pulseira', 'Azul Clara', '#AEDFF0', 13),
  ('Cor da Pulseira', 'Azul-Âncora', '#1E3A5F', 14),
  ('Cor da Pulseira', 'Azul / Azul Brilhante', '#2E6FBA', 15),
  ('Cor da Pulseira', 'Preta-Carvão', '#2B2B2B', 16),
  ('Cor da Pulseira', 'Dourada', '#D4AF7A', 17),
  ('Cor da Pulseira', 'Natural', '#C8C0B4', 18),
  ('Cor da Pulseira', 'Ardósia', '#4B4E52', 19)
) as v(type_name, value, swatch_hex, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

-- =====================================================================
-- ROW LEVEL SECURITY — habilitar + policy permissiva em todas as tabelas
-- (ver nota de segurança no topo do arquivo: a proteção real é feita
-- pelo Next.js, não pelo Postgres, porque o app usa a ANON KEY)
-- =====================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'admin_users', 'affiliates', 'affiliate_users', 'user_ecommerce',
    'products', 'product_images', 'product_details', 'product_variant_types',
    'product_variants', 'product_variant_values', 'stock_movements',
    'affiliate_product_commissions', 'orders', 'order_items', 'payments',
    'coupons', 'coupon_usage', 'affiliate_sales', 'affiliate_withdrawals',
    'platform_config', 'installment_fees'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "Allow all" on %I', t);
    execute format('create policy "Allow all" on %I for all using (true) with check (true)', t);
  end loop;
end $$;

-- =====================================================================
-- STORAGE — bucket público "images" (upload de imagens de produto)
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

drop policy if exists "Public read images" on storage.objects;
create policy "Public read images" on storage.objects
  for select using (bucket_id = 'images');

drop policy if exists "Allow upload images" on storage.objects;
create policy "Allow upload images" on storage.objects
  for insert with check (bucket_id = 'images');
