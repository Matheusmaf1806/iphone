'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAffiliate } from '../contexts/AffiliateContext';
import { formatCurrency } from '../lib/pricing';
import { SITE_NAME } from '../lib/siteConfig';

const CATEGORIES = [
  {
    key: 'iphone',
    tag: 'iPhone',
    titleLine1: 'iPhone.',
    titleLine2: 'Poder de sobra.',
    image: '/produtos/iphone.png',
    href: '/categoria/iphone',
    dark: true,
  },
  {
    key: 'mac',
    tag: 'MacBook',
    titleLine1: 'MacBook.',
    titleLine2: 'Feito pra criar.',
    image: '/produtos/macbook.png',
    href: '/categoria/mac',
    dark: false,
  },
  {
    key: 'apple-watch',
    tag: 'Apple Watch',
    titleLine1: 'Apple Watch.',
    titleLine2: 'Seu ritmo, sempre com você.',
    image: '/produtos/applewatch.png',
    href: '/categoria/apple-watch',
    dark: false,
  },
  {
    key: 'airpods',
    tag: 'AirPods',
    titleLine1: 'AirPods.',
    titleLine2: 'Som que acompanha o seu dia.',
    image: '/produtos/airpods.png',
    href: '/categoria/airpods',
    dark: false,
  },
  {
    key: 'acessorios',
    tag: 'Acessórios',
    titleLine1: 'Acessórios.',
    titleLine2: 'O toque final, original.',
    image: '/produtos/cabo.png',
    href: '/categoria/acessorios',
    dark: false,
  },
];

const GAP = 28;
const AUTOPLAY_MS = 3500;

// Três cópias da lista: sempre há um conjunto completo pra cada lado,
// então o "reset" do loop cai numa posição visualmente idêntica —
// nunca aparece vazio nem pisca, mesmo que o timing da transição varie.
const SLIDES = [...CATEGORIES, ...CATEGORIES, ...CATEGORIES];
const START_INDEX = CATEGORIES.length;
const RESET_THRESHOLD = CATEGORIES.length * 2;

