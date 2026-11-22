import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { STORES, startServer, api, register, type TestServer } from './helpers';
import { mpSignatureOk, notificationPaymentId, parseRef } from '../src/payments';

// O Mercado Pago é simulado: interceptamos o fetch só para api.mercadopago.com. Nada de credenciais reais aqui.
const TOKEN = 'TEST-token-de-mentira', SECRET = 'segredo-de-teste';
const realFetch = globalThis.fetch;
const mp = { prefs: [] as any[], payments: new Map<string, any>(), down: false };
function installMock() {
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.startsWith('https://api.mercadopago.com/')) return realFetch(input, init);
    assert.equal(new Headers(init?.headers).get('authorization'), `Bearer ${TOKEN}`);
    if (mp.down) return new Response('{}', { status: 503 });
    if (url.endsWith('/checkout/preferences')) { const b = JSON.parse(init.body); mp.prefs.push(b); return Response.json({ id: 'pref' + mp.prefs.length, init_point: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref' + mp.prefs.length }); }
    const m = /\/v1\/payments\/(\d+)$/.exec(url);
    if (m) { const p = mp.payments.get(m[1]); return p ? Response.json(p) : new Response('{}', { status: 404 }); }
    return new Response('{}', { status: 404 });
  }) as typeof fetch;
}
const hook = (S: TestServer, id: string, headers: Record<string, string> = {}) =>
  realFetch(`${S.url}/payments/mp/webhook?data.id=${id}&type=payment`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify({ type: 'payment', action: 'payment.updated', data: { id } }) });
const sign = (id: string, ts = String(Date.now()), reqId = 'req-1') => ({ 'x-request-id': reqId, 'x-signature': `ts=${ts},v1=${createHmac('sha256', SECRET).update(`id:${id};request-id:${reqId};ts:${ts};`).digest('hex')}` });

describe('pagamentos: funções', () => {
  test('referência, id da notificação e assinatura', () => {
    const acc = '0f8fad5b-d9cb-469f-a165-70867728950e';
    assert.deepEqual(parseRef(`${acc}:p500`)?.pack.n, 500);
    assert.equal(parseRef(`${acc}:p999`), null); assert.equal(parseRef('lixo'), null); assert.equal(parseRef(undefined), null);
    assert.equal(notificationPaymentId({ type: 'payment', data: { id: '123' } }, {}), '123');
    assert.equal(notificationPaymentId({}, { topic: 'payment', id: '77' }), '77');
    assert.equal(notificationPaymentId({ type: 'merchant_order', data: { id: '5' } }, {}), null);
    assert.equal(notificationPaymentId({ data: { id: '../x' } }, {}), null);
    const h = sign('123');
    assert.ok(mpSignatureOk(SECRET, h['x-signature'], h['x-request-id'], '123'));
    assert.ok(!mpSignatureOk(SECRET, h['x-signature'], h['x-request-id'], '124'));
    assert.ok(!mpSignatureOk('outro', h['x-signature'], h['x-request-id'], '123'));
    const old = sign('123', String(Date.now() - 2 * 3_600_000));
    assert.ok(!mpSignatureOk(SECRET, old['x-signature'], old['x-request-id'], '123'));   // velha demais
    assert.ok(!mpSignatureOk(SECRET, undefined, undefined, '123'));
  });
});

