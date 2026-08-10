-- v3 — enriquece os SKUs de iPad (já cadastrados via add_mac_ipad_catalog.sql
-- e add_mac_ipad_catalog_v2.sql) com custo real em USD, imposto e margem do
-- fornecedor, vindos da planilha que vocês mandaram. Ativa os 6 produtos de
-- iPad (agora têm preço de verdade — só falta foto, que não bloqueia mais
-- nada). MacBook continua fora deste arquivo (sem tabela de custo ainda).
--
-- Todo valor aqui é 7% de imposto, 10% de margem do fornecedor,
-- 10 unidades de estoque por SKU — igual em toda a planilha que vocês
-- mandaram. cost_price varia por config exatamente como a planilha.
--
-- Roda por cima de v1/v2 sem duplicar (faz UPDATE nos SKUs que já existem,
-- casando pelo mesmo SKU gerado nas migrations anteriores).
--
-- Rode este arquivo inteiro de uma vez no SQL Editor do Supabase.

-- Ativa os produtos de iPad (agora têm custo real, não ficam mais R$ 0,00)
update products set is_active = true
where slug in ('ipad-11', 'ipad-mini-7', 'ipad-air-11-m4', 'ipad-air-13-m4', 'ipad-pro-11-m5', 'ipad-pro-13-m5');

-- =====================================================================
-- ipad-11
-- =====================================================================
update product_variants pv
set cost_price = v.cost_price,
    cost_currency = 'USD',
    import_tax_percentage = 7,
    supplier_margin_percentage = 10,
    stock_quantity = 10,
    is_active = true
from (values
  ('IPAD11-PRATEADO-128GB-WIFI', 449::numeric),
  ('IPAD11-PRATEADO-128GB-WIFICELLULAR', 599::numeric),
  ('IPAD11-PRATEADO-256GB-WIFI', 549::numeric),
  ('IPAD11-PRATEADO-256GB-WIFICELLULAR', 699::numeric),
  ('IPAD11-PRATEADO-512GB-WIFI', 749::numeric),
  ('IPAD11-PRATEADO-512GB-WIFICELLULAR', 899::numeric),
  ('IPAD11-AZULCU-128GB-WIFI', 449::numeric),
  ('IPAD11-AZULCU-128GB-WIFICELLULAR', 599::numeric),
  ('IPAD11-AZULCU-256GB-WIFI', 549::numeric),
  ('IPAD11-AZULCU-256GB-WIFICELLULAR', 699::numeric),
  ('IPAD11-AZULCU-512GB-WIFI', 749::numeric),
  ('IPAD11-AZULCU-512GB-WIFICELLULAR', 899::numeric),
  ('IPAD11-AMARELO-128GB-WIFI', 449::numeric),
  ('IPAD11-AMARELO-128GB-WIFICELLULAR', 599::numeric),
  ('IPAD11-AMARELO-256GB-WIFI', 549::numeric),
  ('IPAD11-AMARELO-256GB-WIFICELLULAR', 699::numeric),
  ('IPAD11-AMARELO-512GB-WIFI', 749::numeric),
  ('IPAD11-AMARELO-512GB-WIFICELLULAR', 899::numeric),
  ('IPAD11-ROSA-128GB-WIFI', 449::numeric),
  ('IPAD11-ROSA-128GB-WIFICELLULAR', 599::numeric),
  ('IPAD11-ROSA-256GB-WIFI', 549::numeric),
  ('IPAD11-ROSA-256GB-WIFICELLULAR', 699::numeric),
  ('IPAD11-ROSA-512GB-WIFI', 749::numeric),
  ('IPAD11-ROSA-512GB-WIFICELLULAR', 899::numeric)
) as v(sku, cost_price)
inner join products p on p.slug = 'ipad-11'
where pv.product_id = p.id and pv.sku = v.sku;

