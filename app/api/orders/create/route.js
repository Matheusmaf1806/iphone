import { NextResponse } from 'next/server';
import { createServerClient } from '../../../../lib/supabase/server';
import { calculateAllPrices, resolveCostPriceBRL } from '../../../../lib/pricing';
import { getPlatformConfig } from '../../../../lib/affiliateTracking';
import { registerCouponUsage, resolveServerCouponDiscount } from '../../../../lib/coupons';
import { getInstallmentFees, getFeeForInstallments } from '../../../../lib/installmentFees';
import { updateStock, updateVariantStock } from '../../../../lib/products';
import { getAffiliateSession } from '../../../../lib/affiliateAuth';
import { markAffiliateSale } from '../../../../lib/heads';

// Mesma faixa segura usada em lib/orderPricing.js (ver comentário lá) — mantida
// duplicada aqui porque esta rota ainda reimplementa a cascata de preço em vez de
// chamar priceCartItems().
const MIN_CLIENT_MARKUP = 0;
const MAX_CLIENT_MARKUP = 90;

export async function POST(request) {
  try {
    const body = await request.json();
    const { customer, pickup, payment, items, affiliateId, coupon } = body;

    // Validação básica
    if (!customer || !pickup || !payment || !items || items.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Dados do pedido incompletos',
      }, { status: 400 });
    }

    if (!pickup.travelDate || !pickup.pickupLocation || !pickup.termsAccepted) {
      return NextResponse.json({
        success: false,
        error: 'Dados de retirada incompletos',
      }, { status: 400 });
    }

    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Serviço não configurado',
      }, { status: 500 });
    }

    // pickupLocationId é opcional pra não quebrar caso o front ainda mande só o texto
    // livre antigo — mas quando vem, precisa apontar pra um local ativo de verdade.
    let pickupLocationId = null;
    if (pickup.pickupLocationId) {
      const { data: pickupLocationRow } = await supabase
        .from('pickup_locations')
        .select('id')
        .eq('id', pickup.pickupLocationId)
        .eq('is_active', true)
        .single();
      if (!pickupLocationRow) {
        return NextResponse.json({ success: false, error: 'Local de retirada inválido' }, { status: 400 });
      }
      pickupLocationId = pickupLocationRow.id;
    }

    // Obter configurações da plataforma
    const config = await getPlatformConfig();

    // Buscar dados do afiliado se houver
    let affiliate = null;
    if (affiliateId) {
      const { data: affiliateData } = await supabase
        .from('affiliates')
        .select('id, commission_rate, head_id')
        .eq('id', affiliateId)
        .eq('is_active', true)
        .single();

      affiliate = affiliateData;
    }

    // Rede de Heads — se o afiliado pertence à carteira de um Head, o Head ganha uma
    // fatia recorrente da margem que seria da iShop em toda venda desse afiliado. Não
    // reavalia aqui a regra dos 90 dias sem vender: quem mantém affiliates.head_id
    // "fresco" é o cron de liberação por inatividade (ver
    // app/api/cron/release-inactive-heads) — se ainda está preenchido, o vínculo vale.
    let head = null;
    if (affiliate?.head_id) {
      const { data: headData } = await supabase
        .from('heads')
        .select('id, commission_percentage')
        .eq('id', affiliate.head_id)
        .eq('is_active', true)
        .single();
      head = headData;
    }

    // customMarkup só é honrado quando quem está logado é de fato um agente vinculado
    // a ESSE afiliado — sem essa checagem, qualquer POST direto (sem passar pela UI)
    // conseguiria definir a própria margem, inclusive negativa (vendendo abaixo do custo).
    const session = getAffiliateSession();
    const allowClientMarkup = !!(session && session.role === 'agent' && affiliateId && session.affiliateId === affiliateId);

    // A taxa do cartão varia por número de parcelas (installment_fees) — reflete o
    // custo real do gateway pra cada parcelamento, diferente da taxa única
    // (platform_config.card_fee_percentage) usada só como fallback/pra PIX. PIX não
    // paga taxa de cartão.
    const isPix = payment.method === 'pix';
    let cardFeePercentage = config.cardFeePercentage;
    if (!isPix) {
      const installmentFees = await getInstallmentFees();
      cardFeePercentage = getFeeForInstallments(installmentFees, parseInt(payment.installments, 10) || 1);
    }

    // Calcular totais do pedido
    let orderSubtotal = 0;
    let orderTotal = 0;
    let totalAffiliateCommission = 0;
    let totalSupplierAmount = 0;
    let totalCardFee = 0;
    let totalHeadCommission = 0;

    // Buscar dados autoritativos de produtos e variantes no banco — nunca confiar em
    // preço/custo vindos do cliente (o que o browser manda em costPrice/supplierMarginPercentage
    // é ignorado a partir daqui, só quantity/productId/variantId são usados).
    const productIds = [...new Set(items.map(item => item.productId))];
    const variantIds = [...new Set(items.filter(item => item.variantId).map(item => item.variantId))];

    const { data: products } = await supabase
      .from('products')
      .select('id, name, has_variants, cost_price, cost_currency, import_tax_percentage, supplier_margin_percentage, stock_type, stock_quantity')
      .in('id', productIds);
    const productMap = Object.fromEntries((products || []).map(p => [p.id, p]));

    let variantMap = {};
    if (variantIds.length > 0) {
      const { data: variants } = await supabase
        .from('product_variants')
        .select('id, product_id, sku, attributes, cost_price, cost_currency, import_tax_percentage, supplier_margin_percentage, stock_quantity, is_active')
        .in('id', variantIds);
      variantMap = Object.fromEntries((variants || []).map(v => [v.id, v]));
    }

    // Checar produto/variante válidos, custo configurado e estoque suficiente antes de
    // criar qualquer coisa no banco.
    for (const item of items) {
      // Quantidade tem que ser um inteiro positivo — negativo/zero conseguiria
      // reduzir o total cobrado e, no decremento de estoque, inverter o movimento
      // "out" num aumento de estoque em vez de baixa.
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return NextResponse.json({ success: false, error: 'Quantidade inválida' }, { status: 400 });
      }

      const product = productMap[item.productId];
      if (!product) {
        return NextResponse.json({ success: false, error: 'Produto não encontrado' }, { status: 400 });
      }

      if (item.variantId) {
        const variant = variantMap[item.variantId];
        if (!variant || variant.is_active === false || variant.product_id !== item.productId) {
          return NextResponse.json({ success: false, error: `Variante indisponível para ${product.name}` }, { status: 400 });
        }
        if (variant.cost_price == null) {
          return NextResponse.json({ success: false, error: `${product.name} está sem preço configurado` }, { status: 400 });
        }
        if (variant.stock_quantity < item.quantity) {
          const attrs = Object.entries(variant.attributes || {}).map(([k, v]) => `${k}: ${v}`).join(', ');
          return NextResponse.json({
            success: false,
            error: `Estoque insuficiente para ${product.name}${attrs ? ' — ' + attrs : ''} (disponível: ${Math.max(variant.stock_quantity, 0)})`,
          }, { status: 400 });
        }
      } else {
        // Produto com variação nunca pode ser vendido "às cegas" — sem isso, um
        // request adulterado (sem passar pela seleção de cor/armazenamento na tela)
        // conseguiria comprar usando o preço/estoque agregado do produto, sem
        // nenhum SKU específico associado ao pedido.
        if (product.has_variants) {
          return NextResponse.json({ success: false, error: `Selecione uma variação (cor, armazenamento, etc.) para ${product.name}` }, { status: 400 });
        }
        if (product.cost_price == null) {
          return NextResponse.json({ success: false, error: `${product.name} está sem preço configurado` }, { status: 400 });
        }
        if (product.stock_type === 'limited' && product.stock_quantity !== -1 && product.stock_quantity < item.quantity) {
          return NextResponse.json({
            success: false,
            error: `Estoque insuficiente para ${product.name} (disponível: ${Math.max(product.stock_quantity, 0)})`,
          }, { status: 400 });
        }
      }
    }

    const itemsWithPrices = items.map(item => {
      const product = productMap[item.productId];
      const variant = item.variantId ? variantMap[item.variantId] : null;

      const rawCostPrice = parseFloat(variant ? variant.cost_price : product.cost_price);
      const costCurrency = (variant ? variant.cost_currency : product.cost_currency) || 'BRL';
      const importTaxPercentage = variant?.import_tax_percentage ?? product.import_tax_percentage;
      const supplierMarginPercentage = parseFloat(
        (variant?.supplier_margin_percentage ?? product.supplier_margin_percentage)
      );

      const costPrice = resolveCostPriceBRL({
        costPrice: rawCostPrice,
        costCurrency,
        importTaxPercentage,
        usdBrlRate: config.usdBrlRate,
        defaultImportTaxPercentage: config.defaultImportTaxPercentage,
      });
      const effectiveTaxPercentage = importTaxPercentage != null ? importTaxPercentage : config.defaultImportTaxPercentage;

      // customMarkup do agente só é usado quando allowClientMarkup validou a sessão
      // acima — senão cai sempre na comissão real do afiliado ou no padrão da
      // plataforma. Mesmo autorizado, é limitado a uma faixa segura: fora dela a
      // fórmula pixPrice = netPrice / (1 - margem/100) vende abaixo do custo ou
      // divide por zero/fica negativa.
      const defaultMargin = affiliate?.commission_rate || config.defaultAffiliateMargin;
      const hasClientMarkup = item.customMarkup !== null && item.customMarkup !== undefined && item.customMarkup !== '';
      const affiliateMargin = (allowClientMarkup && hasClientMarkup)
        ? Math.min(Math.max(parseFloat(item.customMarkup) || 0, MIN_CLIENT_MARKUP), MAX_CLIENT_MARKUP)
        : defaultMargin;

      const prices = calculateAllPrices({
        costPrice,
        supplierMarginPercentage,
        affiliateMarginPercentage: affiliateMargin,
        cardFeePercentage,
      });

      const unitPrice = isPix ? prices.pixPrice : prices.finalPrice;
      const itemTotal = unitPrice * item.quantity;

      // Calcular valores para cada parte
      const supplierAmount = (prices.netPrice - prices.costPrice) * item.quantity;
      const affiliateAmount = (prices.pixPrice - prices.netPrice) * item.quantity;
      const cardFeeAmount = isPix ? 0 : (prices.finalPrice - prices.pixPrice) * item.quantity;
      // Rede de Heads: fatia recorrente da margem da iShop, não do afiliado — o
      // afiliado ganha o mesmo affiliateAmount de sempre, tenha Head ou não.
      const headAmount = head ? supplierAmount * (parseFloat(head.commission_percentage) / 100) : 0;

      orderSubtotal += itemTotal;
      totalSupplierAmount += supplierAmount;
      totalAffiliateCommission += affiliateAmount;
      totalCardFee += cardFeeAmount;
      totalHeadCommission += headAmount;

      return {
        product_id: item.productId,
        product_variant_id: variant?.id || null,
        variant_attributes: variant?.attributes || null,
        variant_sku: variant?.sku || null,
        // Nome gravado no pedido já inclui a combinação comprada (cor/armazenamento/
        // versão) — nunca só "iPhone 17 Pro" sem dizer qual SKU foi vendido.
        product_name: variant?.attributes && Object.keys(variant.attributes).length > 0
          ? `${product.name} — ${Object.values(variant.attributes).join(', ')}`
          : product.name,
        quantity: item.quantity,
        cost_price: prices.costPrice,
        exchange_rate_used: costCurrency === 'USD' ? config.usdBrlRate : null,
        import_tax_percentage_used: effectiveTaxPercentage || 0,
        supplier_margin_percentage: supplierMarginPercentage,
        affiliate_margin_percentage: affiliateMargin,
        card_fee_percentage: isPix ? 0 : cardFeePercentage,
        net_price: prices.netPrice,
        pix_price: prices.pixPrice,
        final_price: prices.finalPrice,
        unit_price: unitPrice,
        total_price: itemTotal,
        supplier_amount_unit: parseFloat((prices.netPrice - prices.costPrice).toFixed(2)),
        affiliate_amount_unit: parseFloat((prices.pixPrice - prices.netPrice).toFixed(2)),
        card_fee_amount_unit: isPix ? 0 : parseFloat((prices.finalPrice - prices.pixPrice).toFixed(2)),
      };
    });

    // Cupom revalidado inteiramente no servidor — o discount_amount que o cliente
    // manda é só uma pista de qual cupom aplicar, nunca o valor usado de fato (senão
    // um request adulterado conseguiria mandar um desconto de qualquer tamanho).
    const couponResult = await resolveServerCouponDiscount({
      supabase,
      couponInput: coupon,
      affiliateId: affiliate?.id || null,
      orderSubtotal,
      totalSupplierAmount,
      totalAffiliateAmount: totalAffiliateCommission,
    });
    if (couponResult.error) {
      return NextResponse.json({ success: false, error: couponResult.error }, { status: 400 });
    }
    const couponDiscount = couponResult.discountAmount || 0;
    const subtotalAfterCoupon = orderSubtotal - couponDiscount;

    // Aplicar desconto PIX no subtotal se for o caso (após cupom)
    const pixDiscount = payment.method === 'pix' ? subtotalAfterCoupon * (config.pixDiscountPercentage / 100) : 0;
    orderTotal = subtotalAfterCoupon - pixDiscount;

    // Criar pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: customer.fullName,
        customer_email: customer.email,
        customer_phone: customer.phone,
        customer_cpf: customer.cpf,
        pickup_travel_date: pickup.travelDate,
        pickup_location: pickup.pickupLocation,
        pickup_location_id: pickupLocationId,
        pickup_travel_notes: pickup.travelNotes || null,
        pickup_terms_accepted: pickup.termsAccepted,
        payment_method: payment.method,
        installments: isPix ? 1 : (parseInt(payment.installments, 10) || 1),
        subtotal: orderSubtotal,
        coupon_discount: couponDiscount,
        pix_discount: pixDiscount,
        total: orderTotal,
        affiliate_id: affiliate?.id || null,
        affiliate_commission: totalAffiliateCommission,
        affiliate_amount: totalAffiliateCommission,
        head_id: head?.id || null,
        head_commission_amount: totalHeadCommission,
        status: 'pending',
        payment_status: 'pending',
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao criar pedido',
      }, { status: 500 });
    }

    // Criar itens do pedido
    const orderItems = itemsWithPrices.map(item => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Tentar reverter o pedido
      await supabase.from('orders').delete().eq('id', order.id);

      return NextResponse.json({
        success: false,
        error: 'Erro ao criar itens do pedido',
      }, { status: 500 });
    }

    // Baixar estoque (por SKU quando o item tem variante, senão no produto simples).
    // updateStock/updateVariantStock agora podem retornar success:false (estoque
    // insuficiente ou alterado concorrentemente por outro pedido no meio do
    // caminho) em vez de sempre "success:true" — o pedido já foi criado nesse ponto,
    // então só registramos bem visível pro dono da loja conferir manualmente, sem
    // tentar desfazer o pedido/pagamento já em andamento.
    for (const item of items) {
      try {
        let stockResult;
        if (item.variantId) {
          stockResult = await updateVariantStock(item.variantId, item.quantity, 'out', `Pedido ${order.order_number}`);
        } else {
          const product = productMap[item.productId];
          if (product?.stock_type === 'limited' && product.stock_quantity !== -1) {
            stockResult = await updateStock(item.productId, item.quantity, 'out', `Pedido ${order.order_number}`);
          }
        }
        if (stockResult && !stockResult.success) {
          console.error(`[ESTOQUE] Falha ao baixar estoque do pedido ${order.order_number} (item ${item.productId}/${item.variantId || 'sem variante'}): ${stockResult.error}`);
        }
      } catch (stockErr) {
        console.error('Error decrementing stock for order', order.id, stockErr);
      }
    }

    // Se for PIX, criar registro de pagamento pendente
    if (payment.method === 'pix') {
      await supabase.from('payments').insert({
        order_id: order.id,
        method: 'pix',
        amount: orderTotal,
        status: 'pending',
      });
    }

    // Cartão de crédito é processado via PayPal CardFields — a captura (ver
    // /api/payments/paypal/capture-order) já aconteceu ANTES desta rota ser chamada,
    // então precisa refletir "pago" aqui do mesmo jeito que o fluxo PayPal Buttons faz
    // logo abaixo. Sem isso o pedido ficava pending pra sempre mesmo com o dinheiro já
    // capturado — inclusive bloqueando a retirada em /loja, que exige payment_status='paid'.
    if (payment.method === 'credit-card' || payment.method === 'paypal') {
      await supabase.from('payments').insert({
        order_id: order.id,
        method: payment.method,
        amount: orderTotal,
        status: payment.paypalTransactionId ? 'completed' : 'pending',
        transaction_id: payment.paypalTransactionId || null,
      });

      if (payment.paypalTransactionId) {
        await supabase
          .from('orders')
          .update({ status: 'paid', payment_status: 'paid' })
          .eq('id', order.id);
        await markAffiliateSale(affiliate?.id, supabase);
      }
    }

    // Registrar uso do cupom se houver (usa o cupom revalidado no servidor, não o
    // objeto vindo do cliente)
    if (couponResult.coupon) {
      await registerCouponUsage(couponResult.coupon.id, order.id, couponDiscount);
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        total: orderTotal,
        paymentMethod: payment.method,
        pickupToken: order.pickup_token,
      },
    });
  } catch (error) {
    console.error('Error processing order:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao processar pedido',
    }, { status: 500 });
  }
}
