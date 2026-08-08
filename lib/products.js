import { createServerClient } from './supabase/server';
import { createAdminClient } from './supabase/admin';

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
        details:product_details(*)
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !product) {
      return null;
    }

    return mapProductData(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
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
 */
function mapProductData(product) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description || '',
    shortDescription: product.short_description || '',
    short_description: product.short_description || '',
    image_url: product.image_url || null,
    price: product.price ? parseFloat(product.price) : null,
    costPrice: product.cost_price ? parseFloat(product.cost_price) : null,
    cost_price: product.cost_price ? parseFloat(product.cost_price) : null,
    supplierMarginPercentage: product.supplier_margin_percentage ? parseFloat(product.supplier_margin_percentage) : 10,
    supplier_margin_percentage: product.supplier_margin_percentage ? parseFloat(product.supplier_margin_percentage) : 10,
    compareAtPrice: product.compare_at_price ? parseFloat(product.compare_at_price) : null,

    // Estoque
    sku: product.sku,
    barcode: product.barcode,
    stockQuantity: product.stock_quantity,
    stock_quantity: product.stock_quantity,
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
          images:product_images(*)
        `)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error || !data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < PAGE_SIZE) break;
      page++;
    }

    return allData.map(mapProductData);
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