-- =====================================================================
-- ipad-mini-7
-- =====================================================================
update product_variants pv
set cost_price = v.cost_price,
    cost_currency = 'USD',
    import_tax_percentage = 7,
    supplier_margin_percentage = 10,
    stock_quantity = 10,
    is_active = true
from (values
  ('IPADMINI7-GRAFITE-128GB-WIFI', 599::numeric),
  ('IPADMINI7-GRAFITE-128GB-WIFICELLULAR', 749::numeric),
  ('IPADMINI7-GRAFITE-256GB-WIFI', 699::numeric),
  ('IPADMINI7-GRAFITE-256GB-WIFICELLULAR', 849::numeric),
  ('IPADMINI7-GRAFITE-512GB-WIFI', 899::numeric),
  ('IPADMINI7-GRAFITE-512GB-WIFICELLULAR', 1049::numeric),
  ('IPADMINI7-ESTELAR-128GB-WIFI', 599::numeric),
  ('IPADMINI7-ESTELAR-128GB-WIFICELLULAR', 749::numeric),
  ('IPADMINI7-ESTELAR-256GB-WIFI', 699::numeric),
  ('IPADMINI7-ESTELAR-256GB-WIFICELLULAR', 849::numeric),
  ('IPADMINI7-ESTELAR-512GB-WIFI', 899::numeric),
  ('IPADMINI7-ESTELAR-512GB-WIFICELLULAR', 1049::numeric),
  ('IPADMINI7-AZULCU-128GB-WIFI', 599::numeric),
  ('IPADMINI7-AZULCU-128GB-WIFICELLULAR', 749::numeric),
  ('IPADMINI7-AZULCU-256GB-WIFI', 699::numeric),
  ('IPADMINI7-AZULCU-256GB-WIFICELLULAR', 849::numeric),
  ('IPADMINI7-AZULCU-512GB-WIFI', 899::numeric),
  ('IPADMINI7-AZULCU-512GB-WIFICELLULAR', 1049::numeric),
  ('IPADMINI7-ROXO-128GB-WIFI', 599::numeric),
  ('IPADMINI7-ROXO-128GB-WIFICELLULAR', 749::numeric),
  ('IPADMINI7-ROXO-256GB-WIFI', 699::numeric),
  ('IPADMINI7-ROXO-256GB-WIFICELLULAR', 849::numeric),
  ('IPADMINI7-ROXO-512GB-WIFI', 899::numeric),
  ('IPADMINI7-ROXO-512GB-WIFICELLULAR', 1049::numeric)
) as v(sku, cost_price)
inner join products p on p.slug = 'ipad-mini-7'
where pv.product_id = p.id and pv.sku = v.sku;

-- =====================================================================
-- ipad-air-11-m4
-- =====================================================================
update product_variants pv
set cost_price = v.cost_price,
    cost_currency = 'USD',
    import_tax_percentage = 7,
    supplier_margin_percentage = 10,
    stock_quantity = 10,
    is_active = true
