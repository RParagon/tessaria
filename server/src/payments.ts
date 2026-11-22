// Mercado Pago (Checkout Pro): compra de Fios Dourados com Pix ou cartão.
//
// Fluxo: o jogo pede um pacote -> o servidor cria uma "preferência" e devolve o link do checkout ->
// o jogador paga na página do Mercado Pago -> o Mercado Pago chama o webhook -> o servidor CONSULTA o
// pagamento na API do Mercado Pago com o próprio token (nunca confia no corpo do webhook) e só credita se
// estiver aprovado, em reais, com o valor exato do pacote. O id do pagamento é a chave na tabela payments,
// então cada pagamento credita uma vez só, mesmo que o webhook chegue repetido.
//
// O Access Token vem só da variável de ambiente MP_ACCESS_TOKEN. Nunca no repositório nem nos logs.
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { DOURADOS_PACKS } from '../../shared/season';

export const MP_API = 'https://api.mercadopago.com';
export type Pack = typeof DOURADOS_PACKS[number];

/** external_reference = "conta:pacote" (é o que volta no pagamento para sabermos a quem creditar). */
export const mpRef = (accountId: string, pack: string) => `${accountId}:${pack}`;
export function parseRef(ref: unknown): { accountId: string; pack: Pack } | null {
  if (typeof ref !== 'string') return null;
  const m = /^([0-9a-f-]{36}):([a-z0-9]{1,10})$/i.exec(ref); if (!m) return null;
  const pack = DOURADOS_PACKS.find(p => p.id === m[2]); return pack ? { accountId: m[1].toLowerCase(), pack } : null;
}

export interface Preference { pack: Pack; accountId: string; notificationUrl: string; siteUrl: string | null }

/** Cria a preferência de pagamento e devolve o link do checkout (init_point). */
export async function mpCreatePreference(token: string, o: Preference): Promise<{ id: string; url: string }> {
  const back = o.siteUrl ? {
    back_urls: { success: `${o.siteUrl}/?pagamento=ok`, pending: `${o.siteUrl}/?pagamento=pendente`, failure: `${o.siteUrl}/?pagamento=falhou` },
    auto_return: 'approved',
  } : {};
  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-idempotency-key': randomUUID() },
    body: JSON.stringify({
      items: [{ id: o.pack.id, title: `${o.pack.n} Fios Dourados (Fios de Tessária)`, description: 'Moeda de cosméticos do jogo Fios de Tessária', category_id: 'virtual_goods', quantity: 1, currency_id: 'BRL', unit_price: o.pack.brl }],
      external_reference: mpRef(o.accountId, o.pack.id),
      metadata: { account_id: o.accountId, pack: o.pack.id },
      notification_url: o.notificationUrl,
      statement_descriptor: 'TESSARIA',
      binary_mode: false,
      ...back,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Mercado Pago respondeu ${res.status} ao criar a preferência`);
  const j: any = await res.json();
  if (typeof j?.init_point !== 'string') throw new Error('Mercado Pago não devolveu o link do checkout');
  return { id: String(j.id ?? ''), url: j.init_point };
}

export interface MpPayment { id: string; status: string; currency: string; amount: number; ref: unknown }
/** Consulta um pagamento direto na API (a fonte da verdade). null se não existe. */
export async function mpGetPayment(token: string, id: string): Promise<MpPayment | null> {
  const res = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Mercado Pago respondeu ${res.status} ao consultar o pagamento`);
  const j: any = await res.json();
  return { id: String(j.id), status: String(j.status ?? ''), currency: String(j.currency_id ?? ''), amount: Number(j.transaction_amount), ref: j.external_reference };
}

/** O pagamento bate com o pacote? Aprovado, em reais e com o valor exato. */
export function paymentMatches(p: MpPayment, pack: Pack) {
  return p.status === 'approved' && p.currency === 'BRL' && Math.abs(p.amount - pack.brl) < 0.005;
}

/** Tira o id do pagamento de uma notificação (webhook novo no corpo/query ou IPN antigo ?topic=payment&id=). */
export function notificationPaymentId(body: any, query: any): string | null {
  const type = body?.type ?? body?.topic ?? query?.type ?? query?.topic;
  if (type && type !== 'payment') return null;
  const id = body?.data?.id ?? query?.['data.id'] ?? query?.id;
  const s = id == null ? '' : String(id);
  return /^[0-9]{1,24}$/.test(s) ? s : null;
}

/**
 * Confere a assinatura x-signature do webhook ("ts=...,v1=..."), como manda a documentação do Mercado Pago:
 * HMAC-SHA256 de "id:{data.id};request-id:{x-request-id};ts:{ts};" com a assinatura secreta.
 */
export function mpSignatureOk(secret: string, header: unknown, requestId: unknown, dataId: string, now = Date.now()) {
  if (typeof header !== 'string') return false;
  const parts = Object.fromEntries(header.split(',').map(kv => kv.trim().split('=', 2) as [string, string]));
  const ts = parts.ts, v1 = parts.v1; if (!ts || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return false;
  // ts vem em milissegundos (ou segundos, nas versões antigas): recusa assinaturas de mais de 1 hora.
  const tsMs = Number(ts) < 1e12 ? Number(ts) * 1000 : Number(ts);
  if (!Number.isFinite(tsMs) || Math.abs(now - tsMs) > 3_600_000) return false;
  let manifest = `id:${dataId.toLowerCase()};`;
  if (typeof requestId === 'string' && requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  const want = createHmac('sha256', secret).update(manifest).digest();
  return timingSafeEqual(want, Buffer.from(v1, 'hex'));
}
