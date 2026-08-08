'use client';

export default function NavBar({ brandColor }) {
  return (
    <nav className="bg-brand-dark text-white">
      <div className="container mx-auto">
        <ul className="flex items-center justify-center gap-4 md:gap-8 p-3 text-sm font-bold overflow-x-auto whitespace-nowrap">
          <li>
            <a
              href="/categoria/iphone"
              className="transition-colors"
              style={{ color: 'white' }}
              onMouseEnter={(e) => e.target.style.color = brandColor}
              onMouseLeave={(e) => e.target.style.color = 'white'}
            >
              iPhone
            </a>
          </li>
          <li>
            <a
              href="/categoria/mac"
              className="transition-colors"
              style={{ color: 'white' }}
              onMouseEnter={(e) => e.target.style.color = brandColor}
              onMouseLeave={(e) => e.target.style.color = 'white'}
            >
              Mac
            </a>
          </li>
          <li>
            <a
              href="/categoria/ipad"
              className="transition-colors"
              style={{ color: 'white' }}
              onMouseEnter={(e) => e.target.style.color = brandColor}
              onMouseLeave={(e) => e.target.style.color = 'white'}
            >
              iPad
            </a>
          </li>
          <li>
            <a
              href="/categoria/apple-watch"
              className="transition-colors"
              style={{ color: 'white' }}
              onMouseEnter={(e) => e.target.style.color = brandColor}
              onMouseLeave={(e) => e.target.style.color = 'white'}
            >
              Apple Watch
            </a>
          </li>
          <li>
            <a
              href="/categoria/airpods"
              className="transition-colors"
              style={{ color: 'white' }}
              onMouseEnter={(e) => e.target.style.color = brandColor}
              onMouseLeave={(e) => e.target.style.color = 'white'}
            >
              AirPods
            </a>
          </li>
          <li>
            <a
              href="/categoria/promocoes"
              className="text-white py-1 px-3 rounded-full transition-transform hover:scale-105"
              style={{ backgroundColor: brandColor }}
            >
              PARCELE EM 21X
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
        </ul>
      </div>
    </nav>
  );
}
