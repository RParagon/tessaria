import postgres from 'postgres';
import WebSocket from 'ws';
import { buildApp } from '../src/app';
import { loadConfig, type Config } from '../src/config';
import { MemoryStore } from '../src/store/memory';
import { PgStore } from '../src/store/pg';
import type { Store } from '../src/store/types';
import type { HubOptions } from '../src/hub';

/** Bancos a testar: sempre memória; PostgreSQL se TEST_DATABASE_URL estiver definido. */
export const STORES: Array<'memoria' | 'postgres'> = process.env.TEST_DATABASE_URL ? ['memoria', 'postgres'] : ['memoria'];

export async function resetPg(url: string) {
  const sql = postgres(url, { onnotice: () => {} });
  await sql.unsafe('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
  await sql.end();
}

export interface TestServer { url: string; ws: string; store: Store; close: () => Promise<void>; config: Config }

export async function startServer(kind: 'memoria' | 'postgres', over: Partial<Config> = {}, hub: HubOptions = {}): Promise<TestServer> {
  let store: Store;
  if (kind === 'postgres') { await resetPg(process.env.TEST_DATABASE_URL!); store = new PgStore(process.env.TEST_DATABASE_URL!); }
  else store = new MemoryStore();
  await store.migrate();
  const config = loadConfig({ port: 0, host: '127.0.0.1', logLevel: 'silent', production: false, corsOrigins: [], authPerMinute: 10_000, ...over });
  const { app } = await buildApp({ config, store, hub });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const port = (app.server.address() as any).port;
  return { url: `http://127.0.0.1:${port}`, ws: `ws://127.0.0.1:${port}/ws`, store, config, close: async () => { await app.close(); await store.close(); } };
}

export async function api(base: string, method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(base + path, {
    method, headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null; try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, body: json };
}

let n = 0;
export async function register(base: string, name?: string) {
  const id = ++n + Math.floor(Math.random() * 1e5);
  const r = await api(base, 'POST', '/auth/register', { name: name ?? 'Teste' + id, email: `t${id}@exemplo.com`, password: 'senha1234' });
  if (r.status !== 201) throw new Error('registro falhou: ' + JSON.stringify(r.body));
  return r.body as { token: string; account: { id: string; name: string } };
}

/** Save mínimo válido, parecido com o do jogo. */
export function baseSave(extra: Record<string, any> = {}) {
  return {
    v: 1, char: { name: 'Lume', cls: 'lamina', body: 1, skin: 2, hair: 'rabo', hairCol: 1, outfit: 0, trim: 0, glow: 0, acc: 'nenhum', cape: true, beard: 'nenhuma' },
    lvl: 3, xp: 10, gold: 120, potions: 3, up: { pow: 0, vig: 0, agi: 0, foc: 0, pot: 0 }, frags: [], chests: [], bosses: {}, met: {}, region: 'hub',
    inv: [] as any[], eq: { weapon: { id: 'w0000001', slot: 'weapon', rar: 0, tier: 1, st: { dmg: 8 }, cls: 'lamina', name: 'Espada de treino' } },
    ...extra,
  };
}
export const item = (id: string, over: Record<string, any> = {}) => ({ id, slot: 'charm', rar: 2, tier: 2, st: { crit: 4, gold: 12 }, cls: 'lamina', name: 'Anel de Teste', ...over });

/** Cliente WebSocket que guarda as mensagens recebidas. */
export class WsClient {
  ws: WebSocket; msgs: any[] = []; closed = false; closeCode = 0;
  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.on('message', d => this.msgs.push(JSON.parse(d.toString())));
    this.ws.on('close', c => { this.closed = true; this.closeCode = c; });
    this.ws.on('error', () => {});
  }
  open() { return new Promise<void>((res, rej) => { this.ws.once('open', () => res()); this.ws.once('unexpected-response', (_q, r) => rej(new Error('HTTP ' + r.statusCode))); this.ws.once('error', rej); }); }
  send(m: any) { this.ws.send(JSON.stringify(m)); }
  async waitFor(pred: (m: any) => boolean, ms = 3000) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { const m = this.msgs.find(pred); if (m) return m; await new Promise(r => setTimeout(r, 20)); }
    throw new Error('mensagem não chegou: ' + pred.toString());
  }
  close() { this.ws.close(); }
}
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
