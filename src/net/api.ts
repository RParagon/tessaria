// Acesso à API do servidor. O endereço vem de VITE_API_URL no build
// (ex.: https://api.seujogo.com). Sem ele, o jogo fica só offline.
// Para testes, ?server=http://... na URL também funciona.

function resolveBase(): string | null {
  try {
    const q = new URLSearchParams(location.search).get('server');
    if (q && /^https?:\/\//.test(q)) return q.replace(/\/$/, '');
  } catch { /* sem location */ }
  const env = import.meta.env.VITE_API_URL as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (import.meta.env.DEV) return 'http://localhost:2567';
  return null;
}

export const API_BASE = resolveBase();
export const WS_BASE = API_BASE ? API_BASE.replace(/^http/, 'ws') + '/ws' : null;

const TOKEN_KEY = 'tessaria-sessao';
export const tokens = {
  get(): string | null { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set(t: string) { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* sem storage */ } },
  clear() { try { localStorage.removeItem(TOKEN_KEY); } catch { /* sem storage */ } },
};

export interface ApiResult<T = any> { status: number; data: T; error: string | null }

/** Chamada à API com tempo limite. Nunca lança: erros de rede viram status 0. */
export async function call<T = any>(method: string, path: string, body?: unknown, timeoutMs = 12000): Promise<ApiResult<T>> {
  if (!API_BASE) return { status: 0, data: null as T, error: 'Modo online indisponível.' };
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), timeoutMs);
  const token = tokens.get();
  try {
    const res = await fetch(API_BASE + path, {
      method, signal: ctl.signal,
      headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: 'Bearer ' + token } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data: any = null; const text = await res.text();
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    return { status: res.status, data, error: res.ok ? null : (data && data.error) || `Erro ${res.status}` };
  } catch (e: any) {
    return { status: 0, data: null as T, error: e && e.name === 'AbortError' ? 'O servidor demorou para responder.' : 'Sem conexão com o servidor.' };
  } finally { clearTimeout(timer); }
}
