import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

const CATEGORY_KEYWORDS = {
  racoes: 'nutrição completa, palatabilidade, proteínas, vitaminas, minerais, digestibilidade, ração para cães, ração para gatos, saúde do pet',
  petiscos: 'snack natural, petisco para adestramento, recompensa, sem conservantes, ingredientes naturais, tira-gosto saudável',
  brinquedos: 'brinquedo interativo, estimulação mental, resistente, não tóxico, entretenimento, enriquecimento ambiental',
  coleiras: 'coleira ajustável, segura, resistente, passear com pet, identificação, nylon, couro, conforto no pescoço',
  guias: 'guia retrátil, passeio seguro, controle do pet, resistente, ergonômica, cão na coleira',
  passeio: 'acessório para passeio, segurança, controle, conforto, mobilidade com pet',
  acessorios: 'acessório pet, qualidade, durabilidade, prático, estilo, conforto para o animal',
  'higiene-e-saude': 'higiene pet, saúde animal, banho, grooming, cuidados veterinários, prevenção',
  'camas-e-casas': 'cama para cachorro, casa para gato, conforto, descanso, segurança, lavável, pelúcia',
  farmacia: 'saúde animal, prevenção, tratamento, veterinário, bem-estar, remédio pet',
  limpeza: 'limpeza segura para pets, sem produtos tóxicos, higiene do lar com animais',
};

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

async function callGemini(apiKey, payload) {
  return fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function parseGeminiText(result) {
  return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callGroq(apiKey, systemInstruction, userPrompt) {
  return fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.65,
      max_tokens: 4096,
    }),
  });
}

function fixJsonNewlines(text) {
  let result = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; result += ch; continue; }
    if (ch === '\\' && inString) { escaped = true; result += ch; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }
    if (inString && ch === '\n') { result += '\\n'; continue; }
    if (inString && ch === '\r') { result += '\\r'; continue; }
    if (inString && ch === '\t') { result += '\\t'; continue; }
    result += ch;
  }
  return result;
}

function parseJsonFromText(text) {
  try { return JSON.parse(text); } catch {}
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try { return JSON.parse(stripped); } catch {}
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    const extracted = text.slice(start, end + 1);
    try { return JSON.parse(extracted); } catch {}
    try { return JSON.parse(fixJsonNewlines(extracted)); } catch {}
  }
  return null;
}

