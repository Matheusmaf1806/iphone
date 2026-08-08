'use client';

import { useAffiliate } from '../contexts/AffiliateContext';

export default function FeaturesBar() {
  const { brandColor } = useAffiliate();

  return (
    <section className="py-6 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4">
            <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: brandColor }}>
              <i className="fas fa-truck-fast text-lg text-white"></i>
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900 text-sm">Frete Grátis</p>
              <p className="text-xs text-gray-600">Acima de R$ 199</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4">
            <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: brandColor }}>
              <i className="fas fa-lock text-lg text-white"></i>
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900 text-sm">Compra Segura</p>
              <p className="text-xs text-gray-600">Proteção total</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4">
            <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: brandColor }}>
              <i className="fas fa-medal text-lg text-white"></i>
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900 text-sm">Qualidade</p>
              <p className="text-xs text-gray-600">Marcas selecionadas para pets</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4">
            <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: brandColor }}>
              <i className="fas fa-credit-card text-lg text-white"></i>
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900 text-sm">Parcele em até</p>
              <p className="text-xs text-gray-600">10x sem juros</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
