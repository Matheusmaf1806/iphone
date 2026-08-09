'use client';

import { useMemo, useState } from 'react';
import ProductGallery from './ProductGallery';
import ProductInfo from './ProductInfo';
import ProductActions from './ProductActions';

// Liga a galeria de fotos ao seletor de variante: quando o SKU escolhido tem fotos
// próprias (product_variants.image_urls, até 4), a galeria mostra só elas. Sem isso,
// o cliente escolhe "Titânio Azul" e continua vendo a mesma foto genérica do produto.
export default function ProductPurchasePanel({ product }) {
  const [activeVariant, setActiveVariant] = useState(null);

  const galleryImages = useMemo(() => {
    const variantImages = activeVariant?.imageUrls?.length > 0 ? activeVariant.imageUrls : null;
    if (!variantImages) return product.images;

    const label = Object.values(activeVariant.attributes || {}).join(', ');
    return variantImages.map((src, index) => ({
      id: `variant-${activeVariant.id}-${index}`,
      src,
      alt: `${product.name} — ${label}`,
      position: index,
      isPrimary: index === 0,
    }));
  }, [activeVariant, product.images, product.name]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
      <ProductGallery images={galleryImages} />
      <ProductInfo product={product}>
        <ProductActions product={product} onVariantChange={setActiveVariant} />
      </ProductInfo>
    </div>
  );
}