from (values
  ('IPADAIR11M4-GRAFITE-128GB-WIFI', 749::numeric),
  ('IPADAIR11M4-GRAFITE-128GB-WIFICELLULAR', 899::numeric),
  ('IPADAIR11M4-GRAFITE-256GB-WIFI', 849::numeric),
  ('IPADAIR11M4-GRAFITE-256GB-WIFICELLULAR', 999::numeric),
  ('IPADAIR11M4-GRAFITE-512GB-WIFI', 1049::numeric),
  ('IPADAIR11M4-GRAFITE-512GB-WIFICELLULAR', 1199::numeric),
  ('IPADAIR11M4-GRAFITE-1TB-WIFI', 1349::numeric),
  ('IPADAIR11M4-GRAFITE-1TB-WIFICELLULAR', 1499::numeric),
  ('IPADAIR11M4-AZUL-128GB-WIFI', 749::numeric),
  ('IPADAIR11M4-AZUL-128GB-WIFICELLULAR', 899::numeric),
  ('IPADAIR11M4-AZUL-256GB-WIFI', 849::numeric),
  ('IPADAIR11M4-AZUL-256GB-WIFICELLULAR', 999::numeric),
  ('IPADAIR11M4-AZUL-512GB-WIFI', 1049::numeric),
  ('IPADAIR11M4-AZUL-512GB-WIFICELLULAR', 1199::numeric),
  ('IPADAIR11M4-AZUL-1TB-WIFI', 1349::numeric),
  ('IPADAIR11M4-AZUL-1TB-WIFICELLULAR', 1499::numeric),
  ('IPADAIR11M4-ROXO-128GB-WIFI', 749::numeric),
  ('IPADAIR11M4-ROXO-128GB-WIFICELLULAR', 899::numeric),
  ('IPADAIR11M4-ROXO-256GB-WIFI', 849::numeric),
  ('IPADAIR11M4-ROXO-256GB-WIFICELLULAR', 999::numeric),
  ('IPADAIR11M4-ROXO-512GB-WIFI', 1049::numeric),
  ('IPADAIR11M4-ROXO-512GB-WIFICELLULAR', 1199::numeric),
  ('IPADAIR11M4-ROXO-1TB-WIFI', 1349::numeric),
  ('IPADAIR11M4-ROXO-1TB-WIFICELLULAR', 1499::numeric),
  ('IPADAIR11M4-ESTELAR-128GB-WIFI', 749::numeric),
  ('IPADAIR11M4-ESTELAR-128GB-WIFICELLULAR', 899::numeric),
  ('IPADAIR11M4-ESTELAR-256GB-WIFI', 849::numeric),
  ('IPADAIR11M4-ESTELAR-256GB-WIFICELLULAR', 999::numeric),
  ('IPADAIR11M4-ESTELAR-512GB-WIFI', 1049::numeric),
  ('IPADAIR11M4-ESTELAR-512GB-WIFICELLULAR', 1199::numeric),
  ('IPADAIR11M4-ESTELAR-1TB-WIFI', 1349::numeric),
  ('IPADAIR11M4-ESTELAR-1TB-WIFICELLULAR', 1499::numeric)
) as v(sku, cost_price)
inner join products p on p.slug = 'ipad-air-11-m4'
where pv.product_id = p.id and pv.sku = v.sku;

-- =====================================================================
-- ipad-air-13-m4
-- =====================================================================
update product_variants pv
set cost_price = v.cost_price,
    cost_currency = 'USD',
    import_tax_percentage = 7,
    supplier_margin_percentage = 10,
    stock_quantity = 10,
    is_active = true
