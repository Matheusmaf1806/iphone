'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AffiliateLayout from './AffiliateLayout';
import Loader from '../Loader';
import ImageUpload from '../shared/ImageUpload';

export default function AffiliateSettings({ session }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    cpf: '',
    pix_key: '',
    profile_photo_url: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    address_zip: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/affiliate/settings');
      const data = await response.json();

      if (data.success) {
        setFormData(data.data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess('');
    setSaving(true);

    try {
      // Only send fields relevant to the current tab (never commission_percentage)
      let payload;
      if (activeTab === 'personal') {
        payload = {
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          cpf: formData.cpf,
          pix_key: formData.pix_key,
          profile_photo_url: formData.profile_photo_url,
        };
      } else if (activeTab === 'address') {
        payload = {
          address_street: formData.address_street,
          address_number: formData.address_number,
          address_complement: formData.address_complement,
          address_neighborhood: formData.address_neighborhood,
          address_city: formData.address_city,
          address_state: formData.address_state,
          address_zip: formData.address_zip,
        };
      }

      const response = await fetch('/api/affiliate/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Configurações atualizadas com sucesso!');
        // Refresh session cookie so sidebar updates (e.g. profile photo)
        try { await fetch('/api/affiliate/refresh-session', { method: 'POST' }); } catch (e) {}
        setTimeout(() => router.refresh(), 1500);
      } else {
        setErrors({ general: data.error });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setErrors({ general: 'Erro ao salvar configurações' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrors({ confirmPassword: 'As senhas não coincidem' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setErrors({ newPassword: 'A senha deve ter no mínimo 6 caracteres' });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/affiliate/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: true,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Senha atualizada com sucesso!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setErrors({ general: data.error });
      }
    } catch (error) {
      console.error('Error updating password:', error);
      setErrors({ general: 'Erro ao atualizar senha' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AffiliateLayout session={session}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader size="lg" className="mx-auto mb-4" />
            <p className="text-gray-600">Carregando...</p>
          </div>
        </div>
      </AffiliateLayout>
    );
  }

  return (
    <AffiliateLayout session={session}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <i className="fas fa-cog text-brand-yellow"></i>
            Configurações
          </h1>
          <p className="text-gray-600">
            Gerencie suas informações e preferências
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center gap-3">
            <i className="fas fa-check-circle text-green-600 text-xl"></i>
            <p className="text-green-700 font-medium">{success}</p>
          </div>
        )}

        {/* Error Message */}
        {errors.general && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3">
            <i className="fas fa-exclamation-circle text-red-600 text-xl"></i>
            <p className="text-red-700 font-medium">{errors.general}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl p-2 shadow-md">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { id: 'personal', label: 'Dados Pessoais', icon: 'fa-user' },
              { id: 'address', label: 'Endereço', icon: 'fa-map-marker-alt' },
              { id: 'security', label: 'Segurança', icon: 'fa-lock' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-brand-yellow text-gray-900 shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <i className={`fas ${tab.icon} mr-2`}></i>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-md">
          {/* Dados Pessoais */}
          {activeTab === 'personal' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Informações Pessoais</h2>

              {/* Profile Photo */}
              <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex-shrink-0">
                  {formData.profile_photo_url ? (
                    <img
                      src={formData.profile_photo_url}
                      alt="Foto de perfil"
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-brand-yellow to-yellow-400 rounded-full flex items-center justify-center text-2xl font-bold text-gray-900 border-4 border-white shadow-md">
                      {formData.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-2">Foto de Perfil</p>
                  <ImageUpload
                    value={formData.profile_photo_url || ''}
                    onChange={(url) => setFormData({ ...formData, profile_photo_url: url })}
                    label="Foto de Perfil"
                    compact={true}
                    folder="affiliates"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-yellow transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-yellow transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-yellow transition-colors"
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={formData.cpf || ''}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-yellow transition-colors"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chave PIX
                  </label>
                  <input
                    type="text"
                    value={formData.pix_key || ''}
                    onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-yellow transition-colors"
                    placeholder="Digite sua chave PIX"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Usada para receber seus saques
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-r from-brand-yellow to-yellow-400 text-gray-900 font-bold py-4 rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader size="xs" className="mr-2 inline-block" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    Salvar Alterações
                  </>
                )}
              </button>
            </form>
          )}

          {/* Endereço */}
          {activeTab === 'address' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Endereço</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CEP
                  </label>
                  <input
                    type="text"
                    value={formData.address_zip || ''}
                    onChange={(e) => setFormData({ ...formData, address_zip: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-yellow transition-colors"
                    placeholder="00000-000"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rua
                  </label>
                  <input
                    type="text"
                    value={formData.address_street || ''}
                    onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-yellow transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número
                  </label>
                  <input
                    type="text"
                    value={formData.address_number || ''}
                    onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-yellow transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={formData.address_complement || ''}
                    onChange={(e) => setFormData({ ...formData, address_complement: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-yellow transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={formData.address_neighborhood || ''}
                    onChange={(e) => setFormData({ ...formData, address_neighborhood: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-yellow transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.address_city || ''}
                    onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-yellow transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <select
                    value={formData.address_state || ''}
                    onChange={(e) => setFormData({ ...formData, address_state: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-yellow transition-colors"
                  >
                    <option value="">Selecione</option>
                    <option value="SP">São Paulo</option>
                    <option value="RJ">Rio de Janeiro</option>
                    <option value="MG">Minas Gerais</option>
                    <option value="BA">Bahia</option>
                    {/* Adicionar outros estados */}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-r from-brand-yellow to-yellow-400 text-gray-900 font-bold py-4 rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader size="xs" className="mr-2 inline-block" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    Salvar Endereço
                  </>
                )}
              </button>
            </form>
          )}

          {/* Segurança */}
          {activeTab === 'security' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Alterar Senha</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha Atual *
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-yellow transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nova Senha *
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className={`w-full px-4 py-3 border-2 ${
                      errors.newPassword ? 'border-red-500' : 'border-gray-200'
                    } rounded-xl focus:outline-none focus:border-brand-yellow transition-colors`}
                    required
                  />
                  {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Nova Senha *
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className={`w-full px-4 py-3 border-2 ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-200'
                    } rounded-xl focus:outline-none focus:border-brand-yellow transition-colors`}
                    required
                  />
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-r from-brand-yellow to-yellow-400 text-gray-900 font-bold py-4 rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader size="xs" className="mr-2 inline-block" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-lock mr-2"></i>
                    Atualizar Senha
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </AffiliateLayout>
  );
}
