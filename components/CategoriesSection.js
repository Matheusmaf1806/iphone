'use client';

import { useEffect, useRef } from 'react';

const ArrowIcon = () => (
  <svg viewBox="0 0 12 12">
    <path d="M2 6h8M7 2l4 4-4 4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const categories = [
  {
    slug: 'iphone',
    label: 'iPhone',
    icon: (
      <svg viewBox="0 0 64 64">
        <rect x="20" y="6" width="24" height="52" rx="7" />
        <line x1="20" y1="14" x2="44" y2="14" />
        <line x1="20" y1="50" x2="44" y2="50" />
        <circle cx="32" cy="54" r="1.6" />
      </svg>
    ),
  },
  {
    slug: 'mac',
    label: 'Mac',
    icon: (
      <svg viewBox="0 0 64 64">
        <rect x="8" y="12" width="48" height="30" rx="3" />
        <path d="M4 46h56l-5 6H9z" />
        <line x1="27" y1="46" x2="37" y2="46" />
      </svg>
    ),
  },
  {
    slug: 'ipad',
    label: 'iPad',
    icon: (
      <svg viewBox="0 0 64 64">
        <rect x="14" y="6" width="36" height="52" rx="6" />
        <circle cx="32" cy="52" r="1.6" />
      </svg>
    ),
  },
  {
    slug: 'apple-watch',
    label: 'Apple Watch',
    icon: (
      <svg viewBox="0 0 64 64">
        <path d="M24 14V8h16v6M24 50v6h16v-6" />
        <rect x="21" y="14" width="22" height="36" rx="9" />
        <line x1="43" y1="27" x2="47" y2="27" />
      </svg>
    ),
  },
  {
    slug: 'airpods',
    label: 'AirPods',
    icon: (
      <svg viewBox="0 0 64 64">
        <rect x="18" y="20" width="28" height="30" rx="7" />
        <line x1="32" y1="27" x2="32" y2="34" />
        <path d="M26 12c0-4 3-7 6-7s6 3 6 7v6" />
        <circle cx="26" cy="18" r="1.4" />
        <circle cx="38" cy="18" r="1.4" />
      </svg>
    ),
  },
  {
    slug: 'acessorios',
    label: 'Acessórios',
    icon: (
      <svg viewBox="0 0 64 64">
        <circle cx="22" cy="42" r="8" />
        <circle cx="42" cy="22" r="8" />
        <line x1="27" y1="37" x2="37" y2="27" />
      </svg>
    ),
  },
];

