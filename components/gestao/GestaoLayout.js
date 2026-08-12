'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { SITE_NAME } from '../../lib/siteConfig';

export default function GestaoLayout({ children, session }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    {
      icon: 'fa-box',
      label: 'Produtos',
      path: '/gestao/erp',
    },
    {
      icon: 'fa-shopping-bag',
      label: 'Vendas',
      path: '/gestao/erp/vendas',
    },
    {
      icon: 'fa-users',
      label: 'Afiliados',
      path: '/gestao/erp/afiliados',
    },
    {
      icon: 'fa-sitemap',
      label: 'Rede de Heads',
      path: '/gestao/erp/rede',
    },
    {
      icon: 'fa-tag',
      label: 'Cupons',
      path: '/gestao/erp/cupons',
    },
    {
      icon: 'fa-warehouse',
      label: 'Estoque',
      path: '/gestao/erp/estoque',
    },
    {
      icon: 'fa-user-shield',
      label: 'Usuários',
      path: '/gestao/erp/usuarios',
    },
    {
      icon: 'fa-file-zipper',
      label: 'Importar Apple Watch',
      path: '/gestao/erp/importar-watch',
    },
    {
      icon: 'fa-sliders-h',
      label: 'Configurações',
      path: '/gestao/erp/configuracoes',
    },
  ];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/gestao/login');
    router.refresh();
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
            <Link href="/gestao/erp" className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform overflow-hidden bg-gray-900 border border-gray-200">
                <span className="text-white font-bold text-sm">
                  {SITE_NAME.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-bold text-gray-900">Painel</p>
                <p className="text-sm text-gray-600">Administração</p>
              </div>
            </Link>
          </div>

          {/* User Info */}
          <div className="p-4 border-b-2 border-gray-100">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center font-bold text-white">
                {(session.fullName || session.username).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate text-sm">
                  {session.fullName || session.username}
                </p>
                <p className="text-xs text-gray-600 truncate">{session.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
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
                        isActive
                          ? 'bg-gray-900 text-white shadow-md'
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

          {/* Ver Loja */}
          <div className="p-4 border-t-2 border-gray-100">
            <Link
              href="/"
              target="_blank"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <i className="fas fa-store text-lg w-5"></i>
              <span>Ver Loja</span>
              <i className="fas fa-external-link-alt text-xs ml-auto"></i>
            </Link>
          </div>

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
                <p className="text-sm text-gray-600">Painel de Gestão</p>
                <p className="font-bold text-gray-900 text-lg">
                  {session.fullName || session.username}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Role Badge */}
              <div className="hidden md:flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-md">
                <i className="fas fa-user-shield text-gray-800"></i>
                <span className="text-sm font-semibold text-gray-700">
                  {session.role}
                </span>
              </div>
            </div>
          </div>

          {/* Page Content */}
          {children}
        </div>
      </main>
    </div>
  );
}
