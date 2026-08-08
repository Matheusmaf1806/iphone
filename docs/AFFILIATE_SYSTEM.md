# Sistema de Afiliados - Folha de Guiné

## 📊 Visão Geral

Sistema completo de afiliados com cálculo automático de margens em cascata, permitindo que a empresa configure produtos e afiliados revendam com suas próprias margens.

## 🔢 Cálculo de Preços

### Fluxo de Margens em Cascata

```
┌─────────────────────────────────────────────────────────┐
│  CUSTO BASE                                             │
│  R$ 35,00                                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ + Margem Supplier (10%)
                     │ = 35 / (1 - 0.10) = 35 / 0.90
                     ▼
┌─────────────────────────────────────────────────────────┐
│  NET PRICE (Preço após margem supplier)                 │
│  R$ 38,89                                               │
│  Margem Supplier: R$ 3,89                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ + Margem Afiliado (10% padrão)
                     │ = 38.89 / (1 - 0.10) = 38.89 / 0.90
                     ▼
┌─────────────────────────────────────────────────────────┐
│  PIX PRICE (Preço no PIX)                               │
│  R$ 43,21                                               │
│  Margem Afiliado: R$ 4,32                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ + Taxa Cartão (9,68%)
                     │ = 43.21 / (1 - 0.0968) = 43.21 / 0.9032
                     ▼
┌─────────────────────────────────────────────────────────┐
│  FINAL PRICE (Preço no cartão)                          │
│  R$ 47,84                                               │
│  Taxa Cartão: R$ 4,63                                   │
└─────────────────────────────────────────────────────────┘
```

### Breakdown de Valores

Para o exemplo acima (1 unidade no cartão):

| Item | Valor | % do Total |
|------|-------|-----------|
| **Custo do Produto** | R$ 35,00 | 73,15% |
| **Margem Supplier** (empresa) | R$ 3,89 | 8,13% |
| **Margem Afiliado** | R$ 4,32 | 9,03% |
| **Taxa do Cartão** | R$ 4,63 | 9,68% |
| **TOTAL CLIENTE** | **R$ 47,84** | **100%** |

### Diferença PIX vs Cartão

- **Pagamento PIX**: R$ 43,21 (sem taxa de cartão)
- **Pagamento Cartão**: R$ 47,84 (com taxa de 9,68%)
- **Diferença**: R$ 4,63

## 🏗️ Estrutura do Banco de Dados

### Tabelas Principais

#### `products`
Produtos cadastrados apenas pela empresa.

```sql
- id: UUID
- name: VARCHAR(255)
- slug: VARCHAR(255) UNIQUE
- cost_price: DECIMAL(10,2)          -- Custo base
- supplier_margin_percentage: DECIMAL(5,2)  -- Margem da empresa
- stock_quantity: INTEGER
- is_active: BOOLEAN
```

#### `affiliates`
Afiliados cadastrados no sistema.

```sql
- id: UUID
- username: VARCHAR(50) UNIQUE
- email: VARCHAR(255) UNIQUE
- password_hash: VARCHAR(255)
- full_name: VARCHAR(255)
- commission_percentage: DECIMAL(5,2)  -- Margem do afiliado (padrão 10%)
- pix_key: VARCHAR(255)               -- Para recebimento
- is_active: BOOLEAN
```

#### `orders`
Pedidos realizados.

```sql
- id: UUID
- order_number: VARCHAR(20) UNIQUE    -- Ex: ORD-20231209-0001
- affiliate_id: UUID
- customer_name, customer_email, customer_phone, customer_cpf
- shipping_* (endereço completo)
- payment_method: VARCHAR(20)         -- 'credit_card' ou 'pix'
- payment_status: VARCHAR(20)
- total, subtotal, shipping_cost, discount
- supplier_amount: DECIMAL(10,2)      -- Total da empresa
- affiliate_amount: DECIMAL(10,2)     -- Total do afiliado
- card_fee_amount: DECIMAL(10,2)      -- Total da taxa do cartão
- status: VARCHAR(20)
```

