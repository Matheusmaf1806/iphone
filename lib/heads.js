import { createServerClient } from './supabase/server';

// Marca a última venda do afiliado — chamado toda vez que um pedido é confirmado
// como pago (nunca na criação do pedido em si, que pode ficar pending/expirar sem
// nunca ser pago). Alimenta a regra dos 90 dias sem vender que libera o afiliado
// da carteira do Head automaticamente (ver app/api/cron/release-inactive-heads).
export async function markAffiliateSale(affiliateId, supabaseClient) {
  if (!affiliateId) return;
  const supabase = supabaseClient || createServerClient();
  if (!supabase) return;

  await supabase
    .from('affiliates')
    .update({ last_sale_at: new Date().toISOString() })
    .eq('id', affiliateId);
}
