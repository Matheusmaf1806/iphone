import { SITE_NAME } from '../lib/siteConfig';

// Logo padrão da loja (usado quando o afiliado não tem logo próprio configurado).
// A versão "light" é uma arte "glow" branca sobre fundo transparente — só
// funciona sobre fundo escuro/colorido. A "dark" é a mesma arte com o traço
// recolorido pra quase-preto (mantendo o azul do ponto do "i"), pra usar sobre
// fundo claro (ex: rodapé) sem cair pro fallback em texto.
const DEFAULT_LOGO_LIGHT = '/logo/ishop.png';
const DEFAULT_LOGO_DARK = '/logo/ishop-dark.png';

/**
 * Logo da loja. Passa `src` (URL de imagem) quando o afiliado tiver logo próprio
 * configurado — nesse caso ele sempre tem prioridade sobre o logo padrão.
 *
 * `fallbackImage`: true (padrão) = logo padrão claro, pra fundo escuro/colorido;
 * 'dark' = logo padrão escuro, pra fundo claro; false = sem logo padrão, cai
 * pro nome em texto.
 */
export default function Logo({ src, name, imgClassName = 'h-12', textClassName = 'text-2xl font-bold tracking-tight', fallbackImage = true }) {
  const defaultLogo = fallbackImage === 'dark' ? DEFAULT_LOGO_DARK : DEFAULT_LOGO_LIGHT;
  const resolvedSrc = src || (fallbackImage ? defaultLogo : null);
  if (resolvedSrc) {
    return <img src={resolvedSrc} alt={name || SITE_NAME} className={imgClassName} />;
  }
  return <span className={textClassName}>{name || SITE_NAME}</span>;
}
