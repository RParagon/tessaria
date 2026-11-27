// Interface do modo online: painel de conta, escolha de progresso, chat,
// emotes e indicador de conexão. Tudo em DOM, no visual do jogo.

import type { Net, ChatLine } from './online';
import { EMOTES, EMOTE_LABEL, CHAT_MAX } from '../../shared/protocol';
import { nameProblem } from '../../shared/text';
import { PARTY_MAX, WHERE_LABEL } from '../../shared/social';
import { EMB_COLORS, EMB_SHAPES, EMB_SYMBOLS, GUILD_FOUND_COST, GUILD_FOUND_LVL, emblemSvg, guildNameProblem, guildTagProblem, type Emblem } from '../../shared/guild';

const $ = <T extends HTMLElement = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector(s) as T;
const h = (tag: string, attrs: Record<string, any> = {}, ...kids: Array<Node | string | null | false>) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) (el as any)[k] = v; else if (v === true) el.setAttribute(k, ''); else if (v !== false && v != null) el.setAttribute(k, String(v));
  }
  for (const c of kids) if (c) el.append(c);
  return el;
};
const game = () => (window as any).TessGame as {
  mode: string; region: string | null; save: any; readLocalSave(): any; writeLocalSave(s: any): void; useOnlineSlot(id: string): void; forgetOnline(id: string): void;
  startFromSave(s: any): void; newGame(): void; toTitle(): void; toast(a: string, big?: boolean, sub?: string, c?: string): void; sfx(k: string): void;
} | undefined;
const CLS: Record<string, string> = { lamina: 'Lâmina', arcano: 'Arcano', arco: 'Arco' };
const summary = (s: any) => s ? `${s.char?.name || 'Tecelão'} · Nv ${s.lvl} · ${CLS[s.char?.cls] || ''} · ${Math.round((s.time || 0) / 60)} min · ${s.gold ?? 0} Centelhas` : 'Nenhum progresso';

