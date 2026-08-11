-- Parcelamento passa a ir até 10x (era até 21x), com taxa fixa de 9,68% em
-- qualquer número de parcelas (era uma taxa crescente por parcela, de 7,60%
-- em 1x até 40,68% em 21x). Idempotente — pode rodar mais de uma vez.

-- Afrouxa/reaperta a constraint de installment_fees pra caber 1-10 (nome
-- padrão que o Postgres dá pra um check sem nome explícito na coluna).
alter table installment_fees drop constraint if exists installment_fees_installments_check;
alter table installment_fees add constraint installment_fees_installments_check check (installments between 1 and 10);

-- Remove as parcelas de 11 a 21 — não existem mais.
delete from installment_fees where installments > 10;

-- Taxa fixa de 9,68% pra 1-10x (upsert: atualiza quem já existe, cria quem falta).
insert into installment_fees (installments, fee_percentage)
select i, 9.68 from generate_series(1, 10) as i
on conflict (installments) do update set fee_percentage = 9.68;

-- Taxa de cartão "única" (fallback usado fora do fluxo de installment_fees).
update platform_config set value = '9.68' where key = 'card_fee_percentage';

-- Produtos existentes: parcelamento máximo cai pra 10x.
update products set installments = 10 where installments is null or installments > 10;
alter table products alter column installments set default 10;
