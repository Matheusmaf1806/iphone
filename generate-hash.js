// Gerar hash correto para a senha
const bcrypt = require('bcryptjs');

const password = 'afiliado123';

async function generateHash() {
  console.log('🔐 Gerando hash para a senha:', password);
  console.log('');

  try {
    const hash = await bcrypt.hash(password, 10);
    console.log('✅ Hash gerado com sucesso!');
    console.log('');
    console.log('Hash:', hash);
    console.log('');
    console.log('📝 Execute esta query no Supabase SQL Editor:');
    console.log('');
    console.log('UPDATE affiliate_users');
    console.log("SET password_hash = '" + hash + "'");
    console.log("WHERE username = 'afiliado1';");
    console.log('');

    // Testar se o hash funciona
    const match = await bcrypt.compare(password, hash);
    console.log('✅ Verificação:', match ? 'Hash confirmado como válido!' : 'ERRO na verificação');
  } catch (error) {
    console.error('❌ Erro ao gerar hash:', error);
  }
}

generateHash();
