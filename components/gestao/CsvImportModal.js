'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';

export default function CsvImportModal({ onClose, onSave }) {
  const [parsedProducts, setParsedProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importResults, setImportResults] = useState(null);
  const [step, setStep] = useState('upload'); // upload | preview | results
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setParsedProducts([]);

    if (!file.name.endsWith('.csv')) {
      setError('Por favor, selecione um arquivo .csv');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`Erros no CSV: ${results.errors.map(e => e.message).join(', ')}`);
          return;
        }

        if (results.data.length === 0) {
          setError('O arquivo CSV está vazio');
          return;
        }

        // Validar que tem as colunas esperadas
        const headers = Object.keys(results.data[0]);
        const requiredColumns = ['Nome Sugerido (Venda)', 'Custo Unit (R$)'];
        const missing = requiredColumns.filter(col => !headers.includes(col));

        if (missing.length > 0) {
          setError(`Colunas obrigatórias não encontradas: ${missing.join(', ')}`);
          return;
        }

        setParsedProducts(results.data);
        setStep('preview');
      },
      error: (err) => {
        setError(`Erro ao ler o arquivo: ${err.message}`);
      }
    });
  };

  const handleImport = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/products/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ products: parsedProducts }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erro ao importar produtos');
        setLoading(false);
        return;
      }

      setImportResults(data);
      setStep('results');

      if (data.summary.success > 0) {
        setSuccess(`${data.summary.success} produto(s) importado(s) com sucesso!`);
      }

      if (data.summary.errors > 0) {
        setError(`${data.summary.errors} produto(s) com erro.`);
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    onSave();
    onClose();
  };

  // Parsear valor monetário para exibição
  const parseMoneyDisplay = (value) => {
    if (!value) return '-';
    return value.toString().trim();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-900">
              Importar Produtos via CSV
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-2 text-sm">
            <span className={`px-3 py-1 rounded-full font-medium ${step === 'upload' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
              1. Upload
            </span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className={`px-3 py-1 rounded-full font-medium ${step === 'preview' ? 'bg-yellow-100 text-yellow-800' : step === 'results' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
              2. Preview
            </span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className={`px-3 py-1 rounded-full font-medium ${step === 'results' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-500'}`}>
              3. Resultado
            </span>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="max-w-lg mx-auto text-center">
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 hover:border-yellow-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Clique para selecionar o arquivo CSV
                </p>
                <p className="text-sm text-gray-500">
                  ou arraste e solte aqui
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="mt-6 text-left bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Formato esperado do CSV:</h3>
                <p className="text-sm text-gray-600 mb-2">
                  O arquivo deve conter as seguintes colunas:
                </p>
                <div className="text-xs font-mono bg-white rounded-lg p-3 border overflow-x-auto">
                  <p className="text-green-700 font-bold">Obrigatórias:</p>
                  <p>Nome Sugerido (Venda), Custo Unit (R$)</p>
                  <p className="text-blue-700 font-bold mt-2">Opcionais:</p>
                  <p>Idade, Tamanho, Porte, Sabor</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  <span className="font-bold text-gray-900">{parsedProducts.length}</span> produto(s) encontrado(s) no CSV
                </p>
                <button
                  onClick={() => { setStep('upload'); setParsedProducts([]); setError(''); }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Escolher outro arquivo
                </button>
              </div>

              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">#</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Nome (Venda)</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Idade</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Tamanho</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Porte</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Sabor</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Custo Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedProducts.map((product, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">
                          {product['Nome Sugerido (Venda)'] || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{product['Idade'] || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{product['Tamanho'] || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{product['Porte'] || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{product['Sabor'] || '-'}</td>
                        <td className="px-4 py-3 text-right text-gray-900 font-mono">
                          {parseMoneyDisplay(product['Custo Unit (R$)'])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 3: Results */}
          {step === 'results' && importResults && (
            <div>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{importResults.summary.total}</p>
                  <p className="text-sm text-blue-600">Total</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{importResults.summary.success}</p>
                  <p className="text-sm text-green-600">Importados</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">{importResults.summary.errors}</p>
                  <p className="text-sm text-red-600">Erros</p>
                </div>
              </div>

              {/* Results List */}
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Produto</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {importResults.results.map((result, index) => (
                      <tr key={index} className={result.success ? 'bg-green-50/50' : 'bg-red-50/50'}>
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">
                          {result.name}
                        </td>
                        <td className="px-4 py-3">
                          {result.success ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                              Importado
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                              Erro
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {result.success ? `ID: ${result.id}` : result.error}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            {step !== 'results' && (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            )}

            {step === 'preview' && (
              <button
                type="button"
                onClick={handleImport}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Importando...
                  </span>
                ) : (
                  `Importar ${parsedProducts.length} Produto(s)`
                )}
              </button>
            )}

            {step === 'results' && (
              <button
                type="button"
                onClick={handleFinish}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
              >
                Concluir e Atualizar Lista
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
