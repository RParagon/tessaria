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

// ---------- dano em monstros (Fendas e Ermos do grupo) ----------
// O anfitrião simula os monstros; o servidor não sabe a vida de cada um, mas sabe o mínimo que um abate custa
// (o monstro mais fraco do jogo, a aranha: 22 de vida, na dificuldade e no nível da Fenda) e o máximo de dano que o
// grupo consegue causar (perfil de cada um). Abate mais rápido que isso, sem ninguém atacando ou longe de todos: não vale.
/** Vida dos monstros por dificuldade (DIFFS em src/game/core/state.js). */
export const DIFF_HP = [1, 1.5, 2.2, 3.2, 4.6, 6.5, 9];
export const MIN_MONSTER_HP = 22, ELITE_HP = 3.2, MONSTER_AOE = 8;
/** Menor vida possível de um monstro na instância (folga: nos Ermos, monstros de nível baixo em zona baixa valem 60%). */
export function minMonsterHp(o: { kind: 'rift' | 'wilds'; L: number; diff: number; aff?: string[] }, elite = false) {
  const d = DIFF_HP[Math.max(0, Math.min(DIFF_HP.length - 1, Math.floor(o.diff) || 0))];
  const scale = o.kind === 'rift' ? (1 + .4 * (Math.max(1, o.L) - 1)) * (o.aff?.includes('fortificada') ? 1.4 : 1) : .6;
  return MIN_MONSTER_HP * d * scale * (elite ? ELITE_HP * MONSTER_AOE / 2 : 1);   // elite: no máximo 2 por golpe (a folga de área é para os comuns)
}
/** Dano por segundo máximo de um jogador contra monstros, com folga para golpes em área (vários monstros por golpe), bênçãos e comida. */
export const dpsCap = (p: CombatProfile) => p.dmg * p.critMul / Math.max(.15, p.atkCd) * MONSTER_AOE;
