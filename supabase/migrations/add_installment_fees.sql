-- Migration: taxa do cartão por número de parcelas
-- Rode este arquivo inteiro no SQL Editor do Supabase.
--
-- Contexto: até aqui o custo do cartão era um único percentual fixo
-- (platform_config.card_fee_percentage), igual pra 1x ou 21x. Isso não reflete
-- como gateways de cartão cobram de verdade (taxa cresce conforme aumenta o
-- número de parcelas), e o assistente de compra da home precisa calcular o preço
-- exatamente pro número de parcelas que o cliente disse que consegue pagar.
--
-- Os valores abaixo são FICTÍCIOS (mesma taxa de hoje em 1x, subindo daí pra
-- frente) — troque pelos valores reais assim que o gateway novo for integrado,
-- direto na tela Configurações (/gestao/erp/configuracoes), sem precisar mexer
-- em código. platform_config.card_fee_percentage continua existindo e sendo
-- usado normalmente no resto do site (produto, carrinho, checkout) — esta
-- tabela nova é usada apenas onde o número de parcelas já é conhecido.

create table if not exists installment_fees (
  installments integer primary key check (installments between 1 and 21),
  fee_percentage numeric(5,2) not null default 0
);

insert into installment_fees (installments, fee_percentage) values
  (1, 9.68), (2, 10.50), (3, 11.30), (4, 12.10), (5, 12.90),
  (6, 13.70), (7, 14.60), (8, 15.50), (9, 16.40), (10, 17.30),
  (11, 18.20), (12, 19.10), (13, 20.00), (14, 20.90), (15, 21.80),
  (16, 22.70), (17, 23.60), (18, 24.50), (19, 25.40), (20, 26.30),
  (21, 27.20)
on conflict (installments) do nothing;

alter table installment_fees enable row level security;
drop policy if exists "Allow all" on installment_fees;
create policy "Allow all" on installment_fees for all using (true) with check (true);
