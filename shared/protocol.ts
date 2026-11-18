// Protocolo da vila online (WebSocket) e tipos da API.
// Mensagens são JSON curtos. Posições vêm do cliente (a vila não tem combate);
// a mesma conexão leva amigos e grupo, inclusive fora da vila;
// o servidor limita velocidade, área e frequência.

export const PROTOCOL_VERSION = 1;
export const HUB_CAP = 40;          // jogadores por sala da vila
export const SNAP_HZ = 10;          // snapshots por segundo
export const VISIBLE_MAX = 12;      // jogadores remotos desenhados ao mesmo tempo (cores próprias na paleta)
export const CHAT_MAX = 140;
export const HUB_BOUNDS = { x0: 4, x1: 150, z0: 4, z1: 60 };   // vila + Bairro Leste
export const MAX_SPEED = 12;        // unidades/s (corrida + esquiva com folga)
// ---------- instâncias (co-op) ----------
/** Bases de Fenda que o jogo conhece (core/progression.js, RTYPES). */
/** Co-op: vida e dano dos inimigos pelo número de jogadores na instância (índice = jogadores). */
export const COOP_HP = [1, 1, 1.75, 2.5, 3.25];
export const COOP_DMG = [1, 1, 1.1, 1.15, 1.2];
export const DOWN_SECS = 15, SEW_SECS = 3, SEW_HP = .3, XP_SHARE_DIST = 30;
export const RIFT_BASES = ['forest', 'crypt', 'peaks', 'swamp', 'glass'] as const;
export const INST_CAP = 4;                 // jogadores por instância
export const INST_READY_MS = 20_000;       // tempo do aviso "Pronto?"
export const INST_EMPTY_MS = 60_000;       // instância vazia fecha depois disso
export const INST_BOUNDS = { x0: 0, x1: 700, z0: 0, z1: 700 };   // cabe a Fenda e os Ermos (600x520 unidades)
/** Tudo o que define uma Fenda: com os mesmos dados (e a mesma semente), todo jogo gera o mesmo mapa. */
export const RELAY_PER_SEC = 60;          // mensagens de combate por segundo por jogador (snapshots 10/s + eventos)
export const RELAY_MAX_BYTES = 24_000;
export interface RiftParams { L: number; base: string; aff: string[]; boss: string; seed: number }

export const EMOTES = ['acenar', 'comemorar', 'dancar', 'sentar'] as const;
export type Emote = typeof EMOTES[number];
/** Ações com animação própria (ataque, habilidade, esquiva), enviadas no quadro em que começam. */
export const ACTS = ['swing', 'cast', 'shoot', 'volley', 'spin', 'nova', 'dash'] as const;
export type Act = typeof ACTS[number];
export const ACT_BURST = 6;         // ações seguidas permitidas de uma vez
export const ACT_RATE = 6;          // ações por segundo, em média
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
  | { t: 'act'; a: Act; c: number; yaw: number }      // c: golpe do combo, runa da habilidade ou poder da esquiva (0..3)
  | { t: 'look'; look: Look }
  | { t: 'time'; c: number }
  | { t: 'iopen'; kind: 'rift'; L: number; base: string; aff: string[]; boss: string }   // líder abre a Fenda para o grupo
  | { t: 'iopen'; kind: 'wilds' }   // líder abre os Ermos para o grupo (o mapa é sempre o mesmo)
  | { t: 'ijoin'; inst: number }   // entrar na instância do grupo
  | { t: 'ikill'; n: number; el: 0 | 1; th: 0 | 1; x: number; z: number; b?: number }   // b: bioma (Ermos)   // anfitrião: monstro derrotado (loot pelo servidor)
  | { t: 'hx'; d: unknown }                // anfitrião → todos da instância (estado dos inimigos, mortes, projéteis)
  | { t: 'gx'; d: unknown }                // jogador → anfitrião (acertos)
  | { t: 'hto'; to: number; d: unknown }   // anfitrião → um jogador (dano recebido)
  | { t: 'px'; to?: number; d: unknown }   // jogador → jogador (ou todos) da instância: caído, levantou, costurar   // pedido da hora do servidor (c: hora do cliente no envio)
  // amigos e grupo (docs/ONLINE.md). Fora da vila a conexão continua aberta só para isso.
  | { t: 'where'; r: string; n?: number; i?: number }        // região atual (chave do jogo), nível da Fenda e instância do grupo
  | { t: 'pinvite'; name: string }              // convidar para o grupo
  | { t: 'paccept'; from: string }              // aceitar o convite de alguém
  | { t: 'pdecline'; from: string }
  | { t: 'pleave' }
  | { t: 'pkick'; name: string }                // só o líder
  | { t: 'plead'; name: string };               // só o líder

// Servidor → cliente
export type ServerMsg =
  | { t: 'welcome'; id: number; room: string; players: PublicPlayer[]; v: number; now?: number }
  | { t: 'time'; c: number; s: number }
  | { t: 'iready'; inst: number; kind: 'rift' | 'wilds'; L: number; by: string; ms: number; diff: number }   // diff: dificuldade do grupo   // aviso "Pronto?" para o grupo
  | { t: 'ienter'; inst: number; kind: 'rift' | 'wilds'; rift: RiftParams | null; diff: number; lvl: number }   // lvl: nível do líder (Fio de Elo)   // pode entrar: dados para gerar o mesmo mapa
  | { t: 'iclosed'; inst: number }
  | { t: 'ihost'; id: number }
  | { t: 'loot'; x: number; z: number; items: any[] }   // itens sorteados pelo servidor para este jogador   // quem simula o combate na instância
  | { t: 'hx'; from: number; d: any }
  | { t: 'gx'; from: number; d: any }
  | { t: 'px'; from: number; d: any }   // resposta: c ecoado, s = hora do servidor   // room vazio: conectado fora da vila
  | { t: 'join'; p: PublicPlayer }
  | { t: 'leave'; id: number }
  | { t: 'snap'; ps: Array<[number, number, number, number, number, string]> }   // id, x, z, yaw, mover(0..1), ação
  | { t: 'chat'; id: number; name: string; text: string; ts: number }
  | { t: 'emote'; id: number; e: Emote }
  | { t: 'act'; id: number; a: Act; c: number; yaw: number }
  | { t: 'look'; id: number; look: Look }
  | { t: 'title'; id: number; title: string }
  | { t: 'sys'; text: string }
  | { t: 'kick'; reason: string }
  | { t: 'party'; party: PartyView | null }
  | { t: 'pinvite'; from: string; size: number; ms: number }
  | { t: 'pchat'; name: string; text: string; ts: number }
  /** Algo mudou na lista de amigos: o cliente recarrega. `ev` diz o quê, para o aviso. */
  | { t: 'social'; ev: 'pedido' | 'aceito' | 'online' | 'offline'; name: string };
