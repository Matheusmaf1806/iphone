'use client';

import { useState } from 'react';
import ProductModal from './ProductModal';
import BulkProductModal from './BulkProductModal';
import CsvImportModal from './CsvImportModal';
import DuplicatesModal from './DuplicatesModal';
import BulkAIModal from './BulkAIModal';

export default function ProductList({ initialProducts }) {
  const [products, setProducts] = useState(initialProducts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [settingUnlimitedStock, setSettingUnlimitedStock] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterNoImage, setFilterNoImage] = useState(false);
  const [filterNoDescription, setFilterNoDescription] = useState(false);
  const [filterNoMeta, setFilterNoMeta] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkAIOpen, setIsBulkAIOpen] = useState(false);

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleProductSaved = (product) => {
    // Atualizar lista de produtos
    if (selectedProduct) {
      setProducts(products.map(p => p.id === product.id ? product : p));
    } else {
      setProducts([product, ...products]);
    }
    handleCloseModal();
  };

  const handleBulkProductsSaved = () => {
    // Recarregar página para atualizar lista de produtos
    window.location.reload();
  };

  const handleSetUnlimitedStock = async () => {
    if (!confirm('Deseja definir o estoque de TODOS os produtos como Ilimitado (-1)? Esta ação não pode ser desfeita.')) return;
    setSettingUnlimitedStock(true);
    try {
      const res = await fetch('/api/products/bulk-stock', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        alert('Estoque de todos os produtos definido como ilimitado!');
        window.location.reload();
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (err) {
      alert('Erro ao conectar com o servidor');
    } finally {
      setSettingUnlimitedStock(false);
    }
  };

  const handleDuplicateProduct = async (product) => {
    if (!confirm(`Deseja duplicar o produto "${product.name}"?`)) return;

    try {
      const response = await fetch('/api/products/duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Importante: incluir cookies na requisição
        body: JSON.stringify({ productId: product.id }),
      });

      const data = await response.json();

      if (data.success) {
        setProducts([data.product, ...products]);
        alert('Produto duplicado com sucesso!');
      } else {
        alert(`Erro ao duplicar produto: ${data.error}`);
      }
    } catch (error) {
      console.error('Error duplicating product:', error);
      alert('Erro ao conectar com o servidor');
    }
  };

  // Calcular preço de venda
  const calculateSalePrice = (product) => {
    if (!product.cost_price || !product.supplier_margin_percentage) return 0;
    const salePrice = product.cost_price / (1 - product.supplier_margin_percentage / 100);
    return salePrice.toFixed(2);
  };

  // Filtrar produtos
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || product.category === filterCategory;
    const matchesNoImage = !filterNoImage || !product.image_url;
    const matchesNoDescription = !filterNoDescription || !product.description?.trim();
    const matchesNoMeta = !filterNoMeta || (!product.meta_title?.trim() || !product.meta_description?.trim());
    return matchesSearch && matchesCategory && matchesNoImage && matchesNoDescription && matchesNoMeta;
  });

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredProducts.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const handleFilterChange = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  // Seleção de produtos
  const allVisibleIds = paginatedProducts.map(p => p.id);
  const allVisibleSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id));
  const someVisibleSelected = allVisibleIds.some(id => selectedIds.has(id));

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        allVisibleIds.forEach(id => next.delete(id));
      } else {
        allVisibleIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedProducts = products.filter(p => selectedIds.has(p.id));

  const handleBulkAIDone = (updatedProducts) => {
    setProducts(prev => prev.map(p => {
      const updated = updatedProducts.find(u => u.id === p.id);
      return updated || p;
    }));
    setSelectedIds(new Set());
    setIsBulkAIOpen(false);
  };

  // Obter categorias únicas
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  return (
    <>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total de Produtos</p>
                <p className="text-3xl font-bold mt-2">{products.length}</p>
              </div>
              <div className="bg-blue-400 bg-opacity-30 rounded-full p-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Produtos Ativos</p>
                <p className="text-3xl font-bold mt-2">{products.filter(p => p.is_active).length}</p>
              </div>
              <div className="bg-green-400 bg-opacity-30 rounded-full p-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Estoque Total</p>
                <p className="text-3xl font-bold mt-2">
                  {products.some(p => p.stock_quantity === -1 || p.stock_type === 'unlimited')
                    ? '∞'
                    : products.reduce((sum, p) => sum + (p.stock_quantity || 0), 0)}
                </p>
              </div>
              <div className="bg-yellow-400 bg-opacity-30 rounded-full p-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Categorias</p>
                <p className="text-3xl font-bold mt-2">{categories.length}</p>
              </div>
              <div className="bg-purple-400 bg-opacity-30 rounded-full p-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl shadow-md p-4">
          {/* Row 1: Search + Filters */}
          <div className="flex flex-wrap gap-3 mb-3">
            <div className="flex-1 min-w-48">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <select
              value={filterCategory}
              onChange={(e) => handleFilterChange(setFilterCategory)(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
            >
              <option value="">Todas as Categorias</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors whitespace-nowrap select-none text-sm">
              <input
                type="checkbox"
                checked={filterNoImage}
                onChange={(e) => handleFilterChange(setFilterNoImage)(e.target.checked)}
                className="w-4 h-4 accent-yellow-500"
              />
              <span className="font-medium text-gray-700">Sem imagem</span>
            </label>

            <label className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors whitespace-nowrap select-none text-sm">
              <input
                type="checkbox"
                checked={filterNoDescription}
                onChange={(e) => handleFilterChange(setFilterNoDescription)(e.target.checked)}
                className="w-4 h-4 accent-yellow-500"
              />
              <span className="font-medium text-gray-700">Sem descrição</span>
            </label>

            <label className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors whitespace-nowrap select-none text-sm">
              <input
                type="checkbox"
                checked={filterNoMeta}
                onChange={(e) => handleFilterChange(setFilterNoMeta)(e.target.checked)}
                className="w-4 h-4 accent-yellow-500"
              />
              <span className="font-medium text-gray-700">Sem meta tag</span>
            </label>

            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
            >
              <option value={10}>10 / página</option>
              <option value={25}>25 / página</option>
              <option value={50}>50 / página</option>
              <option value={100}>100 / página</option>
            </select>
          </div>

          {/* Row 2: Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-sm whitespace-nowrap flex items-center gap-1.5 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Importar CSV
            </button>

            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm whitespace-nowrap flex items-center gap-1.5 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Cadastro em Massa
            </button>

            <button
              onClick={() => setIsDuplicatesModalOpen(true)}
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm whitespace-nowrap flex items-center gap-1.5 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Duplicados
            </button>

            <button
              onClick={handleSetUnlimitedStock}
              disabled={settingUnlimitedStock}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-sm whitespace-nowrap flex items-center gap-1.5 text-sm disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {settingUnlimitedStock ? 'Atualizando...' : 'Estoque Ilimitado'}
            </button>

            <button
              onClick={handleAddProduct}
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 font-bold py-2 px-4 rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition-all shadow-sm whitespace-nowrap flex items-center gap-1.5 text-sm ml-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Produto
            </button>
          </div>
        </div>

        {/* Product Grid/List */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum produto encontrado</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || filterCategory || filterNoImage
                  ? 'Tente ajustar seus filtros de busca'
                  : 'Comece adicionando seu primeiro produto'}
              </p>
              {!searchTerm && !filterCategory && !filterNoImage && (
                <button
                  onClick={handleAddProduct}
                  className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 font-bold py-3 px-6 rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition-all inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Adicionar Primeiro Produto
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="pl-4 pr-2 py-4 w-10">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        ref={el => { if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected; }}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 accent-yellow-500 cursor-pointer"
                        title="Selecionar todos visíveis"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Categoria
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Custo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Margem
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Preço Venda
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Estoque
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedProducts.map((product) => {
                    const salePrice = calculateSalePrice(product);
                    return (
                      <tr key={product.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(product.id) ? 'bg-yellow-50' : ''}`}>
                        <td className="pl-4 pr-2 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(product.id)}
                            onChange={() => toggleSelect(product.id)}
                            className="w-4 h-4 accent-yellow-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-14 h-14 object-cover rounded-lg border border-gray-200"
                                onError={(e) => {
                                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="56" height="56"%3E%3Crect fill="%23f3f4f6" width="56" height="56"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3E📦%3C/text%3E%3C/svg%3E';
                                }}
                              />
                            ) : (
                              <div className="w-14 h-14 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center text-2xl">
                                📦
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-gray-900">
                                {product.name}
                              </p>
                              <p className="text-sm text-gray-500 font-mono">
                                {product.slug}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {product.category || 'Sem categoria'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          R$ {parseFloat(product.cost_price || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800">
                            {parseFloat(product.supplier_margin_percentage || 0).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-green-600">
                          R$ {salePrice}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {product.stock_quantity === -1 || product.stock_type === 'unlimited' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                              ∞ Ilimitado
                            </span>
                          ) : (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              product.stock_quantity === 0
                                ? 'bg-red-100 text-red-800'
                                : product.stock_quantity < 10
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {product.stock_quantity} un
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            product.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {product.is_active ? '✓ Ativo' : '○ Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar produto"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDuplicateProduct(product)}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Duplicar produto"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <a
                              href={`/produto/${product.slug}`}
                              target="_blank"
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Ver na loja"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                Mostrando{' '}
                <span className="font-semibold">{filteredProducts.length === 0 ? 0 : (safePage - 1) * itemsPerPage + 1}</span>
                {' '}–{' '}
                <span className="font-semibold">{Math.min(safePage * itemsPerPage, filteredProducts.length)}</span>
                {' '}de{' '}
                <span className="font-semibold">{filteredProducts.length}</span> produto(s)
              </p>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={safePage === 1}
                    className="px-2 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Primeira página"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ‹ Anterior
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || Math.abs(page - safePage) <= 2)
                    .reduce((acc, page, idx, arr) => {
                      if (idx > 0 && page - arr[idx - 1] > 1) acc.push('...');
                      acc.push(page);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 py-1.5 text-gray-400 text-sm select-none">…</span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setCurrentPage(item)}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            safePage === item
                              ? 'bg-yellow-400 text-gray-900 font-bold shadow-sm'
                              : 'text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Próxima ›
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safePage === totalPages}
                    className="px-2 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Última página"
                  >
                    »
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-gray-700">
          <span className="text-sm font-medium text-gray-300">
            {selectedIds.size} produto{selectedIds.size > 1 ? 's' : ''} selecionado{selectedIds.size > 1 ? 's' : ''}
          </span>
          <div className="w-px h-5 bg-gray-600" />
          <button
            onClick={() => setIsBulkAIOpen(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold py-1.5 px-4 rounded-lg text-sm flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Gerar IA em lote
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-gray-400 hover:text-white text-sm transition-colors px-1"
            title="Limpar seleção"
          >
            ✕
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <ProductModal
          product={selectedProduct}
          onClose={handleCloseModal}
          onSave={handleProductSaved}
        />
      )}

      {/* Bulk Product Modal */}
      {isBulkModalOpen && (
        <BulkProductModal
          onClose={() => setIsBulkModalOpen(false)}
          onSave={handleBulkProductsSaved}
        />
      )}

      {/* CSV Import Modal */}
      {isCsvModalOpen && (
        <CsvImportModal
          onClose={() => setIsCsvModalOpen(false)}
          onSave={handleBulkProductsSaved}
        />
      )}

      {/* Duplicates Modal */}
      {isDuplicatesModalOpen && (
        <DuplicatesModal
          onClose={() => setIsDuplicatesModalOpen(false)}
          onDeleted={handleBulkProductsSaved}
        />
      )}

      {/* Bulk AI Modal */}
      {isBulkAIOpen && (
        <BulkAIModal
          products={selectedProducts}
          onClose={() => setIsBulkAIOpen(false)}
          onDone={handleBulkAIDone}
        />
      )}
    </>
  );
}
