// Interface do modo online: painel de conta, escolha de progresso, chat,
// emotes e indicador de conexão. Tudo em DOM, no visual do jogo.

import type { Net, ChatLine } from './online';
import { EMOTES, EMOTE_LABEL, CHAT_MAX } from '../../shared/protocol';
import { nameProblem } from '../../shared/text';
import { PARTY_MAX } from '../../shared/social';

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
  mode: string; region: string | null; save: any; readLocalSave(): any; writeLocalSave(s: any): void;
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
  const closeModal = () => { modal.hidden = true; };
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
  function openModal(v: string) { view = v; render(); modal.hidden = false; setTimeout(() => (box.querySelector('input,button.gold') as HTMLElement | null)?.focus(), 30); }

  function render() {
    box.innerHTML = '';
    if (view === 'amigos') return renderFriends();
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
      box.append(h('button', { class: 'px net-alt', onclick: () => { closeModal(); }, text: 'Jogar offline' }));
    }
    if (view === 'conta' && net.account) {
      const a = net.account;
      box.append(close, h('h2', { id: 'netTitle', text: a.name }),
        h('p', { class: 'sub', text: a.guest ? 'Conta de convidado: proteja com e-mail e senha para não perder o progresso se trocar de aparelho.' : (a.email ? `Conta ${a.email}${a.google ? ' · Google' : ''}` : 'Conta Google') }),
        h('button', { class: 'px gold', onclick: () => chooseProgress(), text: 'Continuar online' }),
        h('button', { class: 'px', onclick: () => openModal('amigos'), text: 'Amigos' }));
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
    box.append(h('h2', { id: 'netTitle', text: 'Seu progresso' }), h('p', { class: 'sub', text: 'Buscando seu progresso na nuvem…' }));
    const cloud = await net.cloudSave(), local = preferCloud && cloud.ok && cloud.data ? null : game()?.readLocalSave();
    box.innerHTML = '';
    const close = h('button', { class: 'net-x', 'aria-label': 'Fechar', onclick: closeModal, text: '✕' });
    box.append(close, h('h2', { id: 'netTitle', text: 'Seu progresso' }));
    if (!cloud.ok) { box.append(h('p', { class: 'net-msg', 'data-kind': 'erro', text: cloud.error || 'Falha ao buscar o progresso.' }), h('button', { class: 'px gold', onclick: () => chooseProgress(preferCloud), text: 'Tentar de novo' })); return; }
    const start = (data: any, rev: number) => { net.adopt(rev); game()?.writeLocalSave(data); closeModal(); game()?.startFromSave(data); };
    const card = (title: string, s: any) => h('div', { class: 'net-card' }, h('b', { text: title }), h('span', { text: summary(s) }));
    if (cloud.data) {
      const same = local && local.time === cloud.data.time && local.lvl === cloud.data.lvl && local.gold === cloud.data.gold;
      if (!local || same) return start(cloud.data, cloud.rev);
      box.append(h('p', { class: 'sub', text: 'O progresso deste aparelho é diferente do que está na nuvem. Qual você quer usar?' }),
        card('NA NUVEM', cloud.data), card('NESTE APARELHO', local),
        h('button', { class: 'px gold', onclick: () => start(cloud.data, cloud.rev), text: 'Usar o da nuvem' }),
        h('button', { class: 'px', onclick: () => act(async () => { const r = await net.putNow(local, cloud.rev); return r.ok ? { ok: true } : { ok: false, error: (r.erros && r.erros.length ? 'O servidor recusou: ' + r.erros[0] : r.error) + ' Use o progresso da nuvem.' }; }, () => start(local, net.rev)), text: 'Enviar o deste aparelho para a nuvem' }));
      let confirm = false;
      const del = h('button', { class: 'net-link', onclick: () => {
        if (!confirm) { confirm = true; del.textContent = 'Tem certeza? Isso apaga o progresso da nuvem para sempre. Clique de novo.'; return; }
        act(() => net.resetCloud(), () => { net.adopt(0); closeModal(); game()?.newGame(); });
      }, text: 'Apagar o progresso da nuvem e começar do zero' });
      box.append(del);
    } else if (local) {
      box.append(h('p', { class: 'sub', text: 'Sua conta ainda não tem progresso. Quer levar o progresso deste aparelho para ela?' }), card('NESTE APARELHO', local),
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
  hud.append(chat, chatBtn); (document.querySelector('.hud-l') || hud).append(chip);

  const playing = () => { const g = game(); return !!(g && (g.mode === 'play' || g.mode === 'dialog')); };
  const inHub = () => { const g = game(); return !!(g && g.region === 'hub' && playing() && net.inRoom); };
  /** O chat abre na vila, e fora dela quando há grupo (aí vai para o grupo). */
  const chatOk = () => inHub() || (playing() && net.connected && !!net.party);
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
    friendsBtn.hidden = !(on && playing() && net.connected);
    input.placeholder = inHub() ? 'Mensagem (Enter envia, Esc fecha) · /g fala com o grupo' : 'Mensagem para o grupo (Enter envia, Esc fecha)';
    emotes.hidden = input.hidden || !inHub();
    if (!ok && !input.hidden) closeChat();
    renderParty();
  }
  function openChat() { if (!chatOk()) return; input.hidden = false; emotes.hidden = !inHub(); chat.classList.add('open'); chatBtn.hidden = true; input.focus(); }
  function closeChat() { input.hidden = true; emotes.hidden = true; chat.classList.remove('open'); input.blur(); updateChip(); }
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { const t = input.value.trim(); if (t) { if (inHub() || t.startsWith('/')) net.chat(t); else net.partyChat(t); } input.value = ''; if (!t) closeChat(); e.preventDefault(); }
    else if (e.key === 'Escape') { closeChat(); e.preventDefault(); }
    e.stopPropagation();
  });
  addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.hidden && chatOk() && game()?.mode === 'play' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); openChat(); }
  });

  // ---------- amigos e grupo no HUD ----------
  const friendsBtn = h('button', { class: 'px net-friendsbtn', hidden: true, 'aria-label': 'Amigos', onclick: () => { game()?.sfx('ui'); openModal('amigos'); }, text: 'Amigos' });
  const partyBox = h('div', { class: 'net-party', hidden: true, 'aria-label': 'Grupo' });
  hud.append(friendsBtn, partyBox);
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
  function renderInvites() {
    invBox.innerHTML = '';
    const now = Date.now(); net.invites = net.invites.filter(i => i.exp > now);
    const r = net.ready;
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
  setInterval(() => { const now = Date.now(); if ((net.invites.length && net.invites.some(i => i.exp <= now)) || (net.ready && net.ready.until <= now)) { if (net.ready && net.ready.until <= now) net.ready = null; renderInvites(); } }, 1000);
  net.on((ev, data) => {
    if (ev === 'pinvite') { game()?.sfx('ui'); renderInvites(); }
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
    const row = h('div', { class: 'net-line' + (l.kind === 'sys' ? ' sys' : l.kind === 'grupo' ? ' grp' : '') + (l.mine ? ' mine' : '') });
    if (l.kind === 'grupo') row.append(h('b', { text: '[Grupo] ' + l.name + ': ' }), document.createTextNode(l.text));
    else if (l.kind === 'chat') row.append(h('b', { text: l.name + ': ' }), document.createTextNode(l.text)); else row.textContent = l.text;
    log.append(row); while (log.children.length > 30) log.firstChild!.remove();
    log.scrollTop = log.scrollHeight;
    setTimeout(() => row.classList.add('old'), 12000);
  }
  net.on((ev, data) => { if (ev === 'chat') addLine(data); if (ev === 'hub' && data?.joined) addLine({ kind: 'sys', text: net.inst ? (net.instKind === 'wilds' ? `${data.joined} chegou aos Ermos.` : `${data.joined} entrou na Fenda.`) : `${data.joined} chegou à vila.`, ts: Date.now() }); });
  setInterval(updateChip, 500);

  // salvar ao sair da aba
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void net.flushNow(); });
}
