// Configuração por variáveis de ambiente. Tudo tem padrão seguro para
// desenvolvimento; em produção, defina pelo menos DATABASE_URL e CORS_ORIGINS.

const env = process.env;
const list = (v: string | undefined) => (v ? v.split(',').map(s => s.trim()).filter(Boolean) : []);

export interface Config {
  port: number;
  host: string;
  production: boolean;
  databaseUrl: string | null;
  corsOrigins: string[];          // vazio = qualquer origem (só em desenvolvimento)
  googleClientId: string | null;
  metricsToken: string | null;
  sessionDays: number;
  trustProxy: boolean;
  logLevel: string;
  authPerMinute: number;         // tentativas de login/registro por minuto por IP
  version: string;
}

export function loadConfig(over: Partial<Config> = {}): Config {
  const production = env.NODE_ENV === 'production';
  const cfg: Config = {
    port: Number(env.PORT || 2567),
    host: env.HOST || '0.0.0.0',
    production,
    databaseUrl: env.DATABASE_URL || null,
    corsOrigins: list(env.CORS_ORIGINS),
    googleClientId: env.GOOGLE_CLIENT_ID || null,
    metricsToken: env.METRICS_TOKEN || null,
    sessionDays: Number(env.SESSION_DAYS || 30),
    trustProxy: env.TRUST_PROXY ? env.TRUST_PROXY !== 'false' : production,
    logLevel: env.LOG_LEVEL || (production ? 'info' : 'warn'),
    authPerMinute: Number(env.AUTH_PER_MINUTE || 12),
    // process.env.APP_VERSION é trocado pela versão do package.json no build (server/build.mjs).
    version: process.env.APP_VERSION || env.APP_VERSION || 'dev',
    ...over,
  };
  if (production && !cfg.databaseUrl) throw new Error('DATABASE_URL é obrigatório em produção');
  if (production && !cfg.corsOrigins.length) throw new Error('CORS_ORIGINS é obrigatório em produção (ex.: https://seujogo.netlify.app)');
  return cfg;
}
