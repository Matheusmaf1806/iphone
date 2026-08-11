'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AffiliateLayout({ children, session }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    {
      icon: 'fa-home',
      label: 'Dashboard',
      path: '/afiliado/adm',
    },
    {
      icon: 'fa-box',
      label: 'Produtos',
      path: '/afiliado/adm/produtos',
    },
    {
      icon: 'fa-percent',
      label: 'Margens',
      path: '/afiliado/adm/margens',
    },
    {
      icon: 'fa-tag',
      label: 'Cupons',
      path: '/afiliado/adm/cupons',
    },
    {
      icon: 'fa-shopping-bag',
      label: 'Vendas',
      path: '/afiliado/adm/vendas',
    },
    {
      icon: 'fa-qrcode',
      label: 'Retiradas',
      path: '/afiliado/adm/retiradas',
    },
    {
      icon: 'fa-money-bill-wave',
      label: 'Saques',
      path: '/afiliado/adm/saques',
    },
    {
      icon: 'fa-palette',
      label: 'Identidade Visual',
      path: '/afiliado/adm/identidade-visual',
    },
    {
      icon: 'fa-users',
      label: 'Usuários',
      path: '/afiliado/adm/usuarios',
    },
    {
      icon: 'fa-cog',
      label: 'Configurações',
      path: '/afiliado/adm/configuracoes',
    },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/affiliate/logout', { method: 'POST' });
      router.push('/afiliado/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center"
      >
        <i className={`fas ${sidebarOpen ? 'fa-times' : 'fa-bars'} text-gray-700`}></i>
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="p-6 border-b-2 border-gray-100">
            <Link href="/afiliado/adm" className="flex items-center gap-3 group">
              {session.affiliateLogoUrl ? (
                <img
                  src={session.affiliateLogoUrl}
                  alt={session.affiliateName}
                  className="w-12 h-12 rounded-xl object-contain shadow-md group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-brand-yellow to-yellow-400 rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <span className="text-gray-900 font-bold text-lg">
                    {session.affiliateName?.charAt(0)?.toUpperCase() || 'A'}
                  </span>
                </div>
              )}
              <div>
                <p className="font-bold text-gray-900 truncate">{session.affiliateName || 'Painel'}</p>
                <p className="text-sm text-gray-600">Afiliado</p>
              </div>
            </Link>
          </div>

          {/* User Info */}
          <div className="p-4 border-b-2 border-gray-100">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              {session.profilePhotoUrl ? (
                <img
                  src={session.profilePhotoUrl}
                  alt={session.fullName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-brand-yellow to-yellow-400 rounded-full flex items-center justify-center font-bold text-gray-900">
                  {(session.fullName || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate text-sm">
                  {session.fullName}
                </p>
                <p className="text-xs text-gray-600 truncate">@{session.username}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                        isActive
                          ? 'bg-brand-yellow text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100'
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

          {/* Logout */}
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

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 md:p-8 pt-20 lg:pt-8">
          {/* Top Bar */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="hidden lg:block">
                <p className="text-sm text-gray-600">Bem-vindo de volta,</p>
                <p className="font-bold text-gray-900 text-lg">{session.fullName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Commission Badge */}
              <div className="hidden md:flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-md">
                <i className="fas fa-percentage text-brand-yellow"></i>
                <span className="text-sm font-semibold text-gray-700">
                  Margem: {session.commissionPercentage < 1
                    ? `${(session.commissionPercentage * 100).toFixed(0)}%`
                    : `${session.commissionPercentage}%`
                  }
                </span>
              </div>

              {/* Link para loja */}
              <Link
                href="/"
                className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-md hover:shadow-lg transition-all text-sm font-medium text-gray-700"
              >
                <i className="fas fa-store"></i>
                <span className="hidden md:inline">Ver Loja</span>
              </Link>
            </div>
          </div>

          {/* Page Content */}
          {children}
        </div>
      </main>
    </div>
  );
}
