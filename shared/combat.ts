// Atributos de combate a partir do save: a mesma conta do stats() do jogo (src/game/core/state.js), sem os efeitos
// passageiros (bênçãos, comida) e sem o Fio de Elo. Usada pelo servidor para decidir os duelos.
// Um teste do jogo confere que os números batem com o stats() (tests/e2e: "combate: atributos do servidor…").

export const CLASS_BASE: Record<string, { hp: number; dmg: number; atkCd: number; dr?: number; ls?: number }> = {
  lamina: { hp: 130, dmg: 17, atkCd: .36, dr: .15, ls: .02 },
  arcano: { hp: 90, dmg: 13.5, atkCd: .34 },
  arco: { hp: 110, dmg: 12.8, atkCd: .25 },
};
/** Regras do PvP (Ermo Profundo e duelos): o golpe vale 30% e tira no máximo 20% da vida por acerto. */
export const PVP_MUL = .3, PVP_MAX_FRAC = .2;

export interface CombatProfile { maxHp: number; dmg: number; atkCd: number; crit: number; critMul: number; dr: number }
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function combatProfile(save: any): CombatProfile {
  const cls = CLASS_BASE[save?.char?.cls] ?? CLASS_BASE.lamina;
  const lv = Math.max(1, Math.min(200, Math.floor(num(save?.lvl) || 1)));
  const up = save?.up ?? {}, pg = save?.pgp ?? {}, pk = save?.perks ?? {};
  const tal = new Set<string>(Array.isArray(save?.talents) ? save.talents : []);
  const e: Record<string, number> = { dmg: 0, hp: 0, crit: 0, dr: 0 };
  for (const k in save?.eq ?? {}) { const it = save.eq[k]; if (!it || !it.st) continue; for (const st in it.st) if (st in e) e[st] += num(it.st[st]); }
  return {
    maxHp: Math.round(cls.hp + 18 * num(up.vig) + 10 * (lv - 1) + e.hp + num(pg.hp) * 5 + (pk.mel ? 20 : 0)),
    dmg: cls.dmg * (1 + .15 * num(up.pow)) * (1 + .07 * (lv - 1)) * (1 + e.dmg / 100) * (1 + num(pg.dmg) / 100) * (pk.lio ? 1.1 : 1),
    atkCd: cls.atkCd * (tal.has('mao') ? .88 : 1),
    crit: .08 + Math.min(52, e.crit + num(pg.crit) * .5) / 100 + (tal.has('olho') ? .08 : 0),
    critMul: tal.has('olho') ? 2.5 : 2,
    dr: Math.min(.7, Math.min(60, e.dr) / 100 + (tal.has('casca') ? .1 : 0) + (cls.dr ?? 0)),
  };
}

/** Maior golpe possível de um perfil (crítico e o maior multiplicador: o meteoro do Arcano, 12×), com folga. */
export const maxHit = (p: CombatProfile) => p.dmg * 12 * p.critMul * 1.15;
/** Dano de PvP que um golpe bruto causa na vítima. */
export const pvpDamage = (raw: number, victim: CombatProfile) => Math.max(1, Math.round(Math.min(raw * PVP_MUL, victim.maxHp * PVP_MAX_FRAC) * (1 - victim.dr)));
