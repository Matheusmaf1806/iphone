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
          <i className="fas fa-plane-departure mr-1 text-xs"></i>{' '}
          Parcele em até <span className="font-bold">12x sem juros</span> e retire seu iPhone{' '}
          <span className="font-bold">pessoalmente em Orlando</span>{' '}
          <i className="fas fa-mobile-alt ml-1 text-xs"></i>
        </p>
      </div>

      {/* CAMADA 2: Cabeçalho Principal */}
      <ClientHeader config={config} />

      {/* CAMADA 3: Barra de Navegação */}
      <NavBar brandColor={config.brandColor || '#0071e3'} />
    </header>
  );
}
