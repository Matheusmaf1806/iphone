'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import ProductCard from './ProductCard';

export default function FeaturedProducts({ products, title = 'Produtos em Destaque', compact = false }) {
  const scrollRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const isJumping = useRef(false);

  const shouldLoop = products.length > 3;
  // Triple the list so we can silently jump between copies
  const loopedProducts = shouldLoop ? [...products, ...products, ...products] : products;

  // On mount, position in the middle copy so the user can scroll both ways
  useEffect(() => {
    if (!shouldLoop) return;
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollLeft = el.scrollWidth / 3;
    });
  }, [shouldLoop]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !shouldLoop) return;

    const interval = setInterval(() => {
      if (isPaused) return;
      el.scrollLeft += 1;
    }, 25);

    return () => clearInterval(interval);
  }, [isPaused, shouldLoop]);

  // Seamless infinite loop: when entering the 1st or 3rd copy, silently jump
  const handleScroll = useCallback(() => {
    if (!shouldLoop || isJumping.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const oneSetWidth = el.scrollWidth / 3;

    if (el.scrollLeft >= oneSetWidth * 2) {
      isJumping.current = true;
      el.scrollLeft -= oneSetWidth;
      isJumping.current = false;
    } else if (el.scrollLeft < oneSetWidth * 0.05) {
      // User manually scrolled left into the first copy
      isJumping.current = true;
      el.scrollLeft += oneSetWidth;
      isJumping.current = false;
    }
  }, [shouldLoop]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('[data-card]')?.offsetWidth || 220;
    el.scrollBy({ left: dir * (cardWidth + 16) * 2, behavior: 'smooth' });
  };

  if (!products || products.length === 0) return null;

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className={compact ? 'text-lg md:text-xl font-bold text-gray-900' : 'text-xl md:text-2xl font-bold text-gray-900'}>
          {title}
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { scroll(-1); setIsPaused(true); setTimeout(() => setIsPaused(false), 5000); }}
            className="w-10 h-10 rounded-full border-2 border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50 flex items-center justify-center transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button
            onClick={() => { scroll(1); setIsPaused(true); setTimeout(() => setIsPaused(false), 5000); }}
            className="w-10 h-10 rounded-full border-2 border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50 flex items-center justify-center transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative">
        <div
          ref={scrollRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setTimeout(() => setIsPaused(false), 3000)}
          className="flex gap-4 overflow-x-auto pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {loopedProducts.map((product, index) => (
            <div
              key={`${product.id ?? index}-${Math.floor(index / products.length)}`}
              data-card
              className="flex-shrink-0 w-[200px] sm:w-[220px] md:w-[240px]"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );

  // Em modo compact isso entra direto como filho de um grid (Apple Watch / AirPods
  // lado a lado) — precisa de UM elemento só envolvendo tudo, senão cada pedaço do
  // Fragment (título, carrossel) vira um item separado do grid e a coluna quebra.
  if (compact) return <div>{content}</div>;

  return (
    <section className="py-10 md:py-14 bg-white">
      <div className="container mx-auto px-4">
        {content}
      </div>
    </section>
  );
}
