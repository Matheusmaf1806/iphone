import { createServerClient } from './supabase/server';

/**
 * Taxas fictícias usadas como fallback quando a tabela `installment_fees` ainda
 * não existe no banco (antes de rodar a migration) ou o Supabase não está
 * configurado. Mesma taxa de 1x que já era o padrão do site (card_fee_percentage),
 * subindo dali pra frente — troque pelos valores reais do gateway direto na tela
 * Configurações assim que a integração acontecer.
 */
export const DEFAULT_INSTALLMENT_FEES = {
  1: 9.68, 2: 10.5, 3: 11.3, 4: 12.1, 5: 12.9,
  6: 13.7, 7: 14.6, 8: 15.5, 9: 16.4, 10: 17.3,
  11: 18.2, 12: 19.1, 13: 20.0, 14: 20.9, 15: 21.8,
  16: 22.7, 17: 23.6, 18: 24.5, 19: 25.4, 20: 26.3,
  21: 27.2,
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
