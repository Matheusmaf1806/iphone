import { createServerClient } from './supabase/server';
import { createAdminClient } from './supabase/admin';
import { getPlatformConfig } from './affiliateTracking';
import { resolveCostPriceBRL } from './pricing';

/**
 * Obtém um produto pelo slug
 */
export async function getProduct(slug) {
  const supabase = createServerClient();

  if (!supabase) {
    return null;
  }

  try {
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        images:product_images(*),
        details:product_details(*),
        variants:product_variants(*)
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !product) {
      return null;
    }

    const config = await getPlatformConfig();
    const mapped = mapProductData(product, config);

    if (mapped.hasVariants && mapped.variants.length > 0) {
      mapped.variantSwatches = await getVariantSwatchMap();
    }

    return mapped;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

/**
 * Monta um mapa { [nomeDoTipo]: { [valor]: swatchHex } } a partir do catálogo global
 * de valores de atributo — usado para desenhar os botões de cor (bolinha colorida) na
 * página do produto sem precisar guardar o hex em cada variante.
 */
async function getVariantSwatchMap() {
  const supabase = createServerClient();
  if (!supabase) return {};

  const { data, error } = await supabase
    .from('product_variant_values')
    .select('value, swatch_hex, variant_type:product_variant_types(name)')
    .not('swatch_hex', 'is', null);

  if (error || !data) return {};

  return data.reduce((map, row) => {
    const typeName = row.variant_type?.name;
    if (!typeName) return map;
    if (!map[typeName]) map[typeName] = {};
    map[typeName][row.value] = row.swatch_hex;
    return map;
  }, {});
}

/**
 * Obtém um produto por ID
 */
export async function getProductById(id) {
  const supabase = createServerClient();

  const { data: product, error } = await supabase
    .from('products')
    .select(`
      *,
      images:product_images(*),
      details:product_details(*)
    `)
    .eq('id', id)
    .single();

  if (error || !product) {
    return null;
  }

  return mapProductData(product);
}

/**
 * Lista todos os produtos ativos
 */
export async function getAllProducts(filters = {}) {
  const supabase = createServerClient();

  if (!supabase) {
    return [];
  }

  try {
    let query = supabase
      .from('products')
      .select(`
        *,
        images:product_images(*)
      `)
      .eq('is_active', true);

  // Filtros opcionais
  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  if (filters.isFeatured) {
    query = query.eq('is_featured', true).order('featured_order', { ascending: true });
  }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  // Ordenação
  const orderBy = filters.orderBy || 'created_at';
  const order = filters.order || 'desc';
  query = query.order(orderBy, { ascending: order === 'asc' });

  // Paginação
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

    const { data: products, error } = await query;

    if (error || !products) {
      return [];
    }

    return products.map(mapProductData);
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

/**
 * Obtém produtos em destaque
 */
export async function getFeaturedProducts(limit = 5) {
  return getAllProducts({
    isFeatured: true,
    limit,
  });
}

/**
 * Obtém produtos relacionados
 */
export async function getRelatedProducts(productId, category, limit = 10) {
  const supabase = createServerClient();

  const { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      images:product_images(*)
    `)
    .eq('category', category)
    .eq('is_active', true)
    .neq('id', productId)
    .limit(limit);

  if (error || !products) {
    return [];
  }

  return products.map(mapProductData);
}

/**
 * Cross-sell inteligente: retorna produtos de categorias complementares
 */
const CROSS_SELL_MAP = {
  'iphone': ['acessorios', 'apple-watch', 'airpods'],
  'mac': ['acessorios', 'ipad'],
  'ipad': ['acessorios', 'apple-watch'],
  'apple-watch': ['iphone', 'acessorios'],
  'airpods': ['iphone', 'acessorios'],
  'acessorios': ['iphone', 'mac', 'ipad'],
  'seminovos': ['acessorios'],
};

export async function getCrossSellProducts(productId, category, limit = 10) {
  const supabase = createServerClient();
  if (!supabase || !category) return [];

  const complementary = CROSS_SELL_MAP[category] || [];
  if (complementary.length === 0) {
    // Fallback: return any products from other categories
    const { data, error } = await supabase
      .from('products')
      .select('*, images:product_images(*)')
      .eq('is_active', true)
      .neq('id', productId)
      .neq('category', category)
      .limit(limit);

    if (error || !data) return [];
    return data.map(mapProductData);
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, images:product_images(*)')
      .eq('is_active', true)
      .neq('id', productId)
      .in('category', complementary)
      .limit(limit);

    if (error || !data) return [];
    return data.map(mapProductData);
  } catch {
    return [];
  }
}

/**
 * Busca produtos por texto
 */
export async function searchProducts(searchTerm, limit = 20) {
  const supabase = createServerClient();

  const { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      images:product_images(*)
    `)
    .eq('is_active', true)
    .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
    .limit(limit);

  if (error || !products) {
    return [];
  }

  return products.map(mapProductData);
}

/**
 * Cria ou atualiza um produto
 */
export async function upsertProduct(productData) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('products')
    .upsert(productData)
    .select()
    .single();

  if (error) {
    console.error('Error upserting product:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Deleta um produto (soft delete)
 */
export async function deleteProduct(id) {
  const supabase = createServerClient();

  const { error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    console.error('Error deleting product:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Exclui um produto "de verdade" (linha some do banco, variantes/imagens/detalhes
 * cascateiam junto) quando ele nunca teve pedido — senão, para não perder o
 * histórico de vendas, cai automaticamente para soft delete (is_active = false).
 * order_items.product_id não tem "on delete cascade" de propósito, então a
 * violação de chave estrangeira (23503) é o próprio banco nos avisando que esse
 * produto já vendeu algo.
 */
export async function deleteProductSmart(id) {
  const supabase = createAdminClient() || createServerClient();
  if (!supabase) {
    return { success: false, error: 'Sem conexão com o banco de dados' };
  }

  const { error } = await supabase.from('products').delete().eq('id', id);

  if (!error) {
    return { success: true, hardDeleted: true };
  }

  if (error.code === '23503') {
    const { error: updateError } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id);

    if (updateError) {
      console.error('Error soft-deleting product after FK conflict:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true, hardDeleted: false };
  }

  console.error('Error hard-deleting product:', error);
  return { success: false, error: error.message };
}

/**
 * Adiciona imagem a um produto
 */
export async function addProductImage(productId, imageData) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('product_images')
    .insert({
      product_id: productId,
      ...imageData,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding product image:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Remove imagem de um produto
 */
export async function deleteProductImage(imageId) {
  const supabase = createServerClient();

  const { error } = await supabase
    .from('product_images')
    .delete()
    .eq('id', imageId);

  if (error) {
    console.error('Error deleting product image:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Atualiza estoque de um produto
 */
export async function updateStock(productId, quantity, movementType, reason = null, createdBy = null) {
  const supabase = createServerClient();

  // Buscar produto atual
  const { data: product } = await supabase
    .from('products')
    .select('stock_quantity')
    .eq('id', productId)
    .single();

  if (!product) {
    return { success: false, error: 'Product not found' };
  }

  const previousQuantity = product.stock_quantity;
  let newQuantity = previousQuantity;

  // Calcular nova quantidade baseado no tipo de movimentação
  if (movementType === 'in' || movementType === 'return') {
    newQuantity = previousQuantity + quantity;
  } else if (movementType === 'out' || movementType === 'adjustment') {
    newQuantity = previousQuantity - quantity;
  }

  // Atualizar estoque do produto
  const { error: updateError } = await supabase
    .from('products')
    .update({ stock_quantity: newQuantity })
    .eq('id', productId);

  if (updateError) {
    console.error('Error updating stock:', updateError);
    return { success: false, error: updateError.message };
  }

  // Registrar movimentação de estoque
  const { error: movementError } = await supabase
    .from('stock_movements')
    .insert({
      product_id: productId,
      quantity,
      movement_type: movementType,
      reason,
      reference: null,
      previous_quantity: previousQuantity,
      new_quantity: newQuantity,
      created_by: createdBy,
    });

  if (movementError) {
    console.error('Error recording stock movement:', movementError);
  }

  return {
    success: true,
    previousQuantity,
    newQuantity,
  };
}

/**
 * Atualiza estoque de uma variante (SKU) específica — mesmo padrão de updateStock(),
 * mas grava em product_variants + stock_movements.product_variant_id.
 */
export async function updateVariantStock(variantId, quantity, movementType, reason = null, createdBy = null) {
  const supabase = createServerClient();

  const { data: variant } = await supabase
    .from('product_variants')
    .select('id, product_id, stock_quantity')
    .eq('id', variantId)
    .single();

  if (!variant) {
    return { success: false, error: 'Variant not found' };
  }

  const previousQuantity = variant.stock_quantity || 0;
  let newQuantity = previousQuantity;

  if (movementType === 'in' || movementType === 'return') {
    newQuantity = previousQuantity + quantity;
  } else if (movementType === 'out' || movementType === 'adjustment') {
    newQuantity = previousQuantity - quantity;
  }

  const { error: updateError } = await supabase
    .from('product_variants')
    .update({ stock_quantity: newQuantity })
    .eq('id', variantId);

  if (updateError) {
    console.error('Error updating variant stock:', updateError);
    return { success: false, error: updateError.message };
  }

  const { error: movementError } = await supabase
    .from('stock_movements')
    .insert({
      product_id: variant.product_id,
      product_variant_id: variantId,
      quantity,
      movement_type: movementType,
      reason,
      reference: null,
      previous_quantity: previousQuantity,
      new_quantity: newQuantity,
      created_by: createdBy,
    });

  if (movementError) {
    console.error('Error recording variant stock movement:', movementError);
  }

  await syncProductFromVariants(variant.product_id);

  return {
    success: true,
    previousQuantity,
    newQuantity,
  };
}

/**
 * Calcula custo (BRL)/preço "a partir de"/estoque total de um produto com variações a
 * partir das próprias variantes — SKU mais barato define custo/preço, estoque é a soma
 * dos SKUs ativos. Usado tanto por syncProductFromVariants (grava em products.*) quanto
 * por mapProductData (fallback de leitura, pra listagens nunca mostrarem R$ 0,00 só
 * porque o sync não rodou/está desatualizado — mesmo cálculo, sem gravar nada).
 */
function computeVariantRollup(variants, supplierMarginPercentage, config) {
  const active = (variants || []).filter(v => v.is_active !== false);
  const totalStock = active.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
  const costedActive = active.filter(v => v.cost_price != null && v.cost_price > 0);

  if (costedActive.length === 0) {
    return { stock: totalStock, costPrice: null, price: null };
  }

  // Cada SKU pode ter sua própria moeda/imposto — resolve tudo pra BRL antes de
  // comparar, e o valor retornado já sai convertido (custo/preço derivado, não um
  // custo cadastrado — quem grava isso sempre grava cost_currency='BRL' junto).
  const costsInBRL = costedActive.map(v => resolveCostPriceBRL({
    costPrice: parseFloat(v.cost_price),
    costCurrency: v.cost_currency || 'BRL',
    importTaxPercentage: v.import_tax_percentage != null ? parseFloat(v.import_tax_percentage) : null,
    usdBrlRate: config.usdBrlRate,
    defaultImportTaxPercentage: config.defaultImportTaxPercentage,
  }));
  const cheapestCost = Math.min(...costsInBRL);
  const margin = supplierMarginPercentage ? parseFloat(supplierMarginPercentage) : 10;
  const price = margin < 100 ? cheapestCost / (1 - margin / 100) : cheapestCost;

  return { stock: totalStock, costPrice: cheapestCost, price };
}

/**
 * Recalcula products.cost_price/price/stock_quantity a partir das variantes ativas do
 * produto (SKU mais barato define custo/preço "a partir de"; estoque = soma dos SKUs).
 * Chamado sempre que uma variante é criada/editada/removida, para que listagens e o
 * card do produto (que leem direto de products.*) continuem corretos sem precisar
 * conhecer o conceito de variante.
 */
export async function syncProductFromVariants(productId) {
  const supabase = createAdminClient() || createServerClient();
  if (!supabase) {
    return { success: false, error: 'Sem conexão com o banco de dados' };
  }

  const { data: product } = await supabase
    .from('products')
    .select('supplier_margin_percentage')
    .eq('id', productId)
    .single();

  const { data: variants } = await supabase
    .from('product_variants')
    .select('cost_price, cost_currency, import_tax_percentage, stock_quantity, is_active')
    .eq('product_id', productId);

  const active = variants || [];

  // Ter pelo menos 1 SKU cadastrado É o que define "este produto tem variações" — não
  // depende de o admin ter marcado o checkbox e salvo o formulário base antes de abrir
  // "Gerenciar Variantes". Sem isso, a página do produto nunca mostra os seletores
  // mesmo com os SKUs certinhos no banco (has_variants ficaria false).
  const updateData = { stock_type: 'limited', has_variants: active.length > 0 };

  const hasCostedVariant = active.some(v => v.is_active !== false && v.cost_price != null && v.cost_price > 0);
  const config = hasCostedVariant ? await getPlatformConfig() : null;
  const rollup = computeVariantRollup(active, product?.supplier_margin_percentage, config || { usdBrlRate: 1, defaultImportTaxPercentage: 0 });

  updateData.stock_quantity = rollup.stock;
  if (rollup.costPrice != null) {
    updateData.cost_price = rollup.costPrice;
    updateData.cost_currency = 'BRL';
    updateData.import_tax_percentage = null;
    updateData.price = rollup.price;
  }

  const { error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', productId);

  if (error) {
    console.error('Error syncing product from variants:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Obtém histórico de movimentações de estoque
 */
export async function getStockMovements(productId, limit = 50) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('stock_movements')
    .select(`
      *,
      admin:admin_users(full_name, username)
    `)
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  return data;
}

/**
 * Mapeia dados do produto do banco para o formato esperado
 *
 * @param {Object} product
 * @param {Object|null} [config] - platformConfig (usdBrlRate, defaultImportTaxPercentage).
 *   Quando informado e o produto tem variações, custo/preço/estoque exibidos são
 *   recalculados na hora a partir dos SKUs — assim uma listagem nunca mostra R$ 0,00 só
 *   porque o sync (syncProductFromVariants) não rodou ou está desatualizado. Sem config,
 *   cai pros valores já gravados em products.* (comportamento anterior).
 */
function mapProductData(product, config) {
  const hasVariantsComputed = !!(product.has_variants || (product.variants || []).some(v => v.is_active !== false));
  const rollup = (hasVariantsComputed && config)
    ? computeVariantRollup(product.variants, product.supplier_margin_percentage, config)
    : null;

  const effectiveStock = rollup ? rollup.stock : product.stock_quantity;
  // Só sobrepõe custo/preço se algum SKU já tem custo cadastrado — senão mantém o que
  // já está gravado em products.* (pode já estar sincronizado, ou legitimamente ainda
  // sem preço enquanto ninguém preencheu nenhum SKU).
  const effectiveCostPrice = rollup?.costPrice ?? (product.cost_price ? parseFloat(product.cost_price) : null);
  const effectivePrice = rollup?.costPrice != null ? rollup.price : (product.price ? parseFloat(product.price) : null);
  // rollup já vem resolvido pra BRL com imposto embutido — marcar a moeda como BRL evita
  // que quem usa esse valor (ex: applyPrices da página do produto) tente converter de
  // novo em cima de um número que já não é mais o custo cru cadastrado.
  const effectiveCostCurrency = rollup?.costPrice != null ? 'BRL' : (product.cost_currency || 'BRL');
  const effectiveImportTax = rollup?.costPrice != null ? null : (product.import_tax_percentage != null ? parseFloat(product.import_tax_percentage) : null);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description || '',
    shortDescription: product.short_description || '',
    short_description: product.short_description || '',
    image_url: product.image_url || null,
    price: effectivePrice,
    costPrice: effectiveCostPrice,
    cost_price: effectiveCostPrice,
    costCurrency: effectiveCostCurrency,
    cost_currency: effectiveCostCurrency,
    importTaxPercentage: effectiveImportTax,
    import_tax_percentage: effectiveImportTax,
    supplierMarginPercentage: product.supplier_margin_percentage ? parseFloat(product.supplier_margin_percentage) : 10,
    supplier_margin_percentage: product.supplier_margin_percentage ? parseFloat(product.supplier_margin_percentage) : 10,
    compareAtPrice: product.compare_at_price ? parseFloat(product.compare_at_price) : null,

    // Estoque
    sku: product.sku,
    barcode: product.barcode,
    stockQuantity: effectiveStock,
    stock_quantity: effectiveStock,
    stockStatus: product.stock_status,
    lowStockThreshold: product.low_stock_threshold,
    low_stock_threshold: product.low_stock_threshold,
    manageStock: product.manage_stock,
    allowBackorders: product.allow_backorders,

    // Parcelamento
    installments: product.installments,
    installmentValue: product.installment_value ? parseFloat(product.installment_value) : null,
    installment_value: product.installment_value ? parseFloat(product.installment_value) : null,

    // Avaliações
    rating: product.rating ? parseFloat(product.rating) : 0,
    reviews: product.reviews_count || 0,

    // Dimensões
    weight: product.weight ? parseFloat(product.weight) : null,
    depth: product.depth ? parseFloat(product.depth) : null,
    width: product.width ? parseFloat(product.width) : null,
    height: product.height ? parseFloat(product.height) : null,

    // Categorização
    category: product.category,
    tags: product.tags || [],

    // SEO
    metaTitle: product.meta_title,
    metaDescription: product.meta_description,

    // Status
    isActive: product.is_active,
    is_active: product.is_active,
    isFeatured: product.is_featured,
    is_featured: product.is_featured,
    // Deriva de verdade pela existência de SKUs ativos, não só da flag has_variants —
    // se a flag ficar desatualizada por algum motivo, a vitrine continua correta.
    hasVariants: hasVariantsComputed,
    has_variants: hasVariantsComputed,

    // Variações (SKUs) — cada uma com preço/custo/estoque próprios
    variants: (product.variants || [])
      .filter(v => v.is_active !== false)
      .map(v => ({
        id: v.id,
        sku: v.sku,
        attributes: v.attributes || {},
        costPrice: v.cost_price ? parseFloat(v.cost_price) : null,
        costCurrency: v.cost_currency || 'BRL',
        importTaxPercentage: v.import_tax_percentage != null ? parseFloat(v.import_tax_percentage) : null,
        supplierMarginPercentage: v.supplier_margin_percentage ? parseFloat(v.supplier_margin_percentage) : null,
        stockQuantity: v.stock_quantity ?? 0,
        lowStockThreshold: v.low_stock_threshold ?? 10,
        imageUrl: v.image_url || (v.image_urls && v.image_urls[0]) || null,
        imageUrls: (v.image_urls && v.image_urls.length > 0) ? v.image_urls : (v.image_url ? [v.image_url] : []),
        isDefault: v.is_default || false,
        weight: v.weight ? parseFloat(v.weight) : null,
        height: v.height ? parseFloat(v.height) : null,
        width: v.width ? parseFloat(v.width) : null,
        depth: v.depth ? parseFloat(v.depth) : null,
      })),

    // Imagens
    images: product.images && product.images.length > 0
      ? product.images
          .sort((a, b) => a.position - b.position)
          .map(img => ({
            id: img.id,
            src: img.url,
            alt: img.alt_text || product.name,
            position: img.position,
            isPrimary: img.is_primary,
          }))
      : product.image_url
      ? [{
          id: 1,
          src: product.image_url,
          alt: product.name,
          position: 0,
          isPrimary: true,
        }]
      : [],

    // Detalhes
    details: product.details
      ? product.details
          .sort((a, b) => a.display_order - b.display_order)
          .reduce((acc, detail) => {
            acc[detail.key] = detail.value;
            return acc;
          }, {})
      : {},

    // Timestamps
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

/**
 * Obtém TODOS os produtos (incluindo inativos) com paginação para bypassar o limite de 1000 linhas do Supabase.
 * Usa o admin client (service role) para evitar restrições de RLS e max_rows.
 */
export async function getAllProductsAdmin() {
  const supabase = createAdminClient() || createServerClient();

  if (!supabase) {
    return [];
  }

  const PAGE_SIZE = 1000;
  let allData = [];
  let page = 0;

  try {
    while (true) {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          images:product_images(*),
          variants:product_variants(*)
        `)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error || !data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < PAGE_SIZE) break;
      page++;
    }

    // Config carregada uma única vez (não por produto) — usada pra recalcular
    // custo/preço/estoque de produtos com variação direto dos SKUs, pra listagem do
    // admin nunca mostrar R$ 0,00 só porque o sync ficou desatualizado.
    const config = await getPlatformConfig();
    return allData.map(product => mapProductData(product, config));
  } catch (error) {
    console.error('Error in getAllProductsAdmin:', error);
    return [];
  }
}

/**
 * Define estoque ilimitado (stock_quantity = -1, stock_type = 'unlimited') para todos os produtos.
 */
export async function bulkSetUnlimitedStock() {
  const supabase = createAdminClient() || createServerClient();

  if (!supabase) {
    return { success: false, error: 'Sem conexão com o banco de dados' };
  }

  const { error, count } = await supabase
    .from('products')
    .update({ stock_quantity: -1, stock_type: 'unlimited' })
    .not('id', 'is', null)
    .select('id', { count: 'exact', head: true });

  if (error) {
    console.error('Error bulk updating stock:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Encontra produtos duplicados (mesmo nome, ignorando maiúsculas/minúsculas).
 * Retorna grupos de produtos com o mesmo nome.
 */
export async function findDuplicateProducts() {
  const supabase = createAdminClient() || createServerClient();

  if (!supabase) {
    return [];
  }

  const PAGE_SIZE = 1000;
  let allData = [];
  let page = 0;

  try {
    while (true) {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, category, cost_price, created_at, is_active, image_url, stock_quantity')
        .order('name', { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error || !data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < PAGE_SIZE) break;
      page++;
    }

    // Group by normalized name + price (ambos devem ser iguais para ser duplicata)
    const groups = {};
    for (const p of allData) {
      const nameKey = p.name.toLowerCase().trim();
      const priceKey = parseFloat(p.cost_price || 0).toFixed(2);
      const key = `${nameKey}__${priceKey}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }

    // Return only groups with more than 1 product, sorted by group size
    return Object.values(groups)
      .filter(g => g.length > 1)
      .sort((a, b) => b.length - a.length);
  } catch (error) {
    console.error('Error finding duplicates:', error);
    return [];
  }
}

/**
 * Deleta produtos por IDs (hard delete).
 */
export async function deleteProductsByIds(ids) {
  const supabase = createAdminClient() || createServerClient();

  if (!supabase || !ids || ids.length === 0) {
    return { success: false, error: 'IDs inválidos ou sem conexão' };
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .in('id', ids);

  if (error) {
    console.error('Error deleting products:', error);
    return { success: false, error: error.message };
  }

  return { success: true, deleted: ids.length };
}

/**
 * Obtém categorias únicas de produtos
 */
export async function getCategories() {
  const supabase = createServerClient();

  const { data, error} = await supabase
    .from('products')
    .select('category')
    .eq('is_active', true)
    .not('category', 'is', null);

  if (error || !data) {
    return [];
  }

  // Extrair categorias únicas
  const categories = [...new Set(data.map(p => p.category))].filter(Boolean);
  return categories.sort();
}
