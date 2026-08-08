-- Tabela de usuários B2C do e-commerce
CREATE TABLE IF NOT EXISTS user_ecommerce (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  cpf VARCHAR(14),
  address_street VARCHAR(255),
  address_number VARCHAR(20),
  address_complement VARCHAR(100),
  address_neighborhood VARCHAR(100),
  address_city VARCHAR(100),
  address_state VARCHAR(2),
  address_zipcode VARCHAR(10),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca por email (login)
CREATE INDEX IF NOT EXISTS idx_user_ecommerce_email ON user_ecommerce(email);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_user_ecommerce_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_ecommerce_updated_at ON user_ecommerce;
CREATE TRIGGER trigger_user_ecommerce_updated_at
  BEFORE UPDATE ON user_ecommerce
  FOR EACH ROW
  EXECUTE FUNCTION update_user_ecommerce_updated_at();

-- RLS (Row Level Security) - habilitar
ALTER TABLE user_ecommerce ENABLE ROW LEVEL SECURITY;

-- Política: permitir acesso via service role (API routes usam anon key com policies)
CREATE POLICY "Allow all for service" ON user_ecommerce
  FOR ALL USING (true) WITH CHECK (true);
