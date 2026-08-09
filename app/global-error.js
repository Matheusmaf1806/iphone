'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('Erro global:', error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
              Algo deu errado
            </h1>
            <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '4px' }}>
              Ocorreu um erro inesperado ao carregar o site.
            </p>
            {error?.message && (
              <p style={{ fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace', marginBottom: '16px', wordBreak: 'break-word' }}>
                {error.message}
              </p>
            )}
            <button
              onClick={() => reset()}
              style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: 600, color: '#fff', backgroundColor: '#111827', border: 'none', cursor: 'pointer' }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
