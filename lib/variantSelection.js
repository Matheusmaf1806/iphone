// Helpers puros de seleção de variante — sem imports server-only, podem ser
// usados em qualquer componente client (ProductActions, combos de sugestão, etc).

// Agrupa os atributos de todas as variantes em eixos (ex: Versão, Cor, Armazenamento),
// na ordem em que aparecem, para desenhar um seletor por eixo.
export function buildAxisOptions(variants) {
  const order = [];
  const values = {};
  variants.forEach(v => {
    Object.entries(v.attributes || {}).forEach(([key, value]) => {
      if (!values[key]) {
        values[key] = [];
        order.push(key);
      }
      if (!values[key].includes(value)) values[key].push(value);
    });
  });
  return order.map(name => ({ name, values: values[name] }));
}

export function findMatchingVariant(variants, selected) {
  return variants.find(v => Object.entries(selected).every(([key, value]) => v.attributes[key] === value)) || null;
}

// Escolhe uma variante padrão sensata pra pré-selecionar num combo: a marcada
// como is_default (se tiver estoque), senão a primeira com estoque, senão a
// primeira de todas — assim o combo já nasce "pronto pra adicionar" em vez de
// obrigar o cliente a escolher cor/armazenamento antes de conseguir comprar.
export function pickDefaultVariant(variants) {
  if (!variants || variants.length === 0) return null;
  const withStock = variants.filter(v => v.stockQuantity > 0);
  const pool = withStock.length > 0 ? withStock : variants;
  return pool.find(v => v.isDefault) || pool[0];
}
