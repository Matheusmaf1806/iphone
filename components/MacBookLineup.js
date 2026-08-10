'use client';

import { formatCurrency } from '../lib/pricing';

const MACBOOKS = [
  {
    key: 'macbook-neo',
    tag: 'MacBook Neo',
    who: 'Pra quem tá começando',
    titleLine1: 'MacBook Neo.',
    titleLine2: 'Acessível, do jeito Apple.',
    image: '/produtos/macbook%20neo.png',
    href: '/produto/macbook-neo',
    style: 'colorful',
  },
  {
    key: 'macbook-air-m5',
    tag: 'MacBook Air',
    who: 'Pra levar em qualquer lugar',
    titleLine1: 'MacBook Air.',
    titleLine2: 'Leve na mão, forte no uso.',
    image: '/produtos/macbook%20air.png',
    href: '/produto/macbook-air-m5',
    style: 'light',
  },
  {
    key: 'macbook-pro-m5',
    tag: 'MacBook Pro',
    who: 'Pra quem não abre mão de potência',
    titleLine1: 'MacBook Pro.',
    titleLine2: 'Potência pra ir além.',
    image: '/produtos/macbook%20pro.png',
    href: '/produto/macbook-pro-m5',
    style: 'dark',
  },
];

const CARD_BG = {
  colorful: 'radial-gradient(circle at 15% 0%, #F2C572 0%, #E8C4C0 35%, #f5f5f7 70%)',
  light: '#f5f5f7',
  dark: 'radial-gradient(circle at 30% 0%, #2c2c2e 0%, #000000 70%)',
};

export default function MacBookLineup({ startingPrices = {} }) {
  return (
    <section className="py-12 md:py-16 bg-white overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-xl mb-10 md:mb-12">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-gray-900 mb-3">
            Qual MacBook<br />é o seu?
          </h2>
          <p className="text-base md:text-lg text-gray-500">
            Do dia a dia ao trabalho pesado, veja qual combina com você.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-7">
          {MACBOOKS.map((mb, i) => {
            const dark = mb.style === 'dark';
            const price = startingPrices?.[mb.key];
            return (
              <a
                key={mb.key}
                href={mb.href}
                className="macbook-card flex-shrink-0 h-[460px] md:h-[480px] rounded-3xl p-8 flex flex-col relative overflow-hidden no-underline shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.06),0_20px_40px_rgba(0,0,0,0.12)] transition-all duration-300 group"
                style={{
                  background: CARD_BG[mb.style],
                  border: dark ? 'none' : '1px solid #ececee',
                  '--i': i,
                }}
              >
                <span
                  className="inline-flex items-center text-xs font-semibold mb-4 relative z-10 px-3 py-1.5 rounded-full w-fit"
                  style={{
                    color: dark ? '#f5f5f7' : '#1d1d1f',
                    background: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.055)',
                  }}
                >
                  {mb.who}
                </span>
                <h3
                  className="text-2xl font-semibold tracking-tight leading-snug mb-3 relative z-10"
                  style={{ color: dark ? '#f5f5f7' : '#1d1d1f' }}
                >
                  {mb.titleLine1}<br />{mb.titleLine2}
                </h3>
                <p className="text-lg font-bold relative z-10" style={{ color: dark ? '#f5f5f7' : '#1d1d1f' }}>
                  {price ? `A partir de ${formatCurrency(price)}` : 'Em breve'}
                </p>
                {price && (
                  <p className="text-xs relative z-10" style={{ color: dark ? '#98989d' : '#6e6e73' }}>
                    no PIX
                  </p>
                )}

                <span
                  className="macbook-card-cta mt-4 inline-flex items-center gap-1.5 text-sm font-semibold relative z-10 w-fit"
                  style={{ color: dark ? '#f5f5f7' : '#1d1d1f' }}
                >
                  Ver modelo
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </span>

                <div className="absolute inset-x-0 bottom-0 h-[260px] pointer-events-none z-0">
                  <div
                    className="absolute left-1/2 bottom-8 -translate-x-1/2 w-[78%] h-10 rounded-full"
                    style={{
                      background: dark
                        ? 'radial-gradient(ellipse, rgba(255,255,255,0.14) 0%, transparent 72%)'
                        : 'radial-gradient(ellipse, rgba(0,0,0,0.1) 0%, transparent 72%)',
                    }}
                  />
                  <div className="absolute inset-0 flex items-end justify-center">
                    <img
                      src={mb.image}
                      alt={mb.tag}
                      className="max-h-full max-w-[92%] object-contain transition-transform duration-500 group-hover:scale-105"
                      style={{ filter: 'drop-shadow(0 18px 20px rgba(0,0,0,0.18))' }}
                      loading="lazy"
                    />
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .macbook-card {
          opacity: 0;
          animation: macbookCardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: calc(var(--i, 0) * 120ms);
        }
        .macbook-card:hover {
          transform: translateY(-6px);
        }
        .macbook-card-cta svg {
          transition: transform 0.25s ease;
        }
        .macbook-card:hover .macbook-card-cta svg {
          transform: translateX(3px);
        }
        @keyframes macbookCardIn {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .macbook-card {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </section>
  );
}
