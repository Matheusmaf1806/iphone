'use client';

import { useState } from 'react';
import { useAffiliate } from '../contexts/AffiliateContext';

export default function PromoSection() {
  const { brandColor } = useAffiliate();
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [showCoupon, setShowCoupon] = useState(false);
  const [errors, setErrors] = useState({ email: '', whatsapp: '' });

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateWhatsapp = (phone) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 11;
  };

  const formatWhatsapp = (value) => {
    const cleaned = value.replace(/\D/g, '');
    let formatted = cleaned;

    if (cleaned.length <= 2) {
      formatted = cleaned;
    } else if (cleaned.length <= 7) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    } else if (cleaned.length <= 11) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    }

    return formatted;
  };

  const handleWhatsappChange = (e) => {
    const formatted = formatWhatsapp(e.target.value);
    setWhatsapp(formatted);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = { email: '', whatsapp: '' };

    if (!validateEmail(email)) {
      newErrors.email = 'Email inválido';
    }

    if (!validateWhatsapp(whatsapp)) {
      newErrors.whatsapp = 'WhatsApp inválido (mínimo 10 dígitos)';
    }

    setErrors(newErrors);

    if (!newErrors.email && !newErrors.whatsapp) {
      setShowCoupon(true);
      setEmail('');
      setWhatsapp('');
    }
  };

  const copyCoupon = () => {
    navigator.clipboard.writeText('BEMVINDO');
  };

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="container mx-auto px-4">
        <div
          className="max-w-6xl mx-auto rounded-3xl overflow-hidden shadow-2xl"
          style={{ backgroundImage: `linear-gradient(135deg, ${brandColor}, #ff6b8a)` }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Lado esquerdo - Info */}
            <div className="px-8 py-10 md:px-12 md:py-14 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 bg-white bg-opacity-20 text-white font-bold px-4 py-2 rounded-full text-sm mb-6 w-fit">
                <i className="fas fa-scissors"></i>
                <span>OFERTA LIMITADA</span>
              </div>

              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
                Ganhe 10%<br />de Desconto
              </h2>
              <p className="text-white text-opacity-90 text-lg mb-8">
                Na sua <strong>primeira compra</strong> para o seu melhor amigo. Cadastre-se e libere o cupom agora.
              </p>

              {/* Divider */}
              <div className="border-t border-white border-opacity-30 mb-6"></div>

              {/* Stats */}
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-2xl md:text-3xl font-extrabold text-white">50k+</p>
                  <p className="text-white text-opacity-70 text-xs uppercase tracking-wide">Pets Felizes</p>
                </div>
                <div>
                  <p className="text-2xl md:text-3xl font-extrabold text-white">4.9 <span className="text-yellow-300">&#9733;</span></p>
                  <p className="text-white text-opacity-70 text-xs uppercase tracking-wide">Avaliação</p>
                </div>
                <div>
                  <p className="text-2xl md:text-3xl font-extrabold text-white">15k+</p>
                  <p className="text-white text-opacity-70 text-xs uppercase tracking-wide">Entregas</p>
                </div>
              </div>
            </div>

            {/* Lado direito - Formulário */}
            <div className="px-8 py-10 md:px-12 md:py-14 bg-black bg-opacity-10 flex flex-col justify-center">
              {!showCoupon ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <i className="fas fa-gift text-white text-xl"></i>
                    <h3 className="text-xl font-bold text-white">
                      Receba seu cupom agora
                    </h3>
                  </div>
                  <p className="text-white text-opacity-80 text-sm mb-6">
                    Sem spam. Apenas promoções e dicas de cuidado.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Seu melhor e-mail
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <i className="fas fa-envelope"></i>
                        </span>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="ex: contato@seupet.com"
                          className={`w-full pl-12 pr-4 py-4 rounded-xl border-2 ${
                            errors.email ? 'border-red-400' : 'border-transparent'
                          } bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 text-sm`}
                          required
                        />
                      </div>
                      {errors.email && (
                        <p className="text-yellow-200 text-xs mt-1">{errors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Seu WhatsApp
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <i className="fas fa-phone"></i>
                        </span>
                        <input
                          type="tel"
                          value={whatsapp}
                          onChange={handleWhatsappChange}
                          placeholder="ex: (11) 99999-9999"
                          className={`w-full pl-12 pr-4 py-4 rounded-xl border-2 ${
                            errors.whatsapp ? 'border-red-400' : 'border-transparent'
                          } bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 text-sm`}
                          required
                        />
                      </div>
                      {errors.whatsapp && (
                        <p className="text-yellow-200 text-xs mt-1">{errors.whatsapp}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-3 bg-brand-dark text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all transform hover:scale-[1.02] shadow-lg text-lg"
                    >
                      <i className="fas fa-gift"></i>
                      Revelar Cupom
                    </button>
                  </form>

                  <p className="text-white text-opacity-60 text-xs text-center mt-4">
                    Ao clicar, você concorda em receber novidades. Cancele quando quiser.
                  </p>
                </>
              ) : (
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white bg-opacity-20 mb-4">
                    <i className="fas fa-check text-3xl text-white"></i>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Seu cupom está pronto!
                  </h3>
                  <div className="inline-flex items-center gap-3 bg-white rounded-2xl px-6 py-4 shadow-lg mb-4">
                    <span className="text-gray-600 font-medium">Use o cupom:</span>
                    <span className="text-2xl font-bold tracking-wider" style={{ color: brandColor }}>BEMVINDO</span>
                    <button
                      onClick={copyCoupon}
                      className="text-gray-500 hover:text-black transition-colors"
                      title="Copiar cupom"
                    >
                      <i className="fas fa-copy"></i>
                    </button>
                  </div>
                  <p className="text-white text-opacity-80 text-sm">
                    Aproveite 10% de desconto na sua primeira compra!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
