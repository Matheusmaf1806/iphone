import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { createAdminClient } from '../../../../lib/supabase/admin';

export const dynamic = 'force-dynamic';

const DEFAULT_AFFILIATE_MARGIN = 10;
const GEMINI_25_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';
const GEMINI_20_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

function calculateFinalPrice(costPrice, brandpetMargin, affiliateMargin = DEFAULT_AFFILIATE_MARGIN) {
  const netPrice = costPrice / (1 - brandpetMargin / 100);
  const finalPrice = netPrice / (1 - affiliateMargin / 100);
  return Math.round(finalPrice * 100) / 100;
}

function parseJsonFromText(text) {
  try { return JSON.parse(text); } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return null;
}

async function callGeminiPrice(modelUrl, apiKey, prompt) {
  return fetch(`${modelUrl}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
    }),
  });
}

// POST /api/ai/price-check - Check price for one or multiple products
export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const { products } = await request.json();

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ success: false, error: 'Produtos inválidos' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY não configurada' }, { status: 500 });
    }

    const supabase = createAdminClient();
    const results = [];

    for (const product of products) {
      const ourPrice = calculateFinalPrice(
        parseFloat(product.cost_price || 0),
        parseFloat(product.supplier_margin_percentage || 10)
      );

      const prompt = `Você é um assistente especializado em pesquisa de preços para pet shops brasileiros.

Pesquise o preço atual do seguinte produto pet nas lojas online brasileiras:

Produto: ${product.name}
Categoria: ${product.category || 'pet'}
Nosso preço atual: R$ ${ourPrice.toFixed(2)}

Busque em:
1. Petlove (petlove.com.br)
2. Cobasi (cobasi.com.br)
3. Petz (petz.com.br)

Retorne APENAS um JSON válido (sem markdown, sem explicações) no seguinte formato:
{
  "petlove_price": <número em reais ou null se não encontrado>,
  "cobasi_price": <número em reais ou null se não encontrado>,
  "petz_price": <número em reais ou null se não encontrado>,
  "found_product": "<nome exato encontrado ou null>",
  "note": "<observação breve sobre a pesquisa>"
}

Se o produto não for encontrado em uma loja, use null para aquele campo. Não invente preços - use apenas dados reais encontrados.`;

      try {
        let priceData = null;
        let usedProvider = null;

        // Attempt 1: Gemini 2.5 Flash + web search
        const res1 = await callGeminiPrice(GEMINI_25_URL, geminiKey, prompt);
        if (res1.ok) {
          const text1 = (await res1.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
          priceData = parseJsonFromText(text1);
          if (priceData) usedProvider = 'gemini-2.5+search';
        } else {
          const err1 = await res1.json().catch(() => ({}));
          console.warn(`[PriceCheck] Gemini 2.5 failed status=${res1.status} product="${product.name}"`, JSON.stringify(err1).slice(0, 300));

          // Attempt 2: Gemini 2.0 Flash + web search (only if not rate-limited)
          if (res1.status !== 429) {
            const res2 = await callGeminiPrice(GEMINI_20_URL, geminiKey, prompt);
            if (res2.ok) {
              const text2 = (await res2.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
              priceData = parseJsonFromText(text2);
              if (priceData) usedProvider = 'gemini-2.0+search';
            } else {
              const err2 = await res2.json().catch(() => ({}));
              console.warn(`[PriceCheck] Gemini 2.0 failed status=${res2.status} product="${product.name}"`, JSON.stringify(err2).slice(0, 300));
            }
          } else {
            console.warn(`[PriceCheck] Gemini rate limited (429) for "${product.name}"`);
          }
        }

        if (!priceData) {
          priceData = { petlove_price: null, cobasi_price: null, petz_price: null, note: 'Gemini indisponível — tente novamente mais tarde' };
        }

        if (usedProvider) console.info(`[PriceCheck] "${product.name}" checked via ${usedProvider}`);

        const competitors = [priceData.petlove_price, priceData.cobasi_price, priceData.petz_price]
          .filter(p => p !== null && p > 0);
        const cheapestCompetitor = competitors.length > 0 ? Math.min(...competitors) : null;
        const priceDiff = cheapestCompetitor ? ourPrice - cheapestCompetitor : null;
        const priceDiffPct = cheapestCompetitor ? ((ourPrice - cheapestCompetitor) / cheapestCompetitor) * 100 : null;

        let alertType = 'no_data';
        if (cheapestCompetitor !== null) {
          if (priceDiffPct > 10) alertType = 'expensive';
          else if (priceDiffPct < -5) alertType = 'cheap';
          else alertType = 'competitive';
        }

        const record = {
          product_id: product.id,
          product_name: product.name,
          our_price: ourPrice,
          petlove_price: priceData.petlove_price || null,
          cobasi_price: priceData.cobasi_price || null,
          petz_price: priceData.petz_price || null,
          cheapest_competitor: cheapestCompetitor,
          difference_amount: priceDiff,
          difference_percentage: priceDiffPct ? Math.round(priceDiffPct * 100) / 100 : null,
          alert_type: alertType,
          note: priceData.note || null,
        };

        results.push(record);

        if (supabase) {
          await supabase
            .from('price_comparisons')
            .upsert({ ...record, checked_at: new Date().toISOString() }, { onConflict: 'product_id' })
            .select();
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Error checking price for ${product.name}:`, err);
        results.push({
          product_id: product.id,
          product_name: product.name,
          our_price: ourPrice,
          petlove_price: null,
          cobasi_price: null,
          petz_price: null,
          alert_type: 'error',
          note: 'Erro ao pesquisar',
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error in price-check:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// GET /api/ai/price-check - Get stored price comparisons
export async function GET(request) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Sem conexão com o banco' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('price_comparisons')
      .select('*')
      .order('checked_at', { ascending: false })
      .limit(500);

    if (error) {
      // Table might not exist yet
      if (error.code === '42P01') {
        return NextResponse.json({
          success: false,
          error: 'table_not_found',
          message: 'Tabela price_comparisons não existe. Execute a migration SQL no Supabase.',
        }, { status: 404 });
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error getting price comparisons:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}
