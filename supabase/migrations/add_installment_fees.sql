-- Migration: taxa do cartão por número de parcelas
-- Rode este arquivo inteiro no SQL Editor do Supabase.
--
-- Contexto: até aqui o custo do cartão era um único percentual fixo
-- (platform_config.card_fee_percentage), igual pra 1x ou 21x. Isso não reflete
-- como gateways de cartão cobram de verdade (taxa cresce conforme aumenta o
-- número de parcelas), e o assistente de compra da home precisa calcular o preço
-- exatamente pro número de parcelas que o cliente disse que consegue pagar.
--
-- platform_config.card_fee_percentage continua existindo e sendo usado
-- normalmente no resto do site (produto, carrinho, checkout) — esta tabela
-- nova é usada apenas onde o número de parcelas já é conhecido.
--
-- Se essa migration já rodou antes com os valores fictícios iniciais, rode
-- de novo — o "do update" abaixo substitui pelos valores reais.

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
on conflict (installments) do update set fee_percentage = excluded.fee_percentage;

alter table installment_fees enable row level security;
drop policy if exists "Allow all" on installment_fees;
create policy "Allow all" on installment_fees for all using (true) with check (true);
