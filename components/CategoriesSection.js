'use client';

import { useAffiliate } from '../contexts/AffiliateContext';

const categories = [
  {
    name: 'Rações',
    icon: 'fa-bowl-food',
    slug: 'racoes',
  },
  {
    name: 'Brinquedos',
    icon: 'fa-baseball',
    slug: 'brinquedos',
  },
  {
    name: 'Acessórios',
    icon: 'fa-bone',
    slug: 'acessorios',
  },
  {
    name: 'Higiene e Saúde',
    icon: 'fa-shower',
    slug: 'higiene-e-saude',
  },
  {
    name: 'Camas e Casas',
    icon: 'fa-house',
    slug: 'camas-e-casas',
  },
  {
    name: 'Passeio',
    icon: 'fa-paw',
    slug: 'passeio',
  },
];

export default function CategoriesSection() {
  const { brandColor } = useAffiliate();

  // Lighten brand color for circle background (10% opacity)
  const circleBg = brandColor + '1A';

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="mb-10">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            Explore categorias populares
          </h2>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-6 md:gap-8">
          {categories.map((category, index) => (
            <a
              key={index}
              href={`/categoria/${category.slug}`}
              className="flex flex-col items-center gap-3 group"
            >
              <div
                className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: circleBg }}
              >
                <i
                  className={`fas ${category.icon} text-2xl md:text-3xl transition-transform duration-300 group-hover:scale-110`}
                  style={{ color: brandColor }}
                ></i>
              </div>
              <span className="text-sm md:text-base font-medium text-gray-700 text-center group-hover:text-gray-900 transition-colors">
                {category.name}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