#### `order_items`
Itens dos pedidos com breakdown completo.

```sql
- id: UUID
- order_id: UUID
- product_id: UUID
- product_name: VARCHAR(255)          -- Snapshot no momento da compra

-- Percentuais aplicados (snapshot)
- supplier_margin_percentage: DECIMAL(5,2)
- affiliate_margin_percentage: DECIMAL(5,2)
- card_fee_percentage: DECIMAL(5,2)

-- Preços calculados
- cost_price: DECIMAL(10,2)           -- Custo base
- net_price: DECIMAL(10,2)            -- Após margem supplier
- pix_price: DECIMAL(10,2)            -- Após margem afiliado
- final_price: DECIMAL(10,2)          -- Após taxa cartão

-- Breakdown por unidade
- supplier_amount_unit: DECIMAL(10,2) -- Quanto a empresa ganha
- affiliate_amount_unit: DECIMAL(10,2)-- Quanto o afiliado ganha
- card_fee_amount_unit: DECIMAL(10,2) -- Quanto vai para taxa

- quantity: INTEGER
- subtotal: DECIMAL(10,2)             -- final_price * quantity
```

#### `platform_config`
Configurações globais da plataforma.

```sql
- key: VARCHAR(100) UNIQUE
- value: TEXT
- description: TEXT

Exemplos:
- 'card_fee_percentage' = '9.68'
- 'pix_discount_percentage' = '5'
- 'default_affiliate_margin' = '10'
```

#### `affiliate_withdrawals`
Solicitações de saque dos afiliados.

```sql
- id: UUID
- affiliate_id: UUID
- amount: DECIMAL(10,2)
- pix_key: VARCHAR(255)
- status: VARCHAR(20)                 -- pending, processing, paid, cancelled
- requested_at, processed_at, paid_at
```

## 👥 Painéis do Sistema

### 1. Painel do Afiliado (`/afiliado/adm`)

O afiliado pode:
- ✅ Ver seus produtos disponíveis (da empresa)
- ✅ Configurar sua margem personalizada (padrão 10%)
- ✅ Ver histórico de vendas
- ✅ Ver comissões recebidas por venda
- ✅ Solicitar saques
- ✅ Atualizar dados pessoais e chave PIX
- ❌ **NÃO** pode criar produtos próprios

**Tela de Vendas:**
```
┌────────────────────────────────────────────────────┐
│ PEDIDO #ORD-20231209-0001                          │
│ Data: 09/12/2023 15:30                             │
│ Cliente: João Silva                                │
├────────────────────────────────────────────────────┤
│ Produto: Vela 7 Ervas (2x)                         │
│ Cliente pagou: R$ 95,68                            │
│ Sua comissão: R$ 8,64                              │
└────────────────────────────────────────────────────┘
```

### 2. Painel Super Admin (`/gestao/erp`)

A empresa pode:
- ✅ Cadastrar produtos (custo + margem supplier)
- ✅ Gerenciar afiliados (aprovar, desativar)
- ✅ Ver todas as vendas com breakdown completo
- ✅ Processar saques
- ✅ Configurar taxa do cartão
- ✅ Relatórios financeiros completos

**Tela de Breakdown Detalhado:**
```
┌─────────────────────────────────────────────────────────┐
│ PEDIDO #ORD-20231209-0001 - BREAKDOWN FINANCEIRO       │
├─────────────────────────────────────────────────────────┤
│ Produto: Vela 7 Ervas                                   │
│ Quantidade: 2 unidades                                  │
│ Pagamento: Cartão de Crédito                            │
├─────────────────────────────────────────────────────────┤
│ Custo do Produto:          R$ 70,00 (73,15%)           │
│ Margem Supplier (Empresa): R$  7,78 ( 8,13%)           │
│ Margem Afiliado:           R$  8,64 ( 9,03%)           │
│ Taxa do Cartão:            R$  9,26 ( 9,68%)           │
│ ─────────────────────────────────────────────────       │
│ TOTAL CLIENTE:             R$ 95,68 (100%)             │
├─────────────────────────────────────────────────────────┤
│ Afiliado: João Silva (@afiliado1)                      │
│ Cliente: Maria Santos                                   │
└─────────────────────────────────────────────────────────┘
```

