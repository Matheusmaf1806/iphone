import { createServerClient } from './supabase/server';

/**
 * Taxas usadas como fallback quando a tabela `installment_fees` ainda não existe
 * no banco (antes de rodar a migration) ou o Supabase não está configurado.
 * Parcelamento vai até 10x, com taxa fixa de 9,68% em qualquer número de
 * parcelas (não é mais uma taxa crescente por parcela).
 */
export const DEFAULT_INSTALLMENT_FEES = {
  1: 9.68, 2: 9.68, 3: 9.68, 4: 9.68, 5: 9.68,
  6: 9.68, 7: 9.68, 8: 9.68, 9: 9.68, 10: 9.68,
};

/**
 * Busca a tabela de taxas do cartão por número de parcelas (1 a 10x).
 * @returns {Object<number, number>} mapa { [parcelas]: taxaPercentual }
 */
export async function getInstallmentFees() {
  const supabase = createServerClient();
  if (!supabase) {
    return DEFAULT_INSTALLMENT_FEES;
  }

  try {
    const { data, error } = await supabase
      .from('installment_fees')
      .select('installments, fee_percentage')
      .order('installments');

    if (error || !data || data.length === 0) {
      return DEFAULT_INSTALLMENT_FEES;
    }

    const fees = {};
    data.forEach((row) => {
      fees[row.installments] = parseFloat(row.fee_percentage);
    });
    return fees;
  } catch (error) {
    console.error('Error fetching installment fees:', error);
    return DEFAULT_INSTALLMENT_FEES;
  }
}

/**
 * Resolve a taxa para um número de parcelas específico. Se essa contagem exata
 * não estiver cadastrada, usa a taxa da contagem cadastrada mais próxima (a de
 * baixo, se existir) em vez de quebrar o cálculo.
 */
export function getFeeForInstallments(feesMap, installments) {
  if (feesMap[installments] != null) {
    return feesMap[installments];
  }

  const known = Object.keys(feesMap).map(Number).sort((a, b) => a - b);
  if (known.length === 0) return 0;

  const lower = known.filter((n) => n <= installments).pop();
  if (lower != null) return feesMap[lower];

  return feesMap[known[0]];
}
