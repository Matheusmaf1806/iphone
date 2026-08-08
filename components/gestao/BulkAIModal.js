'use client';

import { useState, useRef } from 'react';

const STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  WAITING: 'waiting',   // rate limit cooldown
  DONE: 'done',
  ERROR: 'error',
};

// Delay between calls to stay within Gemini free tier (15 RPM = 1 req / 4s)
const CALL_DELAY_MS = 5000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function BulkAIModal({ products, onClose, onDone }) {
  const [items, setItems] = useState(() =>
    products.map(p => ({ product: p, status: STATUS.PENDING, error: null, waitSec: 0 }))
  );
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [globalWait, setGlobalWait] = useState(0); // countdown shown in footer
  const updatedProductsRef = useRef([]);
  const abortRef = useRef(false);

  const setItemStatus = (id, status, error = null, waitSec = 0) => {
    setItems(prev => prev.map(item =>
      item.product.id === id ? { ...item, status, error, waitSec } : item
    ));
  };

  const countdown = async (seconds) => {
    setGlobalWait(seconds);
    for (let i = seconds; i > 0; i--) {
      if (abortRef.current) return;
      setGlobalWait(i);
      await sleep(1000);
    }
    setGlobalWait(0);
  };

  const callAI = async (product) => {
    const res = await fetch('/api/ai/description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: product.name,
        category: product.category,
        sku: product.sku,
        description: product.description,
        weight: product.weight || null,
        height: product.height || null,
        width: product.width || null,
        depth: product.depth || null,
        cost_price: product.cost_price || null,
        supplier_margin_percentage: product.supplier_margin_percentage || null,
      }),
    });
    const data = await res.json();
    if (!data.success) {
      // Return rate limit info so caller can retry
      if (data.error === 'rate_limit') {
        return { rateLimited: true, retryAfter: data.retryAfter || 30 };
      }
      throw new Error(data.error || 'Erro na IA');
    }
    return data;
  };

  const processProduct = async (product) => {
    setItemStatus(product.id, STATUS.IN_PROGRESS);

    // 1. Generate AI description (with retry on rate limit)
    let aiData;
    let attempts = 0;
    while (attempts < 3) {
      if (abortRef.current) return null;
      const result = await callAI(product);
      if (result.rateLimited) {
        attempts++;
        const wait = result.retryAfter;
        setItemStatus(product.id, STATUS.WAITING, null, wait);
        await countdown(wait);
        setItemStatus(product.id, STATUS.IN_PROGRESS);
        continue;
      }
      aiData = result;
      break;
    }

    if (!aiData) {
      setItemStatus(product.id, STATUS.ERROR, 'Limite da API atingido. Tente novamente mais tarde.');
      return null;
    }

    // 2. Save updated product
    const price = product.cost_price && product.supplier_margin_percentage
      ? parseFloat(product.cost_price) / (1 - parseFloat(product.supplier_margin_percentage) / 100)
      : parseFloat(product.price || 0);

    try {
      const saveRes = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          product: {
            ...product,
            price: price.toFixed(2),
            description: aiData.description || product.description,
            short_description: aiData.short_description || product.short_description,
            meta_title: aiData.meta_title || product.meta_title,
            meta_description: aiData.meta_description || product.meta_description,
          },
        }),
      });
      const saveData = await saveRes.json();
      if (!saveData.success) throw new Error(saveData.error || 'Erro ao salvar');
      setItemStatus(product.id, STATUS.DONE);
      return saveData.product;
    } catch (err) {
      setItemStatus(product.id, STATUS.ERROR, `Salvar: ${err.message}`);
      return null;
    }
  };

  const handleStart = async () => {
    setRunning(true);
    abortRef.current = false;
    updatedProductsRef.current = [];

    for (let i = 0; i < items.length; i++) {
      if (abortRef.current) break;
      const item = items[i];
      if (item.status === STATUS.DONE) continue;

      const updated = await processProduct(item.product);
      if (updated) updatedProductsRef.current.push(updated);

      // Delay between calls to respect rate limits (skip delay after last item)
      if (i < items.length - 1 && !abortRef.current) {
        await sleep(CALL_DELAY_MS);
      }
    }

    setRunning(false);
    setFinished(true);
    setGlobalWait(0);
  };

  const handleClose = () => {
    if (running) abortRef.current = true;
    if (finished && updatedProductsRef.current.length > 0) {
      onDone(updatedProductsRef.current);
    } else {
      onClose();
    }
  };

  const doneCount = items.filter(i => i.status === STATUS.DONE).length;
  const errorCount = items.filter(i => i.status === STATUS.ERROR).length;
  const activeItem = items.find(i => i.status === STATUS.IN_PROGRESS || i.status === STATUS.WAITING);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Gerar IA em Lote</h2>
            <p className="text-sm text-gray-500 mt-0.5">{items.length} produto{items.length > 1 ? 's' : ''} selecionado{items.length > 1 ? 's' : ''}</p>
          </div>
          {!running && (
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Progress bar */}
        {(running || finished) && (
          <div className="px-6 pt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{doneCount} concluído{doneCount !== 1 ? 's' : ''}</span>
              {errorCount > 0 && <span className="text-red-500">{errorCount} erro{errorCount !== 1 ? 's' : ''}</span>}
              <span>{doneCount + errorCount}/{items.length}</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${((doneCount + errorCount) / items.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Product list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {items.map(({ product, status, error, waitSec }) => (
            <div
              key={product.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                status === STATUS.DONE ? 'bg-green-50 border-green-200' :
                status === STATUS.ERROR ? 'bg-red-50 border-red-200' :
                status === STATUS.IN_PROGRESS ? 'bg-purple-50 border-purple-300' :
                status === STATUS.WAITING ? 'bg-yellow-50 border-yellow-300' :
                'bg-gray-50 border-gray-200'
              }`}
            >
              {/* Status icon */}
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                {status === STATUS.DONE && (
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {status === STATUS.ERROR && (
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {status === STATUS.IN_PROGRESS && (
                  <svg className="w-5 h-5 text-purple-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                {status === STATUS.WAITING && (
                  <svg className="w-5 h-5 text-yellow-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                {status === STATUS.PENDING && (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                )}
              </div>

              {/* Product info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                {error && <p className="text-xs text-red-500 truncate mt-0.5">{error}</p>}
                {status === STATUS.IN_PROGRESS && (
                  <p className="text-xs text-purple-600 mt-0.5">Gerando descrição com IA...</p>
                )}
                {status === STATUS.WAITING && (
                  <p className="text-xs text-yellow-600 mt-0.5">Limite da API atingido — aguardando {waitSec}s para retentar...</p>
                )}
                {status === STATUS.DONE && (
                  <p className="text-xs text-green-600 mt-0.5">Descrição + meta tags atualizadas</p>
                )}
              </div>

              {/* Badges */}
              <div className="flex gap-1 flex-shrink-0">
                {!product.description?.trim() && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">sem desc.</span>
                )}
                {(!product.meta_title?.trim() || !product.meta_description?.trim()) && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">sem meta</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
          {finished ? (
            <>
              <p className="text-sm text-gray-600">
                {doneCount > 0 && <span className="text-green-600 font-semibold">{doneCount} produto{doneCount !== 1 ? 's' : ''} atualizado{doneCount !== 1 ? 's' : ''}. </span>}
                {errorCount > 0 && <span className="text-red-600">{errorCount} erro{errorCount !== 1 ? 's' : ''}.</span>}
              </p>
              <button
                onClick={handleClose}
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 font-bold py-2 px-6 rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition-all text-sm"
              >
                Concluir
              </button>
            </>
          ) : running ? (
            <>
              <p className="text-sm text-gray-500">
                {globalWait > 0
                  ? `⏳ Rate limit — retomando em ${globalWait}s...`
                  : activeItem
                    ? `Processando "${activeItem.product.name}"...`
                    : 'Processando...'}
              </p>
              <button
                onClick={() => { abortRef.current = true; }}
                className="text-sm text-red-500 hover:text-red-700 transition-colors font-medium"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <div className="text-sm text-gray-500">
                Gera <strong>descrição + short + meta title + meta description</strong> e salva automaticamente.
                <span className="block text-xs mt-0.5 text-gray-400">Respeita os limites da API Gemini com pausa entre chamadas.</span>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={onClose}
                  className="py-2 px-4 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleStart}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-colors text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Iniciar geração
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
