'use client';

import { useState, useEffect, useRef } from 'react';
import ProductVariantsManager from './ProductVariantsManager';
import Loader from '../Loader';

const MAX_IMAGES = 4;

export default function ProductModal({ product, onClose, onSave }) {
  const isEdit = !!product;

  const [showVariantsManager, setShowVariantsManager] = useState(false);

  // Initialize images from product data
  const getInitialImages = () => {
    if (product?.images && product.images.length > 0) {
      return product.images.map(img => img.src || img.url).filter(Boolean).slice(0, MAX_IMAGES);
    }
    if (product?.image_url) {
      return [product.image_url];
    }
    return [];
  };

  const [formData, setFormData] = useState({
    name: product?.name || '',
    slug: product?.slug || '',
    description: product?.description || '',
    short_description: product?.short_description || '',
    meta_title: product?.metaTitle || '',
    meta_description: product?.metaDescription || '',
    category: product?.category || '',
    image_url: product?.image_url || '',
    cost_price: product?.cost_price || '',
    supplier_margin_percentage: product?.supplier_margin_percentage || 10,
    sku: product?.sku || '',
    stock_type: product?.stock_type || 'unlimited',
    stock_quantity: product?.stock_quantity || 0,
    low_stock_threshold: product?.low_stock_threshold || 10,
    weight: product?.weight || '',
    height: product?.height || '',
    width: product?.width || '',
    depth: product?.depth || '',
    is_active: product?.is_active !== false,
    is_featured: product?.is_featured || false,
  });

  const [productImages, setProductImages] = useState(getInitialImages);
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const fileInputRefs = useRef([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatingDesc, setGeneratingDesc] = useState(false);

  // Calcular preço de venda automaticamente
  const calculateSalePrice = () => {
    if (!formData.cost_price || !formData.supplier_margin_percentage) return 0;
    const costPrice = parseFloat(formData.cost_price);
    const margin = parseFloat(formData.supplier_margin_percentage);
    // Fórmula: Preço de Venda = Custo / (1 - Margem/100)
    const salePrice = costPrice / (1 - margin / 100);
    return salePrice;
  };

  // Gerar slug automaticamente do nome
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Gerar slug automaticamente ao digitar o nome
    if (name === 'name' && !isEdit) {
      setFormData(prev => ({
        ...prev,
        slug: generateSlug(value),
      }));
    }
  };

  // Image upload handlers
  const handleImageUpload = async (file, slotIndex) => {
    setUploadingSlot(slotIndex);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'products');

      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const result = await res.json();

      if (result.success) {
        setProductImages(prev => {
          const updated = [...prev];
          if (slotIndex < updated.length) {
            updated[slotIndex] = result.url;
          } else {
            updated.push(result.url);
          }
          return updated;
        });
      } else {
        setError(result.error || 'Erro ao fazer upload');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Erro ao fazer upload da imagem');
    }
    setUploadingSlot(null);
  };

  // Upload múltiplas imagens de uma vez
  const handleMultipleImageUpload = async (files) => {
    const availableSlots = MAX_IMAGES - productImages.length;
    const filesToUpload = Array.from(files).slice(0, availableSlots);

    if (filesToUpload.length === 0) {
      setError(`Limite de ${MAX_IMAGES} fotos atingido`);
      return;
    }

    setUploadingSlot('multi');
    let uploadedCount = 0;

    for (const file of filesToUpload) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'products');

        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const result = await res.json();

        if (result.success) {
          setProductImages(prev => [...prev, result.url]);
          uploadedCount++;
        } else {
          setError(result.error || `Erro ao fazer upload de ${file.name}`);
        }
      } catch (err) {
        console.error('Upload error:', err);
        setError(`Erro ao fazer upload de ${file.name}`);
      }
    }

    setUploadingSlot(null);
  };

  const handleRemoveImage = async (index) => {
    const imageUrl = productImages[index];
    // Remove do estado local imediatamente
    const newImages = productImages.filter((_, i) => i !== index);
    setProductImages(newImages);

    // Se estiver editando, remove do banco também
    if (isEdit && product?.id && imageUrl) {
      try {
        // 1. Remove da tabela product_images
        await fetch('/api/product-images', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            product_id: product.id,
            image_url: imageUrl,
          }),
        });

        // 2. Atualiza image_url diretamente na tabela products via PUT parcial
        await fetch('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            product: {
              id: product.id,
              image_url: newImages.length > 0 ? newImages[0] : null,
              _partialUpdate: true,
            },
          }),
        });
      } catch (err) {
        console.error('Error deleting image from DB:', err);
      }
    }
  };

  const handleMoveImage = (index, direction) => {
    setProductImages(prev => {
      const updated = [...prev];
      const target = index + direction;
      if (target < 0 || target >= updated.length) return prev;
      [updated[index], updated[target]] = [updated[target], updated[index]];
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Calcular preço de venda automaticamente
      const salePrice = calculateSalePrice();

      // Calcular valor da parcela (assumindo parcelamento padrão)
      const defaultInstallments = 21; // Todos produtos podem ser parcelados em até 21x
      const installmentValue = salePrice > 0 ? (salePrice / defaultInstallments) : null;

      const mainImageUrl = productImages.length > 0 ? productImages[0] : formData.image_url || null;

      const productData = {
        ...(isEdit && { id: product.id }),
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        category: formData.category || null,
        image_url: mainImageUrl,
        price: salePrice, // Calculado automaticamente
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        supplier_margin_percentage: parseFloat(formData.supplier_margin_percentage),
        sku: formData.sku || null,
        stock_type: formData.stock_type,
        stock_quantity: formData.stock_type === 'unlimited' ? -1 : parseInt(formData.stock_quantity),
        low_stock_threshold: formData.stock_type === 'unlimited' ? 0 : parseInt(formData.low_stock_threshold),
        weight: formData.weight ? parseFloat(formData.weight) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        width: formData.width ? parseFloat(formData.width) : null,
        depth: formData.depth ? parseFloat(formData.depth) : null,
        installments: defaultInstallments,
        installment_value: installmentValue,
        short_description: formData.short_description || null,
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || null,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
      };

      const response = await fetch('/api/products', {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product: productData }),
      });

      const data = await response.json();

      if (data.success) {
        // Sync images to product_images table
        if (productImages.length > 0 && data.product?.id) {
          try {
            await fetch('/api/product-images', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                product_id: data.product.id,
                images: productImages.map((url, idx) => ({
                  url,
                  alt_text: formData.name,
                })),
              }),
            });
          } catch (imgErr) {
            console.error('Error syncing product images:', imgErr);
          }
        }
        onSave(data.product);
      } else {
        setError(data.error || 'Erro ao salvar produto');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAIDescription = async () => {
    if (!formData.name) {
      setError('Preencha o nome do produto antes de gerar a descrição com IA.');
      return;
    }
    setGeneratingDesc(true);
    setError('');
    try {
      const res = await fetch('/api/ai/description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          sku: formData.sku,
          description: formData.description,
          weight: formData.weight || null,
          height: formData.height || null,
          width: formData.width || null,
          depth: formData.depth || null,
          cost_price: formData.cost_price || null,
          supplier_margin_percentage: formData.supplier_margin_percentage || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          description: data.description || prev.description,
          short_description: data.short_description || prev.short_description,
          meta_title: data.meta_title || prev.meta_title,
          meta_description: data.meta_description || prev.meta_description,
        }));
      } else {
        setError(data.error || 'Erro ao gerar descrição com IA');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setGeneratingDesc(false);
    }
  };

  const salePrice = calculateSalePrice();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-white flex-shrink-0">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {isEdit ? '✏️ Editar Produto' : '✨ Novo Produto'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {isEdit ? 'Atualize as informações do produto' : 'Preencha os dados para criar um novo produto'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body - Scrollable */}
          <div className="p-6 overflow-y-auto flex-1 min-h-0">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded mb-6 flex items-start">
                <svg className="w-5 h-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-yellow-100 text-yellow-800 w-8 h-8 rounded-full flex items-center justify-center mr-2 text-sm">1</span>
                  Informações Básicas
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Produto <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Ex: Vela Aromática 7 Ervas"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Slug (URL) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleChange}
                      required
                      placeholder="vela-aromatica-7-ervas"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">URL amigável para o produto (gerado automaticamente)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoria
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    >
                      <option value="">Selecione uma categoria</option>
                      <option value="racoes">Rações</option>
                      <option value="brinquedos">Brinquedos</option>
                      <option value="acessorios">Acessórios</option>
                      <option value="higiene-e-saude">Higiene e Saúde</option>
                      <option value="camas-e-casas">Camas e Casas</option>
                      <option value="passeio">Passeio</option>
                      <option value="coleiras">Coleiras</option>
                      <option value="guias">Guias</option>
                      <option value="petiscos">Petiscos</option>
                      <option value="farmacia">Farmácia</option>
                      <option value="limpeza">Limpeza</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>

                  {/* Multi-image upload grid */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fotos do Produto <span className="text-xs text-gray-400">(até {MAX_IMAGES} fotos)</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Existing images */}
                      {productImages.map((url, idx) => (
                        <div key={url} className="relative group">
                          <div className="aspect-square rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-50">
                            <img
                              src={url}
                              alt={`Foto ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {/* Badge for main image */}
                          {idx === 0 && (
                            <span className="absolute top-1.5 left-1.5 bg-yellow-400 text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow" style={{ zIndex: 30 }}>
                              Principal
                            </span>
                          )}
                          {/* Delete button - always visible, outside overflow-hidden */}
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveImage(idx); }}
                            className="absolute top-1 right-1 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 shadow-lg cursor-pointer"
                            style={{ zIndex: 50 }}
                            title="Remover foto"
                          >
                            <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                          {/* Move & replace buttons - visible on hover */}
                          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ zIndex: 30 }}>
                            {idx > 0 && (
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleMoveImage(idx, -1); }}
                                className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 shadow-md cursor-pointer"
                                title="Mover para esquerda"
                              >
                                <svg className="w-3.5 h-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                              </button>
                            )}
                            {idx < productImages.length - 1 && (
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleMoveImage(idx, 1); }}
                                className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 shadow-md cursor-pointer"
                                title="Mover para direita"
                              >
                                <svg className="w-3.5 h-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              </button>
                            )}
                          </div>
                          {/* Replace image button */}
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[idx]?.click()}
                            className="absolute bottom-1.5 right-1.5 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-gray-600 hover:bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            style={{ zIndex: 30 }}
                            title="Trocar imagem"
                          >
                            <svg className="w-3.5 h-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </button>
                          <input
                            ref={el => fileInputRefs.current[idx] = el}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file, idx);
                              e.target.value = '';
                            }}
                          />
                        </div>
                      ))}

                      {/* Add new image slot */}
                      {productImages.length < MAX_IMAGES && (
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[productImages.length]?.click()}
                          disabled={uploadingSlot !== null}
                          className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploadingSlot !== null ? (
                            <>
                              <Loader size="sm" />
                              <span className="text-xs font-medium">Enviando...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                              </svg>
                              <span className="text-xs font-medium text-center">
                                {productImages.length === 0 ? 'Adicionar fotos' : `Adicionar mais`}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {MAX_IMAGES - productImages.length} restante(s)
                              </span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Hidden file input for adding new images (multiple) */}
                      <input
                        ref={el => fileInputRefs.current[productImages.length] = el}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files && files.length > 1) {
                            handleMultipleImageUpload(files);
                          } else if (files && files.length === 1) {
                            handleImageUpload(files[0], productImages.length);
                          }
                          e.target.value = '';
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">A primeira foto será a imagem principal do produto. Arraste para reordenar.</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Descrição Completa
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateAIDescription}
                        disabled={generatingDesc || !formData.name}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-semibold rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!formData.name ? 'Preencha o nome primeiro' : 'Gerar descrição com IA (SEO)'}
                      >
                        {generatingDesc ? (
                          <>
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Gerando...
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            Gerar com IA
                          </>
                        )}
                      </button>
                    </div>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows="4"
                      placeholder="Descreva as características, benefícios e diferenciais do produto... ou clique em 'Gerar com IA'"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descrição Curta
                      <span className="ml-2 text-xs text-purple-600 font-normal">gerada pela IA</span>
                    </label>
                    <input
                      type="text"
                      name="short_description"
                      value={formData.short_description}
                      onChange={handleChange}
                      placeholder="Frase de impacto resumindo o principal benefício do produto..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Meta Title (SEO)
                        <span className="ml-2 text-xs text-purple-600 font-normal">gerado pela IA</span>
                      </label>
                      <input
                        type="text"
                        name="meta_title"
                        value={formData.meta_title}
                        onChange={handleChange}
                        maxLength={60}
                        placeholder="Título para buscadores (até 60 caracteres)"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all text-sm"
                      />
                      <p className="text-xs text-gray-400 mt-1">{(formData.meta_title || '').length}/60 caracteres</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Meta Description (SEO)
                        <span className="ml-2 text-xs text-purple-600 font-normal">gerada pela IA</span>
                      </label>
                      <input
                        type="text"
                        name="meta_description"
                        value={formData.meta_description}
                        onChange={handleChange}
                        maxLength={160}
                        placeholder="Descrição para buscadores (140-155 caracteres)"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all text-sm"
                      />
                      <p className="text-xs text-gray-400 mt-1">{(formData.meta_description || '').length}/160 caracteres</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Precificação */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-green-100 text-green-800 w-8 h-8 rounded-full flex items-center justify-center mr-2 text-sm">2</span>
                  Precificação e Margens
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preço de Custo (R$) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="cost_price"
                      value={formData.cost_price}
                      onChange={handleChange}
                      required
                      step="0.01"
                      min="0"
                      placeholder="35.00"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-gray-600 mt-1">Custo base do produto</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Margem (%) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="supplier_margin_percentage"
                      value={formData.supplier_margin_percentage}
                      onChange={handleChange}
                      required
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="10.00"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-gray-600 mt-1">Margem de lucro do fornecedor</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SKU
                    </label>
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      placeholder="SKU-001"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-gray-600 mt-1">Código único do produto</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Peso (g)
                    </label>
                    <input
                      type="number"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      placeholder="180"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-gray-600 mt-1">Peso em gramas</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Altura (cm)
                    </label>
                    <input
                      type="number"
                      name="height"
                      value={formData.height}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      placeholder="10.5"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-gray-600 mt-1">Altura em centímetros</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Largura (cm)
                    </label>
                    <input
                      type="number"
                      name="width"
                      value={formData.width}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      placeholder="8.0"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-gray-600 mt-1">Largura em centímetros</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profundidade (cm)
                    </label>
                    <input
                      type="number"
                      name="depth"
                      value={formData.depth}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      placeholder="8.0"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-gray-600 mt-1">Profundidade em centímetros</p>
                  </div>
                </div>

                {/* Calculadora de Preço */}
                {formData.cost_price && formData.supplier_margin_percentage && (
                  <div className="mt-4 p-4 bg-white rounded-lg border-2 border-green-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">💰 Preço de Venda (Calculado Automaticamente)</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Fórmula: R$ {formData.cost_price} / (1 - {formData.supplier_margin_percentage}%) = R$ {salePrice.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          📦 Parcelamento: até 21x de R$ {(salePrice / 21).toFixed(2)} sem juros
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-green-600">
                          R$ {salePrice.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Lucro: R$ {(salePrice - parseFloat(formData.cost_price || 0)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Estoque */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-blue-100 text-blue-800 w-8 h-8 rounded-full flex items-center justify-center mr-2 text-sm">3</span>
                  Estoque
                </h3>

                {/* Stock type toggle */}
                <div className="flex gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, stock_type: 'unlimited' }))}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                      formData.stock_type === 'unlimited'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <i className="fas fa-infinity mr-2"></i>
                    Estoque Ilimitado
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, stock_type: 'limited' }))}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                      formData.stock_type === 'limited'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <i className="fas fa-cubes mr-2"></i>
                    Estoque Limitado
                  </button>
                </div>

                {formData.stock_type === 'unlimited' ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                    <i className="fas fa-info-circle mr-2"></i>
                    Este produto será considerado sempre disponível. Não será exibido na gestão de estoque.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantidade em Estoque
                      </label>
                      <input
                        type="number"
                        name="stock_quantity"
                        value={formData.stock_quantity}
                        onChange={handleChange}
                        min="0"
                        placeholder="0"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                      <p className="text-xs text-gray-500 mt-1">Quantidade disponível para venda</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Estoque Mínimo (alerta)
                      </label>
                      <input
                        type="number"
                        name="low_stock_threshold"
                        value={formData.low_stock_threshold}
                        onChange={handleChange}
                        min="0"
                        placeholder="10"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                      <p className="text-xs text-gray-500 mt-1">Você será alertado quando atingir esse limite</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-purple-100 text-purple-800 w-8 h-8 rounded-full flex items-center justify-center mr-2 text-sm">4</span>
                  Status
                </h3>

                <div className="space-y-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="ml-3">
                      <span className="text-sm font-medium text-gray-900">Produto Ativo</span>
                      <p className="text-xs text-gray-500">Produto visível e disponível para venda</p>
                    </span>
                  </label>

                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_featured"
                      checked={formData.is_featured}
                      onChange={handleChange}
                      className="w-5 h-5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                    />
                    <span className="ml-3">
                      <span className="text-sm font-medium text-gray-900">Produto em Destaque</span>
                      <p className="text-xs text-gray-500">Exibir na página inicial</p>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Fixed */}
          <div className="flex items-center justify-between gap-4 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-all"
                disabled={loading}
              >
                Cancelar
              </button>
              {isEdit && (
                <button
                  type="button"
                  onClick={() => setShowVariantsManager(true)}
                  className="px-6 py-2.5 border-2 border-blue-500 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-all"
                  disabled={loading}
                >
                  🔧 Gerenciar Variantes
                </button>
              )}
            </div>
            <button
              type="submit"
              className={`bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 font-bold py-2.5 px-8 rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <Loader size="xs" className="-ml-1 mr-2" />
                  Salvando...
                </span>
              ) : isEdit ? '💾 Atualizar Produto' : '✨ Criar Produto'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Variantes */}
      {showVariantsManager && product?.id && (
        <ProductVariantsManager
          productId={product.id}
          onClose={() => setShowVariantsManager(false)}
        />
      )}
    </div>
  );
}
