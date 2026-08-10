'use client';

import LineupCarousel from './LineupCarousel';

const MACBOOKS = [
  {
    key: 'macbook-neo',
    tag: 'MacBook Neo',
    titleLine1: 'MacBook Neo.',
    titleLine2: 'Acessível, do jeito Apple.',
    image: 'https://gkvrkutdjuxrolztwlvl.supabase.co/storage/v1/object/public/images/products/1786379263205-jzvp6xnfsfe.png',
    href: '/produto/macbook-neo',
    dark: false,
  },
  {
    key: 'macbook-air-m5',
    tag: 'MacBook Air',
    titleLine1: 'MacBook Air.',
    titleLine2: 'Leve na mão, forte no uso.',
    image: 'https://gkvrkutdjuxrolztwlvl.supabase.co/storage/v1/object/public/images/products/1786379281636-p7ncxfxjj7.png',
    href: '/produto/macbook-air-m5',
    dark: false,
  },
  {
    key: 'macbook-pro-m5',
    tag: 'MacBook Pro',
    titleLine1: 'MacBook Pro.',
    titleLine2: 'Potência pra ir além.',
    image: 'https://gkvrkutdjuxrolztwlvl.supabase.co/storage/v1/object/public/images/products/1786379253463-sn42k6ea17g.png',
    href: '/produto/macbook-pro-m5',
    dark: true,
  },
];

export default function MacBookLineupCarousel({ startingPrices = {} }) {
  const items = MACBOOKS.map((mb) => ({ ...mb, price: startingPrices?.[mb.key] }));

  return (
    <LineupCarousel
      items={items}
      heading={<>Qual MacBook<br />é o seu?</>}
      subheading="Do dia a dia ao trabalho pesado — veja qual combina com você."
    />
  );
}
