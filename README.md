# Axe - Plataforma de Afiliados White-Label

Plataforma completa de e-commerce com sistema de afiliados, white-label e ERP de gestão de produtos, construída com **Next.js 14+** e **Supabase**.

## 🚀 Características

### Sistema de Afiliados
- **Rastreamento de Vendas**: Sistema completo de tracking de conversões
- **Comissões Configuráveis**: Cada afiliado pode ter sua própria taxa de comissão
- **Links de Referência**: URLs com parâmetro `?ref=` para rastreamento
- **Dashboard de Vendas**: Visualize e gerencie vendas por afiliado

### White-Label
- **Multi-Domínio**: Suporte para múltiplos domínios/subdomínios
- **Personalização de Marca**: Cada afiliado pode ter:
  - Logo personalizada
  - Cor de marca customizada (primary, buttons, hover)
  - Nome da loja
  - CNPJ e informações fiscais
- **Configuração Dinâmica**: Detecta automaticamente o domínio e aplica as configurações

### Funcionalidades do E-commerce
- Galeria de imagens com lightbox
- Sistema de carrinho de compras
- Calculadora de frete
- Avaliações e classificações de produtos
- Oráculo de Aruanda (integração com Gemini AI)
- Busca e filtros de produtos
- Produtos em destaque

### Sistema de Gestão (ERP)
- **Gestão de Produtos**: CRUD completo de produtos
- **Controle de Estoque**: Movimentações, alertas de estoque baixo
- **Upload de Imagens**: Múltiplas imagens por produto
- **Especificações**: Detalhes customizáveis de produtos
- **Autenticação Segura**: Sistema de login para administradores
- **Dashboard Intuitivo**: Interface moderna e responsiva

## 📁 Estrutura do Projeto

```
axe/
├── app/                          # Next.js App Router
│   ├── layout.js                # Layout principal
│   ├── page.js                  # Página inicial
│   ├── globals.css              # Estilos globais
│   ├── produto/[slug]/         # Detalhes do produto
│   ├── gestao/                  # Área de gestão
│   │   ├── login/              # Login admin
│   │   └── erp/                # Painel ERP
│   └── api/                     # API Routes
│       ├── auth/               # Autenticação
│       └── products/           # Produtos API
├── components/                  # Componentes reutilizáveis
│   ├── Header.js               # Cabeçalho público
│   ├── Footer.js               # Rodapé público
│   ├── ProductGallery.js       # Galeria de imagens
│   ├── ProductActions.js       # Ações do produto
│   ├── ProductTabs.js          # Abas de descrição
│   ├── GeminiRitual.js         # Oráculo com IA
│   └── gestao/                 # Componentes de gestão
│       ├── GestaoLayout.js    # Layout do ERP
│       ├── LoginForm.js       # Formulário de login
│       ├── ProductList.js     # Lista de produtos
│       └── ProductModal.js    # Modal de produto
├── lib/                        # Bibliotecas e utilitários
│   ├── supabase/              # Configuração Supabase
│   ├── affiliate.js           # Sistema de afiliados
│   ├── products.js            # Gestão de produtos
│   └── auth.js                # Autenticação
├── supabase/                   # Banco de dados
│   ├── schema.sql             # Schema SQL completo
│   └── README.md              # Guia do Supabase
├── next.config.js             # Configuração do Next.js
├── tailwind.config.js         # Configuração do Tailwind
└── package.json               # Dependências
```

## 🛠️ Instalação

### 1. Clone o repositório

```bash
git clone <repository-url>
cd axe
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o Supabase

#### 3.1. Criar Projeto

1. Acesse [https://supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Guarde a senha do banco de dados

#### 3.2. Executar Schema SQL

1. No painel do Supabase, vá em **SQL Editor**
2. Cole o conteúdo de `supabase/schema.sql`
3. Execute o script

Isso criará automaticamente:
- Todas as tabelas necessárias
- Índices para performance
- Triggers automáticos
- Views úteis
- Dados iniciais (afiliado padrão e admin)

#### 3.3. Obter Credenciais

No Supabase, vá em **Settings → API** e copie:
- Project URL
- anon/public key

### 4. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` com suas credenciais:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui

# Gemini AI (opcional)
GEMINI_API_KEY=sua-chave-gemini-aqui

