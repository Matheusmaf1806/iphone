'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function HeadLayout({ children, session }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { icon: 'fa-sitemap', label: 'Minha Rede', path: '/head/adm' },
    ...(session.ownAffiliateId ? [{ icon: 'fa-shopping-bag', label: 'Minhas Vendas', path: '/head/adm/vendas' }] : []),
    { icon: 'fa-money-bill-wave', label: 'Saques', path: '/head/adm/saques' },
  ];

  const handleLogout = async () => {
    await fetch('/api/head/logout', { method: 'POST' });
    router.push('/head/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center"
      >
        <i className={`fas ${sidebarOpen ? 'fa-times' : 'fa-bars'} text-gray-700`}></i>
      </button>

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b-2 border-gray-100">
            <Link href="/head/adm" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <i className="fas fa-sitemap text-white text-lg"></i>
              </div>
              <div>
                <p className="font-bold text-gray-900 truncate">{session.headName || 'Rede'}</p>
                <p className="text-sm text-gray-600">Head</p>
              </div>
            </Link>
          </div>

          <div className="p-4 border-b-2 border-gray-100">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-full flex items-center justify-center font-bold text-white">
                {(session.fullName || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate text-sm">{session.fullName}</p>
                <p className="text-xs text-gray-600 truncate">@{session.username}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                        isActive ? 'bg-indigo-700 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <i className={`fas ${item.icon} text-lg w-5`}></i>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="p-4 border-t-2 border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <i className="fas fa-sign-out-alt text-lg w-5"></i>
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 md:p-8 pt-20 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
