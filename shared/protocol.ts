// Protocolo da vila online (WebSocket) e tipos da API.
// Mensagens são JSON curtos. Posições vêm do cliente (a vila não tem combate);
// a mesma conexão leva amigos e grupo, inclusive fora da vila;
// o servidor limita velocidade, área e frequência.

export const PROTOCOL_VERSION = 1;
export const HUB_CAP = 40;          // jogadores por sala da vila
export const SNAP_HZ = 10;          // snapshots por segundo
export const VISIBLE_MAX = 12;      // jogadores remotos desenhados ao mesmo tempo (cores próprias na paleta)
export const CHAT_MAX = 140;
export const HUB_BOUNDS = { x0: 4, x1: 84, z0: 4, z1: 60 };
export const MAX_SPEED = 12;        // unidades/s (corrida + esquiva com folga)
export const EMOTES = ['acenar', 'comemorar', 'dancar', 'sentar'] as const;
export type Emote = typeof EMOTES[number];
export const EMOTE_LABEL: Record<Emote, string> = { acenar: 'Acenar', comemorar: 'Comemorar', dancar: 'Dançar', sentar: 'Sentar' };

/** Aparência pública do personagem (o que os outros veem). */
export interface Look {
  cls: string; body: number; skin: number; hair: string; hairCol: number; outfit: number; trim: number;
  glow: number; acc: string; cape: boolean; beard: string; armor: number | null; charm: number | null; wr: number;
}

const int = (v: unknown, lo: number, hi: number, d: number) => (Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi ? (v as number) : d);
const word = (v: unknown, d: string) => (typeof v === 'string' && /^[a-z]{1,14}$/.test(v) ? v : d);

/** Normaliza uma aparência vinda da rede (nunca confia no que chega). */
export function sanitizeLook(x: any): Look {
  const o = x && typeof x === 'object' ? x : {};
  return {
    cls: ['lamina', 'arcano', 'arco'].includes(o.cls) ? o.cls : 'lamina',
    body: int(o.body, 0, 2, 1), skin: int(o.skin, 0, 9, 2), hair: word(o.hair, 'curto'), hairCol: int(o.hairCol, 0, 9, 1),
    outfit: int(o.outfit, 0, 20, 0), trim: int(o.trim, 0, 9, 0), glow: int(o.glow, 0, 9, 0), acc: word(o.acc, 'nenhum'),
    cape: !!o.cape, beard: word(o.beard, 'nenhuma'),
    armor: o.armor === null || o.armor === undefined ? null : int(o.armor, 0, 4, 0),
    charm: o.charm === null || o.charm === undefined ? null : int(o.charm, 0, 4, 0),
    wr: int(o.wr, 0, 4, 0),
  };
}

import type { PartyView } from './social';

export interface PublicPlayer { id: number; name: string; title: string; look: Look; x: number; z: number; yaw: number }

// Cliente → servidor
export type ClientMsg =
  | { t: 'pos'; x: number; z: number; yaw: number; m: number; a: string }
  | { t: 'chat'; text: string }
  | { t: 'emote'; e: Emote }
  | { t: 'look'; look: Look }
  // amigos e grupo (docs/ONLINE.md). Fora da vila a conexão continua aberta só para isso.
  | { t: 'where'; r: string; n?: number }        // região atual (chave do jogo) e nível da Fenda
  | { t: 'pinvite'; name: string }              // convidar para o grupo
  | { t: 'paccept'; from: string }              // aceitar o convite de alguém
  | { t: 'pdecline'; from: string }
  | { t: 'pleave' }
  | { t: 'pkick'; name: string }                // só o líder
  | { t: 'plead'; name: string };               // só o líder

// Servidor → cliente
export type ServerMsg =
  | { t: 'welcome'; id: number; room: string; players: PublicPlayer[]; v: number }   // room vazio: conectado fora da vila
  | { t: 'join'; p: PublicPlayer }
  | { t: 'leave'; id: number }
  | { t: 'snap'; ps: Array<[number, number, number, number, number, string]> }   // id, x, z, yaw, mover(0..1), ação
  | { t: 'chat'; id: number; name: string; text: string; ts: number }
  | { t: 'emote'; id: number; e: Emote }
  | { t: 'look'; id: number; look: Look }
  | { t: 'title'; id: number; title: string }
  | { t: 'sys'; text: string }
  | { t: 'kick'; reason: string }
  | { t: 'party'; party: PartyView | null }
  | { t: 'pinvite'; from: string; size: number; ms: number }
  | { t: 'pchat'; name: string; text: string; ts: number }
  /** Algo mudou na lista de amigos: o cliente recarrega. `ev` diz o quê, para o aviso. */
  | { t: 'social'; ev: 'pedido' | 'aceito' | 'online' | 'offline'; name: string };
