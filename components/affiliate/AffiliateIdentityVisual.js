'use client';

import { useState, useEffect } from 'react';
import AffiliateLayout from './AffiliateLayout';
import Loader from '../Loader';
import ImageUpload from '../shared/ImageUpload';
import { SITE_NAME } from '../../lib/siteConfig';

export default function AffiliateIdentityVisual({ session }) {
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0043f7');
  const [backgroundColor, setBackgroundColor] = useState('#ebf0f6');
  const [buttonColor, setButtonColor] = useState('#0043f7');
  const [buttonTextColor, setButtonTextColor] = useState('#0c0e0b');
  const [buttonHover, setButtonHover] = useState('#0036c6');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/affiliate/settings/visual', {
        credentials: 'include',
      });

      const result = await response.json();

      console.log('API Response:', { status: response.status, result });

      if (!response.ok) {
        throw new Error(result.error || `Erro ${response.status}: ${response.statusText}`);
      }

      if (result.success && result.data) {
        setLogoUrl(result.data.logoUrl || '');
        setFaviconUrl(result.data.faviconUrl || '');
        setPrimaryColor(result.data.primaryColor || '#0043f7');
        setBackgroundColor(result.data.backgroundColor || '#ebf0f6');
        setButtonColor(result.data.buttonColor || '#0043f7');
        setButtonTextColor(result.data.buttonTextColor || '#0c0e0b');
        setButtonHover(result.data.buttonHover || '#0036c6');
        setInstagramHandle(result.data.instagramHandle || '');
        setWhatsappNumber(result.data.whatsappNumber || '');
      } else {
        throw new Error(result.error || 'Resposta inválida da API');
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setMessage({ type: 'error', text: `Erro ao carregar configurações: ${error.message}. Usando valores padrão.` });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/affiliate/settings/visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          logoUrl,
          faviconUrl,
          primaryColor,
          backgroundColor,
          buttonColor,
          buttonTextColor,
          buttonHover,
          instagramHandle,
          whatsappNumber,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao salvar configurações');
      }

      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar configurações. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = () => {
    if (confirm('Tem certeza que deseja resetar todas as configurações?')) {
      setLogoUrl('');
      setFaviconUrl('');
      setPrimaryColor('#0043f7');
      setBackgroundColor('#ebf0f6');
      setButtonColor('#0043f7');
      setButtonTextColor('#0c0e0b');
      setButtonHover('#0036c6');
      setInstagramHandle('');
      setWhatsappNumber('');
      setMessage({ type: 'info', text: 'Configurações resetadas. Clique em "Salvar" para aplicar.' });
    }
  };

  const ColorInput = ({ label, value, onChange, description }) => (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
          <i className="fas fa-palette text-white"></i>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{label}</h2>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Cor:</label>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-12 w-20 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-brand-yellow transition-colors"
          />
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/20 transition-all"
          placeholder="#0043f7"
          maxLength={7}
        />

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Prévia:</span>
          <div
            className="h-12 w-24 rounded-lg border-2 border-gray-300 shadow-inner"
            style={{ backgroundColor: value }}
          />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <AffiliateLayout session={session}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader size="lg" className="mx-auto mb-4" />
            <p className="text-gray-600">Carregando configurações...</p>
          </div>
        </div>
      </AffiliateLayout>
    );
  }

  return (
    <AffiliateLayout session={session}>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Identidade Visual
          </h1>
          <p className="text-gray-600">
            Personalize a aparência da sua loja com suas cores e logo
          </p>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' :
            message.type === 'error' ? 'bg-red-50 text-red-800' :
            'bg-blue-50 text-blue-800'
          }`}>
            <i className={`fas ${
              message.type === 'success' ? 'fa-check-circle' :
              message.type === 'error' ? 'fa-exclamation-circle' :
              'fa-info-circle'
            }`}></i>
            <span className="font-medium">{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="ml-auto"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* Logo */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <i className="fas fa-image text-white"></i>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Logo da Loja</h2>
                <p className="text-sm text-gray-600">Logo que aparece no cabeçalho da sua loja</p>
              </div>
            </div>

            <ImageUpload
              value={logoUrl}
              onChange={(url) => setLogoUrl(url)}
              label="Logo da Loja"
              folder="affiliates"
            />

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <i className="fas fa-info-circle mr-2"></i>
                <strong>Recomendações:</strong>
              </p>
              <ul className="mt-2 space-y-1 text-sm text-blue-800 ml-6">
                <li>• Formato PNG com fundo transparente</li>
                <li>• Altura mínima de 200px</li>
                <li>• Proporção horizontal (mais larga que alta)</li>
              </ul>
            </div>
          </div>

          {/* Favicon */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <i className="fas fa-star text-white"></i>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Favicon</h2>
                <p className="text-sm text-gray-600">Ícone que aparece na aba do navegador</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              <div className="flex-1 w-full sm:w-auto">
                <ImageUpload
                  value={faviconUrl}
                  onChange={(url) => setFaviconUrl(url)}
                  label="Favicon"
                  folder="affiliates"
                  compact
                />
              </div>

              {/* Favicon preview */}
              <div className="flex-shrink-0">
                <p className="text-xs font-medium text-gray-500 mb-2">Prévia na aba:</p>
                <div className="bg-gray-100 rounded-lg border border-gray-300 px-3 py-2 flex items-center gap-2 min-w-[180px]">
                  {faviconUrl ? (
                    <img src={faviconUrl} alt="Favicon" className="w-4 h-4 object-contain" />
                  ) : (
                    <span className="w-4 h-4 rounded-sm bg-gray-800 flex-shrink-0" />
                  )}
                  <span className="text-xs text-gray-600 truncate">Minha Loja</span>
                  <span className="text-gray-300 ml-auto text-xs">x</span>
                </div>
              </div>
            </div>

            <div className="mt-3 p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-green-800">
                <i className="fas fa-info-circle mr-1"></i>
                <strong>Recomendação:</strong> Use uma imagem quadrada (ex: 64x64px ou 128x128px) em PNG com fundo transparente.
                {!faviconUrl && ` Sem favicon personalizado, será usado o ícone padrão ${SITE_NAME}.`}
              </p>
            </div>
          </div>

          {/* Contato público */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-orange-400 rounded-xl flex items-center justify-center">
                <i className="fab fa-instagram text-white"></i>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Contato Público</h2>
                <p className="text-sm text-gray-600">Aparece nos banners e destaques da sua loja</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instagram
                </label>
                <div className="flex items-center border-2 border-gray-300 rounded-lg overflow-hidden focus-within:border-brand-yellow">
                  <span className="px-3 text-gray-500 bg-gray-50 h-full flex items-center border-r border-gray-300">@</span>
                  <input
                    type="text"
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value.replace(/^@/, ''))}
                    placeholder="minhaloja"
                    className="flex-1 px-3 py-2.5 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp (com DDI e DDD)
                </label>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="5511999999999"
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-brand-yellow"
                />
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              <i className="fas fa-info-circle mr-1"></i>
              Sem esses dados, os botões de Instagram e "Fale com um especialista" não aparecem na loja.
            </p>
          </div>

          {/* Cores */}
          <div className="space-y-6">
            <ColorInput
              label="Cor Principal"
              description="Cor principal da marca (cabeçalho e destaques)"
              value={primaryColor}
              onChange={setPrimaryColor}
            />

            <ColorInput
              label="Cor de Fundo"
              description="Cor de fundo da página"
              value={backgroundColor}
              onChange={setBackgroundColor}
            />

            <ColorInput
              label="Cor dos Botões"
              description="Cor padrão dos botões de ação"
              value={buttonColor}
              onChange={setButtonColor}
            />

            <ColorInput
              label="Cor do Texto dos Botões"
              description="Cor do texto dentro dos botões"
              value={buttonTextColor}
              onChange={setButtonTextColor}
            />

            <ColorInput
              label="Cor de Hover dos Botões"
              description="Cor dos botões quando o mouse passa por cima"
              value={buttonHover}
              onChange={setButtonHover}
            />
          </div>

          {/* Preview de Botão */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <i className="fas fa-eye text-white"></i>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Pré-visualização do Botão</h2>
                <p className="text-sm text-gray-600">Veja como os botões ficarão com suas cores</p>
              </div>
            </div>

            <div className="p-8 bg-gray-50 rounded-lg flex items-center justify-center">
              <button
                className="px-8 py-3 rounded-lg font-bold shadow-md transition-all transform hover:scale-105"
                style={{
                  backgroundColor: buttonColor,
                  color: buttonTextColor,
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = buttonHover}
                onMouseLeave={(e) => e.target.style.backgroundColor = buttonColor}
              >
                <i className="fas fa-shopping-cart mr-2"></i>
                Adicionar ao Carrinho
              </button>
            </div>
          </div>

          {/* Dica */}
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl shadow-md p-6">
            <div className="flex items-start gap-3">
              <i className="fas fa-lightbulb text-yellow-500 text-2xl"></i>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Dica de Design</h3>
                <p className="text-sm text-gray-700">
                  Escolha cores que tenham bom contraste entre si para garantir legibilidade.
                  A cor do texto dos botões deve contrastar bem com a cor de fundo do botão.
                  Use ferramentas como o verificador de contraste WCAG para garantir acessibilidade.
                </p>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={resetSettings}
              disabled={saving}
              className="flex-1 sm:flex-none px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-undo mr-2"></i>
              Resetar
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-8 py-3 bg-brand-yellow text-white rounded-lg font-bold hover:bg-yellow-400 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader size="xs" className="mr-2 inline-block" />
                  Salvando...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  Salvar Configurações
                </>
              )}
            </button>
          </div>

          {/* Preview Link */}
          <div className="bg-gradient-to-r from-brand-yellow to-yellow-400 rounded-xl shadow-md p-6 text-center">
            <p className="text-gray-900 font-semibold mb-3">
              Quer ver como sua loja ficará?
            </p>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-lg font-bold hover:shadow-lg transition-all"
            >
              <i className="fas fa-external-link-alt"></i>
              Visualizar Loja
            </a>
          </div>
        </div>
      </div>
    </AffiliateLayout>
  );
}
