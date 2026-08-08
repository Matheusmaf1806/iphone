'use client';

import { useState, useEffect } from 'react';

const ALERT_LABELS = {
  expensive: { label: 'Mais caro', color: 'bg-red-100 text-red-700', icon: '↑' },
  cheap: { label: 'Mais barato', color: 'bg-blue-100 text-blue-700', icon: '↓' },
  competitive: { label: 'Competitivo', color: 'bg-green-100 text-green-700', icon: '=' },
  no_data: { label: 'Sem dados', color: 'bg-gray-100 text-gray-600', icon: '?' },
  error: { label: 'Erro', color: 'bg-orange-100 text-orange-700', icon: '!' },
};

const MIGRATION_SQL = `CREATE TABLE IF NOT EXISTS price_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  our_price DECIMAL(10,2),
  petlove_price DECIMAL(10,2),
  cobasi_price DECIMAL(10,2),
  petz_price DECIMAL(10,2),
  cheapest_competitor DECIMAL(10,2),
  difference_amount DECIMAL(10,2),
  difference_percentage DECIMAL(6,2),
  alert_type TEXT DEFAULT 'no_data',
  note TEXT,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id)
);`;

export default function PriceIntelligence({ products = [] }) {
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [tableExists, setTableExists] = useState(true);
  const [filterAlert, setFilterAlert] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMigration, setShowMigration] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  useEffect(() => {
    loadComparisons();
  }, []);

  const loadComparisons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/price-check', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setComparisons(data.data || []);
        setTableExists(true);
      } else if (data.error === 'table_not_found') {
        setTableExists(false);
      }
    } catch (err) {
      console.error('Error loading comparisons:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckPrices = async (productList) => {
    if (productList.length === 0) return;
    if (!confirm(`Verificar preços de ${productList.length} produto(s)? Isso pode levar alguns minutos.`)) return;

    setChecking(true);
    setProgress({ current: 0, total: productList.length });

    const BATCH_SIZE = 3;
    const results = [];

    for (let i = 0; i < productList.length; i += BATCH_SIZE) {
      const batch = productList.slice(i, i + BATCH_SIZE);
      try {
        const res = await fetch('/api/ai/price-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ products: batch }),
        });
        const data = await res.json();
        if (data.success) {
          results.push(...data.results);
        }
      } catch (err) {
        console.error('Error in batch:', err);
      }
      setProgress({ current: Math.min(i + BATCH_SIZE, productList.length), total: productList.length });
    }

    setChecking(false);
    await loadComparisons();
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined) return '-';
    return `R$ ${parseFloat(price).toFixed(2)}`;
  };

  const formatDiff = (pct) => {
    if (pct === null || pct === undefined) return null;
    const sign = pct > 0 ? '+' : '';
    return `${sign}${parseFloat(pct).toFixed(1)}%`;
  };

  const filtered = comparisons.filter(c => {
    const matchesSearch = c.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterAlert === 'all' || c.alert_type === filterAlert;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    expensive: comparisons.filter(c => c.alert_type === 'expensive').length,
    cheap: comparisons.filter(c => c.alert_type === 'cheap').length,
    competitive: comparisons.filter(c => c.alert_type === 'competitive').length,
  };

  if (!tableExists) {
    return (
      <div className="space-y-6">
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Inteligência de Preços</h1>
          <p className="text-gray-600">Compare seus preços com Petlove, Cobasi e Petz usando IA</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-bold text-amber-800 mb-1">Configuração necessária</h3>
              <p className="text-sm text-amber-700 mb-4">
                Execute o SQL abaixo no editor SQL do Supabase para ativar a funcionalidade de comparação de preços.
              </p>
              <button
                onClick={() => setShowMigration(!showMigration)}
                className="text-sm text-amber-700 font-semibold underline"
              >
                {showMigration ? 'Ocultar SQL' : 'Ver SQL da migration'}
              </button>
              {showMigration && (
                <pre className="mt-3 p-4 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                  {MIGRATION_SQL}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Inteligência de Preços</h1>
        <p className="text-gray-600">Compare seus preços com Petlove, Cobasi e Petz usando IA com busca na web</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className="bg-white border border-red-200 rounded-xl p-5 cursor-pointer hover:bg-red-50 transition-colors"
          onClick={() => setFilterAlert(filterAlert === 'expensive' ? 'all' : 'expensive')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Mais caros que concorrência</p>
              <p className="text-3xl font-bold text-red-700 mt-1">{stats.expensive}</p>
              <p className="text-xs text-gray-500 mt-1">Considere reduzir o preço</p>
            </div>
            <div className="bg-red-100 rounded-xl p-3 text-2xl">📈</div>
          </div>
        </div>

        <div
          className="bg-white border border-green-200 rounded-xl p-5 cursor-pointer hover:bg-green-50 transition-colors"
          onClick={() => setFilterAlert(filterAlert === 'competitive' ? 'all' : 'competitive')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Competitivos</p>
              <p className="text-3xl font-bold text-green-700 mt-1">{stats.competitive}</p>
              <p className="text-xs text-gray-500 mt-1">Preço dentro da faixa ideal</p>
            </div>
            <div className="bg-green-100 rounded-xl p-3 text-2xl">✅</div>
          </div>
        </div>

        <div
          className="bg-white border border-blue-200 rounded-xl p-5 cursor-pointer hover:bg-blue-50 transition-colors"
          onClick={() => setFilterAlert(filterAlert === 'cheap' ? 'all' : 'cheap')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Mais baratos (oportunidade)</p>
              <p className="text-3xl font-bold text-blue-700 mt-1">{stats.cheap}</p>
              <p className="text-xs text-gray-500 mt-1">Margem para aumentar preço</p>
            </div>
            <div className="bg-blue-100 rounded-xl p-3 text-2xl">💰</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-48 relative">
            <input
              type="text"
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={filterAlert}
            onChange={e => setFilterAlert(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="all">Todos os alertas</option>
            <option value="expensive">Mais caros</option>
            <option value="competitive">Competitivos</option>
            <option value="cheap">Mais baratos</option>
            <option value="no_data">Sem dados</option>
          </select>

          <button
            onClick={loadComparisons}
            disabled={loading}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>

          <button
            onClick={() => handleCheckPrices(products.slice(0, 50))}
            disabled={checking || products.length === 0}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg text-sm font-semibold hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {checking ? `Verificando (${progress.current}/${progress.total})...` : 'Verificar 50 produtos'}
          </button>
        </div>

        {checking && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Verificando preços via IA... {progress.current} de {progress.total} produtos
            </p>
          </div>
        )}
      </div>

      {/* AI Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-blue-700">
          Os preços são pesquisados via IA com busca na web em tempo real. Os resultados são estimativas baseadas em dados públicos e podem variar.
          O preço final calculado inclui a margem BrandPet + margem padrão do afiliado (10%).
        </p>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          Carregando comparações...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {comparisons.length === 0 ? 'Nenhuma comparação ainda' : 'Nenhum resultado encontrado'}
          </h3>
          <p className="text-sm text-gray-500">
            {comparisons.length === 0
              ? 'Clique em "Verificar 50 produtos" para iniciar a análise de preços com IA.'
              : 'Tente ajustar os filtros de busca.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Produto</th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Nosso Preço</th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Petlove</th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Cobasi</th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Petz</th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Menor Concorrente</th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Diferença</th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((c) => {
                  const alert = ALERT_LABELS[c.alert_type] || ALERT_LABELS.no_data;
                  const diffPct = formatDiff(c.difference_percentage);
                  return (
                    <tr key={c.product_id || c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">{c.product_name}</p>
                        {c.note && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{c.note}</p>
                        )}
                        {c.checked_at && (
                          <p className="text-xs text-gray-400">
                            Verificado: {new Date(c.checked_at).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm font-bold text-gray-900">{formatPrice(c.our_price)}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`text-sm ${c.petlove_price ? 'text-gray-700' : 'text-gray-400'}`}>
                          {formatPrice(c.petlove_price)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`text-sm ${c.cobasi_price ? 'text-gray-700' : 'text-gray-400'}`}>
                          {formatPrice(c.cobasi_price)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`text-sm ${c.petz_price ? 'text-gray-700' : 'text-gray-400'}`}>
                          {formatPrice(c.petz_price)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`text-sm font-semibold ${c.cheapest_competitor ? 'text-gray-700' : 'text-gray-400'}`}>
                          {formatPrice(c.cheapest_competitor)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {diffPct && c.alert_type !== 'no_data' && c.alert_type !== 'error' ? (
                          <span className={`text-sm font-bold ${
                            c.difference_percentage > 0 ? 'text-red-600' : 'text-blue-600'
                          }`}>
                            {diffPct}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${alert.color}`}>
                          {alert.icon} {alert.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
