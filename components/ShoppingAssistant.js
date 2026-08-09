'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAffiliate } from '../contexts/AffiliateContext';
import { useCart } from '../contexts/CartContext';
import { formatCurrency } from '../lib/pricing';

const CATEGORIES = [
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

const BUDGET_OPTIONS = [150, 300, 500, 800, 1200];
const MIN_INSTALLMENTS = 1;
const MAX_INSTALLMENTS = 21;

// Tamanho vai via atributo width/height (não via classe CSS): estes ícones são
// componentes à parte, então o escopo do styled-jsx do componente pai não os
// alcança — uma regra CSS de tamanho aqui silenciosamente não bate em nada, e o
// SVG sem width/height definido cresce pra preencher o espaço livre do flex.
const SparkleIcon = ({ size = 16, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, ...style }}>
    <path d="M12 2.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2-5.2-1.8 5.2-1.8L12 2.5z" fill="currentColor" />
    <path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8L19 15z" fill="currentColor" />
  </svg>
);

const ArrowIcon = ({ size = 10, style }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" style={{ flexShrink: 0, ...style }}>
    <path d="M2 6h8M7 2l4 4-4 4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckIcon = ({ size = 8, style }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" style={{ flexShrink: 0, ...style }}>
    <path d="M2 6l3 3 5-6" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ShoppingAssistant() {
  const { brandColor } = useAffiliate();
  const { addToCart } = useCart();
  const brand = brandColor || '#0043f7';

  const [step, setStep] = useState('categories'); // categories | budget | installments | loading | result | empty
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [budgetInput, setBudgetInput] = useState('');
  const [maxInstallments, setMaxInstallments] = useState(12);
  const [combo, setCombo] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);
  const [addedAll, setAddedAll] = useState(false);

  const budgetValue = useMemo(() => {
    const parsed = parseFloat(String(budgetInput).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }, [budgetInput]);

  const stepNumber = { categories: 1, budget: 2, installments: 3 }[step] || null;
  const sliderProgress = ((maxInstallments - MIN_INSTALLMENTS) / (MAX_INSTALLMENTS - MIN_INSTALLMENTS)) * 100;

  const wrapRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          io.unobserve(el);
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggleCategory = (slug) => {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const goToBudget = () => {
    if (selectedCategories.length === 0) return;
    setStep('budget');
  };

  const goToInstallments = () => {
    if (budgetValue <= 0) return;
    setStep('installments');
  };

  const buildCombo = async () => {
    setStep('loading');
    setErrorInfo(null);
    setAddedAll(false);

    try {
      const res = await fetch('/api/combo-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: selectedCategories,
          maxInstallmentValue: budgetValue,
          maxInstallments,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setCombo(data.combo);
        setStep('result');
      } else {
        setErrorInfo(data);
        setStep('empty');
      }
    } catch (err) {
      console.error('[ShoppingAssistant] error building combo:', err);
      setErrorInfo({ error: 'Não conseguimos montar seu combo agora. Tenta de novo em instantes.' });
      setStep('empty');
    }
  };

  const restart = () => {
    setStep('categories');
    setSelectedCategories([]);
    setBudgetInput('');
    setMaxInstallments(12);
    setCombo(null);
    setErrorInfo(null);
    setAddedAll(false);
  };

  const tryAgainWithMoreRoom = () => {
    setStep('installments');
    setErrorInfo(null);
  };

  const handleAddAllToCart = () => {
    if (!combo) return;
    combo.items.forEach((item) => {
      addToCart({
        id: item.id,
        name: item.name,
        slug: item.slug,
        price: item.pixPrice,
        pixPrice: item.pixPrice,
        cardPrice: item.cardPrice,
        image: item.image_url,
        image_url: item.image_url,
      });
    });
    setAddedAll(true);
  };

  return (
    <section className="assist-section">
      <div className="container mx-auto px-4">
        <div className={`assist-wrap ${isVisible ? 'in-view' : ''}`} ref={wrapRef}>
          <div className="assist-intro">
            <div className="assist-badge">
              <SparkleIcon size={11} />
              Assistente de compra
            </div>
            <h2 className="assist-heading">Quanto dá pra levar com o seu orçamento?</h2>
            <p className="assist-subheading">Escolha o que você quer, diga quanto cabe no seu bolso por mês e a gente monta o combo que você pode levar hoje.</p>

            {stepNumber && (
              <div className="assist-progress">
                {[1, 2, 3].map((n) => (
                  <div key={n} className={`assist-dot ${n <= stepNumber ? 'active' : ''}`} />
                ))}
              </div>
            )}
          </div>

          <div className="assist-card">
            {step === 'categories' && (
              <div className="assist-step">
                <p className="assist-question">O que você tá pensando em comprar?</p>
                <div className="assist-chip-grid">
                  {CATEGORIES.map((cat) => {
                    const active = selectedCategories.includes(cat.slug);
                    return (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => toggleCategory(cat.slug)}
                        className={`assist-chip ${active ? 'active' : ''}`}
                      >
                        {active && (
                          <span className="assist-chip-check">
                            <CheckIcon size={8} />
                          </span>
                        )}
                        <span className="assist-chip-icon">{cat.icon}</span>
                        <span className="assist-chip-label">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={goToBudget}
                  disabled={selectedCategories.length === 0}
                  className="assist-cta assist-cta-block"
                >
                  Continuar <ArrowIcon size={10} />
                </button>
              </div>
            )}

            {step === 'budget' && (
              <div className="assist-step">
                <p className="assist-question">Quanto você consegue pagar por parcela?</p>
                <div className="assist-budget-chips">
                  {BUDGET_OPTIONS.map((v) => {
                    const active = budgetValue === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setBudgetInput(String(v))}
                        className={`assist-budget-chip ${active ? 'active' : ''}`}
                      >
                        {formatCurrency(v)}
                      </button>
                    );
                  })}
                </div>
                <div className="assist-input-wrap">
                  <span className="assist-input-prefix">R$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="decimal"
                    placeholder="Outro valor por parcela"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    className="assist-input"
                  />
                </div>
                <div className="assist-step-actions">
                  <button type="button" onClick={() => setStep('categories')} className="assist-back">Voltar</button>
                  <button type="button" onClick={goToInstallments} disabled={budgetValue <= 0} className="assist-cta">
                    Continuar <ArrowIcon size={10} />
                  </button>
                </div>
              </div>
            )}

            {step === 'installments' && (
              <div className="assist-step">
                <div className="assist-question-row">
                  <p className="assist-question">Em quantas parcelas, no máximo?</p>
                  <span className="assist-installments-value">{maxInstallments}x</span>
                </div>
                <input
                  type="range"
                  min={MIN_INSTALLMENTS}
                  max={MAX_INSTALLMENTS}
                  value={maxInstallments}
                  onChange={(e) => setMaxInstallments(parseInt(e.target.value, 10))}
                  className="assist-slider"
                  style={{ '--progress': `${sliderProgress}%` }}
                />
                <div className="assist-slider-labels">
                  <span>1x</span>
                  <span>21x</span>
                </div>
                <div className="assist-step-actions">
                  <button type="button" onClick={() => setStep('budget')} className="assist-back">Voltar</button>
                  <button type="button" onClick={buildCombo} className="assist-cta">
                    Montar combo <ArrowIcon size={10} />
                  </button>
                </div>
              </div>
            )}

            {step === 'loading' && (
              <div className="assist-loading">
                <div className="assist-loading-orb">
                  <SparkleIcon size={18} style={{ color: "#fff" }} />
                </div>
                <p>Montando o combo perfeito pro seu orçamento...</p>
              </div>
            )}

            {step === 'empty' && (
              <div className="assist-step">
                <p className="assist-empty-msg">{errorInfo?.error || 'Não conseguimos montar um combo com esses critérios.'}</p>
                {errorInfo?.cheapestOption && (
                  <a href={`/produto/${errorInfo.cheapestOption.slug}`} className="assist-cheapest-link">
                    Ver a opção mais em conta em {errorInfo.cheapestOption.categoryLabel}: {formatCurrency(errorInfo.cheapestOption.cardPrice)}
                  </a>
                )}
                <div className="assist-step-actions">
                  <button type="button" onClick={restart} className="assist-back">Começar de novo</button>
                  <button type="button" onClick={tryAgainWithMoreRoom} className="assist-cta">
                    Ajustar <ArrowIcon size={10} />
                  </button>
                </div>
              </div>
            )}

            {step === 'result' && combo && (
              <div className="assist-result">
                <div className="assist-result-items">
                  {combo.items.map((item, index) => (
                    <a key={item.id} href={`/produto/${item.slug}`} className="assist-result-item" style={{ '--i': index }}>
                      <div className="assist-result-img">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} loading="lazy" />
                        ) : (
                          <div className="assist-result-img-fallback" />
                        )}
                      </div>
                      <div className="assist-result-info">
                        <span className="assist-result-cat">{item.categoryLabel}</span>
                        <span className="assist-result-name">{item.name}</span>
                        <span className="assist-result-price">{formatCurrency(item.pixPrice)}</span>
                      </div>
                    </a>
                  ))}
                </div>

                <div className="assist-result-summary">
                  <div className="assist-result-summary-main">
                    <div>
                      <span className="assist-result-total-label">Total do combo</span>
                      <div className="assist-result-total-value">{formatCurrency(combo.totalCard)}</div>
                      <div className="assist-result-pix">ou {formatCurrency(combo.totalPix)} no PIX</div>
                    </div>
                    <div className="assist-result-installment-box">
                      <span className="assist-result-installment-label">cabe em</span>
                      <div className="assist-result-installment-value">
                        {combo.installmentsUsed}x de {formatCurrency(combo.installmentValue)}
                      </div>
                    </div>
                  </div>

                  {combo.droppedForBudget.length > 0 && (
                    <p className="assist-result-note">
                      Pra caber no seu orçamento, deixamos de fora: {combo.droppedForBudget.map((d) => d.categoryLabel).join(', ')}. Aumente as parcelas pra incluir tudo.
                    </p>
                  )}
                  {combo.unavailableCategories.length > 0 && (
                    <p className="assist-result-note">
                      Sem estoque no momento: {combo.unavailableCategories.map((d) => d.categoryLabel).join(', ')}.
                    </p>
                  )}

                  <div className="assist-step-actions">
                    <button type="button" onClick={restart} className="assist-back">Refazer</button>
                    <button type="button" onClick={handleAddAllToCart} className="assist-cta">
                      {addedAll ? 'Adicionado!' : 'Adicionar tudo ao carrinho'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .assist-section {
          background: #fbfbfd;
          padding: 40px 0;
        }
        @media (min-width: 768px) {
          .assist-section {
            padding: 56px 0;
          }
        }

        .assist-wrap {
          max-width: 960px;
          margin: 0 auto;
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .assist-wrap.in-view {
          opacity: 1;
          transform: translateY(0);
        }
        @media (min-width: 900px) {
          .assist-wrap {
            display: grid;
            grid-template-columns: 0.85fr 1.15fr;
            gap: 40px;
            align-items: center;
          }
        }

        @keyframes assistStepIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .assist-step,
        .assist-loading,
        .assist-result {
          animation: assistStepIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @media (prefers-reduced-motion: reduce) {
          .assist-wrap,
          .assist-step,
          .assist-loading,
          .assist-result,
          .assist-result-item,
          .assist-loading-orb {
            animation: none !important;
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }

        .assist-intro {
          margin-bottom: 20px;
        }
        @media (min-width: 900px) {
          .assist-intro {
            margin-bottom: 0;
          }
        }

        .assist-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: ${brand};
          background: color-mix(in srgb, ${brand} 9%, white);
          border: 1px solid color-mix(in srgb, ${brand} 20%, white);
          padding: 5px 11px;
          border-radius: 999px;
          margin-bottom: 12px;
        }

        .assist-heading {
          font-size: clamp(22px, 2.6vw, 30px);
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.15;
          margin: 0 0 8px;
          color: #0c0e0b;
        }

        .assist-subheading {
          font-size: 15px;
          line-height: 1.5;
          color: #6e6e73;
          margin: 0 0 20px;
          max-width: 380px;
        }

        .assist-progress {
          display: flex;
          gap: 5px;
        }
        .assist-dot {
          width: 22px;
          height: 3px;
          border-radius: 999px;
          background: #e5e5e7;
          transition: background 0.3s ease;
        }
        .assist-dot.active {
          background: ${brand};
        }

        .assist-card {
          position: relative;
          border-radius: 20px;
          background: #ffffff;
          border: 1px solid #e5e5e7;
          box-shadow: 0 16px 40px -28px rgba(0, 0, 0, 0.2);
          padding: 20px;
        }
        @media (min-width: 640px) {
          .assist-card {
            padding: 26px 28px;
          }
        }

        .assist-question {
          font-size: 15px;
          font-weight: 600;
          color: #0c0e0b;
          margin: 0 0 14px;
        }

        .assist-question-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .assist-question-row .assist-question {
          margin: 0;
        }
        .assist-installments-value {
          font-size: 20px;
          font-weight: 700;
          color: ${brand};
        }

        .assist-chip-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 18px;
        }

        .assist-chip {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 14px 6px 12px;
          border-radius: 13px;
          border: 1.5px solid #e5e5e7;
          background: #fbfbfd;
          color: #0c0e0b;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
        }
        .assist-chip:hover {
          transform: translateY(-2px);
          border-color: #c7c7cc;
          box-shadow: 0 8px 18px -14px rgba(0, 0, 0, 0.3);
        }
        .assist-chip:active {
          transform: scale(0.96);
        }
        .assist-chip.active {
          border-color: ${brand};
          background: color-mix(in srgb, ${brand} 6%, white);
        }

        .assist-chip-icon {
          width: 24px;
          height: 24px;
          color: #0c0e0b;
        }
        .assist-chip.active .assist-chip-icon {
          color: ${brand};
        }
        .assist-chip-icon :global(svg) {
          width: 100%;
          height: 100%;
        }
        .assist-chip-icon :global(path),
        .assist-chip-icon :global(rect),
        .assist-chip-icon :global(circle),
        .assist-chip-icon :global(line) {
          stroke: currentColor;
          stroke-width: 1.5;
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .assist-chip-label {
          font-size: 11.5px;
          font-weight: 600;
        }

        .assist-chip-check {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 15px;
          height: 15px;
          border-radius: 999px;
          background: ${brand};
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .assist-budget-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
        }
        .assist-budget-chip {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1.5px solid #e5e5e7;
          background: #fff;
          color: #0c0e0b;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .assist-budget-chip:hover {
          border-color: #c7c7cc;
        }
        .assist-budget-chip:active {
          transform: scale(0.95);
        }
        .assist-budget-chip.active {
          border-color: ${brand};
          background: ${brand};
          color: #fff;
        }

        .assist-input-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1.5px solid #e5e5e7;
          border-radius: 12px;
          padding: 2px 14px;
          max-width: 280px;
          margin-bottom: 18px;
          background: #fbfbfd;
          transition: border-color 0.2s ease;
        }
        .assist-input-wrap:focus-within {
          border-color: ${brand};
        }
        .assist-input-prefix {
          font-size: 14px;
          font-weight: 700;
          color: #86868b;
        }
        .assist-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #0c0e0b;
          font-size: 14.5px;
          padding: 10px 0;
        }
        .assist-input::placeholder {
          color: #a1a1a6;
        }
        .assist-input::-webkit-outer-spin-button,
        .assist-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .assist-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 5px;
          border-radius: 999px;
          margin: 14px 0 6px;
          background: linear-gradient(to right, ${brand} 0%, ${brand} var(--progress), #e5e5e7 var(--progress), #e5e5e7 100%);
          outline: none;
        }
        .assist-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: #fff;
          border: 3px solid ${brand};
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          cursor: pointer;
        }
        .assist-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: #fff;
          border: 3px solid ${brand};
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          cursor: pointer;
        }
        .assist-slider::-moz-range-track {
          height: 5px;
          border-radius: 999px;
          background: #e5e5e7;
        }
        .assist-slider::-moz-range-progress {
          height: 5px;
          border-radius: 999px;
          background: ${brand};
        }

        .assist-slider-labels {
          display: flex;
          justify-content: space-between;
          font-size: 11.5px;
          color: #a1a1a6;
          margin-bottom: 18px;
        }

        .assist-step-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 14px;
        }

        .assist-back {
          background: none;
          border: none;
          color: #6e6e73;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          padding: 10px 4px;
        }
        .assist-back:hover {
          color: #0c0e0b;
        }

        .assist-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          white-space: nowrap;
          border: none;
          color: #fff;
          background: ${brand};
          font-size: 13px;
          font-weight: 700;
          padding: 11px 20px;
          border-radius: 999px;
          cursor: pointer;
          transition: filter 0.2s ease, transform 0.15s ease;
        }
        .assist-cta-block {
          width: 100%;
        }
        .assist-cta:hover:not(:disabled) {
          filter: brightness(1.1);
        }
        .assist-cta:active:not(:disabled) {
          transform: scale(0.98);
        }
        .assist-cta:disabled {
          background: #d2d2d7;
          cursor: not-allowed;
        }
        .assist-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 22px 0 10px;
          gap: 14px;
        }
        .assist-loading-orb {
          width: 44px;
          height: 44px;
          border-radius: 999px;
          background: ${brand};
          display: flex;
          align-items: center;
          justify-content: center;
          animation: assistPulse 1.4s ease-in-out infinite;
        }
        @keyframes assistPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.75;
          }
        }
        .assist-loading p {
          font-size: 13.5px;
          color: #6e6e73;
        }

        .assist-empty-msg {
          font-size: 14px;
          color: #3a3a3c;
          margin-bottom: 12px;
        }
        .assist-cheapest-link {
          display: inline-block;
          font-size: 13px;
          color: ${brand};
          font-weight: 600;
          text-decoration: underline;
          margin-bottom: 18px;
        }

        .assist-result-items {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }

        .assist-result-item {
          display: flex;
          flex-direction: column;
          background: #fff;
          border: 1px solid #e5e5e7;
          border-radius: 12px;
          overflow: hidden;
          text-decoration: none;
          color: #0c0e0b;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          animation: assistStepIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: calc(var(--i, 0) * 70ms);
        }
        .assist-result-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -14px rgba(0, 0, 0, 0.3);
        }

        .assist-result-img {
          background: #fbfbfd;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-bottom: 1px solid #f0f0f2;
        }
        .assist-result-img img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 8px;
        }
        .assist-result-img-fallback {
          width: 100%;
          height: 100%;
          background: #e5e5e7;
        }

        .assist-result-info {
          display: flex;
          flex-direction: column;
          padding: 8px 9px 9px;
          flex: 1;
        }

        .assist-result-cat {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: #86868b;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .assist-result-name {
          font-size: 11.5px;
          font-weight: 600;
          line-height: 1.3;
          margin-bottom: 6px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .assist-result-price {
          font-size: 12.5px;
          font-weight: 700;
          color: ${brand};
          margin-top: auto;
        }

        .assist-result-summary {
          background: color-mix(in srgb, ${brand} 5%, white);
          border: 1px solid color-mix(in srgb, ${brand} 14%, white);
          border-radius: 14px;
          padding: 16px;
        }

        .assist-result-summary-main {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 4px;
        }

        .assist-result-total-label {
          font-size: 11.5px;
          color: #6e6e73;
          font-weight: 600;
        }
        .assist-result-total-value {
          font-size: 23px;
          font-weight: 700;
          color: #0c0e0b;
          letter-spacing: -0.01em;
        }
        .assist-result-pix {
          font-size: 12px;
          color: #6e6e73;
        }

        .assist-result-installment-box {
          text-align: right;
        }
        .assist-result-installment-label {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: #6e6e73;
        }
        .assist-result-installment-value {
          font-size: 16px;
          font-weight: 700;
          color: ${brand};
        }

        .assist-result-note {
          font-size: 11.5px;
          color: #6e6e73;
          margin: 8px 0 0;
        }

        .assist-result-summary .assist-step-actions {
          margin-top: 14px;
        }
      `}</style>
    </section>
  );
}