from (values
  ('IPADAIR13M4-GRAFITE-128GB-WIFI', 949::numeric),
  ('IPADAIR13M4-GRAFITE-128GB-WIFICELLULAR', 1099::numeric),
  ('IPADAIR13M4-GRAFITE-256GB-WIFI', 1049::numeric),
  ('IPADAIR13M4-GRAFITE-256GB-WIFICELLULAR', 1199::numeric),
  ('IPADAIR13M4-GRAFITE-512GB-WIFI', 1249::numeric),
  ('IPADAIR13M4-GRAFITE-512GB-WIFICELLULAR', 1399::numeric),
  ('IPADAIR13M4-GRAFITE-1TB-WIFI', 1549::numeric),
  ('IPADAIR13M4-GRAFITE-1TB-WIFICELLULAR', 1699::numeric),
  ('IPADAIR13M4-AZUL-128GB-WIFI', 949::numeric),
  ('IPADAIR13M4-AZUL-128GB-WIFICELLULAR', 1099::numeric),
  ('IPADAIR13M4-AZUL-256GB-WIFI', 1049::numeric),
  ('IPADAIR13M4-AZUL-256GB-WIFICELLULAR', 1199::numeric),
  ('IPADAIR13M4-AZUL-512GB-WIFI', 1249::numeric),
  ('IPADAIR13M4-AZUL-512GB-WIFICELLULAR', 1399::numeric),
  ('IPADAIR13M4-AZUL-1TB-WIFI', 1549::numeric),
  ('IPADAIR13M4-AZUL-1TB-WIFICELLULAR', 1699::numeric),
  ('IPADAIR13M4-ROXO-128GB-WIFI', 949::numeric),
  ('IPADAIR13M4-ROXO-128GB-WIFICELLULAR', 1099::numeric),
  ('IPADAIR13M4-ROXO-256GB-WIFI', 1049::numeric),
  ('IPADAIR13M4-ROXO-256GB-WIFICELLULAR', 1199::numeric),
  ('IPADAIR13M4-ROXO-512GB-WIFI', 1249::numeric),
  ('IPADAIR13M4-ROXO-512GB-WIFICELLULAR', 1399::numeric),
  ('IPADAIR13M4-ROXO-1TB-WIFI', 1549::numeric),
  ('IPADAIR13M4-ROXO-1TB-WIFICELLULAR', 1699::numeric),
  ('IPADAIR13M4-ESTELAR-128GB-WIFI', 949::numeric),
  ('IPADAIR13M4-ESTELAR-128GB-WIFICELLULAR', 1099::numeric),
  ('IPADAIR13M4-ESTELAR-256GB-WIFI', 1049::numeric),
  ('IPADAIR13M4-ESTELAR-256GB-WIFICELLULAR', 1199::numeric),
  ('IPADAIR13M4-ESTELAR-512GB-WIFI', 1249::numeric),
  ('IPADAIR13M4-ESTELAR-512GB-WIFICELLULAR', 1399::numeric),
  ('IPADAIR13M4-ESTELAR-1TB-WIFI', 1549::numeric),
  ('IPADAIR13M4-ESTELAR-1TB-WIFICELLULAR', 1699::numeric)
) as v(sku, cost_price)
inner join products p on p.slug = 'ipad-air-13-m4'
where pv.product_id = p.id and pv.sku = v.sku;

-- =====================================================================
-- ipad-pro-11-m5
-- =====================================================================
update product_variants pv
set cost_price = v.cost_price,
    cost_currency = 'USD',
    import_tax_percentage = 7,
    supplier_margin_percentage = 10,
    stock_quantity = 10,
    is_active = true
