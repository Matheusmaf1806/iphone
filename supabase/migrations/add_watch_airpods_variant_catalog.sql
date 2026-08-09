-- Migration: catálogo de atributos pra Apple Watch e AirPods
-- Rode este arquivo inteiro no SQL Editor do Supabase.
--
-- O sistema de variantes já é genérico (qualquer produto pode ter seus próprios
-- eixos/valores, criados na hora em "Gerenciar Variantes"). Esta migration só
-- pré-cadastra os tipos e valores mais comuns de Apple Watch e AirPods, pra não
-- precisar digitar tudo do zero a cada produto novo — mesmo padrão já usado pro
-- catálogo inicial de iPhone (Versão/Cor/Armazenamento).
--
-- Tudo aqui é editável depois (renomear, desativar, adicionar mais valores) nas
-- telas normais de "Gerenciar Variantes" do admin.

insert into product_variant_types (name, is_active, display_order) values
  ('Tamanho da Caixa', true, 4),
  ('Material da Caixa', true, 5),
  ('Conectividade', true, 6),
  ('Tipo de Pulseira', true, 7),
  ('Cor da Pulseira', true, 8),
  ('Tamanho da Pulseira', true, 9),
  ('Modelo', true, 10)
on conflict (name) do nothing;

-- Tamanho da Caixa (Apple Watch)
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
  ('Tamanho da Caixa', '49mm', 8)
) as v(type_name, value, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

-- Material da Caixa (Apple Watch)
insert into product_variant_values (variant_type_id, value, display_order)
select t.id, v.value, v.display_order
from product_variant_types t
join (values
  ('Material da Caixa', 'Alumínio', 1),
  ('Material da Caixa', 'Aço Inoxidável', 2),
  ('Material da Caixa', 'Titânio', 3)
) as v(type_name, value, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

-- Conectividade (Apple Watch)
insert into product_variant_values (variant_type_id, value, display_order)
select t.id, v.value, v.display_order
from product_variant_types t
join (values
  ('Conectividade', 'GPS', 1),
  ('Conectividade', 'GPS + Cellular', 2)
) as v(type_name, value, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

-- Tipo de Pulseira (Apple Watch)
insert into product_variant_values (variant_type_id, value, display_order)
select t.id, v.value, v.display_order
from product_variant_types t
join (values
  ('Tipo de Pulseira', 'Pulseira Esportiva', 1),
  ('Tipo de Pulseira', 'Loop Esportiva', 2),
  ('Tipo de Pulseira', 'Loop Trançada Solo', 3),
  ('Tipo de Pulseira', 'Nike Sport Band', 4),
  ('Tipo de Pulseira', 'Nike Sport Loop', 5),
  ('Tipo de Pulseira', 'Milanese Loop', 6),
  ('Tipo de Pulseira', 'Pulseira de Elo', 7),
  ('Tipo de Pulseira', 'Pulseira Hermès', 8)
) as v(type_name, value, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

-- Tamanho da Pulseira (Apple Watch)
insert into product_variant_values (variant_type_id, value, display_order)
select t.id, v.value, v.display_order
from product_variant_types t
join (values
  ('Tamanho da Pulseira', 'S/M', 1),
  ('Tamanho da Pulseira', 'M/L', 2),
  ('Tamanho da Pulseira', 'Único', 3)
) as v(type_name, value, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

-- Cor da Pulseira (Apple Watch) — com swatch, igual ao padrão de Cor do iPhone
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
  ('Cor da Pulseira', 'Roxo', '#7D7191', 8)
) as v(type_name, value, swatch_hex, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

-- Modelo (AirPods — também reutilizável por qualquer produto com "linhas")
insert into product_variant_values (variant_type_id, value, display_order)
select t.id, v.value, v.display_order
from product_variant_types t
join (values
  ('Modelo', 'AirPods 4', 1),
  ('Modelo', 'AirPods 4 (Cancelamento de Ruído)', 2),
  ('Modelo', 'AirPods Pro 2', 3),
  ('Modelo', 'AirPods Max', 4)
) as v(type_name, value, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;

-- Mais valores de Cor (compartilhado), relevantes pra Apple Watch e AirPods Max
insert into product_variant_values (variant_type_id, value, swatch_hex, display_order)
select t.id, v.value, v.swatch_hex, v.display_order
from product_variant_types t
join (values
  ('Cor', 'Meia-noite', '#2B3441', 13),
  ('Cor', 'Estelar', '#E5DFD3', 14),
  ('Cor', 'Prateado', '#E3E4E5', 15),
  ('Cor', 'Grafite', '#54524F', 16),
  ('Cor', 'Azul-céu', '#B9D3E0', 17),
  ('Cor', 'Vermelho-produto', '#B1281F', 18)
) as v(type_name, value, swatch_hex, display_order) on v.type_name = t.name
on conflict (variant_type_id, value) do nothing;