# Sessão Admin
ADMIN_SESSION_SECRET=gere-uma-chave-aleatoria-segura-aqui
```

### 5. Execute o servidor de desenvolvimento

```bash
npm run dev
```

Acesse:
- **Loja**: [http://localhost:3000](http://localhost:3000)
- **Login Admin**: [http://localhost:3000/gestao/login](http://localhost:3000/gestao/login)
- **Painel ERP**: [http://localhost:3000/gestao/erp](http://localhost:3000/gestao/erp)

## 🔐 Credenciais Padrão

O schema SQL cria um usuário admin padrão:

```
Username: admin
Email: admin@folhadeguine.com
Senha: admin123
```

**⚠️ IMPORTANTE: Altere a senha imediatamente após o primeiro login!**

## 💾 Banco de Dados

### Tabelas Principais

1. **affiliates** - Afiliados e configurações white-label
2. **products** - Produtos do e-commerce
3. **product_images** - Imagens dos produtos (múltiplas)
4. **product_details** - Especificações customizáveis
5. **product_reviews** - Avaliações de clientes
6. **admin_users** - Usuários administradores
7. **affiliate_sales** - Vendas e comissões
8. **stock_movements** - Histórico de movimentações de estoque

### Funcionalidades Automáticas

- ✅ `updated_at` atualiza automaticamente
- ✅ Rating calculado automaticamente das reviews
- ✅ Status de estoque atualizado automaticamente
- ✅ Triggers para integridade de dados
- ✅ Índices otimizados para performance

Para mais detalhes, consulte `supabase/README.md`

## 🎨 Como Usar

### Acessar o Painel de Gestão

1. Acesse `/gestao/login`
2. Faça login com as credenciais
3. Gerencie produtos em `/gestao/erp`

### Adicionar Produtos

1. No painel ERP, clique em "**+ Novo Produto**"
2. Preencha as informações:
   - Nome, descrição, preço
   - SKU, estoque, categoria
   - Adicione imagens (URLs)
   - Adicione especificações
3. Clique em "**Criar Produto**"
4. O produto aparecerá imediatamente na loja

### Gerenciar Estoque

- **Quantidade**: Defina no formulário do produto
- **Estoque Mínimo**: Alerta quando atingir este valor
- **Status**: Atualizado automaticamente (in_stock, low_stock, out_of_stock)

### Configurar Afiliados

Os afiliados são configurados diretamente no banco de dados (tabela `affiliates`):

```sql
INSERT INTO affiliates (
  slug, domain, name, logo_url,
  primary_color, commission_rate
) VALUES (
  'afiliado-1',
  'afiliado1.seudominio.com',
  'Loja do Afiliado 1',
  'https://exemplo.com/logo.png',
  '#ff6b6b',
  0.15
);
```

O sistema detecta automaticamente o domínio e aplica as configurações.

## 🚢 Deploy

### Vercel (Recomendado)

1. Faça push do código para GitHub
2. Importe o projeto na [Vercel](https://vercel.com)
3. Configure as variáveis de ambiente
4. Deploy automático

### Configurar Domínios de Afiliados

1. Na Vercel: **Settings → Domains**
2. Adicione cada domínio de afiliado
3. Configure o DNS apontando para a Vercel
4. Adicione o domínio na tabela `affiliates`

## 🤖 Integração com Gemini AI

O "Oráculo de Aruanda" usa a API do Google Gemini.

1. Obtenha uma chave em [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Adicione no `.env`:
```env
GEMINI_API_KEY=sua-chave-aqui
```
3. Atualize `components/GeminiRitual.js` linha 10 para usar a variável

## 📊 APIs Disponíveis

### Produtos

- `POST /api/products` - Criar produto
- `PUT /api/products` - Atualizar produto
- `GET /produto/[slug]` - Ver produto (SSR)

### Autenticação

- `POST /api/auth/login` - Fazer login
- `POST /api/auth/logout` - Fazer logout

## 🔧 Desenvolvimento

### Adicionar Novas Funcionalidades

A estrutura é modular e fácil de estender:

1. **Nova tabela**: Adicione em `supabase/schema.sql`
2. **Nova lib**: Crie em `lib/nome.js`
3. **Nova API**: Crie em `app/api/rota/route.js`
4. **Nova página**: Crie em `app/pagina/page.js`

### Estrutura de Componentes

- **Client Components**: Use `'use client'` para interatividade
- **Server Components**: Padrão para SSR e dados
- **Layouts**: Compartilhados entre páginas

## 📝 Próximas Funcionalidades

- [ ] Upload direto de imagens (Supabase Storage)
- [ ] Relatórios de vendas avançados
- [ ] Dashboard de analytics
- [ ] Sistema de pagamento integrado
- [ ] Notificações de estoque baixo
- [ ] Exportação de dados (CSV/Excel)
- [ ] Multi-idioma
- [ ] App mobile (React Native)

## 🤝 Referências

Este projeto foi inspirado no sistema de afiliados do [AirNext](https://github.com/airnext).

## 🐛 Troubleshooting

### Erro de conexão com Supabase

Verifique se:
1. As credenciais no `.env` estão corretas
2. O schema SQL foi executado sem erros
3. A URL do projeto está completa (incluindo https://)

### Erro no login admin

Verifique se:
1. O schema SQL criou o usuário padrão
2. Você está usando as credenciais corretas
3. A tabela `admin_users` existe

### Produtos não aparecem

Verifique se:
1. Os produtos têm `is_active = true`
2. As imagens têm URLs válidas
3. O slug está correto e único

## 📞 Suporte

Para problemas ou dúvidas:

1. Consulte a documentação em `supabase/README.md`
2. Verifique os logs do console (F12)
3. Abra uma issue no repositório

## 📝 Licença

Projeto privado. Todos os direitos reservados.

---

**Feito com ❤️ usando Next.js e Supabase**
