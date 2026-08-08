'use client';

export default function NavBar({ brandColor }) {
  return (
    <nav className="bg-brand-dark text-white">
      <div className="container mx-auto">
        <ul className="flex items-center justify-center gap-4 md:gap-8 p-3 text-sm font-bold overflow-x-auto whitespace-nowrap">
          <li>
            <a
              href="/categoria/racoes"
              className="transition-colors"
              style={{ color: 'white' }}
              onMouseEnter={(e) => e.target.style.color = brandColor}
              onMouseLeave={(e) => e.target.style.color = 'white'}
            >
              Rações
            </a>
          </li>
          <li>
            <a
              href="/categoria/brinquedos"
              className="transition-colors"
              style={{ color: 'white' }}
              onMouseEnter={(e) => e.target.style.color = brandColor}
              onMouseLeave={(e) => e.target.style.color = 'white'}
            >
              Brinquedos
            </a>
          </li>
          <li>
            <a
              href="/categoria/acessorios"
              className="transition-colors"
              style={{ color: 'white' }}
              onMouseEnter={(e) => e.target.style.color = brandColor}
              onMouseLeave={(e) => e.target.style.color = 'white'}
            >
              Acessórios
            </a>
          </li>
          <li>
            <a
              href="/categoria/higiene-e-saude"
              className="transition-colors"
              style={{ color: 'white' }}
              onMouseEnter={(e) => e.target.style.color = brandColor}
              onMouseLeave={(e) => e.target.style.color = 'white'}
            >
              Higiene e Saúde
            </a>
          </li>
          <li>
            <a
              href="/categoria/camas-e-casas"
              className="transition-colors"
              style={{ color: 'white' }}
              onMouseEnter={(e) => e.target.style.color = brandColor}
              onMouseLeave={(e) => e.target.style.color = 'white'}
            >
              Camas e Casas
            </a>
          </li>
          <li>
            <a
              href="/categoria/promocoes"
              className="text-white py-1 px-3 rounded-full transition-transform hover:scale-105"
              style={{ backgroundColor: brandColor }}
            >
              PROMOÇÕES
            </a>
          </li>
          <li>
            <a
              href="/categoria/passeio"
              className="transition-colors"
              style={{ color: 'white' }}
              onMouseEnter={(e) => e.target.style.color = brandColor}
              onMouseLeave={(e) => e.target.style.color = 'white'}
            >
              Passeio
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
