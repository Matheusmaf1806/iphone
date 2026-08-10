import { SITE_NAME } from '../lib/siteConfig';

// Logo padrão da loja (usado quando o afiliado não tem logo próprio configurado).
// É uma arte "glow" branca sobre fundo transparente — só funciona sobre fundo
// escuro/colorido; em fundo claro, use `fallbackImage={false}` pra cair no texto.
const DEFAULT_LOGO = '/logo/ishop.png';

/**
 * Logo da loja. Passa `src` (URL de imagem) quando o afiliado tiver logo próprio
 * configurado — nesse caso ele sempre tem prioridade sobre o logo padrão.
 */
export default function Logo({ src, name, imgClassName = 'h-12', textClassName = 'text-2xl font-bold tracking-tight', fallbackImage = true }) {
  const resolvedSrc = src || (fallbackImage ? DEFAULT_LOGO : null);
  if (resolvedSrc) {
    return <img src={resolvedSrc} alt={name || SITE_NAME} className={imgClassName} />;
  }
  return <span className={textClassName}>{name || SITE_NAME}</span>;
}
