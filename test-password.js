// Script para testar se o hash da senha está correto
const bcrypt = require('bcryptjs');

const password = 'afiliado123';
const hashFromDatabase = '$2b$10$QwAqxgguiPX/B9.vAbcqQ.794/HXOXfUYugqDAFmL7q/SEyB2dkEa';

async function testPassword() {
  console.log('🔐 Testando password hash...\n');
  console.log('Senha testada:', password);
  console.log('Hash do banco:', hashFromDatabase);
  console.log('');

  try {
    const match = await bcrypt.compare(password, hashFromDatabase);

    if (match) {
      console.log('✅ SUCESSO! A senha "afiliado123" corresponde ao hash do banco de dados.');
      console.log('   O problema não está no password hash.');
    } else {
      console.log('❌ ERRO! A senha NÃO corresponde ao hash do banco de dados.');
      console.log('   Será necessário gerar um novo hash.');
    }
  } catch (error) {
    console.error('❌ Erro ao comparar senha:', error);
  }
}

testPassword();