export default function CategoriesSection() {
  const gridRef = useRef(null);

  useEffect(() => {
    const cards = gridRef.current?.querySelectorAll('.cat-card');
    if (!cards || cards.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    cards.forEach((card) => io.observe(card));
    return () => io.disconnect();
  }, []);

  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty('--x', `${x}%`);
    card.style.setProperty('--y', `${y}%`);
  };

  return (
    <section className="cat-section">
      <div className="container mx-auto px-4">
        <p className="cat-eyebrow">EXPLORAR</p>
        <h2 className="cat-heading">
          Categorias. <span>Escolha a sua.</span>
        </h2>

        <div className="cat-grid" ref={gridRef}>
          {categories.map((category, index) => (
            <a
              key={category.slug}
              href={`/categoria/${category.slug}`}
              className="cat-card"
              style={{ '--i': index }}
              onMouseMove={handleMouseMove}
            >
              <div className="cat-spot"></div>
              <div className="cat-icon">{category.icon}</div>
              <span className="cat-label">{category.label}</span>
              <span className="cat-cta">
                Ver categoria <ArrowIcon />
              </span>
            </a>
          ))}
        </div>
      </div>

      <style jsx>{`
        .cat-section {
          background: #fbfbfd;
          padding: 64px 0 24px;
        }
        @media (min-width: 768px) {
          .cat-section {
            padding: 80px 0 32px;
          }
        }

        .cat-eyebrow {
          font-size: 13px;
          letter-spacing: 0.04em;
          color: var(--brand-color, #0043f7);
          font-weight: 600;
          margin: 0 0 8px;
        }

        .cat-heading {
          font-size: clamp(28px, 4.4vw, 48px);
          font-weight: 600;
          letter-spacing: -0.02em;
          margin: 0 0 36px;
          color: #0c0e0b;
        }
        .cat-heading span {
          color: #707070;
          font-weight: 500;
        }

        .cat-grid {
          display: flex;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          gap: 1px;
          background: #e5e5e7;
          border: 1px solid #e5e5e7;
          border-radius: 18px;
        }
        .cat-grid::-webkit-scrollbar {
          display: none;
        }

        @media (min-width: 860px) {
          .cat-grid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            overflow: hidden;
            border-radius: 22px;
          }
        }

        .cat-card {
          position: relative;
          background: #ffffff;
          text-decoration: none;
          color: #0c0e0b;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 30px 12px 22px;
          min-height: 190px;
          flex: 0 0 42%;
          scroll-snap-align: start;
          overflow: hidden;
          isolation: isolate;
          opacity: 0;
          transform: translateY(18px);
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s ease;
        }

        @media (min-width: 860px) {
          .cat-card {
            aspect-ratio: 3 / 4;
            min-height: 0;
            flex: initial;
            padding: 38px 14px 26px;
          }
        }

        .cat-card.in-view {
          animation: catCardIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: calc(var(--i) * 70ms);
        }
        @keyframes catCardIn {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .cat-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 24px 48px -20px rgba(0, 0, 0, 0.18);
          z-index: 2;
        }

        .cat-spot {
          position: absolute;
          inset: 0;
          background: radial-gradient(220px circle at var(--x, 50%) var(--y, 20%), rgba(0, 67, 247, 0.1), transparent 70%);
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
        }
        .cat-card:hover .cat-spot {
          opacity: 1;
        }

        .cat-icon {
          width: 64px;
          height: 64px;
          margin-bottom: 18px;
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .cat-card:hover .cat-icon {
          transform: translateY(-4px) scale(1.08);
        }
        .cat-icon svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        .cat-icon :global(path),
        .cat-icon :global(rect),
        .cat-icon :global(circle),
        .cat-icon :global(line) {
          stroke: #0c0e0b;
          stroke-width: 1.3;
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 220;
          stroke-dashoffset: 220;
          transition: stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .cat-card.in-view .cat-icon :global(path),
        .cat-card.in-view .cat-icon :global(rect),
        .cat-card.in-view .cat-icon :global(circle),
        .cat-card.in-view .cat-icon :global(line) {
          stroke-dashoffset: 0;
          transition-delay: calc(var(--i) * 70ms + 0.25s);
        }

        .cat-label {
          font-size: 16px;
          font-weight: 600;
          letter-spacing: -0.01em;
          margin-bottom: 6px;
          text-align: center;
        }

        .cat-cta {
          font-size: 12.5px;
          color: var(--brand-color, #0043f7);
          display: flex;
          align-items: center;
          gap: 3px;
          opacity: 0;
          transform: translateY(4px);
          transition: opacity 0.35s ease, transform 0.35s ease;
        }
        .cat-card:hover .cat-cta {
          opacity: 1;
          transform: translateY(0);
        }
        .cat-cta :global(svg) {
          width: 11px;
          height: 11px;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .cat-card:hover .cat-cta :global(svg) {
          transform: translateX(3px);
        }

        .cat-card::after {
          content: '';
          position: absolute;
          left: 14px;
          right: 14px;
          bottom: 0;
          height: 2px;
          background: var(--brand-color, #0043f7);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .cat-card:hover::after {
          transform: scaleX(1);
        }

        @media (prefers-reduced-motion: reduce) {
          .cat-card,
          .cat-icon :global(path),
          .cat-icon :global(rect),
          .cat-icon :global(circle),
          .cat-icon :global(line) {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </section>
  );
}
