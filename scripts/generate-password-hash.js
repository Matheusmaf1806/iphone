const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);

  console.log('\n=== Password Hash Generator ===\n');
  console.log('Senha:', password);
  console.log('Hash:', hash);
  console.log('\n=== SQL para atualizar no Supabase ===\n');
  console.log(`UPDATE public.admin_users
SET password_hash = '${hash}'
WHERE username = 'admin';`);
  console.log('\n=== Ou SQL para criar novo usuário ===\n');
  console.log(`INSERT INTO public.admin_users (
  username,
  email,
  password_hash,
  full_name,
  role,
  is_active
) VALUES (
  'admin',
  'admin@folhadeguine.com',
  '${hash}',
  'Administrador',
  'super_admin',
  true
) ON CONFLICT (username)
DO UPDATE SET password_hash = '${hash}', is_active = true;`);

  console.log('\n=== Teste do hash ===\n');
  const isValid = await bcrypt.compare('admin123', hash);
  console.log('Hash válido?', isValid ? '✓ SIM' : '✗ NÃO');

  // Testar o hash que estava no banco
  const oldHash = '$2a$10$rN5K9qDn8yWZBxGvJ5YZUeVCxC8fvEzQGY5kKWqXqQ0xYxZY3YZY.';
  console.log('\n=== Testando hash antigo ===\n');
  console.log('Hash antigo:', oldHash);
  try {
    const isOldValid = await bcrypt.compare('admin123', oldHash);
    console.log('Hash antigo válido para "admin123"?', isOldValid ? '✓ SIM' : '✗ NÃO');
  } catch (error) {
    console.log('✗ Hash antigo inválido/corrompido:', error.message);
  }
}

generateHash().catch(console.error);