export function mountOnlineUI(net: Net) {
  if (!net.enabled) return;

  // ---------- botão no título ----------
  const btn = $<HTMLButtonElement>('#mOnline');
  const refreshTitle = () => { btn.hidden = false; btn.textContent = net.account ? `Continuar online · ${net.account.name}` : 'Jogar online'; };
  btn.onclick = () => { game()?.sfx('ui'); net.account ? openModal('conta') : openModal('entrar'); };
  refreshTitle();

  // ---------- painel (modal) ----------
  const modal = h('div', { class: 'net-modal', hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'netTitle' });
  const box = h('div', { class: 'net-box panel' });
  modal.append(box); document.body.append(modal);
  modal.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); e.stopPropagation(); });
  const closeModal = () => { modal.hidden = true; (document.activeElement as HTMLElement | null)?.blur?.(); };   // sem foco num botão, o Enter volta a abrir o chat
  let view = 'entrar', tab = 'entrar', busy = false;

  function field(label: string, id: string, type = 'text', extra: Record<string, any> = {}) {
    return h('label', { class: 'net-field', for: id }, label, h('input', { id, type, autocomplete: type === 'password' ? 'current-password' : 'off', spellcheck: 'false', ...extra }));
  }
  function msg(text: string, kind: 'erro' | 'ok' | 'info' = 'erro') { const m = $('#netMsg', box); if (m) { m.textContent = text; m.dataset.kind = kind; m.hidden = !text; } }
  async function act(fn: () => Promise<{ ok: boolean; error?: string }>, after: () => void) {
    if (busy) return; busy = true; msg('Conectando…', 'info');
    box.querySelectorAll('button').forEach(b => (b as HTMLButtonElement).disabled = true);
    const r = await fn(); busy = false;
    box.querySelectorAll('button').forEach(b => (b as HTMLButtonElement).disabled = false);
    if (!r.ok) { msg(r.error || 'Algo deu errado.'); return; }
    msg(''); after();
  }
  (window as any).TessNetUI = { report: () => { game()?.sfx('ui'); openModal('reportar'); } };
  function openModal(v: string) { view = v; render(); modal.hidden = false; setTimeout(() => (box.querySelector('input,button.gold') as HTMLElement | null)?.focus(), 30); }

  function download(name: string, text: string) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })), el = h('a', { href: url, download: name }) as HTMLAnchorElement;
    document.body.append(el); el.click(); el.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  function legalLinks() {
    return h('p', { class: 'sub net-legal' }, h('a', { href: 'privacidade.html', target: '_blank', rel: 'noopener', text: 'Política de Privacidade' }), ' · ', h('a', { href: 'termos.html', target: '_blank', rel: 'noopener', text: 'Termos de Uso' }));
  }
  function reportCtx() {
    const g = game() as any, s = g?.save;
    return { versao: String(document.querySelector('.ver')?.textContent ?? ''), modo: String(g?.mode ?? ''), regiao: String(g?.region ?? ''), nivel: Number(s?.lvl ?? 0), tela: `${innerWidth}x${innerHeight}`, toque: matchMedia('(pointer: coarse)').matches };
  }
  function render() {
    box.innerHTML = '';
    if (view === 'amigos') return renderFriends();
    if (view === 'guilda') return renderGuild();
    if (view === 'duelos') return renderDuels();
    const close = h('button', { class: 'net-x', 'aria-label': 'Fechar', onclick: closeModal, text: '✕' });
    if (view === 'entrar') {
      box.append(close, h('h2', { id: 'netTitle', text: 'Jogar online' }),
        h('p', { class: 'sub', text: 'Com uma conta, seu progresso fica salvo na nuvem, você encontra outros Tecelões na vila e troca itens pelo correio.' }));
      const tabs = h('div', { class: 'net-tabs', role: 'tablist' });
      for (const [k, l] of [['entrar', 'Entrar'], ['criar', 'Criar conta'], ['convidado', 'Convidado']]) tabs.append(h('button', { class: 'opt', role: 'tab', 'aria-pressed': String(tab === k), onclick: () => { tab = k; render(); }, text: l }));
      box.append(tabs);
      const form = h('form', { class: 'net-form', onsubmit: (e: Event) => { e.preventDefault(); submit(); } });
      if (tab === 'entrar') form.append(field('E-mail ou nome', 'netLogin', 'text', { maxlength: 254, autocomplete: 'username' }), field('Senha', 'netPass', 'password', { maxlength: 200 }), h('button', { class: 'px gold', type: 'submit', text: 'Entrar' }));
      if (tab === 'criar') form.append(field('Nome do Tecelão (aparece para todos)', 'netName', 'text', { maxlength: 16 }), field('E-mail', 'netEmail', 'email', { maxlength: 254, autocomplete: 'email' }), field('Senha (8+ caracteres, letras e números)', 'netPass', 'password', { maxlength: 200, autocomplete: 'new-password' }), h('button', { class: 'px gold', type: 'submit', text: 'Criar conta' }));
      if (tab === 'convidado') form.append(h('p', { class: 'sub', text: 'Entre sem cadastro. Seu progresso fica salvo neste aparelho e na nuvem; depois você protege a conta com e-mail e senha, sem perder nada.' }), h('button', { class: 'px gold', type: 'submit', text: 'Entrar como convidado' }));
      box.append(form, h('p', { id: 'netMsg', class: 'net-msg', hidden: true }));
      if (net.googleClientId) { const g = h('div', { id: 'netGoogle', class: 'net-google' }); box.append(h('div', { class: 'net-or', text: 'ou' }), g); mountGoogle(g); }
      box.append(h('button', { class: 'px net-alt', onclick: () => { closeModal(); }, text: 'Jogar offline' }), h('p', { class: 'sub net-legal' }, 'Ao criar uma conta, você aceita os ', h('a', { href: 'termos.html', target: '_blank', rel: 'noopener', text: 'Termos de Uso' }), ' e a ', h('a', { href: 'privacidade.html', target: '_blank', rel: 'noopener', text: 'Política de Privacidade' }), '.'));
    }
    if (view === 'conta' && net.account) {
      const a = net.account;
      box.append(close, h('h2', { id: 'netTitle', text: a.name }),
        h('p', { class: 'sub', text: a.guest ? 'Conta de convidado: proteja com e-mail e senha para não perder o progresso se trocar de aparelho.' : (a.email ? `Conta ${a.email}${a.google ? ' · Google' : ''}` : 'Conta Google') }),
        h('button', { class: 'px gold', onclick: () => chooseProgress(), text: 'Continuar online' }),
        h('button', { class: 'px', onclick: () => openModal('amigos'), text: 'Amigos' }), h('button', { class: 'px', onclick: () => { void net.guild(); openModal('guilda'); }, text: 'Guilda' }), h('button', { class: 'px', onclick: () => openModal('duelos'), text: 'Ranking de duelos' }));
      if (a.guest) {
        const f = h('form', { class: 'net-form', onsubmit: (e: Event) => { e.preventDefault(); act(() => net.upgrade(($('#netEmail', box) as HTMLInputElement).value, ($('#netPass', box) as HTMLInputElement).value, ($('#netName', box) as HTMLInputElement).value || undefined), () => { game()?.toast('CONTA PROTEGIDA', true, 'agora você entra com e-mail e senha'); render(); }); } },
          h('h3', { class: 'hsec', text: 'PROTEGER CONTA' }), field('Novo nome (opcional)', 'netName', 'text', { maxlength: 16, placeholder: a.name }), field('E-mail', 'netEmail', 'email', { maxlength: 254 }), field('Senha', 'netPass', 'password', { maxlength: 200, autocomplete: 'new-password' }), h('button', { class: 'px', type: 'submit', text: 'Proteger conta' }));
        box.append(f);
      } else {
        const f = h('form', { class: 'net-form net-inline', onsubmit: (e: Event) => { e.preventDefault(); const n = ($('#netName', box) as HTMLInputElement).value; const p = nameProblem(n); if (p) return msg(p); act(() => net.rename(n), () => { refreshTitle(); render(); msg('Nome alterado.', 'ok'); }); } },
          field('Trocar nome', 'netName', 'text', { maxlength: 16, placeholder: a.name }), h('button', { class: 'px', type: 'submit', text: 'Salvar' }));
        box.append(f);
      }
      box.append(h('p', { id: 'netMsg', class: 'net-msg', hidden: true }), h('button', { class: 'px net-alt', onclick: async () => { await net.logout(); refreshTitle(); closeModal(); game()?.toast('Você saiu da conta.'); }, text: 'Sair da conta' }));
      box.append(h('h3', { class: 'hsec', text: 'PRIVACIDADE' }),
        h('div', { class: 'net-row2' },
          h('button', { class: 'px', text: 'Baixar meus dados', onclick: () => act(async () => { const r = await net.exportData(); if (r.ok) download(`fios-de-tessaria-${a.name}.json`, JSON.stringify(r.data, null, 2)); return r; }, () => msg('Arquivo com os seus dados baixado.', 'ok')) }),
          h('button', { class: 'px', text: 'Reportar problema', onclick: () => openModal('reportar') }),
          h('button', { class: 'px danger', text: 'Excluir conta', onclick: () => openModal('excluir') })),
        legalLinks());
    }
    if (view === 'excluir' && net.account) {
      const a = net.account;
      box.append(close, h('h2', { id: 'netTitle', text: 'Excluir conta' }),
        h('p', { class: 'sub', text: `Isto apaga de vez a conta ${a.name}: o progresso na nuvem, os itens, os Fios Dourados e os cosméticos, os amigos, o correio e os anúncios no mercado. Não dá para desfazer. O progresso salvo neste aparelho (offline) continua aqui.` }),
        h('p', { class: 'sub', text: 'Os registros de pagamento ficam guardados pelo prazo exigido por lei, sem a ligação com a conta.' }));
      const f = h('form', { class: 'net-form', onsubmit: (e: Event) => { e.preventDefault(); const c = ($('#netDel', box) as HTMLInputElement).value, pw = ($('#netPass', box) as HTMLInputElement | null)?.value;
        const accId = a.id; act(() => net.deleteAccount(c, pw || undefined), () => { game()?.forgetOnline(accId); refreshTitle(); closeModal(); game()?.toast('Conta excluída', true, 'OBRIGADO POR TER JOGADO'); if (game()?.mode !== 'title') game()?.toTitle(); }); } },
        field(`Digite o nome do Tecelão (${a.name}) para confirmar`, 'netDel', 'text', { maxlength: 40 }),
        a.password ? field('Senha da conta', 'netPass', 'password', { maxlength: 200 }) : null,
        h('button', { class: 'px danger', type: 'submit', text: 'Excluir minha conta para sempre' }));
      box.append(f, h('p', { id: 'netMsg', class: 'net-msg', hidden: true }), h('button', { class: 'px net-alt', onclick: () => openModal('conta'), text: 'Voltar' }));
    }
    if (view === 'reportar') {
      box.append(close, h('h2', { id: 'netTitle', text: 'Reportar problema' }),
        h('p', { class: 'sub', text: 'Conte o que aconteceu. Vamos ler tudo. Para reportar um jogador, escreva o nome do Tecelão.' }));
      const sel = h('select', { id: 'netRepKind' }) as HTMLSelectElement;
      for (const [k, l] of [['bug', 'Erro no jogo'], ['jogador', 'Comportamento de um jogador'], ['pagamento', 'Pagamento ou Fios Dourados'], ['outro', 'Outro assunto']]) sel.append(h('option', { value: k, text: l }));
      const ta = h('textarea', { id: 'netRepText', maxlength: 1500, rows: 5, placeholder: 'O que aconteceu? Onde você estava? Dá para repetir?' }) as HTMLTextAreaElement;
      const f = h('form', { class: 'net-form', onsubmit: (e: Event) => { e.preventDefault(); const t = ($('#netRepWho', box) as HTMLInputElement).value.trim();
        if (ta.value.trim().length < 5) return msg('Escreva um pouco mais (5 letras ou mais).');
        act(() => net.report(sel.value as any, ta.value, t || undefined, reportCtx()), () => { closeModal(); game()?.toast('Reporte enviado', false, 'OBRIGADO! VAMOS ANALISAR'); }); } },
        h('label', { class: 'net-field', for: 'netRepKind' }, 'Assunto', sel), field('Tecelão (opcional)', 'netRepWho', 'text', { maxlength: 16 }),
        h('label', { class: 'net-field', for: 'netRepText' }, 'Descrição', ta), h('button', { class: 'px gold', type: 'submit', text: 'Enviar' }));
      box.append(f, h('p', { id: 'netMsg', class: 'net-msg', hidden: true }));
    }
  }

  function renderFriends() {
    const close = h('button', { class: 'net-x', 'aria-label': 'Fechar', onclick: closeModal, text: '✕' });
    const L = net.friendsList;
    box.append(close, h('h2', { id: 'netTitle', text: 'Amigos' }));
    const add = h('form', { class: 'net-form net-inline', onsubmit: (e: Event) => { e.preventDefault(); const n = ($('#netFriend', box) as HTMLInputElement).value.trim(); if (!n) return; act(() => net.addFriend(n), () => { renderSoon(); msg(net.isFriend(n) ? `${n} agora é seu amigo.` : `Pedido enviado para ${n}.`, 'ok'); }); } },
      field('Adicionar pelo nome do Tecelão', 'netFriend', 'text', { maxlength: 16 }), h('button', { class: 'px', type: 'submit', text: 'Pedir' }));
    box.append(add, h('p', { id: 'netMsg', class: 'net-msg', hidden: true }));
    if (!L) { box.append(h('p', { class: 'sub', text: 'Carregando…' })); void net.friends().then(() => { if (!modal.hidden && view === 'amigos') render(); }); return; }
    const row = (title: string, sub: string, online: boolean | null, ...btns: HTMLElement[]) =>
      h('div', { class: 'net-frow' + (online ? ' on' : '') }, h('div', { class: 'nm' }, h('b', { text: (online === null ? '' : online ? '● ' : '○ ') + title }), h('small', { text: sub })), h('div', { class: 'act' }, ...btns));
    const b = (text: string, fn: () => Promise<{ ok: boolean; error?: string }> | void, gold = false) => h('button', { class: 'px' + (gold ? ' gold' : ''), text, onclick: () => { const r = fn(); if (r) act(() => r, renderSoon); } });
    if (L.incoming.length) {
      box.append(h('h3', { class: 'hsec', text: 'PEDIDOS RECEBIDOS' }));
      for (const f of L.incoming) box.append(row(f.name, 'quer ser seu amigo', null, b('Aceitar', () => net.acceptFriend(f.name), true), b('Recusar', () => net.removeFriend(f.name))));
    }
    box.append(h('h3', { class: 'hsec', text: `AMIGOS (${L.friends.length})` }));
    if (!L.friends.length) box.append(h('p', { class: 'sub', text: 'Toque no nome de alguém na vila para adicionar, ou peça pelo nome acima.' }));
    for (const f of L.friends) {
      const sub = f.online ? [f.where, f.title].filter(Boolean).join(' · ') : 'offline' + (f.lastSeen ? ' · visto ' + ago(f.lastSeen) : '');
      const inParty = !!net.party?.members.some(m => m.name === f.name);
      const btns = [f.online && !inParty && (!net.party || net.isLeader) ? b('Convidar', () => { net.invite(f.name); msg(`Convite enviado para ${f.name}.`, 'ok'); }, true) : null,
        confirmBtn('Remover', `Remover ${f.name}?`, () => net.removeFriend(f.name))].filter(Boolean) as HTMLElement[];
      box.append(row(f.name, sub, f.online, ...btns));
    }
    if (L.outgoing.length) {
      box.append(h('h3', { class: 'hsec', text: 'PEDIDOS ENVIADOS' }));
      for (const f of L.outgoing) box.append(row(f.name, 'esperando resposta', null, b('Cancelar', () => net.removeFriend(f.name))));
    }
    if (L.blocked.length) {
      box.append(h('h3', { class: 'hsec', text: 'BLOQUEADOS' }));
      for (const f of L.blocked) box.append(row(f.name, 'não pode pedir amizade, convidar nem falar com você', null, b('Desbloquear', () => net.unblock(f.name))));
    }
  }
  // ---------- ranking dos duelos ----------
  let duelData: any = null;
  function renderDuels() {
    const close = h('button', { class: 'net-x', 'aria-label': 'Fechar', onclick: closeModal, text: '✕' });
    box.append(close, h('h2', { id: 'netTitle', text: 'Ranking de duelos' }), h('p', { class: 'sub', text: 'Desafie alguém na vila tocando no nome dele. Ninguém morre: quem cair primeiro perde. Cada dupla conta no ranking até 3 vezes por dia.' }));
    if (!duelData) { box.append(h('p', { class: 'sub', text: 'Carregando…' })); void net.duels().then(d => { duelData = d || { top: [], me: null }; if (!modal.hidden && view === 'duelos') render(); }); return; }
    const me = duelData.me;
    if (me) box.append(h('div', { class: 'net-frow on' }, h('div', { class: 'nm' }, h('b', { text: `Você: ${me.rating}` }), h('small', { text: `${me.wins} vitórias · ${me.losses} derrotas` + (me.rank ? ` · ${me.rank}º lugar` : ' · ainda sem duelos') }))));
    box.append(h('h3', { class: 'hsec', text: 'MELHORES DA TESSÁRIA' }));
    if (!duelData.top.length) box.append(h('p', { class: 'sub', text: 'Ninguém duelou ainda. Seja o primeiro!' }));
    duelData.top.forEach((r: any, i: number) => box.append(h('div', { class: 'net-frow' }, h('div', { class: 'nm' }, h('b', { text: `${i + 1}º ${r.name}` }), h('small', { text: `${r.rating} · ${r.wins}V ${r.losses}D` })))));
    duelData = null;   // da próxima vez, recarrega
  }
  // ---------- guilda ----------
  let emb: Emblem = { shape: 0, color: 2, symbol: 0 };
  /** Fundar e doar tiram Centelhas do save da nuvem: espelha no save local (o servidor já gravou). */
  function spentGold(n: number) { const g = game(); if (!g?.save || !n) return; g.save.gold = Math.max(0, (g.save.gold || 0) - n); g.save.spent = (g.save.spent || 0) + n; g.writeLocalSave(g.save); }
  function embPicker(onChange: () => void) {
    const wrap = h('div', { class: 'net-emb' }), prev = h('span', { class: 'net-embprev' }); prev.innerHTML = emblemSvg(emb, 56);
    const sel = (label: string, opts: string[], key: keyof Emblem) => {
      const el = h('select', { 'aria-label': label }) as HTMLSelectElement; opts.forEach((o, i) => el.append(h('option', { value: String(i), text: o })));
      el.value = String(emb[key]); el.onchange = () => { emb = { ...emb, [key]: Number(el.value) }; prev.innerHTML = emblemSvg(emb, 56); onChange(); };
      return h('label', { class: 'net-field' }, label, el);
    };
    wrap.append(prev, h('div', { class: 'net-embsel' }, sel('Forma', EMB_SHAPES, 'shape'), sel('Cor', EMB_COLORS.map((_, i) => `Cor ${i + 1}`), 'color'), sel('Símbolo', EMB_SYMBOLS, 'symbol')));
    return wrap;
  }
  function renderGuild() {
    const close = h('button', { class: 'net-x', 'aria-label': 'Fechar', onclick: closeModal, text: '✕' });
    const V = net.guildView;
    if (!V) { box.append(close, h('h2', { id: 'netTitle', text: 'Guilda' }), h('p', { class: 'sub', text: 'Carregando…' })); void net.guild().then(() => { if (!modal.hidden && view === 'guilda') render(); }); return; }
    const b = (text: string, fn: () => Promise<{ ok: boolean; error?: string }>, gold = false) => h('button', { class: 'px' + (gold ? ' gold' : ''), text, onclick: () => act(fn, renderSoon) });
    if (!V.guild) {
      box.append(close, h('h2', { id: 'netTitle', text: 'Guilda' }), h('p', { class: 'sub', text: 'Jogue junto com uma turma fixa: chat próprio (/gu), sigla e emblema ao lado do nome e Fios da Guilda, que vão erguer a Ilha da Guilda.' }));
      if (V.invites.length) {
        box.append(h('h3', { class: 'hsec', text: 'CONVITES' }));
        for (const i of V.invites) { const ic = h('span', { class: 'net-embico' }); ic.innerHTML = emblemSvg(i.emblem, 28);
          box.append(h('div', { class: 'net-frow' }, h('div', { class: 'nm' }, ic, h('b', { text: `${i.name} [${i.tag}]` }), h('small', { text: `convite de ${i.fromName}` })), h('div', { class: 'act' }, b('Entrar', () => net.guildAccept(i.guildId), true), b('Recusar', () => net.guildDecline(i.guildId))))); }
      }
      box.append(h('h3', { class: 'hsec', text: 'FUNDAR UMA GUILDA' }), h('p', { class: 'sub', text: `Custa ${GUILD_FOUND_COST.toLocaleString('pt-BR')} Centelhas e pede nível ${GUILD_FOUND_LVL}. Você vira o Líder.` }));
      const f = h('form', { class: 'net-form', onsubmit: (e: Event) => { e.preventDefault();
        const n = ($('#netGName', box) as HTMLInputElement).value, t = ($('#netGTag', box) as HTMLInputElement).value;
        const p = guildNameProblem(n) || guildTagProblem(t); if (p) return msg(p);
        act(async () => { const r = await net.guildFound(n, t, emb); if (r.ok) spentGold(Number(r.data?.gold) || GUILD_FOUND_COST); return r; }, () => { game()?.toast('Guilda fundada!', true, n.toUpperCase(), '#ffd27a'); game()?.sfx('legend'); render(); }); } },
        field('Nome da guilda (3 a 20)', 'netGName', 'text', { maxlength: 20 }), field('Sigla (2 a 4 letras)', 'netGTag', 'text', { maxlength: 4 }), embPicker(() => {}),
        h('button', { class: 'px gold', type: 'submit', text: `Fundar (${GUILD_FOUND_COST.toLocaleString('pt-BR')} ✦)` }));
      box.append(f, h('p', { id: 'netMsg', class: 'net-msg', hidden: true }));
      return;
    }
    const G = V.guild, role = V.me.role, mgr = role === 'lider' || role === 'oficial';
    const head = h('div', { class: 'net-ghead' }), ic = h('span', { class: 'net-embico big' }); ic.innerHTML = emblemSvg(G.emblem, 56);
    const pct = Math.round(Math.min(1, (G.fios - G.cur) / Math.max(1, G.next - G.cur)) * 100);
    head.append(ic, h('div', {}, h('h2', { id: 'netTitle', text: `${G.name} [${G.tag}]` }), h('small', { text: `Nível ${G.level} · ${G.fios.toLocaleString('pt-BR')} Fios da Guilda · ${G.members.length}/${G.max} membros` }), h('div', { class: 'fbar' }, h('i', { style: `width:${pct}%` }))));
    box.append(close, head);
    box.append(h('p', { class: 'sub net-motd', text: G.motd ? '📜 ' + G.motd : (mgr ? 'Sem recado do dia. Escreva um abaixo.' : 'Sem recado do dia.') }));
    if (mgr) box.append(h('form', { class: 'net-form net-inline', onsubmit: (e: Event) => { e.preventDefault(); act(() => net.guildMotd(($('#netMotd', box) as HTMLInputElement).value), renderSoon); } }, field('Recado do dia', 'netMotd', 'text', { maxlength: 140, value: G.motd }), h('button', { class: 'px', type: 'submit', text: 'Salvar' })));
    box.append(h('p', { id: 'netMsg', class: 'net-msg', hidden: true }));
    // membros
    box.append(h('h3', { class: 'hsec', text: `MEMBROS · CONTRIBUIÇÃO DA SEMANA` }));
    const sorted = [...G.members].sort((x: any, y: any) => ({ lider: 0, oficial: 1, membro: 2 } as any)[x.role] - ({ lider: 0, oficial: 1, membro: 2 } as any)[y.role] || y.weekFios - x.weekFios);
    for (const m of sorted) {
      const me = m.name === net.account?.name, btns: HTMLElement[] = [];
      if (!me && role === 'lider') {
        if (m.role === 'membro') btns.push(b('Promover', () => net.guildRole(m.name, 'oficial')));
        if (m.role === 'oficial') btns.push(b('Rebaixar', () => net.guildRole(m.name, 'membro')), confirmBtn('Tornar Líder', `Passar a liderança para ${m.name}?`, () => net.guildRole(m.name, 'lider')));
      }
      if (!me && mgr && m.role === 'membro' || (!me && role === 'lider' && m.role === 'oficial')) btns.push(confirmBtn('Expulsar', `Expulsar ${m.name}?`, () => net.guildKick(m.name)));
      box.append(h('div', { class: 'net-frow' + (m.online ? ' on' : '') }, h('div', { class: 'nm' }, h('b', { text: (m.online ? '● ' : '○ ') + m.name + (me ? ' (você)' : '') }), h('small', { text: `${m.roleN} · ${m.weekFios} Fios esta semana · ${m.totalFios} no total` })), h('div', { class: 'act' }, ...btns)));
    }
    if (mgr) box.append(h('form', { class: 'net-form net-inline', onsubmit: (e: Event) => { e.preventDefault(); const n = ($('#netGInv', box) as HTMLInputElement).value.trim(); if (!n) return; act(() => net.guildInvite(n), () => msg(`Convite enviado para ${n}.`, 'ok')); } },
      field('Convidar pelo nome do Tecelão', 'netGInv', 'text', { maxlength: 16 }), h('button', { class: 'px', type: 'submit', text: 'Convidar' })));
    // doar
    box.append(h('h3', { class: 'hsec', text: 'CONTRIBUIR' }), h('p', { class: 'sub', text: `Missões do Passe contam sozinhas (10 por diária, 60 por semanal). Doar: 1 Fio a cada ${V.rules.donatePer} Centelhas, até ${V.rules.donateDayMax} Fios por dia.` }),
      h('form', { class: 'net-form net-inline', onsubmit: (e: Event) => { e.preventDefault(); const v = Math.floor(Number(($('#netGDon', box) as HTMLInputElement).value)); if (!(v >= V.rules.donatePer)) return msg(`Doe pelo menos ${V.rules.donatePer} Centelhas.`);
        act(async () => { const r = await net.guildDonate(v); if (r.ok) { spentGold(Number(r.data?.gold) || 0); game()?.toast(`+${r.data?.fios} Fios da Guilda`, false, 'OBRIGADO!', '#ffd27a'); } return r; }, render); } },
        field('Centelhas para doar', 'netGDon', 'number', { min: V.rules.donatePer, step: V.rules.donatePer, value: '1000' }), h('button', { class: 'px gold', type: 'submit', text: 'Doar' })));
    if (role === 'lider') { box.append(h('h3', { class: 'hsec', text: 'EMBLEMA' })); emb = { ...G.emblem }; box.append(embPicker(() => {}), b('Salvar emblema', () => net.guildEmblem(emb))); }
    // registro
    if (G.log?.length) {
      box.append(h('h3', { class: 'hsec', text: 'REGISTRO' }));
      const L: Record<string, (d: any) => string> = { fundada: d => `${d.nome} fundou a guilda`, entrou: d => `${d.nome} entrou`, saiu: d => `${d.nome} saiu` + (d.lider ? ` (${d.lider} virou Líder)` : ''), expulso: d => `${d.nome} foi removido por ${d.por}`, convite: d => `${d.por} convidou ${d.nome}`, cargo: d => `${d.nome} agora é ${({ lider: 'Líder', oficial: 'Oficial', membro: 'Membro' } as any)[d.cargo]}`, doacao: d => `${d.nome} doou ${d.centelhas} Centelhas (+${d.fios} Fios)` };
      const ul = h('ul', { class: 'net-glog' }); for (const e of G.log.slice(0, 10)) ul.append(h('li', { text: `${(L[e.kind] ?? (() => e.kind))(e.detail)} · ${ago(e.at)}` })); box.append(ul);
    }
    box.append(confirmBtn('Sair da guilda', role === 'lider' ? 'Sair? A liderança passa para outro membro.' : 'Sair da guilda? Você espera 24 h para entrar em outra.', () => net.guildLeave()));
  }
  function confirmBtn(text: string, ask: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    let armed = false;
    const el = h('button', { class: 'px', text, onclick: () => { if (!armed) { armed = true; el.textContent = 'Confirmar'; el.title = ask; setTimeout(() => { armed = false; el.textContent = text; }, 3000); return; } act(fn, renderSoon); } });
    return el;
  }
  const renderSoon = () => { if (!modal.hidden && view === 'amigos') render(); };
  function ago(iso: string) {
    const m = Math.max(0, (Date.now() - Date.parse(iso)) / 60000);
    return m < 2 ? 'agora há pouco' : m < 60 ? `há ${Math.round(m)} min` : m < 48 * 60 ? `há ${Math.round(m / 60)} h` : `há ${Math.round(m / 1440)} dias`;
  }

  // ---------- login com Google (Google Identity Services) ----------
  function mountGoogle(el: HTMLElement) {
    const go = () => {
      const g = (window as any).google?.accounts?.id; if (!g) return;
      g.initialize({ client_id: net.googleClientId, callback: (r: any) => act(() => net.google(r.credential), afterLogin) });
      g.renderButton(el, { theme: 'filled_black', size: 'large', text: 'continue_with', locale: 'pt-BR' });
    };
    if ((window as any).google?.accounts?.id) return go();
    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = go; document.head.append(s);
  }

  function submit() {
    if (tab === 'entrar') act(() => net.login(($('#netLogin', box) as HTMLInputElement).value.trim(), ($('#netPass', box) as HTMLInputElement).value), afterLogin);
    if (tab === 'criar') {
      const name = ($('#netName', box) as HTMLInputElement).value.trim(), p = nameProblem(name);
      if (p) return msg(p);
      act(() => net.register(name, ($('#netEmail', box) as HTMLInputElement).value.trim(), ($('#netPass', box) as HTMLInputElement).value), afterLogin);
    }
    if (tab === 'convidado') act(() => net.guest(), afterLogin);
  }
  function afterLogin() { refreshTitle(); game()?.toast(`Bem-vindo, ${net.account?.name}!`, false, 'CONECTADO'); chooseProgress(); }

  // ---------- escolha de progresso ----------
  /** preferCloud: depois de recusa/conflito, carrega direto o que está na nuvem (se houver). */
  async function chooseProgress(preferCloud = false) {
    view = 'progresso'; modal.hidden = false; box.innerHTML = '';
    if (net.account) game()?.useOnlineSlot(net.account.id);   // o online usa só o save da conta (nunca o offline)
    box.append(h('h2', { id: 'netTitle', text: 'Seu progresso' }), h('p', { class: 'sub', text: 'Buscando seu progresso na nuvem…' }));
    const cloud = await net.cloudSave(), local = preferCloud && cloud.ok && cloud.data ? null : game()?.readLocalSave();
    box.innerHTML = '';
    const close = h('button', { class: 'net-x', 'aria-label': 'Fechar', onclick: closeModal, text: '✕' });
    box.append(close, h('h2', { id: 'netTitle', text: 'Seu progresso' }));
    if (!cloud.ok) { box.append(h('p', { class: 'net-msg', 'data-kind': 'erro', text: cloud.error || 'Falha ao buscar o progresso.' }), h('button', { class: 'px gold', onclick: () => chooseProgress(preferCloud), text: 'Tentar de novo' })); return; }
    const start = (data: any, rev: number) => { net.adopt(rev); game()?.writeLocalSave(data); closeModal(); game()?.startFromSave(data); };
    const card = (title: string, s: any) => h('div', { class: 'net-card' }, h('b', { text: title }), h('span', { text: summary(s) }));
    if (cloud.data) {
      // Mesmo progresso: o aparelho costuma estar só alguns segundos à frente (o envio à nuvem é agrupado). Só pergunta se mudou de verdade.
      const same = local && local.lvl === cloud.data.lvl && local.gold === cloud.data.gold && local.xp === cloud.data.xp && Math.abs((local.time || 0) - (cloud.data.time || 0)) < 300;
      if (!local || same) return start(cloud.data, cloud.rev);
      box.append(h('p', { class: 'sub', text: 'Este aparelho guardou um progresso desta conta diferente do que está na nuvem (talvez a conexão caiu antes de salvar). Qual você quer usar?' }),
        card('NA NUVEM', cloud.data), card('NESTE APARELHO (DESTA CONTA)', local),
        h('button', { class: 'px gold', onclick: () => start(cloud.data, cloud.rev), text: 'Usar o da nuvem' }),
        h('button', { class: 'px', onclick: () => act(async () => { const r = await net.putNow(local, cloud.rev); return r.ok ? { ok: true } : { ok: false, error: (r.erros && r.erros.length ? 'O servidor recusou: ' + r.erros[0] : r.error) + ' Use o progresso da nuvem.' }; }, () => start(local, net.rev)), text: 'Enviar o deste aparelho para a nuvem' }));
      let confirm = false;
      const del = h('button', { class: 'net-link', onclick: () => {
        if (!confirm) { confirm = true; del.textContent = 'Tem certeza? Isso apaga o progresso da nuvem para sempre. Clique de novo.'; return; }
        act(() => net.resetCloud(), () => { net.adopt(0); closeModal(); game()?.newGame(); });
      }, text: 'Apagar o progresso da nuvem e começar do zero' });
      box.append(del);
    } else if (local) {
      box.append(h('p', { class: 'sub', text: 'A nuvem ainda não tem o progresso desta conta, mas este aparelho guardou um. Quer enviá-lo?' }), card('NESTE APARELHO (DESTA CONTA)', local),
        h('button', { class: 'px gold', onclick: () => act(async () => { const r = await net.putNow(local, 0); return r.ok ? { ok: true } : { ok: false, error: r.erros && r.erros.length ? 'O servidor recusou este progresso: ' + r.erros[0] : r.error }; }, () => start(local, net.rev)), text: 'Levar este progresso' }),
        h('button', { class: 'px', onclick: () => { net.adopt(0); closeModal(); game()?.newGame(); }, text: 'Começar uma aventura nova' }));
    } else { net.adopt(0); closeModal(); game()?.newGame(); return; }
    box.append(h('p', { id: 'netMsg', class: 'net-msg', hidden: true }));
  }

  // ---------- avisos de sincronização ----------
  function problemView(title: string, text: string, list: string[] = []) {
    view = 'problema'; modal.hidden = false; box.innerHTML = '';
    box.append(h('h2', { id: 'netTitle', text: title }), h('p', { class: 'sub', text }));
    if (list.length) { const ul = h('ul', { class: 'net-list' }); list.slice(0, 4).forEach(t => ul.append(h('li', { text: t }))); box.append(ul); }
    box.append(h('button', { class: 'px gold', onclick: () => chooseProgress(true), text: 'Carregar o progresso da nuvem' }),
      h('button', { class: 'px', onclick: () => { net.offline = true; net.leaveHub(); closeModal(); game()?.toast('Jogando offline', false, 'O PROGRESSO NÃO SERÁ ENVIADO'); }, text: 'Continuar offline' }));
  }
  net.on((ev, data) => {
    if (ev === 'account') refreshTitle();
    if (ev === 'rejected') problemView('Progresso recusado', 'O servidor recusou o seu progresso. Isso acontece quando o save foi alterado fora do jogo, ou por algum erro nosso. Se for erro, avise a gente.', data);
    if (ev === 'conflict') problemView('Progresso em outro lugar', 'Sua conta salvou progresso em outro aparelho ou aba. Para não perder nada, carregue o progresso da nuvem.');
    if (ev === 'expired') { game()?.toast('Sessão expirada', false, 'ENTRE DE NOVO PARA CONTINUAR ONLINE'); refreshTitle(); }
    if (ev === 'kick') game()?.toast(String(data), false, 'DESCONECTADO DA VILA');
    updateChip();
  });

  // ---------- chip de status, chat e emotes ----------
  const chip = h('div', { class: 'net-chip', hidden: true });
  const chat = h('div', { class: 'net-chat', hidden: true });
  const log = h('div', { class: 'net-log', 'aria-live': 'polite' });
  const input = h('input', { class: 'net-input', type: 'text', maxlength: CHAT_MAX, placeholder: 'Mensagem (Enter envia, Esc fecha)', hidden: true, autocomplete: 'off', 'aria-label': 'Mensagem do chat' }) as HTMLInputElement;
  const emotes = h('div', { class: 'net-emotes', hidden: true });
  for (const e of EMOTES) emotes.append(h('button', { class: 'px', onclick: () => { net.emote(e); input.focus(); }, text: EMOTE_LABEL[e] }));
  const chatBtn = h('button', { class: 'px net-chatbtn', hidden: true, 'aria-label': 'Abrir o chat', onclick: () => openChat(), text: 'Chat' });
  chat.append(log, emotes, input);
  const hud = document.querySelector('#hud') || document.body;
  // Chat e Amigos lado a lado numa fileira (antes, Amigos tinha posição fixa e cobria o Chat)
  const btnRow = h('div', { class: 'net-btns' });
  hud.append(chat, btnRow); btnRow.append(chatBtn); (document.querySelector('.hud-l') || hud).append(chip);

  const playing = () => { const g = game(); return !!(g && (g.mode === 'play' || g.mode === 'dialog')); };
  const inHub = () => { const g = game(); return !!(g && g.region === 'hub' && playing() && net.inRoom); };
  /** O chat abre na vila, e fora dela quando há grupo (aí vai para o grupo). */
  // O chat funciona em qualquer lugar: cada ambiente tem o seu (vila e Ermos por raio; taverna, casas e regiões por lugar).
  const chatOk = () => playing() && net.connected;
  const chanName = () => { const g = game(), r = g?.region ?? ''; return r === 'hub' ? 'Vila' : r === 'wilds' ? 'Ermos' : WHERE_LABEL[r] ?? 'Tessária'; };
  function updateChip() {
    const g = game(), on = g && (g.mode === 'play' || g.mode === 'dialog' || g.mode === 'menu') && !!net.account && !net.offline;
    chip.hidden = !on;
    if (on) {
      const s = ({ salvo: '☁ salvo', pendente: '☁ salvando…', enviando: '☁ salvando…', recusado: '⚠ não salvo', conflito: '⚠ conflito', 'sem-rede': '⚠ sem conexão', desligado: '' } as Record<string, string>)[net.sync] || '';
      const hubTxt = g!.region === 'hub' ? (net.inRoom ? `● ${net.room} · ${net.players().length + 1} online` : '○ conectando…') : '';
      chip.textContent = [hubTxt, s].filter(Boolean).join('  ');
      chip.dataset.state = net.sync;
    }
    const ok = chatOk();
    chat.hidden = !ok; chatBtn.hidden = !ok || !input.hidden;
    friendsBtn.hidden = !(on && playing() && net.connected); guildBtn.hidden = friendsBtn.hidden;
    { const r = game()?.region, open = r === 'hub' || r === 'wilds' || (r === 'rift' && !!net.inst);
      input.placeholder = `${chanName()}: ${open ? 'quem estiver perto ouve' : 'quem estiver aqui ouve'} · /g grupo · /gu guilda`; }
    emotes.hidden = input.hidden || !(net.inRoom && playing());
    if (!ok && !input.hidden) closeChat();
    renderParty();
  }
  function openChat() { if (!chatOk()) return; input.hidden = false; emotes.hidden = !(net.inRoom && playing()); chat.classList.add('open'); chatBtn.hidden = true; input.focus(); }
  function closeChat() { input.hidden = true; emotes.hidden = true; chat.classList.remove('open'); input.blur(); updateChip(); }
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { const t = input.value.trim(); if (t) net.chat(t); input.value = ''; if (!t) closeChat(); e.preventDefault(); }   // chat local em qualquer lugar; /g fala com o grupo
    else if (e.key === 'Escape') { closeChat(); e.preventDefault(); }
    e.stopPropagation();
  });
  addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.hidden && chatOk() && game()?.mode === 'play' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); openChat(); }
  });

  // ---------- amigos e grupo no HUD ----------
  const friendsBtn = h('button', { class: 'px net-friendsbtn', hidden: true, 'aria-label': 'Amigos', onclick: () => { game()?.sfx('ui'); openModal('amigos'); }, text: 'Amigos' });
  const partyBox = h('div', { class: 'net-party', hidden: true, 'aria-label': 'Grupo' });
  // o grupo entra no fluxo da coluna da esquerda, abaixo do objetivo e do status (antes cobria os dois)
  const guildBtn = h('button', { class: 'px net-friendsbtn', hidden: true, 'aria-label': 'Guilda', onclick: () => { game()?.sfx('ui'); void net.guild(); openModal('guilda'); }, text: 'Guilda' });
  btnRow.append(friendsBtn, guildBtn); (document.querySelector('.hud-l') || hud).append(partyBox);
  let partyKey = '';
  function renderParty() {
    const pt = net.party, show = !!pt && playing();
    partyBox.hidden = !show; if (!show) { partyKey = ''; return; }
    const key = JSON.stringify([pt, net.inst]); if (key === partyKey) return; partyKey = key;
    partyBox.innerHTML = '';
    partyBox.append(h('div', { class: 'net-ptitle', text: `GRUPO ${pt!.members.length}/${PARTY_MAX}` }));
    for (const m of pt!.members) {
      const me = m.name === net.account?.name;
      const el = h('button', { class: 'net-pm' + (m.online ? '' : ' off') + (me ? ' me' : ''), onclick: (e: MouseEvent) => partyMenu(m.name, me, e) },
        h('b', { text: (m.leader ? '★ ' : '') + m.name }), h('small', { text: `${CLS[m.cls] || ''} Nv ${m.lvl} · ${m.online ? m.where : 'caiu da conexão'}` }));
      partyBox.append(el);
    }
    // Fenda aberta pelo grupo: quem não está nela pode entrar (aparece no início)
    const ins = pt!.inst;
    if (ins && net.inst !== ins.id) partyBox.append(h('button', { class: 'px gold net-pjoin', text: ins.kind === 'wilds' ? `Entrar nos Ermos do grupo (${ins.n}/4)` : `Entrar na Fenda ${ins.L} do grupo (${ins.n}/4)`, onclick: () => { game()?.sfx('ui'); net.joinInst(ins.id); } }));
  }
  function partyMenu(name: string, me: boolean, e: MouseEvent) {
    const items: Array<[string, () => void]> = [];
    if (me) items.push(['Sair do grupo', () => net.leaveParty()]);
    else {
      if (net.isLeader) items.push(['Passar a liderança', () => net.lead(name)], ['Tirar do grupo', () => net.kick(name)]);
      if (!net.isFriend(name)) items.push(['Adicionar amigo', () => void friendAct(() => net.addFriend(name), `Pedido enviado para ${name}.`)]);
    }
    popMenu(name, items, e.clientX, e.clientY);
  }

  // menu flutuante (tocar no nome de alguém na vila ou no painel do grupo)
  const pop = h('div', { class: 'net-pop panel', hidden: true, role: 'menu' });
  document.body.append(pop);
  const closePop = () => { pop.hidden = true; };
  addEventListener('pointerdown', e => { if (!pop.hidden && !pop.contains(e.target as Node)) closePop(); }, true);
  function popMenu(title: string, items: Array<[string, () => void]>, x: number, y: number) {
    if (!items.length) return;
    pop.innerHTML = ''; pop.append(h('b', { text: title }));
    for (const [label, fn] of items) pop.append(h('button', { class: 'px', role: 'menuitem', text: label, onclick: () => { game()?.sfx('ui'); closePop(); fn(); } }));
    pop.hidden = false;
    const r = pop.getBoundingClientRect();
    pop.style.left = Math.max(8, Math.min(innerWidth - r.width - 8, x - r.width / 2)) + 'px';
    pop.style.top = Math.max(8, Math.min(innerHeight - r.height - 8, y + 12)) + 'px';
  }
  async function friendAct(fn: () => Promise<{ ok: boolean; error?: string; state?: string }>, okText: string) {
    const r = await fn();
    game()?.toast(r.ok ? (r.state === 'amigos' ? 'Agora vocês são amigos.' : okText) : (r.error || 'Algo deu errado.'), false, 'AMIGOS', r.ok ? undefined : '#ff8a6a');
  }
  document.addEventListener('tess:player', (ev: Event) => {
    const { name, x, y } = (ev as CustomEvent).detail as { name: string; x: number; y: number };
    if (!name || !net.inRoom) return;
    const inMine = !!net.party?.members.some(m => m.name === name), items: Array<[string, () => void]> = [];
    if (!inMine && (!net.party || (net.isLeader && net.party.members.length < PARTY_MAX))) items.push(['Convidar para o grupo', () => net.invite(name)]);
    if (net.inRoom) items.push(['Propor troca', () => net.tradePropose(name)]);
    if (net.inRoom && game()?.region === 'hub' && !net.duel) items.push(['Desafiar para duelo', () => net.duelAsk(name)]);
    if (!net.isFriend(name)) items.push(['Adicionar amigo', () => void friendAct(() => net.addFriend(name), `Pedido enviado para ${name}.`)]);
    let armed = false;
    items.push(['Bloquear', () => {
      if (!armed) { armed = true; popMenu(name, [[`Bloquear ${name}? Toque de novo`, () => void friendAct(() => net.block(name), `${name} foi bloqueado.`)]], x, y); }
    }]);
    popMenu(name, items, x, y);
  });

  // convite de grupo: cartão com Aceitar e Recusar, que some quando expira
  const invBox = h('div', { class: 'net-invites' });
  document.body.append(invBox);
  // Os cartões só são refeitos quando o conteúdo muda; o relógio e a vida do duelo mudam no lugar.
  // (Refazer tudo a cada meio segundo trocava o botão debaixo do dedo e o clique em "Aceitar" se perdia.)
  let invSig = '';
  const duelTime = (d: NonNullable<typeof net.duel>, now: number) => { const left = Math.max(0, Math.ceil((d.end - now) / 1000)); return d.go > now ? `começa em ${Math.ceil((d.go - now) / 1000)}…` : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; };
  const hpPct = (v?: number, m?: number) => `${m ? Math.max(0, Math.min(100, v! / m * 100)) : 100}%`;
  function renderInvites() {
    const now = Date.now(); net.invites = net.invites.filter(i => i.exp > now);
    net.duelInvites = net.duelInvites.filter(i => i.exp > now);
    const r = net.ready, d0 = net.duel;
    const sig = JSON.stringify([r && r.until > now && playing() ? [r.inst, r.until] : 0, net.duelInvites.map(i => [i.from, i.exp]), d0 ? [d0.opp, d0.go > now] : 0, net.invites.map(i => [i.from, i.exp, i.size])]);
    if (sig === invSig) {
      if (d0) { const t = invBox.querySelector('.net-dtime'), b = invBox.querySelector<HTMLElement>('.net-dhp > i'); if (t) t.textContent = duelTime(d0, now); if (b) b.style.width = hpPct(d0.oppHp, d0.oppMax); }
      return;
    }
    invSig = sig; invBox.innerHTML = '';
    if (r && r.until > now && playing()) {
      const bar = h('i', { class: 'net-ibar' }); bar.style.animationDuration = Math.max(0, r.until - now) + 'ms';
      invBox.append(h('div', { class: 'net-invite net-ready panel', role: 'alertdialog', 'aria-label': 'Pronto?' },
        h('b', { text: 'Pronto?' }),
        h('span', { text: r.kind === 'wilds' ? `${r.by} abriu os Ermos de Tessária para o grupo` : `${r.by} abriu a Fenda do Tear · Nível ${r.L} para o grupo` }),
        h('div', { class: 'act' },
          h('button', { class: 'px gold', text: 'Entrar', onclick: () => { game()?.sfx('ui'); net.joinInst(r.inst); renderInvites(); } }),
          h('button', { class: 'px', text: 'Agora não', onclick: () => { net.declineReady(); renderInvites(); } })),
        bar));
    }
    for (const i of net.duelInvites) {
      const bar = h('i', { class: 'net-ibar' }); bar.style.animationDuration = Math.max(0, i.exp - now) + 'ms';
      invBox.append(h('div', { class: 'net-invite panel duel', role: 'alertdialog', 'aria-label': `Duelo de ${i.from}` },
        h('b', { text: '⚔ Duelo' }), h('span', { text: `${i.from} desafiou você para um duelo (ninguém morre; quem cair primeiro perde)` }),
        h('div', { class: 'act' },
          h('button', { class: 'px gold', text: 'Aceitar', onclick: () => { game()?.sfx('ui'); net.duelAnswer(i.from, true); renderInvites(); } }),
          h('button', { class: 'px', text: 'Recusar', onclick: () => { net.duelAnswer(i.from, false); renderInvites(); } })),
        bar));
    }
    if (net.duel) {
      const d = net.duel;
      invBox.append(h('div', { class: 'net-duelbar panel', role: 'status' }, h('b', { text: `⚔ Duelo contra ${d.name}` }), h('span', { class: 'net-dtime', text: duelTime(d, now) }),
        h('small', { class: 'net-dhpl', text: 'Vida dele' }), h('i', { class: 'net-dhp' }, h('i', { style: `width:${hpPct(d.oppHp, d.oppMax)}` }))));
    }
    for (const i of net.invites) {
      const bar = h('i', { class: 'net-ibar' }); bar.style.animationDuration = Math.max(0, i.exp - now) + 'ms';
      invBox.append(h('div', { class: 'net-invite panel', role: 'alertdialog', 'aria-label': `Convite de ${i.from}` },
        h('span', { text: `${i.from} convidou você para o grupo (${i.size + 1}/${PARTY_MAX})` }),
        h('div', { class: 'act' },
          h('button', { class: 'px gold', text: 'Aceitar', onclick: () => { game()?.sfx('ui'); net.acceptInvite(i.from); renderInvites(); } }),
          h('button', { class: 'px', text: 'Recusar', onclick: () => { net.declineInvite(i.from); renderInvites(); } })),
        bar));
    }
  }
  setInterval(() => { if (net.duel || net.duelInvites.length) renderInvites(); }, 500);
  setInterval(() => { const now = Date.now(); if ((net.invites.length && net.invites.some(i => i.exp <= now)) || (net.ready && net.ready.until <= now)) { if (net.ready && net.ready.until <= now) net.ready = null; renderInvites(); } }, 1000);
  net.on((ev, data) => {
    if (ev === 'pinvite') { game()?.sfx('ui'); renderInvites(); }
    if (ev === 'dinvite') { game()?.sfx('ui'); renderInvites(); }
    if (ev === 'duel') renderInvites();
    if (ev === 'iready') { if (data) game()?.sfx('ui'); renderInvites(); }
    if (ev === 'iclosed') game()?.toast(net.instKind === 'wilds' ? 'Os Ermos do grupo fecharam' : 'A Fenda do grupo fechou', false, 'VOCÊ CONTINUA SOZINHO AQUI');
    if (ev === 'party') { if (!data) renderInvites(); updateChip(); }
    if (ev === 'friends') renderSoon();
    if (ev === 'social') {
      const n = data.name as string;
      if (data.ev === 'pedido') game()?.toast(`${n} quer ser seu amigo`, false, 'AMIGOS · ABRA A LISTA PARA ACEITAR');
      if (data.ev === 'aceito') game()?.toast(`${n} agora é seu amigo`, false, 'AMIGOS');
      if (data.ev === 'online') addLine({ kind: 'sys', text: `${n} entrou no jogo.`, ts: Date.now() });
      if (data.ev === 'offline') addLine({ kind: 'sys', text: `${n} saiu do jogo.`, ts: Date.now() });
    }
  });

  function addLine(l: ChatLine) {
    const row = h('div', { class: 'net-line' + (l.kind === 'sys' ? ' sys' : l.kind === 'grupo' ? ' grp' : l.kind === 'guilda' ? ' gld' : '') + (l.mine ? ' mine' : '') });
    if (l.kind === 'grupo') row.append(h('b', { text: '[Grupo] ' + l.name + ': ' }), document.createTextNode(l.text));
    else if (l.kind === 'guilda') row.append(h('b', { text: `[${l.ch || 'Guilda'}] ` + l.name + ': ' }), document.createTextNode(l.text));
    else if (l.kind === 'chat') { if (l.ch) row.append(h('span', { class: 'net-ch', text: l.ch })); row.append(h('b', { text: l.name + ': ' }), document.createTextNode(l.text)); } else row.textContent = l.text;
    log.append(row); while (log.children.length > 30) log.firstChild!.remove();
    log.scrollTop = log.scrollHeight;
    setTimeout(() => row.classList.add('old'), 12000);
  }
  net.on(ev => { if (ev === 'guild' && !modal.hidden && view === 'guilda') void net.guild().then(() => { if (!modal.hidden && view === 'guilda') render(); }); });
  net.on((ev, data) => { if (ev === 'chat') addLine(data); if (ev === 'hub' && data?.joined) addLine({ kind: 'sys', text: net.inst ? (net.instKind === 'wilds' ? `${data.joined} chegou aos Ermos.` : `${data.joined} entrou na Fenda.`) : `${data.joined} chegou à vila.`, ts: Date.now() }); });
  setInterval(updateChip, 500);

  // salvar ao sair da aba
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void net.flushNow(); });
}
