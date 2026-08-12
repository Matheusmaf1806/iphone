'use client';
import { useState } from 'react';
import { useAffiliate } from '../contexts/AffiliateContext';
import { useCart } from '../contexts/CartContext';
import { useCustomer } from '../contexts/CustomerContext';
import SearchBar from './SearchBar';
import Logo from './Logo';

export default function ClientHeader({ config }) {
  const affiliate = useAffiliate();
  const { setIsOpen, getTotalItems } = useCart();
  const { customer, login, register, logout } = useCustomer();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Form fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const brandColor = config.brandColor || '#0043f7';

  const resetForm = () => {
    setLoginEmail('');
    setLoginPassword('');
    setRegName('');
    setRegEmail('');
    setRegPassword('');
    setFormError('');
    setFormLoading(false);
  };

  const openModal = (tab = 'login') => {
    resetForm();
    setAuthTab(tab);
    setShowAuthModal(true);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    const result = await login(loginEmail, loginPassword);

    if (result.success) {
      setShowAuthModal(false);
      resetForm();
    } else {
      setFormError(result.error);
    }
    setFormLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormError('');

    if (regPassword.length < 6) {
      setFormError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setFormLoading(true);

    const result = await register(regName, regEmail, regPassword);

    if (result.success) {
      setShowAuthModal(false);
      resetForm();
    } else {
      setFormError(result.error);
    }
    setFormLoading(false);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {/* CAMADA 2: Cabeçalho Principal */}
      <div className="px-4 py-2" style={{ backgroundColor: brandColor }}>
        <div className="container mx-auto flex items-center justify-between gap-4 flex-wrap">
          {/* Logo */}
          <div>
            <a href="/">
              <Logo src={config.logo} name={config.name} imgClassName="h-16 sm:h-24" textClassName="text-2xl font-bold tracking-tight text-white" />
            </a>
          </div>

          {/* Barra de Busca (Desktop) */}
          <div className="hidden lg:flex flex-1 max-w-xl">
            <SearchBar />
          </div>

          {/* Ícones da Direita */}
          <div className="flex items-center gap-4 md:gap-6">
            <a
              href="#"
              className="hidden md:flex items-center gap-2 hover:opacity-80 transition-colors"
              style={{ color: '#ffffff' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <div className="text-sm">
                <p className="font-light">Retirada</p>
                <p className="font-semibold">em Orlando</p>
              </div>
            </a>

            {customer ? (
              /* Usuário logado */
              <div className="relative group">
                <button
                  className="flex items-center gap-2 hover:opacity-80 transition-colors"
                  style={{ color: '#ffffff' }}
                >
                  <div className="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                    <i className="fas fa-user text-sm"></i>
                  </div>
                  <div className="text-sm hidden sm:block text-left">
                    <p className="font-light text-xs">Olá,</p>
                    <p className="font-semibold">{customer.name?.split(' ')[0]}</p>
                  </div>
                </button>
                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 truncate">{customer.name}</p>
                    <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <i className="fas fa-sign-out-alt text-xs"></i>
                    Sair
                  </button>
                </div>
              </div>
            ) : (
              /* Usuário não logado */
              <button
                onClick={() => openModal('login')}
                className="flex items-center gap-2 hover:opacity-80 transition-colors"
                style={{ color: '#ffffff' }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <div className="text-sm hidden sm:block text-left">
                  <p className="font-light">Olá, entre ou</p>
                  <p className="font-semibold">Cadastre-se</p>
                </div>
              </button>
            )}

            <button
              onClick={() => setIsOpen(true)}
              className="relative hover:opacity-80 transition-colors group"
              style={{ color: '#ffffff' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 group-hover:scale-110 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              {getTotalItems() > 0 && (
                <span className="absolute -top-1 -right-1 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse" style={{ backgroundColor: '#ffffff', color: brandColor }}>
                  {getTotalItems()}
                </span>
              )}
            </button>
          </div>

          {/* Barra de Busca (Mobile) */}
          <div className="flex lg:hidden w-full mt-3">
            <SearchBar />
          </div>
        </div>
      </div>

      {/* Modal de Login / Cadastro */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowAuthModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-modal-in" onClick={(e) => e.stopPropagation()}>
            {/* Header do modal */}
            <div className="relative px-6 pt-6 pb-4">
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <i className="fas fa-times"></i>
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: brandColor }}>
                  <i className="fas fa-mobile-alt text-white text-sm"></i>
                </div>
                <div>
                  <p className="font-bold text-gray-900">Bem-vindo!</p>
                  <p className="text-xs text-gray-500">Acesse sua conta ou cadastre-se</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => { setAuthTab('login'); setFormError(''); }}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                    authTab === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Entrar
                </button>
                <button
                  onClick={() => { setAuthTab('register'); setFormError(''); }}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                    authTab === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Cadastrar
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="px-6 pb-6">
              {/* Mensagem de erro */}
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                  <i className="fas fa-exclamation-circle text-red-500 text-sm"></i>
                  <p className="text-red-600 text-sm">{formError}</p>
                </div>
              )}

              {authTab === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                        <i className="fas fa-envelope text-sm"></i>
                      </span>
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 transition-colors"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                        <i className="fas fa-lock text-sm"></i>
                      </span>
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Sua senha"
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 transition-colors"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: brandColor }} />
                      <span className="text-xs text-gray-600">Lembrar-me</span>
                    </label>
                    <button type="button" className="text-xs font-medium hover:underline" style={{ color: brandColor }}>
                      Esqueci a senha
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-all text-sm disabled:opacity-60"
                    style={{ backgroundColor: brandColor }}
                  >
                    {formLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <i className="fas fa-spinner fa-spin"></i> Entrando...
                      </span>
                    ) : 'Entrar'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                        <i className="fas fa-user text-sm"></i>
                      </span>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Seu nome"
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 transition-colors"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                        <i className="fas fa-envelope text-sm"></i>
                      </span>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 transition-colors"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                        <i className="fas fa-lock text-sm"></i>
                      </span>
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Crie uma senha (mín. 6 caracteres)"
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 transition-colors"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-all text-sm disabled:opacity-60"
                    style={{ backgroundColor: brandColor }}
                  >
                    {formLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <i className="fas fa-spinner fa-spin"></i> Criando conta...
                      </span>
                    ) : 'Criar conta'}
                  </button>
                  <p className="text-xs text-gray-500 text-center">
                    Ao cadastrar, você concorda com nossos Termos de Uso e Política de Privacidade.
                  </p>
                </form>
              )}
            </div>
          </div>

          <style jsx>{`
            @keyframes modal-in {
              from {
                opacity: 0;
                transform: scale(0.95) translateY(10px);
              }
              to {
                opacity: 1;
                transform: scale(1) translateY(0);
              }
            }
            .animate-modal-in {
              animation: modal-in 0.2s ease-out;
            }
          `}</style>
        </div>
      )}
    </>
  );
}
