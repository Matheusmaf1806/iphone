// Cotação dólar -> real usada na cascata de preço (lib/pricing.js `resolveCostPriceBRL`).
// Busca a PTAX oficial do Banco Central (cotação de venda) e aplica IOF (3,5%) +
// spread (1,5%) por cima — os dois cobrados numa operação de câmbio de verdade.
// Cacheia por 1h em memória (dura enquanto a instância do servidor ficar viva) e
// cai pro valor manual salvo em platform_config.usd_brl_rate se a API do BCB
// estiver fora do ar, pra nunca travar a precificação do site por causa disso.

const IOF_PERCENT = 3.5;
const SPREAD_PERCENT = 1.5;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h
const BCB_TIMEOUT_MS = 5000;
const MAX_DAYS_BACK = 8; // cobre fins de semana + feriados prolongados

let cachedRate = null;
let cachedAt = 0;

function formatDateBCB(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

async function fetchPtaxForDate(date) {
  const dateStr = formatDateBCB(date);
  const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${dateStr}'&$format=json&$select=cotacaoVenda`;

  const res = await fetch(url, { signal: AbortSignal.timeout(BCB_TIMEOUT_MS) });
  if (!res.ok) return null;

  const data = await res.json();
  const value = data?.value?.[0]?.cotacaoVenda;
  return value ? parseFloat(value) : null;
}

// PTAX só existe em dia útil com pregão — anda pra trás dia a dia até achar a
// cotação mais recente publicada (fins de semana/feriados não têm cotação).
async function fetchLatestPtax() {
  const today = new Date();
  for (let i = 0; i < MAX_DAYS_BACK; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    try {
      const rate = await fetchPtaxForDate(date);
      if (rate) return rate;
    } catch (err) {
      // Tenta o dia anterior — não interrompe a busca por causa de 1 falha pontual.
    }
  }
  return null;
}

/**
 * Cotação dólar->real pronta pra precificação (PTAX + IOF + spread).
 * @param {number} [fallbackRate] - usado se a API do BCB não responder (ex:
 *   plataform_config.usd_brl_rate, configurado manualmente no admin).
 */
export async function getUsdBrlRate(fallbackRate) {
  const now = Date.now();
  if (cachedRate && (now - cachedAt) < CACHE_TTL_MS) {
    return cachedRate;
  }

  try {
    const ptax = await fetchLatestPtax();
    if (ptax) {
      const rate = ptax * (1 + (IOF_PERCENT + SPREAD_PERCENT) / 100);
      cachedRate = parseFloat(rate.toFixed(4));
      cachedAt = now;
      return cachedRate;
    }
  } catch (err) {
    console.error('[ExchangeRate] Falha ao buscar PTAX do Banco Central:', err);
  }

  // BCB fora do ar ou sem cotação recente — usa o fallback (ou o último valor em
  // cache, mesmo vencido, antes de cair pro número fixo de emergência).
  return fallbackRate || cachedRate || 5.5;
}
