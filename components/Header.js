import { getAffiliateConfig } from '../lib/affiliate';
import ClientHeader from './ClientHeader';
import NavBar from './NavBar';

export default async function Header() {
  const config = await getAffiliateConfig();

  return (
    <header className="shadow-md">
      {/* CAMADA 1: Barra de Aviso Superior */}
      <div className="bg-white text-center p-2 text-sm font-medium">
        <p>
          <i className="fas fa-paw mr-1 text-xs"></i>{' '}
          Faltam <span className="font-bold">R$149,90</span> para o{' '}
          <span className="font-bold">FRETE GRÁTIS!</span>{' '}
          <i className="fas fa-truck ml-1 text-xs"></i>
        </p>
      </div>

      {/* CAMADA 2: Cabeçalho Principal */}
      <ClientHeader config={config} />

      {/* CAMADA 3: Barra de Navegação */}
      <NavBar brandColor={config.brandColor || '#f60c49'} />
    </header>
  );
}
