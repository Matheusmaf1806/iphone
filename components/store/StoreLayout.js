'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StoreLayout({ children, session }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/store/logout', { method: 'POST' });
    router.push('/loja/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/loja/adm" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
              <i className="fas fa-store text-white"></i>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">{session.fullName}</p>
              <p className="text-xs text-gray-500 leading-tight">
                {session.pickupLocationName || 'Todos os locais'}
              </p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
          >
            <i className="fas fa-sign-out-alt mr-1"></i>
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
