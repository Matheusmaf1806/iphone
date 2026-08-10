'use client';
import { useAffiliate } from '../contexts/AffiliateContext';

import { useState } from 'react';

const testimonials = [
  {
    name: 'Maria Silva',
    location: 'São Paulo, SP',
    image: 'https://i.pravatar.cc/150?img=5',
    rating: 5,
    text: 'Parcelei meu iPhone em reais e retirei tudo certinho em Orlando na minha viagem de férias. Processo super organizado, recomendo!',
  },
  {
    name: 'João Santos',
    location: 'Rio de Janeiro, RJ',
    image: 'https://i.pravatar.cc/150?img=12',
    rating: 5,
    text: 'Comprei o iPhone pra mim e o Apple Watch pra minha esposa. Preço muito melhor que no Brasil e a retirada foi tranquila.',
  },
  {
    name: 'Ana Paula',
    location: 'Belo Horizonte, MG',
    image: 'https://i.pravatar.cc/150?img=9',
    rating: 5,
    text: 'Já é a segunda vez que compro assim. Parcelamento sem juros, aparelho lacrado, com nota fiscal americana. Virei cliente fiel!',
  },
  {
    name: 'Carlos Oliveira',
    location: 'Salvador, BA',
    image: 'https://i.pravatar.cc/150?img=13',
    rating: 5,
    text: 'Fiquei com receio no início, mas me explicaram tudo sobre a retirada e a cota de bagagem antes da viagem. Atendimento nota 10!',
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
            Milhares de brasileiros já retiraram seu iPhone em Orlando
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
                  <i key={i} className="fas fa-star" style={{ color: affiliate.buttonColor || '#0043f7' }}></i>
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
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 shadow-xl border-2" style={{ borderColor: affiliate.buttonColor || '#0043f7' }}>
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
                <i key={i} className="fas fa-star" style={{ color: affiliate.buttonColor || '#0043f7' }}></i>
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
              className="bg-brand-dark text-white w-10 h-10 rounded-full flex items-center justify-center hover:opacity-90 transition-all shadow-lg"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <button
              onClick={next}
              className="bg-brand-dark text-white w-10 h-10 rounded-full flex items-center justify-center hover:opacity-90 transition-all shadow-lg"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