from (values
  ('IPADPRO11M5-PRATEADO-12GB-256GB-WIFI-PADRO', 1199::numeric),
  ('IPADPRO11M5-PRATEADO-12GB-256GB-WIFICELLULAR-PADRO', 1399::numeric),
  ('IPADPRO11M5-PRATEADO-12GB-512GB-WIFI-PADRO', 1399::numeric),
  ('IPADPRO11M5-PRATEADO-12GB-512GB-WIFICELLULAR-PADRO', 1599::numeric),
  ('IPADPRO11M5-PRATEADO-16GB-1TB-WIFI-PADRO', 1799::numeric),
  ('IPADPRO11M5-PRATEADO-16GB-1TB-WIFI-NANOTEXTURA', 1899::numeric),
  ('IPADPRO11M5-PRATEADO-16GB-1TB-WIFICELLULAR-PADRO', 1999::numeric),
  ('IPADPRO11M5-PRATEADO-16GB-1TB-WIFICELLULAR-NANOTEXTURA', 2099::numeric),
  ('IPADPRO11M5-PRATEADO-16GB-2TB-WIFI-PADRO', 2299::numeric),
  ('IPADPRO11M5-PRATEADO-16GB-2TB-WIFI-NANOTEXTURA', 2399::numeric),
  ('IPADPRO11M5-PRATEADO-16GB-2TB-WIFICELLULAR-PADRO', 2499::numeric),
  ('IPADPRO11M5-PRATEADO-16GB-2TB-WIFICELLULAR-NANOTEXTURA', 2599::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-12GB-256GB-WIFI-PADRO', 1199::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-12GB-256GB-WIFICELLULAR-PADRO', 1399::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-12GB-512GB-WIFI-PADRO', 1399::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-12GB-512GB-WIFICELLULAR-PADRO', 1599::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-1TB-WIFI-PADRO', 1799::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-1TB-WIFI-NANOTEXTURA', 1899::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-1TB-WIFICELLULAR-PADRO', 1999::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-1TB-WIFICELLULAR-NANOTEXTURA', 2099::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-2TB-WIFI-PADRO', 2299::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-2TB-WIFI-NANOTEXTURA', 2399::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-2TB-WIFICELLULAR-PADRO', 2499::numeric),
  ('IPADPRO11M5-PRETOESPACIAL-16GB-2TB-WIFICELLULAR-NANOTEXTURA', 2599::numeric)
) as v(sku, cost_price)
inner join products p on p.slug = 'ipad-pro-11-m5'
where pv.product_id = p.id and pv.sku = v.sku;

-- =====================================================================
-- ipad-pro-13-m5
-- =====================================================================
update product_variants pv
set cost_price = v.cost_price,
    cost_currency = 'USD',
    import_tax_percentage = 7,
    supplier_margin_percentage = 10,
    stock_quantity = 10,
    is_active = true
from (values
  ('IPADPRO13M5-PRATEADO-12GB-256GB-WIFI-PADRO', 1499::numeric),
  ('IPADPRO13M5-PRATEADO-12GB-256GB-WIFICELLULAR-PADRO', 1699::numeric),
  ('IPADPRO13M5-PRATEADO-12GB-512GB-WIFI-PADRO', 1699::numeric),
  ('IPADPRO13M5-PRATEADO-12GB-512GB-WIFICELLULAR-PADRO', 1899::numeric),
  ('IPADPRO13M5-PRATEADO-16GB-1TB-WIFI-PADRO', 2099::numeric),
  ('IPADPRO13M5-PRATEADO-16GB-1TB-WIFI-NANOTEXTURA', 2199::numeric),
  ('IPADPRO13M5-PRATEADO-16GB-1TB-WIFICELLULAR-PADRO', 2299::numeric),
  ('IPADPRO13M5-PRATEADO-16GB-1TB-WIFICELLULAR-NANOTEXTURA', 2399::numeric),
  ('IPADPRO13M5-PRATEADO-16GB-2TB-WIFI-PADRO', 2599::numeric),
  ('IPADPRO13M5-PRATEADO-16GB-2TB-WIFI-NANOTEXTURA', 2699::numeric),
  ('IPADPRO13M5-PRATEADO-16GB-2TB-WIFICELLULAR-PADRO', 2799::numeric),
  ('IPADPRO13M5-PRATEADO-16GB-2TB-WIFICELLULAR-NANOTEXTURA', 2899::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-12GB-256GB-WIFI-PADRO', 1499::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-12GB-256GB-WIFICELLULAR-PADRO', 1699::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-12GB-512GB-WIFI-PADRO', 1699::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-12GB-512GB-WIFICELLULAR-PADRO', 1899::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-1TB-WIFI-PADRO', 2099::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-1TB-WIFI-NANOTEXTURA', 2199::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-1TB-WIFICELLULAR-PADRO', 2299::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-1TB-WIFICELLULAR-NANOTEXTURA', 2399::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-2TB-WIFI-PADRO', 2599::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-2TB-WIFI-NANOTEXTURA', 2699::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-2TB-WIFICELLULAR-PADRO', 2799::numeric),
  ('IPADPRO13M5-PRETOESPACIAL-16GB-2TB-WIFICELLULAR-NANOTEXTURA', 2899::numeric)
) as v(sku, cost_price)
inner join products p on p.slug = 'ipad-pro-13-m5'
where pv.product_id = p.id and pv.sku = v.sku;

