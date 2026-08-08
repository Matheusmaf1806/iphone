'use client';

import { useMemo, useState } from 'react';
import ProductGallery from './ProductGallery';
import ProductInfo from './ProductInfo';
import ProductActions from './ProductActions';

// Liga a galeria de fotos ao seletor de variante: quando o SKU escolhido tem foto
// própria (product_variants.image_url), ela vira a imagem principal, com o resto da
// galeria do produto disponível nas miniaturas. Sem isso, o cliente escolhe "Titânio
// Azul" e continua vendo a mesma foto genérica do produto.
export default function ProductPurchasePanel({ product }) {
  const [activeVariant, setActiveVariant] = useState(null);

  const galleryImages = useMemo(() => {
    if (!activeVariant?.imageUrl) return product.images;

    const rest = (product.images || []).filter(img => img.src !== activeVariant.imageUrl);
    return [
      {
        id: `variant-${activeVariant.id}`,
        src: activeVariant.imageUrl,
        alt: `${product.name} — ${Object.values(activeVariant.attributes || {}).join(', ')}`,
        position: -1,
        isPrimary: true,
      },
      ...rest,
    ];
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
