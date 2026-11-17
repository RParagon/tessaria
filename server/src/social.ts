// Amigos e bloqueios: regras usadas pelas rotas HTTP e pelos comandos do chat.
// O grupo (party) fica no hub, porque vive só em memória enquanto o jogador está conectado.

import { BLOCKS_MAX, FRIENDS_MAX, FRIEND_REQ_DAYS, PENDING_MAX } from '../../shared/social';
import type { Account, Store } from './store/types';

export type SocialResult = { ok: true; state: 'enviado' | 'amigos' | 'ok'; other: Account } | { ok: false; code: number; error: string };

const NOBODY = 'Nenhum Tecelão com esse nome.';

export async function findAccount(store: Store, name: unknown): Promise<Account | null> {
  if (typeof name !== 'string' || !name.trim() || name.length > 32) return null;
  const a = await store.accountByName(name.trim());
  return a && !a.banned ? a : null;
}

/** Pedido de amizade. Se o outro já tinha pedido, a amizade é aceita na hora. */
export async function requestFriend(store: Store, me: Account, name: unknown): Promise<SocialResult> {
  const other = await findAccount(store, name);
  if (!other) return { ok: false, code: 404, error: NOBODY };
  if (other.id === me.id) return { ok: false, code: 422, error: 'Você não pode adicionar a si mesmo.' };
  // Bloqueio em qualquer sentido: a resposta é genérica, para não revelar quem bloqueou.
  if (await store.isBlocked(me.id, other.id)) return { ok: false, code: 409, error: 'Não foi possível enviar o pedido.' };
  const mine = await store.friendLinks(me.id, FRIEND_REQ_DAYS), link = mine.find(l => l.otherId === other.id);
  if (link?.state === 'amigo') return { ok: false, code: 409, error: `${other.name} já é seu amigo.` };
  if (link?.state === 'recebido') return acceptFriend(store, me, other.name);
  if (link?.state === 'enviado') return { ok: true, state: 'enviado', other };
  if (mine.filter(l => l.state === 'amigo').length >= FRIENDS_MAX) return { ok: false, code: 409, error: `Sua lista já tem ${FRIENDS_MAX} amigos.` };
  if (mine.filter(l => l.state === 'enviado').length >= PENDING_MAX) return { ok: false, code: 409, error: 'Você tem pedidos demais esperando resposta.' };
  const theirs = await store.friendLinks(other.id, FRIEND_REQ_DAYS);
  if (theirs.filter(l => l.state === 'amigo').length >= FRIENDS_MAX) return { ok: false, code: 409, error: `A lista de ${other.name} está cheia.` };
  // Um pedido antigo e expirado pode continuar na tabela: some antes de criar o novo.
  await store.removeFriend(me.id, other.id);
  await store.addFriendRequest(me.id, other.id);
  return { ok: true, state: 'enviado', other };
}

export async function acceptFriend(store: Store, me: Account, name: unknown): Promise<SocialResult> {
  const other = await findAccount(store, name);
  if (!other) return { ok: false, code: 404, error: NOBODY };
  const link = (await store.friendLinks(me.id, FRIEND_REQ_DAYS)).find(l => l.otherId === other.id);
  if (link?.state === 'amigo') return { ok: true, state: 'amigos', other };
  if (link?.state !== 'recebido') return { ok: false, code: 404, error: 'Esse pedido não existe mais.' };
  if ((await store.friendLinks(me.id, FRIEND_REQ_DAYS)).filter(l => l.state === 'amigo').length >= FRIENDS_MAX) return { ok: false, code: 409, error: `Sua lista já tem ${FRIENDS_MAX} amigos.` };
  if (!(await store.acceptFriend(me.id, other.id))) return { ok: false, code: 404, error: 'Esse pedido não existe mais.' };
  return { ok: true, state: 'amigos', other };
}

/** Remove amigo, recusa pedido recebido ou cancela pedido enviado. */
export async function removeFriend(store: Store, me: Account, name: unknown): Promise<SocialResult> {
  const other = await findAccount(store, name);
  if (!other) return { ok: false, code: 404, error: NOBODY };
  await store.removeFriend(me.id, other.id);
  return { ok: true, state: 'ok', other };
}

/** Bloquear também desfaz a amizade e os pedidos. */
export async function setBlock(store: Store, me: Account, name: unknown, on: boolean): Promise<SocialResult> {
  const other = await findAccount(store, name);
  if (!other) return { ok: false, code: 404, error: NOBODY };
  if (other.id === me.id) return { ok: false, code: 422, error: 'Você não pode bloquear a si mesmo.' };
  if (on) {
    if ((await store.blockedBy(me.id)).length >= BLOCKS_MAX) return { ok: false, code: 409, error: 'Sua lista de bloqueados está cheia.' };
    await store.removeFriend(me.id, other.id);
  }
  await store.setBlock(me.id, other.id, on);
  return { ok: true, state: 'ok', other };
}
