/**
 * Tabela manual pasta -> atributos da linha Apple Watch 2025 (SE 3, Series 11, Ultra 3),
 * conferida uma a uma contra os nomes reais das 38 pastas de fotos que o Matheus mandou
 * (a nomenclatura não é 100% regular — ex: pulseira Estilo Milanês repete a cor da caixa
 * como "cor da pulseira" no nome da pasta — por isso não dá pra confiar num parser
 * genérico, foi conferido item a item).
 *
 * Usado tanto pelo script de terminal (scripts/import-apple-watch-variants.mjs) quanto
 * pelo importador direto no admin (components/gestao/AppleWatchZipImporter.js), pra não
 * duplicar/divergir a tabela entre os dois.
 */

export const PRODUCT_LINES = [
  {
    lineFolder: 'SE 3',
    productName: 'Apple Watch SE 3',
    slug: 'apple-watch-se-3',
    entries: [
      { folder: '40mm-Aluminio-GPS-Cellular-estelar-esportiva-estelar', tamanho: '40mm', material: 'Alumínio', conectividade: 'GPS + Cellular', cor: 'Estelar', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Estelar' },
      { folder: '40mm-Aluminio-GPS-Cellular-meia-noite-esportiva-meia-noite', tamanho: '40mm', material: 'Alumínio', conectividade: 'GPS + Cellular', cor: 'Meia-noite', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Meia-noite' },
      { folder: '40mm-Aluminio-GPS-estelar-esportiva-estelar', tamanho: '40mm', material: 'Alumínio', conectividade: 'GPS', cor: 'Estelar', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Estelar' },
      { folder: '40mm-Aluminio-GPS-meia-noite-esportiva-meia-noite', tamanho: '40mm', material: 'Alumínio', conectividade: 'GPS', cor: 'Meia-noite', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Meia-noite' },
      { folder: '44mm-Aluminio-GPS-Cellular-estelar-esportiva-estelar', tamanho: '44mm', material: 'Alumínio', conectividade: 'GPS + Cellular', cor: 'Estelar', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Estelar' },
      { folder: '44mm-Aluminio-GPS-Cellular-meia-noite-esportiva-meia-noite', tamanho: '44mm', material: 'Alumínio', conectividade: 'GPS + Cellular', cor: 'Meia-noite', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Meia-noite' },
      { folder: '44mm-Aluminio-GPS-estelar-esportiva-estelar', tamanho: '44mm', material: 'Alumínio', conectividade: 'GPS', cor: 'Estelar', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Estelar' },
      { folder: '44mm-Aluminio-GPS-meia-noite-esportiva-meia-noite', tamanho: '44mm', material: 'Alumínio', conectividade: 'GPS', cor: 'Meia-noite', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Meia-noite' },
    ],
  },
  {
    lineFolder: 'Series 11',
    productName: 'Apple Watch Series 11',
    slug: 'apple-watch-series-11',
    entries: [
      { folder: '42mm-Aluminio-GPS-Cellular-cinza-espacial-esportiva-preta', tamanho: '42mm', material: 'Alumínio', conectividade: 'GPS + Cellular', cor: 'Cinza Espacial', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Preta' },
      { folder: '42mm-Aluminio-GPS-Cellular-cor-de-ouro-rosa-esportiva-blush-clara', tamanho: '42mm', material: 'Alumínio', conectividade: 'GPS + Cellular', cor: 'Cor de Ouro Rosa', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Blush Clara' },
      { folder: '42mm-Aluminio-GPS-Cellular-prateada-esportiva-roxo-nevoa', tamanho: '42mm', material: 'Alumínio', conectividade: 'GPS + Cellular', cor: 'Prateada', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Roxo Névoa' },
      { folder: '42mm-Aluminio-GPS-Cellular-preta-brilhante-esportiva-preta', tamanho: '42mm', material: 'Alumínio', conectividade: 'GPS + Cellular', cor: 'Preta Brilhante', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Preta' },
      { folder: '42mm-Aluminio-GPS-cinza-espacial-esportiva-preta', tamanho: '42mm', material: 'Alumínio', conectividade: 'GPS', cor: 'Cinza Espacial', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Preta' },
      { folder: '42mm-Aluminio-GPS-cor-de-ouro-rosa-esportiva-blush-clara', tamanho: '42mm', material: 'Alumínio', conectividade: 'GPS', cor: 'Cor de Ouro Rosa', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Blush Clara' },
      { folder: '42mm-Aluminio-GPS-prateada-esportiva-roxo-nevoa', tamanho: '42mm', material: 'Alumínio', conectividade: 'GPS', cor: 'Prateada', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Roxo Névoa' },
      { folder: '42mm-Aluminio-GPS-preta-brilhante-esportiva-preta', tamanho: '42mm', material: 'Alumínio', conectividade: 'GPS', cor: 'Preta Brilhante', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Preta' },
      { folder: '42mm-Titanio-GPS-Cellular-ardosia-ardosia-estilo-milanes', tamanho: '42mm', material: 'Titânio', conectividade: 'GPS + Cellular', cor: 'Ardósia', tipoPulseira: 'Estilo Milanês', corPulseira: 'Ardósia' },
      { folder: '42mm-Titanio-GPS-Cellular-dourada-esportiva-blush-clara', tamanho: '42mm', material: 'Titânio', conectividade: 'GPS + Cellular', cor: 'Dourada', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Blush Clara' },
      { folder: '42mm-Titanio-GPS-Cellular-natural-natural-estilo-milanes', tamanho: '42mm', material: 'Titânio', conectividade: 'GPS + Cellular', cor: 'Natural', tipoPulseira: 'Estilo Milanês', corPulseira: 'Natural' },
      { folder: '46mm-Aluminio-GPS-Cellular-cinza-espacial-esportiva-preta', tamanho: '46mm', material: 'Alumínio', conectividade: 'GPS + Cellular', cor: 'Cinza Espacial', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Preta' },
      { folder: '46mm-Aluminio-GPS-Cellular-cor-de-ouro-rosa-esportiva-blush-clara', tamanho: '46mm', material: 'Alumínio', conectividade: 'GPS + Cellular', cor: 'Cor de Ouro Rosa', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Blush Clara' },
      { folder: '46mm-Aluminio-GPS-Cellular-prateada-esportiva-roxo-nevoa', tamanho: '46mm', material: 'Alumínio', conectividade: 'GPS + Cellular', cor: 'Prateada', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Roxo Névoa' },
      { folder: '46mm-Aluminio-GPS-Cellular-preta-brilhante-esportiva-preta', tamanho: '46mm', material: 'Alumínio', conectividade: 'GPS + Cellular', cor: 'Preta Brilhante', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Preta' },
      { folder: '46mm-Aluminio-GPS-cinza-espacial-esportiva-preta', tamanho: '46mm', material: 'Alumínio', conectividade: 'GPS', cor: 'Cinza Espacial', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Preta' },
      { folder: '46mm-Aluminio-GPS-cor-de-ouro-rosa-esportiva-blush-clara', tamanho: '46mm', material: 'Alumínio', conectividade: 'GPS', cor: 'Cor de Ouro Rosa', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Blush Clara' },
      { folder: '46mm-Aluminio-GPS-prateada-esportiva-roxo-nevoa', tamanho: '46mm', material: 'Alumínio', conectividade: 'GPS', cor: 'Prateada', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Roxo Névoa' },
      { folder: '46mm-Aluminio-GPS-preta-brilhante-esportiva-preta', tamanho: '46mm', material: 'Alumínio', conectividade: 'GPS', cor: 'Preta Brilhante', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Preta' },
      { folder: '46mm-Titanio-GPS-Cellular-ardosia-ardosia-estilo-milanes', tamanho: '46mm', material: 'Titânio', conectividade: 'GPS + Cellular', cor: 'Ardósia', tipoPulseira: 'Estilo Milanês', corPulseira: 'Ardósia' },
      { folder: '46mm-Titanio-GPS-Cellular-dourada-dourada-estilo-milanes', tamanho: '46mm', material: 'Titânio', conectividade: 'GPS + Cellular', cor: 'Dourada', tipoPulseira: 'Estilo Milanês', corPulseira: 'Dourada' },
      { folder: '46mm-Titanio-GPS-Cellular-natural-esportiva-cinza-pedra', tamanho: '46mm', material: 'Titânio', conectividade: 'GPS + Cellular', cor: 'Natural', tipoPulseira: 'Pulseira Esportiva', corPulseira: 'Cinza Pedra' },
    ],
  },
  {
    lineFolder: 'Ultra 3',
    productName: 'Apple Watch Ultra 3',
    slug: 'apple-watch-ultra-3',
    entries: [
      { folder: '49mm-Titanio-natural-Oceano-azul-ancora', tamanho: '49mm', material: 'Titânio', cor: 'Natural', tipoPulseira: 'Pulseira Oceano', corPulseira: 'Azul-Âncora' },
      { folder: '49mm-Titanio-natural-loop-Alpina-azul-clara', tamanho: '49mm', material: 'Titânio', cor: 'Natural', tipoPulseira: 'Loop Alpina', corPulseira: 'Azul Clara' },
      { folder: '49mm-Titanio-natural-loop-Trail-azul-azul-brilhante', tamanho: '49mm', material: 'Titânio', cor: 'Natural', tipoPulseira: 'Loop Trail', corPulseira: 'Azul / Azul Brilhante' },
      { folder: '49mm-Titanio-natural-natural-estilo-milanes-de-titanio', tamanho: '49mm', material: 'Titânio', cor: 'Natural', tipoPulseira: 'Estilo Milanês de Titânio', corPulseira: 'Natural' },
      { folder: '49mm-Titanio-preta-Oceano-preta', tamanho: '49mm', material: 'Titânio', cor: 'Preta', tipoPulseira: 'Pulseira Oceano', corPulseira: 'Preta' },
      { folder: '49mm-Titanio-preta-loop-Alpina-preta', tamanho: '49mm', material: 'Titânio', cor: 'Preta', tipoPulseira: 'Loop Alpina', corPulseira: 'Preta' },
      { folder: '49mm-Titanio-preta-loop-Trail-preta-carvao', tamanho: '49mm', material: 'Titânio', cor: 'Preta', tipoPulseira: 'Loop Trail', corPulseira: 'Preta-Carvão' },
      { folder: '49mm-Titanio-preta-preta-estilo-milanes-de-titanio', tamanho: '49mm', material: 'Titânio', cor: 'Preta', tipoPulseira: 'Estilo Milanês de Titânio', corPulseira: 'Preta' },
    ],
  },
];

export function slugifyToken(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '')
    .toUpperCase();
}

export function buildSku(productSlug, entry) {
  const bits = [entry.tamanho, entry.material, entry.conectividade, entry.cor, entry.tipoPulseira, entry.corPulseira]
    .filter(Boolean)
    .map(v => slugifyToken(v).slice(0, 6));
  return `${slugifyToken(productSlug).slice(0, 10)}-${bits.join('-')}`;
}

export function buildAttributes(entry) {
  const attrs = { 'Tamanho da Caixa': entry.tamanho, 'Material da Caixa': entry.material };
  if (entry.conectividade) attrs['Conectividade'] = entry.conectividade;
  attrs['Cor'] = entry.cor;
  attrs['Tipo de Pulseira'] = entry.tipoPulseira;
  attrs['Cor da Pulseira'] = entry.corPulseira;
  return attrs;
}
