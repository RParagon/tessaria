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
  /** Grava lápides (itens que saíram da conta por outro caminho, como o espólio dos Ermos pego por outro jogador). */
  addTombstones(accountId: string, itemIds: string[]): Promise<void>;
  /** Torneio de pesca: soma os pontos da semana e guarda a melhor pesca (a de mais pontos). */
  addFishCatch(week: number, accountId: string, points: number, fish: string, kg: number): Promise<number>;
  fishTop(week: number, n: number): Promise<FishScore[]>;
  fishMine(week: number, accountId: string): Promise<(FishScore & { rank: number; claimed: boolean }) | null>;
  /** Marca o prêmio da semana como resgatado (false se já estava). */
  claimFishPrize(week: number, accountId: string): Promise<boolean>;
  // ---------- mercado da vila e troca direta (mexem nos saves da nuvem, de forma atômica) ----------
  /** Tira o item da bolsa do vendedor (lápide) e cria o anúncio. */
  marketList(sellerId: string, sellerName: string, itemId: string, price: number, maxActive: number): Promise<{ ok: true; rev: number; id: number } | { ok: false; reason: 'sem-save' | 'sem-item' | 'equipado' | 'limite' }>;
  marketActive(limit: number): Promise<Listing[]>;
  marketMine(sellerId: string): Promise<Listing[]>;
  /** Cobra o comprador (Centelhas do save) e põe o item na bolsa dele. */
  marketBuy(buyerId: string, id: number): Promise<{ ok: true; rev: number; item: any; price: number } | { ok: false; reason: 'nao-encontrado' | 'vendido' | 'proprio' | 'sem-save' | 'sem-ouro' | 'bolsa-cheia' }>;
  /** Devolve o item do anúncio para a bolsa do vendedor. */
  marketCancel(sellerId: string, id: number): Promise<{ ok: true; rev: number; item: any } | { ok: false; reason: 'nao-encontrado' | 'vendido' | 'sem-save' | 'bolsa-cheia' }>;
  /** Paga ao vendedor o que já foi vendido e ainda não foi recebido (menos a taxa). */
  marketCollect(sellerId: string, tax: number): Promise<{ ok: true; rev: number; gold: number; n: number } | { ok: false; reason: 'nada' | 'sem-save' }>;
  /** Troca direta: itens (ids da bolsa) e Centelhas dos dois lados, tudo ou nada. */
  tradeExecute(aId: string, bId: string, aItems: string[], aGold: number, bItems: string[], bGold: number): Promise<{ ok: true; revA: number; revB: number; fromA: any[]; fromB: any[] } | { ok: false; reason: string }>;
  /** Histórico: registra uma troca feita e lista as trocas e as compras e vendas no mercado de uma conta (mais novas primeiro). */
  logTrade(e: { aId: string; bId: string; aName: string; bName: string; aItems: any[]; aGold: number; bItems: any[]; bGold: number }): Promise<void>;
  history(accountId: string, limit: number): Promise<HistoryEntry[]>;
  // ---------- temporada, passe, carteira e cosméticos (fonte de verdade no servidor) ----------
  seasonGet(accountId: string, season: number): Promise<SeasonRow>;
  /** Marca a missão como resgatada e soma a XP de passe (false se já estava). */
  seasonMission(accountId: string, season: number, missionId: string, xp: number): Promise<boolean>;
  /** Marca o nível da trilha como resgatado (false se já estava). */
  seasonClaim(accountId: string, season: number, level: number, track: 'free' | 'prem'): Promise<boolean>;
  /** Liga o premium gastando Fios Dourados (motivo se não deu). */
  seasonPremium(accountId: string, season: number, price: number): Promise<'ok' | 'ja' | 'sem-dourados'>;
  /** Soma (ou tira, se n < 0) Fios Dourados; false se o saldo ficaria negativo. */
  walletAdd(accountId: string, n: number): Promise<boolean>;
  /** Compra um cosmético com Fios Dourados (motivo se não deu). */
  buyCosmetic(accountId: string, id: string, price: number): Promise<'ok' | 'ja' | 'sem-dourados'>;
  grantCosmetic(accountId: string, id: string, source: string): Promise<void>;
  /** Entrada do dia: true e a sequência nova se ainda não entrou hoje. */
  loginClaim(accountId: string, day: number): Promise<{ ok: boolean; streak: number }>;
  /** Centelhas e Fios do Tear vão para o save da nuvem (como no mercado); devolve a revisão nova. */
  saveReward(accountId: string, centelhas: number, fios: number): Promise<number | null>;
  /** Registra itens sorteados pelo servidor. */
  grantItems(accountId: string, itemIds: string[], source: string): Promise<void>;
  /** Dos ids dados, os que o servidor concedeu (para qualquer conta). */
  granted(itemIds: string[]): Promise<string[]>;

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

export interface FishScore { name: string; points: number; bestFish: string; bestKg: number; bestPts: number }
export interface Listing { id: number; sellerName: string; item: any; price: number; createdAt: Date; sold: boolean; paid: boolean; buyerName?: string | null }
/** Entrada do histórico: troca (com quem, o que foi e veio, Centelhas líquidas) ou mercado (venda/compra). */
export interface HistoryEntry { kind: 'troca' | 'venda' | 'compra'; with: string; gave: string[]; got: string[]; gold: number; at: Date }
export interface SeasonRow { xp: number; premium: boolean; free: number[]; prem: number[]; missions: string[]; dourados: number; owned: string[]; streak: number; lastDay: number }
