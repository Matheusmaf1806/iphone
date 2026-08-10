'use client';

import { formatCurrency } from '../lib/pricing';

const MACBOOKS = [
  {
    key: 'macbook-neo',
    tag: 'MacBook Neo',
    who: 'Pra quem tá começando',
    titleLine1: 'MacBook Neo.',
    titleLine2: 'Acessível, do jeito Apple.',
    image: 'https://gkvrkutdjuxrolztwlvl.supabase.co/storage/v1/object/public/images/products/1786379263205-jzvp6xnfsfe.png',
    href: '/produto/macbook-neo',
    style: 'colorful',
  },
  {
    key: 'macbook-air-m5',
    tag: 'MacBook Air',
    who: 'Pra levar em qualquer lugar',
    titleLine1: 'MacBook Air.',
    titleLine2: 'Leve na mão, forte no uso.',
    image: 'https://gkvrkutdjuxrolztwlvl.supabase.co/storage/v1/object/public/images/products/1786379281636-p7ncxfxjj7.png',
    href: '/produto/macbook-air-m5',
    style: 'light',
  },
  {
    key: 'macbook-pro-m5',
    tag: 'MacBook Pro',
    who: 'Pra quem não abre mão de potência',
    titleLine1: 'MacBook Pro.',
    titleLine2: 'Potência pra ir além.',
    image: 'https://gkvrkutdjuxrolztwlvl.supabase.co/storage/v1/object/public/images/products/1786379253463-sn42k6ea17g.png',
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
            Do dia a dia ao trabalho pesado — veja qual combina com você.
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
                className="macbook-card flex-shrink-0 h-[440px] md:h-[460px] rounded-3xl p-8 flex flex-col relative overflow-hidden no-underline shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.06),0_20px_40px_rgba(0,0,0,0.12)] transition-all duration-300 group"
                style={{
                  background: CARD_BG[mb.style],
                  border: dark ? 'none' : '1px solid #ececee',
                  '--i': i,
                }}
              >
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-3 relative z-10 px-2.5 py-1 rounded-full w-fit"
                  style={{
                    color: dark ? '#f5f5f7' : '#1d1d1f',
                    background: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
                  }}
                >
                  {mb.who}
                </span>
                <h3
                  className="text-2xl font-semibold tracking-tight leading-snug mb-2 relative z-10"
                  style={{ color: dark ? '#f5f5f7' : '#1d1d1f' }}
                >
                  {mb.titleLine1}<br />{mb.titleLine2}
                </h3>
                <p
                  className="text-sm relative z-10"
                  style={{ color: dark ? '#98989d' : '#6e6e73' }}
                >
                  {price ? `A partir de ${formatCurrency(price)}` : 'Em breve'}
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-[250px] flex items-end justify-center pointer-events-none z-0">
                  <img
                    src={mb.image}
                    alt={mb.tag}
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

      <style jsx>{`
        .macbook-card {
          opacity: 0;
          animation: macbookCardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: calc(var(--i, 0) * 120ms);
        }
        .macbook-card:hover {
          transform: translateY(-6px);
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