for (const kind of STORES) {
  describe(`pagamentos Mercado Pago (${kind})`, () => {
    let S: TestServer;
    before(async () => { installMock(); S = await startServer(kind, { mpAccessToken: TOKEN, mpWebhookSecret: SECRET, publicApiUrl: 'https://api.exemplo.test', siteUrl: 'https://jogo.exemplo.test', devPayments: false }); });
    after(async () => { await S.close(); globalThis.fetch = realFetch; });

    test('checkout cria a preferência certa; o webhook credita só pagamento aprovado e com o valor certo, uma vez', async () => {
      const a = await register(S.url);
      const v0 = (await api(S.url, 'GET', '/season', undefined, a.token)).body; assert.equal(v0.payments, 'mp'); assert.equal(v0.me.dourados, 0);
      const c = await api(S.url, 'POST', '/shop/dourados', { pack: 'p1100' }, a.token);
      assert.equal(c.status, 200); assert.match(c.body.checkout, /^https:\/\/www\.mercadopago\.com\.br\//);
      const pref = mp.prefs.at(-1);
      assert.equal(pref.items[0].unit_price, 19.9); assert.equal(pref.items[0].currency_id, 'BRL');
      assert.equal(pref.notification_url, 'https://api.exemplo.test/payments/mp/webhook');
      assert.equal(pref.back_urls.success, 'https://jogo.exemplo.test/?pagamento=ok');
      const ref = pref.external_reference; assert.equal(parseRef(ref)?.pack.id, 'p1100');
      assert.equal((await api(S.url, 'POST', '/shop/dourados', { pack: 'nada' }, a.token)).status, 404);
      const bal = async () => (await api(S.url, 'GET', '/season', undefined, a.token)).body.me.dourados;

      // pendente (Pix aguardando) não credita
      mp.payments.set('1001', { id: 1001, status: 'pending', currency_id: 'BRL', transaction_amount: 19.9, external_reference: ref });
      assert.equal((await hook(S, '1001', sign('1001'))).status, 200); assert.equal(await bal(), 0);
      // aprovado: credita; webhook repetido não credita de novo
      mp.payments.get('1001').status = 'approved';
      assert.equal((await hook(S, '1001', sign('1001'))).status, 200); assert.equal(await bal(), 1100);
      assert.equal((await hook(S, '1001', sign('1001', String(Date.now()), 'req-2'))).status, 200); assert.equal(await bal(), 1100);
      // valor adulterado (pagou menos que o pacote) e moeda errada não creditam
      mp.payments.set('1002', { id: 1002, status: 'approved', currency_id: 'BRL', transaction_amount: 1, external_reference: ref });
      mp.payments.set('1003', { id: 1003, status: 'approved', currency_id: 'USD', transaction_amount: 19.9, external_reference: ref });
      await hook(S, '1002', sign('1002')); await hook(S, '1003', sign('1003')); assert.equal(await bal(), 1100);
      // sem assinatura (ou assinatura errada): recusado
      mp.payments.set('1004', { id: 1004, status: 'approved', currency_id: 'BRL', transaction_amount: 9.9, external_reference: `${parseRef(ref)!.accountId}:p500` });
      assert.equal((await hook(S, '1004')).status, 401);
      assert.equal((await hook(S, '1004', sign('1005'))).status, 401); assert.equal(await bal(), 1100);
      assert.equal((await hook(S, '1004', sign('1004'))).status, 200); assert.equal(await bal(), 1600);
      // pagamento que não existe: 200 e nada muda; API fora do ar: 500 (o Mercado Pago tenta de novo)
      assert.equal((await hook(S, '9999', sign('9999'))).status, 200);
      mp.down = true; assert.equal((await hook(S, '1004', sign('1004'))).status, 500); mp.down = false;
      // estorno tira os Fios Dourados (até zerar), uma vez
      mp.payments.get('1004').status = 'refunded';
      await hook(S, '1004', sign('1004')); assert.equal(await bal(), 1100);
      await hook(S, '1004', sign('1004')); assert.equal(await bal(), 1100);
    });

    test('Mercado Pago fora do ar no checkout: 502 e nenhum crédito', async () => {
      const a = await register(S.url);
      mp.down = true; const r = await api(S.url, 'POST', '/shop/dourados', { pack: 'p500' }, a.token); mp.down = false;
      assert.equal(r.status, 502); assert.equal((await api(S.url, 'GET', '/season', undefined, a.token)).body.me.dourados, 0);
    });
  });
}

describe('pagamentos desligados', () => {
  let S: TestServer;
  before(async () => { S = await startServer('memoria', { devPayments: false }); });
  after(async () => { await S.close(); });
  test('sem token: compra 501, webhook 404', async () => {
    const a = await register(S.url);
    assert.equal((await api(S.url, 'POST', '/shop/dourados', { pack: 'p500' }, a.token)).status, 501);
    assert.equal((await api(S.url, 'GET', '/season', undefined, a.token)).body.payments, 'em-breve');
    assert.equal((await realFetch(`${S.url}/payments/mp/webhook?data.id=1&type=payment`, { method: 'POST' })).status, 404);
  });
});
