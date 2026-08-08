'use client';

import { useState } from 'react';

export default function LowStockAlert({ products }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !products || products.length === 0) return null;

  const outOfStock = products.filter(p => p.stock_quantity <= 0);
  const lowStock = products.filter(p => p.stock_quantity > 0);

  return (
    <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="bg-amber-100 rounded-lg p-2 mt-0.5">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-amber-900 text-sm">
              Atenção ao Estoque — {products.length} produto{products.length > 1 ? 's' : ''} precisa{products.length > 1 ? 'm' : ''} de atenção
            </h3>
            <div className="mt-2 space-y-1.5">
              {outOfStock.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-700">
                    <strong>{outOfStock.length}</strong> produto{outOfStock.length > 1 ? 's' : ''} esgotado{outOfStock.length > 1 ? 's' : ''}:
                    {' '}{outOfStock.slice(0, 3).map(p => p.name).join(', ')}
                    {outOfStock.length > 3 && ` e mais ${outOfStock.length - 3}`}
                  </span>
                </div>
              )}
              {lowStock.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" />
                  <span className="text-sm text-amber-700">
                    <strong>{lowStock.length}</strong> produto{lowStock.length > 1 ? 's' : ''} com estoque baixo:
                    {' '}{lowStock.slice(0, 3).map(p => `${p.name} (${p.stock_quantity} un)`).join(', ')}
                    {lowStock.length > 3 && ` e mais ${lowStock.length - 3}`}
                  </span>
                </div>
              )}
            </div>
            <a
              href="/gestao/erp/estoque"
              className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors"
            >
              Gerenciar Estoque
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400 hover:text-amber-600 transition-colors p-1"
          title="Fechar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
