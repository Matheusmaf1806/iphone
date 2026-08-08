'use client';

import { useState } from 'react';
import { useAffiliate } from '../contexts/AffiliateContext';

export default function NewsletterSection() {
  const { brandColor } = useAffiliate();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus(''), 3000);
    }
  };

  return (
    <section className="py-12 md:py-14 relative overflow-hidden" style={{ background: 'linear-gradient(to right, #0d1233, #101942, #0d1233)' }}>
      {/* Decorative Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full blur-3xl" style={{ backgroundColor: brandColor }}></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 rounded-full blur-3xl" style={{ backgroundColor: brandColor }}></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block text-white px-4 py-2 rounded-full font-bold text-sm mb-4" style={{ backgroundColor: brandColor }}>
            <i className="fas fa-paw mr-2"></i>NEWSLETTER PET
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ofertas Exclusivas para seu Pet
          </h2>
          <p className="text-gray-300 text-lg mb-8">
            Cadastre-se e ganhe <span className="font-bold" style={{ color: brandColor }}>10% OFF</span> na primeira compra! Dicas de cuidados e novidades toda semana.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto mb-6">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Digite seu melhor e-mail"
              required
              className="flex-1 px-6 py-4 rounded-full border-2 border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:outline-none transition-colors"
              onFocus={(e) => e.target.style.borderColor = brandColor}
              onBlur={(e) => e.target.style.borderColor = '#374151'}
            />
            <button
              type="submit"
              className="text-white font-bold px-8 py-4 rounded-full hover:opacity-90 transition-all transform hover:scale-105 shadow-xl whitespace-nowrap"
              style={{ backgroundColor: brandColor }}
            >
              Quero Descontos
            </button>
          </form>

          {status === 'success' && (
            <p className="text-green-400 font-medium animate-fade-in">
              <i className="fas fa-check-circle mr-2"></i>Cadastro realizado com sucesso! Verifique seu e-mail.
            </p>
          )}

          <p className="text-gray-500 text-sm">
            Não enviaremos spam. Você pode cancelar a qualquer momento.
          </p>

          {/* Social Proof */}
          <div className="flex items-center justify-center gap-6 mt-8 pt-8 border-t border-gray-800">
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: brandColor }}>50k+</p>
              <p className="text-gray-400 text-sm">Pets Felizes</p>
            </div>
            <div className="h-12 w-px bg-gray-800"></div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: brandColor }}>4.9★</p>
              <p className="text-gray-400 text-sm">Avaliação Média</p>
            </div>
            <div className="h-12 w-px bg-gray-800"></div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: brandColor }}>15k+</p>
              <p className="text-gray-400 text-sm">Avaliações</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </section>
  );
}
