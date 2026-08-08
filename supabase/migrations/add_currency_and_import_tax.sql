-- Migration: custo em dólar (USD) + imposto de importação na precificação
-- Rode este arquivo inteiro no SQL Editor do Supabase.
--
-- Contexto: o custo de produtos/SKUs comprados nos EUA precisa ser cadastrado em dólar
-- (não convertido manualmente pelo admin), e o cálculo de preço precisa somar um imposto
-- de importação sobre o custo antes de aplicar a margem do fornecedor.
--
-- Modelo:
-- 1. Cada produto/variante tem uma moeda de custo (cost_currency: BRL ou USD) e um
--    imposto opcional (import_tax_percentage) que, se nulo, usa o padrão global.
-- 2. A cotação USD->BRL e o imposto padrão ficam em platform_config, editáveis numa
--    tela nova em /gestao (não existia edição de platform_config até aqui).
-- 3. order_items grava a cotação e o imposto realmente usados em cada pedido, pra não
--    mudar retroativamente o valor de pedidos antigos quando a cotação for atualizada.

alter table products
  add column if not exists cost_currency text not null default 'BRL',
  add column if not exists import_tax_percentage numeric(5,2);

alter table products
  add constraint products_cost_currency_check check (cost_currency in ('BRL', 'USD'));

alter table product_variants
  add column if not exists cost_currency text not null default 'BRL',
  add column if not exists import_tax_percentage numeric(5,2);

alter table product_variants
  add constraint product_variants_cost_currency_check check (cost_currency in ('BRL', 'USD'));

alter table order_items
  add column if not exists exchange_rate_used numeric(10,4),
  add column if not exists import_tax_percentage_used numeric(5,2);

insert into platform_config (key, value, description) values
  ('usd_brl_rate', '5.50', 'Cotação USD -> BRL usada para converter custos cadastrados em dólar'),
  ('default_import_tax_percentage', '0', 'Imposto de importação padrão (%) aplicado sobre o custo, quando o produto/SKU não tiver um valor próprio')
on conflict (key) do nothing;
