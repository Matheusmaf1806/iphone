'use client';

import LineupCarousel from './LineupCarousel';

const CATEGORIES = [
  {
    key: 'iphone',
    tag: 'iPhone',
    titleLine1: 'iPhone.',
    titleLine2: 'Poder de sobra.',
    image: '/produtos/iphone.png',
    href: '/categoria/iphone',
    dark: true,
  },
  {
    key: 'mac',
    tag: 'MacBook',
    titleLine1: 'MacBook.',
    titleLine2: 'Feito pra criar.',
    image: '/produtos/macbook.png',
    href: '/categoria/mac',
    dark: false,
  },
  {
    key: 'apple-watch',
    tag: 'Apple Watch',
    titleLine1: 'Apple Watch.',
    titleLine2: 'Seu ritmo, sempre com você.',
    image: '/produtos/applewatch.png',
    href: '/categoria/apple-watch',
    dark: false,
  },
  {
    key: 'airpods',
    tag: 'AirPods',
    titleLine1: 'AirPods.',
    titleLine2: 'Som que acompanha o seu dia.',
    image: '/produtos/airpods.png',
    href: '/categoria/airpods',
    dark: false,
  },
  {
    key: 'acessorios',
    tag: 'Acessórios',
    titleLine1: 'Acessórios.',
    titleLine2: 'O toque final, original.',
    image: '/produtos/cabo.png',
    href: '/categoria/acessorios',
    dark: false,
  },
];

export default function AppleUniverseCarousel({ startingPrices = {} }) {
  const items = CATEGORIES.map((cat) => ({ ...cat, price: startingPrices?.[cat.key] }));

  return (
    <LineupCarousel
      items={items}
      heading={<>Todo o universo Apple.<br />Em um só lugar.</>}
      subheading="Produtos lacrados e seminovos premium, com garantia e procedência."
      showHelper
    />
  );
}
