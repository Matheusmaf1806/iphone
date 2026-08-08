import { redirect } from 'next/navigation';
import { isAuthenticated } from '../../../lib/auth';
import LoginForm from '../../../components/gestao/LoginForm';

export const metadata = {
  title: 'Login - Gestão',
};

export default function LoginPage() {
  // Redirecionar se já está autenticado
  if (isAuthenticated()) {
    redirect('/gestao/erp');
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <img
              src="https://brandpet.vercel.app/logo/brand_pet_logo_bege.png"
              alt="Logo"
              className="h-16 mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-gray-900">
              Gestão - Folha de Guiné
            </h1>
            <p className="text-gray-600 mt-2">
              Faça login para acessar o painel de gestão
            </p>
          </div>

          <LoginForm />

          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-sm text-gray-600 hover:text-brand-yellow transition-colors"
            >
              ← Voltar para a loja
            </a>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Credenciais padrão:</p>
          <p className="font-mono text-xs mt-1">
            admin / admin123
          </p>
          <p className="text-xs text-red-600 mt-2">
            ⚠️ Altere a senha após o primeiro login!
          </p>
        </div>
      </div>
    </div>
  );
}
