import { createServerClient } from './supabase/server';

/**
 * Taxas usadas como fallback quando a tabela `installment_fees` ainda não existe
 * no banco (antes de rodar a migration) ou o Supabase não está configurado.
 * Ajuste aqui também se a taxa real do gateway mudar, pra manter igual ao seed.
 */
export const DEFAULT_INSTALLMENT_FEES = {
  1: 7.60, 2: 10.39, 3: 11.60, 4: 12.84, 5: 14.10,
  6: 15.39, 7: 17.23, 8: 18.59, 9: 19.99, 10: 21.42,
  11: 22.88, 12: 24.38, 13: 26.70, 14: 28.29, 15: 29.92,
  16: 31.60, 17: 33.32, 18: 35.09, 19: 36.90, 20: 38.76,
  21: 40.68,
};

/**
 * Busca a tabela de taxas do cartão por número de parcelas (1 a 21x).
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
