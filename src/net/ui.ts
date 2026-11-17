// Interface do modo online: painel de conta, escolha de progresso, chat,
// emotes e indicador de conexão. Tudo em DOM, no visual do jogo.

import type { Net, ChatLine } from './online';
import { EMOTES, EMOTE_LABEL, CHAT_MAX } from '../../shared/protocol';
import { nameProblem } from '../../shared/text';

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
        h('button', { class: 'px gold', onclick: () => chooseProgress(), text: 'Continuar online' }));
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

  const inHub = () => { const g = game(); return !!(g && g.region === 'hub' && (g.mode === 'play' || g.mode === 'dialog') && net.connected); };
  function updateChip() {
    const g = game(), playing = g && (g.mode === 'play' || g.mode === 'dialog' || g.mode === 'menu') && !!net.account && !net.offline;
    chip.hidden = !playing;
    if (playing) {
      const s = ({ salvo: '☁ salvo', pendente: '☁ salvando…', enviando: '☁ salvando…', recusado: '⚠ não salvo', conflito: '⚠ conflito', 'sem-rede': '⚠ sem conexão', desligado: '' } as Record<string, string>)[net.sync] || '';
      const hubTxt = g!.region === 'hub' ? (net.connected ? `● ${net.room} · ${net.players().length + 1} online` : '○ conectando…') : '';
      chip.textContent = [hubTxt, s].filter(Boolean).join('  ');
      chip.dataset.state = net.sync;
    }
    const hub = inHub();
    chat.hidden = !hub; chatBtn.hidden = !hub || !input.hidden;
    if (!hub && !input.hidden) closeChat();
  }
  function openChat() { if (!inHub()) return; input.hidden = false; emotes.hidden = false; chat.classList.add('open'); chatBtn.hidden = true; input.focus(); }
  function closeChat() { input.hidden = true; emotes.hidden = true; chat.classList.remove('open'); input.blur(); updateChip(); }
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { const t = input.value.trim(); if (t) net.chat(t); input.value = ''; if (!t) closeChat(); e.preventDefault(); }
    else if (e.key === 'Escape') { closeChat(); e.preventDefault(); }
    e.stopPropagation();
  });
  addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.hidden && inHub() && game()?.mode === 'play' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); openChat(); }
  });
  function addLine(l: ChatLine) {
    const row = h('div', { class: 'net-line' + (l.kind === 'sys' ? ' sys' : '') + (l.mine ? ' mine' : '') });
    if (l.kind === 'chat') row.append(h('b', { text: l.name + ': ' }), document.createTextNode(l.text)); else row.textContent = l.text;
    log.append(row); while (log.children.length > 30) log.firstChild!.remove();
    log.scrollTop = log.scrollHeight;
    setTimeout(() => row.classList.add('old'), 12000);
  }
  net.on((ev, data) => { if (ev === 'chat') addLine(data); if (ev === 'hub' && data?.joined) addLine({ kind: 'sys', text: `${data.joined} chegou à vila.`, ts: Date.now() }); });
  setInterval(updateChip, 500);

  // salvar ao sair da aba
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void net.flushNow(); });
}
