// Métricas simples no formato do Prometheus (texto), sem dependências.

const counters = new Map<string, number>();
const gauges = new Map<string, () => number>();

export const inc = (name: string, by = 1) => counters.set(name, (counters.get(name) ?? 0) + by);
export const gauge = (name: string, fn: () => number) => gauges.set(name, fn);

export function render(extra: Record<string, number> = {}): string {
  const lines: string[] = [];
  for (const [k, v] of counters) lines.push(`# TYPE tessaria_${k} counter`, `tessaria_${k} ${v}`);
  for (const [k, fn] of gauges) lines.push(`# TYPE tessaria_${k} gauge`, `tessaria_${k} ${fn()}`);
  for (const [k, v] of Object.entries(extra)) lines.push(`# TYPE tessaria_${k} gauge`, `tessaria_${k} ${v}`);
  lines.push(`tessaria_uptime_seconds ${Math.round(process.uptime())}`);
  lines.push(`tessaria_memory_rss_bytes ${process.memoryUsage().rss}`);
  return lines.join('\n') + '\n';
}

/** Valor atual de um contador (0 se nunca contou). */
export const counter = (name: string) => counters.get(name) ?? 0;

export function resetMetricsForTests() { counters.clear(); }
