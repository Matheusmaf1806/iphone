import { SITE_NAME } from '../lib/siteConfig';

/**
 * Logo com fallback em texto — usar até existir arte de logo definitiva.
 * Passa `src` (URL de imagem) quando o afiliado tiver logo próprio configurado.
 */
export default function Logo({ src, name, imgClassName = 'h-12', textClassName = 'text-2xl font-bold tracking-tight' }) {
  if (src) {
    return <img src={src} alt={name || SITE_NAME} className={imgClassName} />;
  }
  return <span className={textClassName}>{name || SITE_NAME}</span>;
}