export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const {
      name,
      category,
      sku,
      description: existingDesc,
      weight,
      height,
      width,
      depth,
      cost_price,
      supplier_margin_percentage,
    } = await request.json();

    if (!name) {
      return NextResponse.json({ success: false, error: 'Nome do produto é obrigatório' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
      return NextResponse.json({ success: false, error: 'Nenhuma chave de IA configurada (GEMINI_API_KEY ou GROQ_API_KEY)' }, { status: 500 });
    }

    const categoryKeywords = CATEGORY_KEYWORDS[category] || 'pet, animal de estimação, qualidade, segurança, conforto';
    const skuLabel = sku ? `SKU: ${sku}` : '';

    // Build technical details block from available product data
    const technicalDetails = [];
    if (weight) technicalDetails.push(`Peso: ${weight}g`);
    if (height || width || depth) {
      const dims = [height && `${height}cm (alt)`, width && `${width}cm (larg)`, depth && `${depth}cm (prof)`]
        .filter(Boolean).join(' × ');
      if (dims) technicalDetails.push(`Dimensões: ${dims}`);
    }
    if (cost_price && supplier_margin_percentage) {
      const netPrice = parseFloat(cost_price) / (1 - parseFloat(supplier_margin_percentage) / 100);
      technicalDetails.push(`Faixa de preço: R$ ${netPrice.toFixed(2)}`);
    }
    const technicalBlock = technicalDetails.length > 0
      ? `\nDados técnicos do produto:\n${technicalDetails.join('\n')}\n`
      : '';

    const existingContext = existingDesc?.trim()
      ? `\nDescrição atual (melhore e expanda com mais detalhes se necessário):\n"${existingDesc.trim()}"\n`
      : '';

    const systemInstruction = `Você é um especialista em copywriting, SEO e GEO (Generative Engine Optimization) para e-commerce de pet shop brasileiro chamado BrandPet.

Seu trabalho é criar descrições que:
1. Ranqueiam bem no Google com palavras-chave relevantes e densidade natural
2. São otimizadas para respostas de IA (perguntas como "qual melhor ração para cachorro?")
3. Convertem visitantes em compradores com linguagem persuasiva e empática
4. Transmitem confiança e especialidade — como um veterinário que também é amigo do tutor

Regras absolutas:
- Escreva em português brasileiro fluente e natural
- NUNCA use asteriscos, markdown, bullet points ou listas no texto corrido
- NUNCA invente especificações técnicas que não existam no produto
- Retorne SOMENTE o JSON solicitado, sem texto fora do JSON
- CRÍTICO para JSON válido: dentro dos valores de string, use \\n para separar parágrafos e NUNCA insira quebras de linha literais (Enter) — o JSON deve ser uma única linha contínua sem quebras dentro dos valores`;

    const userPrompt = `Pesquise o produto na web para encontrar informações reais e detalhadas (composição, ingredientes, fabricante, indicações de uso, diferenciais, tamanhos disponíveis, para qual porte/raça/espécie é indicado) e crie o conteúdo abaixo.

Produto: ${name}
Categoria: ${category || 'pet'}
${skuLabel}
Keywords prioritárias: ${categoryKeywords}
${technicalBlock}${existingContext}

IMPORTANTE: A descrição deve ser RICA em detalhes específicos do produto — composição real, ingredientes, peso, tamanho, para qual animal é indicado, modo de uso, diferenciais da marca. Não seja genérico.

Retorne exatamente este JSON minificado (sem markdown, sem quebras de linha fora das strings, sem espaços extras):
{"description":"Descrição completa com 3 parágrafos fluidos (220-320 palavras), separados por \\n\\n dentro da string. Estrutura obrigatória: [1º parágrafo: o que é o produto, para qual animal/porte/fase é indicado e seu principal diferencial] [2º parágrafo: detalhes reais — ingredientes/composição/material/tecnologia, benefícios concretos e mensuráveis para o pet, como usar] [3º parágrafo: vantagens para o tutor — praticidade, confiança, custo-benefício — e chamada para ação sutil]. Use as keywords naturalmente. SEM markdown. Tom: especialista caloroso e confiável.","short_description":"Uma frase de impacto com até 30 palavras que inclua o diferencial principal, para qual animal é indicado e o benefício mais importante.","meta_title":"Título SEO com até 60 caracteres. Formato: [Nome do Produto] - [Benefício Principal] | BrandPet","meta_description":"Meta description com 140-155 caracteres. Inclua keyword principal, para qual animal é, benefício e call-to-action."}`;

    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    const basePayload = {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { temperature: 0.65, maxOutputTokens: 2048 },
    };

    let parsed = null;
    let usedProvider = null;

    console.info(`[AI] geminiKey=${!!geminiKey} groqKey=${!!groqKey} product="${name}"`);

    // --- Attempt 1: Gemini + web search ---
    if (geminiKey) {
      const res1 = await callGemini(geminiKey, { ...basePayload, tools: [{ google_search: {} }] });
      if (res1.ok) {
        const body1 = await res1.json();
        parsed = parseJsonFromText(parseGeminiText(body1));
        if (parsed?.description) {
          usedProvider = 'gemini+search';
        } else {
          console.warn('[AI] Gemini+search responded ok but JSON parse failed. Raw text:', parseGeminiText(body1).slice(0, 2000));
        }
      } else {
        const errBody1 = await res1.json().catch(() => ({}));
        console.warn(`[AI] Gemini+search failed status=${res1.status}`, JSON.stringify(errBody1).slice(0, 400));
        if (res1.status !== 429) {
          // Attempt 2: Gemini without web search
          const res2 = await callGemini(geminiKey, basePayload);
          if (res2.ok) {
            const body2 = await res2.json();
            parsed = parseJsonFromText(parseGeminiText(body2));
            if (parsed?.description) {
              usedProvider = 'gemini';
            } else {
              console.warn('[AI] Gemini (no search) responded ok but JSON parse failed. Raw text:', parseGeminiText(body2).slice(0, 2000));
            }
          } else {
            const errBody2 = await res2.json().catch(() => ({}));
            console.warn(`[AI] Gemini (no search) failed status=${res2.status}`, JSON.stringify(errBody2).slice(0, 400));
          }
        } else {
          console.warn('[AI] Gemini rate limited (429), trying Groq fallback');
        }
      }
    }

    // --- Attempt 3: Groq Llama 3.3 70B fallback ---
    if (!parsed?.description && groqKey) {
      console.info('[AI] Falling back to Groq Llama 3.3 70B');
      const groqPrompt = userPrompt.replace(
        'Pesquise o produto na web para encontrar informações reais e detalhadas (composição, ingredientes, fabricante, indicações de uso, diferenciais, tamanhos disponíveis, para qual porte/raça/espécie é indicado) e crie o conteúdo abaixo.',
        'Com base no seu conhecimento sobre o produto e os dados fornecidos, crie o conteúdo abaixo de forma precisa e detalhada.'
      );
      const res3 = await callGroq(groqKey, systemInstruction, groqPrompt);
      if (res3.ok) {
        const groqResult = await res3.json();
        const groqText = groqResult.choices?.[0]?.message?.content || '';
        parsed = parseJsonFromText(groqText);
        if (parsed?.description) {
          usedProvider = 'groq';
        } else {
          console.warn('[AI] Groq responded ok but JSON parse failed. Raw text:', groqText.slice(0, 2000));
        }
      } else {
        const errBody3 = await res3.json().catch(() => ({}));
        console.error(`[AI] Groq failed status=${res3.status}`, JSON.stringify(errBody3).slice(0, 400));
      }
    } else if (!parsed?.description && !groqKey) {
      console.warn('[AI] GROQ_API_KEY not set — no fallback available');
    }

    if (!parsed?.description) {
      if (!groqKey && geminiKey) {
        return NextResponse.json({ success: false, error: 'rate_limit', retryAfter: 30 }, { status: 429 });
      }
      return NextResponse.json({ success: false, error: 'Todos os provedores de IA falharam' }, { status: 500 });
    }

    console.info(`[AI] Description generated via ${usedProvider}`);
    return NextResponse.json({
      success: true,
      provider: usedProvider,
      description: parsed.description?.trim() || '',
      short_description: parsed.short_description?.trim() || '',
      meta_title: parsed.meta_title?.trim() || '',
      meta_description: parsed.meta_description?.trim() || '',
    });
  } catch (error) {
    console.error('Error generating description:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}
