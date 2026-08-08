'use client';
import { useAffiliate } from '../contexts/AffiliateContext';

import { useState } from 'react';

const testimonials = [
  {
    name: 'Maria Silva',
    location: 'São Paulo, SP',
    image: 'https://i.pravatar.cc/150?img=5',
    rating: 5,
    text: 'Meu Golden adora a ração que compro aqui! Qualidade premium e entrega super rápida. O pelo dele nunca esteve tão bonito!',
  },
  {
    name: 'João Santos',
    location: 'Rio de Janeiro, RJ',
    image: 'https://i.pravatar.cc/150?img=12',
    rating: 5,
    text: 'Comprei uma caminha para minha gatinha e ela amou! Produto de qualidade, veio bem embalado e chegou antes do prazo. Recomendo!',
  },
  {
    name: 'Ana Paula',
    location: 'Belo Horizonte, MG',
    image: 'https://i.pravatar.cc/150?img=9',
    rating: 5,
    text: 'Melhor pet shop online! Encontro tudo que preciso para meus 3 cães e 2 gatos. Preços justos e variedade enorme. Virei cliente fiel!',
  },
  {
    name: 'Carlos Oliveira',
    location: 'Salvador, BA',
    image: 'https://i.pravatar.cc/150?img=13',
    rating: 5,
    text: 'O kit de banho que comprei deixou meu Shih Tzu cheiroso por dias! Produtos de qualidade e atendimento nota 10. Super indico!',
  },
];

export default function TestimonialsSection() {
  const [current, setCurrent] = useState(0);
  const affiliate = useAffiliate();

  const next = () => {
    setCurrent((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            O Que Nossos Clientes Dizem
          </h2>
          <p className="text-gray-600 text-lg">
            Milhares de pets felizes e donos satisfeitos em todo o Brasil
          </p>
        </div>

        {/* Desktop: Grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-brand-yellow"
            >
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-16 h-16 rounded-full object-cover shadow-md"
                />
                <div>
                  <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                  <p className="text-sm text-gray-600">{testimonial.location}</p>
                </div>
              </div>

              <div className="flex gap-1 mb-3">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <i key={i} className="fas fa-star" style={{ color: affiliate.buttonColor || '#f60c49' }}></i>
                ))}
              </div>

              <p className="text-gray-700 text-sm leading-relaxed">
                "{testimonial.text}"
              </p>
            </div>
          ))}
        </div>

        {/* Mobile: Carousel */}
        <div className="md:hidden relative">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 shadow-xl border-2" style={{ borderColor: affiliate.buttonColor || '#f60c49' }}>
            <div className="flex items-center gap-4 mb-4">
              <img
                src={testimonials[current].image}
                alt={testimonials[current].name}
                className="w-16 h-16 rounded-full object-cover shadow-md"
              />
              <div>
                <h4 className="font-bold text-gray-900">
                  {testimonials[current].name}
                </h4>
                <p className="text-sm text-gray-600">
                  {testimonials[current].location}
                </p>
              </div>
            </div>

            <div className="flex gap-1 mb-3">
              {[...Array(testimonials[current].rating)].map((_, i) => (
                <i key={i} className="fas fa-star" style={{ color: affiliate.buttonColor || '#f60c49' }}></i>
              ))}
            </div>

            <p className="text-gray-700 leading-relaxed">
              "{testimonials[current].text}"
            </p>
          </div>

          {/* Navigation */}
          <div className="flex justify-center gap-4 mt-6">
            <button
              onClick={prev}
              className="bg-brand-dark w-10 h-10 rounded-full flex items-center justify-center hover:opacity-90 transition-all shadow-lg"
              style={{ color: affiliate.buttonColor || '#f60c49' }}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <button
              onClick={next}
              className="bg-brand-dark w-10 h-10 rounded-full flex items-center justify-center hover:opacity-90 transition-all shadow-lg"
              style={{ color: affiliate.buttonColor || '#f60c49' }}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
