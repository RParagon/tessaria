// Amigos e grupo: limites e tipos comuns ao servidor e ao cliente.
// As regras completas estão em docs/ONLINE.md ("Amigos" e "Grupo").

export const FRIENDS_MAX = 100;          // amigos por conta
export const PENDING_MAX = 50;           // pedidos enviados ainda sem resposta
export const FRIEND_REQ_DAYS = 7;        // pedidos de amizade expiram
export const BLOCKS_MAX = 200;
export const PARTY_MAX = 4;              // jogadores por grupo
export const PARTY_INVITE_MS = 60_000;   // convite de grupo expira
export const PARTY_GRACE_MS = 120_000;   // quem cai da conexão continua no grupo por 2 minutos

/** Lugares que o cliente pode informar (chave da região no jogo) e como aparecem para os amigos. */
export const WHERE_LABEL: Record<string, string> = {
  hub: 'Vila Brasa', home: 'Casa do Tecelão', forest: 'Bosque Sussurrante', crypt: 'Ossuário Real', peaks: 'Picos de Cinza',
  swamp: 'Pântano Afogado', glass: 'Cidadela de Vidro', wilds: 'Ermos', rift: 'Fenda do Tear',
};
export const whereLabel = (where: string, n = 0, room = '') =>
  where === 'hub' && room ? room : where === 'rift' && n > 0 ? `Fenda ${n}` : WHERE_LABEL[where] ?? 'Tessária';

export interface PartyMember { name: string; cls: string; lvl: number; online: boolean; where: string; leader: boolean }
/** Instância aberta pelo grupo (Fenda): quem estiver no grupo pode entrar enquanto ela existir. */
export interface InstView { id: number; kind: 'rift' | 'wilds'; L: number; n: number }
export interface PartyView { id: number; leader: string; members: PartyMember[]; inst?: InstView | null }

export interface FriendView { name: string; online: boolean; where: string; title: string; lastSeen: string | null }
export interface FriendsList {
  friends: FriendView[];
  incoming: Array<{ name: string; at: string }>;
  outgoing: Array<{ name: string; at: string }>;
  blocked: Array<{ name: string }>;
}
