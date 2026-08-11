-- Margem uniforme de 5% pra nós (fornecedor) e 5% pro afiliado, em todos os
-- produtos/SKUs e afiliados já cadastrados — e como padrão daqui pra frente
-- (via default de coluna), sem mexer em código.

-- Nossa margem (fornecedor): 5% em todos os produtos e em todas as
-- variantes/SKUs (SKU tem prioridade sobre o produto quando preenchido, então
-- precisa dos dois — senão produtos com variação, como iPad/MacBook/Watch,
-- continuariam usando o valor antigo gravado em cada SKU).
update products set supplier_margin_percentage = 5;
update product_variants set supplier_margin_percentage = 5;
alter table products alter column supplier_margin_percentage set default 5;

-- Margem do afiliado: 5% pra todos os afiliados já cadastrados, e 5% como
-- padrão global (usado quando um afiliado não tem comissão própria).
update affiliates set commission_rate = 5;
alter table affiliates alter column commission_rate set default 5;
update platform_config set value = '5' where key = 'default_affiliate_margin';

-- Zera qualquer margem customizada por produto que algum afiliado tenha
-- configurado (fica em 5%, igual o resto) — sem exceção por produto.
update affiliate_product_commissions set custom_commission_rate = 5;