export default function AppleUniverseCarousel({ startingPrices = {} }) {
  const affiliate = useAffiliate();
  const trackRef = useRef(null);
  const firstCardRef = useRef(null);
  const intervalRef = useRef(null);

  const [index, setIndex] = useState(START_INDEX);
  const [animate, setAnimate] = useState(true);
  const [cardWidth, setCardWidth] = useState(320);

  const measure = useCallback(() => {
    if (firstCardRef.current) {
      setCardWidth(firstCardRef.current.offsetWidth);
    }
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const goNext = useCallback(() => {
    setAnimate(true);
    setIndex((prev) => prev + 1);
  }, []);

  const startAutoplay = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(goNext, AUTOPLAY_MS);
  }, [goNext]);

  useEffect(() => {
    startAutoplay();
    return () => clearInterval(intervalRef.current);
  }, [startAutoplay]);

  // Quando o índice sai da janela "segura" do meio, espera a transição
  // terminar de verdade (transitionend, não um setTimeout chutado) e
  // só então realinha sem animação pra uma posição equivalente. Como as
  // três cópias são idênticas, o realinhamento nunca fica visível.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || index < RESET_THRESHOLD) return;

    const handleTransitionEnd = () => {
      setAnimate(false);
      setIndex(START_INDEX);
    };

    el.addEventListener('transitionend', handleTransitionEnd, { once: true });
    return () => el.removeEventListener('transitionend', handleTransitionEnd);
  }, [index]);

  // Se por algum motivo a transição não disparar (aba em background, etc.),
  // garante o realinhamento mesmo assim depois de um tempo de segurança.
  useEffect(() => {
    if (index < RESET_THRESHOLD) return;
    const fallback = setTimeout(() => {
      setAnimate(false);
      setIndex(START_INDEX);
    }, 900);
    return () => clearTimeout(fallback);
  }, [index]);

  const pause = () => clearInterval(intervalRef.current);
  const resume = () => startAutoplay();

  const translateX = -(index * (cardWidth + GAP));

  const instagramHref = affiliate?.instagram
    ? `https://instagram.com/${affiliate.instagram.replace(/^@/, '')}`
    : null;
  const whatsappHref = affiliate?.whatsapp
    ? `https://wa.me/${affiliate.whatsapp.replace(/\D/g, '')}`
    : null;

  const helperInitials = (affiliate?.name || SITE_NAME)
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <section className="py-12 md:py-16 bg-white overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-10 mb-12">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-gray-900 mb-3">
              Todo o universo Apple.<br />Em um só lugar.
            </h2>
            <p className="text-base md:text-lg text-gray-500">
              Produtos lacrados e seminovos premium, com garantia e procedência.
            </p>
          </div>

          {(whatsappHref || instagramHref) && (
            <div className="flex flex-col gap-5 min-w-[280px]">
              {whatsappHref && (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 group">
                  <span className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-xs font-semibold text-gray-900 flex-shrink-0">
                    {helperInitials}
                  </span>
                  <span>
                    <b className="block text-sm font-semibold text-gray-900">Precisa de ajuda?</b>
                    <span className="text-sm font-medium text-brand-yellow group-hover:opacity-60 transition-opacity">
                      Fale com nossos especialistas ›
                    </span>
                  </span>
                </a>
              )}
              {instagramHref && (
                <a href={instagramHref} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 group">
                  <span className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-base flex-shrink-0">
                    📷
                  </span>
                  <span>
                    <b className="block text-sm font-semibold text-gray-900">Conheça nosso perfil no Instagram</b>
                    <span className="text-sm font-medium text-brand-yellow group-hover:opacity-60 transition-opacity">
                      @{affiliate.instagram.replace(/^@/, '')}
                    </span>
                  </span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Carrossel */}
        <div className="overflow-hidden pb-2" onMouseEnter={pause} onMouseLeave={resume}>
          <div
            ref={trackRef}
            className="flex w-max"
            style={{
              gap: `${GAP}px`,
              transform: `translateX(${translateX}px)`,
              transition: animate ? 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
            }}
          >
            {SLIDES.map((cat, i) => {
              const price = startingPrices?.[cat.key];
              return (
                <a
                  key={`${cat.key}-${i}`}
                  href={cat.href}
                  ref={i === 0 ? firstCardRef : undefined}
                  aria-hidden={i < START_INDEX || i >= RESET_THRESHOLD ? 'true' : undefined}
                  tabIndex={i < START_INDEX || i >= RESET_THRESHOLD ? -1 : 0}
                  className="flex-shrink-0 w-[280px] md:w-[320px] h-[420px] md:h-[440px] rounded-3xl p-8 flex flex-col relative overflow-hidden no-underline shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.06),0_20px_40px_rgba(0,0,0,0.12)] transition-shadow duration-300 group"
                  style={{
                    background: cat.dark
                      ? 'radial-gradient(circle at 30% 0%, #2c2c2e 0%, #000000 70%)'
                      : '#f5f5f7',
                    border: cat.dark ? 'none' : '1px solid #ececee',
                  }}
                >
                  <span
                    className="text-xs font-semibold uppercase tracking-wider mb-3 relative z-10"
                    style={{ color: cat.dark ? '#a1a1a6' : '#86868b' }}
                  >
                    {cat.tag}
                  </span>
                  <h3
                    className="text-2xl font-semibold tracking-tight leading-snug mb-2 relative z-10"
                    style={{ color: cat.dark ? '#f5f5f7' : '#1d1d1f' }}
                  >
                    {cat.titleLine1}<br />{cat.titleLine2}
                  </h3>
                  <p
                    className="text-sm relative z-10"
                    style={{ color: cat.dark ? '#98989d' : '#6e6e73' }}
                  >
                    {price ? `A partir de ${formatCurrency(price)}` : 'Em breve'}
                  </p>
                  <div className="absolute bottom-0 left-0 right-0 h-[240px] flex items-end justify-center pointer-events-none z-0">
                    <img
                      src={cat.image}
                      alt={cat.tag}
                      className="max-h-full max-w-[88%] object-contain transition-transform duration-500 group-hover:scale-105"
                      style={{ filter: 'drop-shadow(0 18px 20px rgba(0,0,0,0.18))' }}
                      loading="lazy"
                    />
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
