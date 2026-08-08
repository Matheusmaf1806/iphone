'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAffiliate } from '../contexts/AffiliateContext';

const slides = [
  {
    id: 1,
    gradient: 'linear-gradient(135deg, #1d1d1f, #3a3a3c)',
    icon: 'fa-mobile-alt',
    title: 'iPhone parcelado em até 21x sem juros',
    subtitle: 'Pague em reais, no seu cartão, do jeito que você já compra hoje.',
  },
  {
    id: 2,
    gradient: 'linear-gradient(135deg, #0071e3, #004a99)',
    icon: 'fa-plane-departure',
    title: 'Retirada pessoal em Orlando',
    subtitle: 'Reserve agora e pegue seu aparelho na sua próxima viagem aos EUA.',
  },
  {
    id: 3,
    gradient: 'linear-gradient(135deg, #2c2c2e, #58585a)',
    icon: 'fa-certificate',
    title: 'Produtos 100% originais Apple',
    subtitle: 'Lacrados, com nota fiscal americana e garantia internacional.',
  },
];

export default function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { brandColor } = useAffiliate();
  const timerRef = useRef(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
  }, []);

  useEffect(() => {
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, [resetTimer]);

  const goToSlide = (index) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide(index);
    resetTimer();
    setTimeout(() => setIsTransitioning(false), 600);
  };

  const nextSlide = () => goToSlide((currentSlide + 1) % slides.length);
  const prevSlide = () => goToSlide((currentSlide - 1 + slides.length) % slides.length);

  const getSlideIndex = (offset) => {
    return (currentSlide + offset + slides.length) % slides.length;
  };

  const renderSlideContent = (slide) => (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
      style={{ background: slide.gradient }}
    >
      <i className={`fas ${slide.icon} text-white text-3xl md:text-4xl mb-3 opacity-90`}></i>
      <h2 className="text-white font-bold text-lg md:text-3xl mb-2">{slide.title}</h2>
      <p className="text-white text-opacity-80 text-xs md:text-base max-w-xl">{slide.subtitle}</p>
    </div>
  );

  return (
    <div className="relative w-full bg-gray-100 overflow-hidden">
      <div className="relative max-w-[1400px] mx-auto px-0 md:px-2 py-3 md:py-5">

        {/* Carousel layout: [peek] [gap] [main] [gap] [peek] */}
        <div className="relative flex items-stretch gap-2 md:gap-3" style={{ minHeight: '180px' }}>

          {/* Prev peek – desktop only */}
          <div
            className="hidden md:block flex-shrink-0 rounded-xl overflow-hidden cursor-pointer relative"
            style={{ width: '4.5%', background: slides[getSlideIndex(-1)].gradient, opacity: 0.6 }}
            onClick={prevSlide}
          />

          {/* Main slide */}
          <div className="flex-1 relative rounded-xl md:rounded-2xl overflow-hidden" style={{ aspectRatio: '1121 / 375' }}>
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-600 ease-in-out ${
                  index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
              >
                {renderSlideContent(slide)}
              </div>
            ))}
          </div>

          {/* Next peek – desktop only */}
          <div
            className="hidden md:block flex-shrink-0 rounded-xl overflow-hidden cursor-pointer relative"
            style={{ width: '4.5%', background: slides[getSlideIndex(1)].gradient, opacity: 0.6 }}
            onClick={nextSlide}
          />

          {/* Arrow left */}
          <button
            onClick={prevSlide}
            className="absolute left-1 md:left-0 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-11 md:h-11 bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all border border-gray-200"
            aria-label="Slide anterior"
          >
            <i className="fas fa-chevron-left text-gray-600 text-xs md:text-sm"></i>
          </button>

          {/* Arrow right */}
          <button
            onClick={nextSlide}
            className="absolute right-1 md:right-0 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-11 md:h-11 bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all border border-gray-200"
            aria-label="Próximo slide"
          >
            <i className="fas fa-chevron-right text-gray-600 text-xs md:text-sm"></i>
          </button>
        </div>

        {/* Dots */}
        <div className="flex justify-center items-center gap-2 mt-4">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'w-7 h-2.5'
                  : 'w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400'
              }`}
              style={index === currentSlide ? { backgroundColor: brandColor } : {}}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
