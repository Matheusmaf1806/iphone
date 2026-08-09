-- Migration: número de parcelas escolhido no pedido
-- Rode este arquivo inteiro no SQL Editor do Supabase.
--
-- Contexto: a taxa de cartão por parcela (installment_fees) já é usada pra calcular
-- o preço, mas o pedido não guardava QUANTAS parcelas o cliente escolheu — só dava
-- pra inferir de volta olhando order_items.card_fee_percentage. Guarda explícito
-- pra facilitar suporte/relatório.

alter table orders add column if not exists installments integer not null default 1;
