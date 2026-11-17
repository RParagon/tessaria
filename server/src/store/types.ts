// Interface do armazenamento. Implementações: PgStore (produção) e MemoryStore
// (desenvolvimento sem banco e testes). Toda regra de negócio fica fora daqui;
// o Store só guarda e garante atomicidade.

export interface Account {
  id: string; name: string; email: string | null; passHash: string | null; googleSub: string | null;
  guest: boolean; banned: boolean; createdAt: Date; lastSeen: Date | null; mutedUntil: Date | null;
}
export interface NewAccount { name: string; email?: string | null; passHash?: string | null; googleSub?: string | null; guest: boolean }
export interface SaveRow { rev: number; data: any; updatedAt: Date }
export interface MailRow { id: number; toId: string; fromId: string | null; fromName: string; item: any; note: string; createdAt: Date; claimedAt: Date | null }

/** Amizade vista por um dos lados. */
export interface FriendLink { otherId: string; otherName: string; otherLastSeen: Date | null; state: 'amigo' | 'enviado' | 'recebido'; since: Date }

export type PutSaveResult = { ok: true; rev: number } | { ok: false; conflict: true; rev: number };
export type TransferResult = { ok: true; rev: number; mailId: number } | { ok: false; reason: 'sem-save' | 'sem-item' | 'equipado' };
export type ClaimResult = { ok: true; rev: number; item: any } | { ok: false; reason: 'nao-encontrado' | 'ja-resgatado' | 'bolsa-cheia' | 'sem-save' };

export interface Store {
  migrate(): Promise<void>;
  close(): Promise<void>;

  createAccount(a: NewAccount): Promise<Account>;
  accountById(id: string): Promise<Account | null>;
  accountByName(name: string): Promise<Account | null>;
  accountByEmail(email: string): Promise<Account | null>;
  accountByGoogle(sub: string): Promise<Account | null>;
  updateAccount(id: string, patch: Partial<Pick<Account, 'name' | 'email' | 'passHash' | 'googleSub' | 'guest' | 'banned' | 'lastSeen' | 'mutedUntil'>>): Promise<void>;

  createSession(tokenHash: string, accountId: string, expiresAt: Date, ua: string): Promise<void>;
  sessionAccount(tokenHash: string): Promise<string | null>;
  deleteSession(tokenHash: string): Promise<void>;

  getSave(accountId: string): Promise<SaveRow | null>;
  /** Grava se a revisão bater (concorrência otimista). expectedRev = 0 cria o primeiro save. */
  putSave(accountId: string, data: any, expectedRev: number): Promise<PutSaveResult>;
  /** Apaga o save (começar do zero). As lápides continuam valendo. */
  deleteSave(accountId: string): Promise<void>;

  /** Lápides: ids de itens que saíram da conta pelo correio e não podem voltar num save. */
  tombstoned(accountId: string, itemIds: string[]): Promise<string[]>;

  /** Atômico: tira o item da bolsa do remetente (no save do servidor), grava a lápide e cria a carta. */
  transferItem(fromId: string, fromName: string, toId: string, itemId: string, note: string): Promise<TransferResult>;
  listMail(accountId: string): Promise<MailRow[]>;
  /** Atômico: põe o item na bolsa do destinatário, marca a carta e remove a lápide do destinatário. */
  claimMail(accountId: string, mailId: number): Promise<ClaimResult>;

  /** Amizades e pedidos que envolvem a conta (pedidos mais velhos que `pendingDays` ficam de fora). */
  friendLinks(accountId: string, pendingDays: number): Promise<FriendLink[]>;
  /** Cria o pedido de `fromId` para `toId` (não faz nada se já existir). */
  addFriendRequest(fromId: string, toId: string): Promise<void>;
  /** Aceita o pedido de `otherId` para `accountId`. false se não houver pedido. */
  acceptFriend(accountId: string, otherId: string): Promise<boolean>;
  /** Desfaz amizade ou pedido, nos dois sentidos. */
  removeFriend(a: string, b: string): Promise<void>;
  blockedBy(accountId: string): Promise<Array<{ id: string; name: string }>>;
  /** true se um dos dois bloqueou o outro. */
  isBlocked(a: string, b: string): Promise<boolean>;
  setBlock(accountId: string, otherId: string, on: boolean): Promise<void>;

  audit(accountId: string | null, kind: string, detail: any): Promise<void>;
  logClientError(e: { accountId: string | null; version: string; message: string; stack: string; ua: string; url: string }): Promise<void>;
  logChat(accountId: string, room: string, text: string): Promise<void>;
  counts(): Promise<{ accounts: number; saves: number; mail: number }>;
}
