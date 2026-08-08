import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { createServerClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

// Gerar slug a partir do nome
function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Parsear valor monetário brasileiro (ex: "R$ 161,76" -> 161.76)
function parseMoneyBR(value) {
  if (!value) return null;
  const cleaned = value
    .replace('R$', '')
    .replace(/\s/g, '')
    .replace(/\./g, '')   // remove pontos de milhar
    .replace(',', '.');   // troca vírgula por ponto
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { products: csvProducts } = await request.json();

    if (!csvProducts || !Array.isArray(csvProducts) || csvProducts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum produto encontrado no CSV' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Erro de conexão com o banco' },
        { status: 500 }
      );
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const row of csvProducts) {
      try {
        const name = row['Nome Sugerido (Venda)'] || '';
        if (!name) {
          results.push({ name: '(sem nome)', success: false, error: 'Nome não encontrado' });
          errorCount++;
          continue;
        }

        const costPrice = parseMoneyBR(row['Custo Unit (R$)']);

        if (!costPrice) {
          results.push({ name, success: false, error: 'Custo unitário inválido' });
          errorCount++;
          continue;
        }

        // Margem padrão de 10% - ajustar depois no ERP
        const marginPercentage = 10;

        const slug = generateSlug(name);

        // Verificar se slug já existe
        const { data: existing } = await supabase
          .from('products')
          .select('id, slug')
          .eq('slug', slug)
          .single();

        const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

        const productData = {
          name,
          slug: finalSlug,
          price: costPrice / (1 - marginPercentage / 100),
          cost_price: costPrice,
          supplier_margin_percentage: marginPercentage,
          category: 'racoes',
          is_active: true,
          is_featured: false,
          stock_quantity: 0,
          stock_type: 'unlimited',
        };

        const { data: product, error: productError } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (productError) {
          results.push({ name, success: false, error: productError.message });
          errorCount++;
          continue;
        }

        // Inserir detalhes do produto (atributos pet)
        const details = [];
        let order = 1;

        const detailMappings = [
          { csvKey: 'Idade', label: 'Idade' },
          { csvKey: 'Tamanho', label: 'Tamanho' },
          { csvKey: 'Porte', label: 'Porte' },
          { csvKey: 'Sabor', label: 'Sabor' },
        ];

        for (const mapping of detailMappings) {
          const value = row[mapping.csvKey];
          if (value && value.toString().trim()) {
            details.push({
              product_id: product.id,
              key: mapping.label,
              value: value.toString().trim(),
              display_order: order++,
            });
          }
        }

        if (details.length > 0) {
          const { error: detailsError } = await supabase
            .from('product_details')
            .insert(details);

          if (detailsError) {
            console.error(`Error inserting details for ${name}:`, detailsError);
          }
        }

        results.push({ name, success: true, id: product.id });
        successCount++;
      } catch (err) {
        results.push({ name: row['Nome Sugerido (Venda)'] || '(erro)', success: false, error: err.message });
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: csvProducts.length,
        success: successCount,
        errors: errorCount,
      },
      results,
    });
  } catch (error) {
    console.error('Error importing CSV:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
