'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Erro na página:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <i className="fas fa-triangle-exclamation text-4xl text-red-500 mb-4"></i>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Algo deu errado nessa página</h1>
        <p className="text-sm text-gray-600 mb-1">
          Ocorreu um erro inesperado ao carregar esse conteúdo.
        </p>
        {error?.message && (
          <p className="text-xs text-gray-400 font-mono mb-4 break-words">
            {error.message}
          </p>
        )}
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-lg font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-colors"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="px-5 py-2.5 rounded-lg font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}