## 🛒 Fluxo de Compra

### 1. Cliente acessa loja do afiliado
```
https://folhadeguine.com.br/loja/afiliado1
```

### 2. Produtos exibidos com preço final
- No PIX: R$ 43,21
- No Cartão: R$ 47,84
- Desconto PIX: 5%

### 3. Checkout
- Coleta dados do cliente
- Escolhe forma de pagamento (PIX ou Cartão)
- Finaliza pedido

### 4. Processamento
- Pedido criado com status `pending`
- Pagamento processado
- Status atualizado para `paid`
- Comissões calculadas e registradas

### 5. Notificações
- Cliente recebe confirmação
- Afiliado recebe notificação da venda
- Admin recebe notificação do pedido

## 💰 Gestão Financeira

### Comissões do Afiliado

O afiliado acumula comissões a cada venda. Pode solicitar saque quando:
- Saldo mínimo: R$ 50,00
- Máximo 1 saque por semana

### Recebimento da Empresa

A empresa recebe:
1. **Margem Supplier**: Por cada produto vendido
2. **Custo do produto**: Para reposição de estoque

### Taxa do Cartão

É descontada automaticamente do valor total quando o pagamento é em cartão.

## 🔐 Permissões

### Super Admin
- Acesso total ao sistema
- Cadastro de produtos
- Configuração de margens supplier
- Aprovação de afiliados
- Processamento de saques
- Relatórios completos

### Afiliado
- Ver produtos disponíveis
- Configurar própria margem
- Ver vendas e comissões
- Solicitar saques
- Atualizar dados pessoais

### Cliente
- Ver produtos e preços finais
- Realizar compra
- Acompanhar pedido

## 📈 Relatórios

### Dashboard do Afiliado
- Total de vendas no mês
- Comissões acumuladas
- Saldo disponível para saque
- Top 5 produtos mais vendidos
- Gráfico de vendas (últimos 30 dias)

### Dashboard Super Admin
- Total de vendas (todos afiliados)
- Margem total da empresa
- Margem total dos afiliados
- Taxa total de cartão
- Afiliados mais performantes
- Produtos mais vendidos
- Gráfico de faturamento

## 🚀 Próximos Passos

1. ✅ Criar estrutura de banco de dados
2. ✅ Implementar cálculos de preços
3. ⏳ Criar API de produtos
4. ⏳ Criar API de autenticação de afiliados
5. ⏳ Implementar checkout com cálculo correto
6. ⏳ Criar painel do afiliado
7. ⏳ Expandir painel super admin
8. ⏳ Implementar sistema de saques
9. ⏳ Integração com gateway de pagamento
10. ⏳ Sistema de notificações

## 📝 Exemplo Prático

### Cadastro de Produto (Empresa)
```javascript
{
  name: "Vela 7 Ervas",
  cost_price: 35.00,
  supplier_margin_percentage: 10.00
}
```

### Configuração do Afiliado
```javascript
{
  commission_percentage: 10.00  // Pode alterar entre 5% e 20%
}
```

### Resultado para Cliente
```javascript
{
  product: "Vela 7 Ervas",
  prices: {
    pix: 43.21,      // Preço no PIX
    card: 47.84      // Preço no cartão
  }
}
```

### Breakdown da Venda
```javascript
{
  cost: 35.00,           // 73,15%
  supplier: 3.89,        //  8,13%
  affiliate: 4.32,       //  9,03%
  cardFee: 4.63,         //  9,68%
  total: 47.84          // 100%
}
```
