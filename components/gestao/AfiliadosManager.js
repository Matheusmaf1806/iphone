'use client';

import { useState, useEffect } from 'react';
import ImageUpload from '../shared/ImageUpload';

const DEFAULT_COLORS = {
  primary_color: '#0043f7',
  background_color: '#ebf0f6',
  button_color: '#0043f7',
  button_text_color: '#ffffff',
  button_hover: '#0036c6',
};

const INITIAL_FORM = {
  name: '',
  slug: '',
  domain: '',
  cnpj: '',
  commission_rate: '0.10',
  logo_url: '',
  primary_color: DEFAULT_COLORS.primary_color,
  background_color: DEFAULT_COLORS.background_color,
  button_color: DEFAULT_COLORS.button_color,
  button_text_color: DEFAULT_COLORS.button_text_color,
  button_hover: DEFAULT_COLORS.button_hover,
  user_full_name: '',
  user_email: '',
  user_username: '',
  user_password: '',
};

export default function AfiliadosManager() {
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ ...INITIAL_FORM });

  useEffect(() => {
    loadAffiliates();
  }, []);

  const loadAffiliates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/affiliates', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setAffiliates(data.affiliates || []);
      }
    } catch (err) {
      console.error('Error fetching affiliates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'name') {
      const slug = value
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData(prev => ({ ...prev, slug }));
    }

    if (name === 'user_email' && !formData.user_username) {
      const username = value.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
      setFormData(prev => ({ ...prev, user_username: username }));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.slug) {
      setError('Nome e slug do afiliado são obrigatórios');
      return;
    }
    if (!formData.user_full_name || !formData.user_email || !formData.user_username || !formData.user_password) {
      setError('Todos os campos do primeiro usuário são obrigatórios');
      return;
    }
    if (formData.user_password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/affiliates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setAffiliates(prev => [...prev, data.affiliate]);
        setShowForm(false);
        setFormData({ ...INITIAL_FORM });
      } else {
        setError(data.error || 'Erro ao criar afiliado');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (affiliate) => {
    try {
      const res = await fetch('/api/affiliates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: affiliate.id, is_active: !affiliate.is_active }),
      });

      const data = await res.json();
      if (data.success) {
        setAffiliates(prev => prev.map(a => a.id === affiliate.id ? { ...a, is_active: !a.is_active } : a));
      }
    } catch (err) {
      console.error('Error toggling affiliate:', err);
    }
  };

  const formatCommission = (rate) => {
    if (!rate) return '10%';
    const num = parseFloat(rate);
    return num < 1 ? `${(num * 100).toFixed(0)}%` : `${num}%`;
  };

  const ColorInput = ({ label, name, value }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          name={name}
          value={value}
          onChange={handleChange}
          className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
        />
        <input
          type="text"
          name={name}
          value={value}
          onChange={handleChange}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-400"
          placeholder="#000000"
          maxLength={7}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Afiliados Cadastrados</h2>
          <button
            onClick={() => { setShowForm(!showForm); setError(''); }}
            className="bg-gray-900 text-white px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm flex items-center gap-2"
          >
            {showForm ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                Cancelar
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Novo Afiliado
              </>
            )}
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <form onSubmit={handleCreate} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {error}
                </div>
              )}

              {/* SECTION 1 - Dados do Afiliado */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">1</span>
                  <h3 className="font-semibold text-gray-900">Dados do Afiliado</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Ex: Loja do João"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                    <input
                      name="slug"
                      value={formData.slug}
                      onChange={handleChange}
                      required
                      placeholder="loja-do-joao"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm font-mono"
                    />
                    <p className="text-xs text-gray-400 mt-1">Gerado automaticamente do nome</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Domínio</label>
                    <input
                      name="domain"
                      value={formData.domain}
                      onChange={handleChange}
                      placeholder="loja.exemplo.com.br"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                    <input
                      name="cnpj"
                      value={formData.cnpj}
                      onChange={handleChange}
                      placeholder="00.000.000/0000-00"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Comissão</label>
                    <select
                      name="commission_rate"
                      value={formData.commission_rate}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                    >
                      <option value="0.05">5%</option>
                      <option value="0.08">8%</option>
                      <option value="0.10">10%</option>
                      <option value="0.12">12%</option>
                      <option value="0.15">15%</option>
                      <option value="0.20">20%</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2 - Identidade Visual */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">2</span>
                  <h3 className="font-semibold text-gray-900">Identidade Visual</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Logo upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo do Afiliado</label>
                    <ImageUpload
                      value={formData.logo_url}
                      onChange={(url) => setFormData(prev => ({ ...prev, logo_url: url }))}
                      label="Logo"
                      folder="affiliates"
                      compact
                    />
                  </div>

                  {/* Preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="h-10 flex items-center px-4 gap-3" style={{ backgroundColor: formData.primary_color }}>
                        {formData.logo_url ? (
                          <img src={formData.logo_url} alt="" className="h-6 object-contain" />
                        ) : (
                          <span className="text-white text-xs font-bold">{formData.name || 'Logo'}</span>
                        )}
                      </div>
                      <div className="p-4" style={{ backgroundColor: formData.background_color }}>
                        <div className="text-xs text-gray-500 mb-2">Exemplo de botão:</div>
                        <button
                          type="button"
                          className="px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                          style={{
                            backgroundColor: formData.button_color,
                            color: formData.button_text_color,
                          }}
                        >
                          Comprar Agora
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Colors grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
                  <ColorInput label="Cor Principal" name="primary_color" value={formData.primary_color} />
                  <ColorInput label="Fundo" name="background_color" value={formData.background_color} />
                  <ColorInput label="Botão" name="button_color" value={formData.button_color} />
                  <ColorInput label="Texto do Botão" name="button_text_color" value={formData.button_text_color} />
                  <ColorInput label="Botão Hover" name="button_hover" value={formData.button_hover} />
                </div>
              </div>

              {/* SECTION 3 - Primeiro Usuário */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">3</span>
                  <h3 className="font-semibold text-gray-900">Primeiro Usuário (Dono)</h3>
                  <span className="text-xs text-gray-400 ml-1">Acesso total ao painel do afiliado</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                    <input
                      name="user_full_name"
                      value={formData.user_full_name}
                      onChange={handleChange}
                      required
                      placeholder="João da Silva"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      name="user_email"
                      type="email"
                      value={formData.user_email}
                      onChange={handleChange}
                      required
                      placeholder="joao@exemplo.com"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Usuário *</label>
                    <input
                      name="user_username"
                      value={formData.user_username}
                      onChange={handleChange}
                      required
                      placeholder="joaosilva"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm font-mono"
                    />
                    <p className="text-xs text-gray-400 mt-1">Usado para login no painel do afiliado</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                    <input
                      name="user_password"
                      type="password"
                      value={formData.user_password}
                      onChange={handleChange}
                      required
                      minLength={6}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-400">* Campos obrigatórios</p>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-gray-900 text-white px-8 py-2.5 rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Criando...
                    </>
                  ) : (
                    'Criar Afiliado'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Carregando...</div>
          ) : affiliates.length === 0 ? (
            <div className="p-12 text-center text-gray-400">Nenhum afiliado cadastrado</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Afiliado</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Slug</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Domínio</th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Comissão</th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {affiliates.map(aff => (
                  <tr key={aff.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {aff.logo_url ? (
                          <img src={aff.logo_url} alt={aff.name} className="w-8 h-8 rounded-lg object-contain border border-gray-200" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                            {aff.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{aff.name}</p>
                          {aff.cnpj && <p className="text-xs text-gray-400">{aff.cnpj}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 font-mono">{aff.slug}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">{aff.domain || aff.subdomain || aff.custom_domain || '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-semibold text-gray-700">{formatCommission(aff.commission_rate)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        aff.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${aff.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                        {aff.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleActive(aff)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                          aff.is_active
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {aff.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
