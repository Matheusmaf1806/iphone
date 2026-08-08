'use client';

import { useState, useRef } from 'react';
import Loader from '../Loader';

export default function ImageUpload({ value, onChange, label = "Imagem do Produto", compact = false, folder = "products" }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(value || '');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);

    // Preview local imediato
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setPreviewUrl(result.url);
        onChange(result.url);
      } else {
        setError(result.error || 'Erro ao fazer upload');
        setPreviewUrl(value || '');
      }
    } catch (err) {
      console.error('Erro no upload:', err);
      setError('Erro ao fazer upload da imagem');
      setPreviewUrl(value || '');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUrlChange = (e) => {
    const url = e.target.value;
    setPreviewUrl(url);
    onChange(url);
    setError('');
  };

  const clearImage = () => {
    setPreviewUrl('');
    onChange('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">
          {label}
        </label>

        <div className="flex gap-2">
          {/* Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {uploading ? (
              <>
                <Loader size="xs" />
                Enviando...
              </>
            ) : (
              <>
                <i className="fas fa-upload"></i>
                Upload
              </>
            )}
          </button>

          {/* URL Input */}
          <input
            type="url"
            value={previewUrl}
            onChange={handleUrlChange}
            placeholder="ou cole a URL"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Clear Button */}
          {previewUrl && (
            <button
              type="button"
              onClick={clearImage}
              className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-xs hover:bg-red-200 transition-colors"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Error Message */}
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}

        {/* Preview */}
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-20 object-cover rounded-lg border border-gray-200"
            onError={() => setError('Erro ao carregar imagem')}
          />
        )}
      </div>
    );
  }

  // Versão completa (não-compact)
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full h-48 mx-auto object-contain rounded-lg"
              onError={() => setError('Erro ao carregar imagem')}
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        ) : (
          <div>
            <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-3"></i>
            <p className="text-sm text-gray-600 mb-2">
              Arraste uma imagem ou clique para selecionar
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPG, WEBP ou GIF (máx. 5MB)
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <span className="flex items-center gap-2">
              <Loader size="xs" />
              Fazendo upload...
            </span>
          ) : (
            <>
              <i className="fas fa-upload mr-2"></i>
              {previewUrl ? 'Alterar Imagem' : 'Selecionar Imagem'}
            </>
          )}
        </button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Ou usar URL */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-white text-gray-500">ou use uma URL</span>
        </div>
      </div>

      <input
        type="url"
        value={previewUrl}
        onChange={handleUrlChange}
        placeholder="https://exemplo.com/imagem.jpg"
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      />

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-gray-500">
        Você pode fazer upload de uma imagem ou colar a URL de uma imagem existente
      </p>
    </div>
  );
}
