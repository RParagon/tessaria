import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maskText, nameProblem, cleanChat } from '../../shared/text';
import { itemProblems, statCap } from '../../shared/items';
import { validateSave } from '../../shared/save';
import { baseSave, item } from './helpers';

test('filtro de chat mascara palavrões e variações, sem pegar palavras inocentes', () => {
  assert.equal(maskText('que porra é essa'), 'que ***** é essa');
  assert.equal(maskText('p0rr4 mano'), '***** mano');
  assert.equal(maskText('porrrrra'), '********');
  assert.equal(maskText('CARALHOOO'), '*********');
  assert.equal(maskText('vou no computador estudar'), 'vou no computador estudar');
  assert.equal(maskText('disputa de cupons'), 'disputa de cupons');
  assert.equal(maskText('bom dia, Tecelão!'), 'bom dia, Tecelão!');
  assert.equal(maskText('Bom dia, porra!'), 'Bom dia, *****!');
  assert.equal(maskText('merda!!! sério'), '*****!!! sério');
});

test('limpeza de chat remove controles e espaços extras', () => {
  assert.equal(cleanChat('  oi\u0000   tudo\n bem  '), 'oi tudo bem');
  assert.equal(cleanChat('a'.repeat(300)).length, 140);
});

test('nomes de conta: tamanho, caracteres, reservados e ofensivos', () => {
  assert.equal(nameProblem('Lume'), null);
  assert.equal(nameProblem('Tecelã_09'), null);
  assert.match(nameProblem('ab')!, /3 a 16/);
  assert.match(nameProblem('nome com espaço')!, /letras, números/);
  assert.match(nameProblem('12345')!, /uma letra/);
  assert.match(nameProblem('Admin')!, /reservado/);
  assert.match(nameProblem('ViadoPro')!, /não é permitido/);
  assert.match(nameProblem('Caralh0')!, /não é permitido/);
});

test('itens: aceita itens normais e recusa os impossíveis', () => {
  assert.deepEqual(itemProblems(item('a1')), []);
  assert.deepEqual(itemProblems({ id: 'w1', slot: 'weapon', rar: 4, tier: 3, st: { dmg: 35, crit: 9 }, name: 'Lâmina do Sol Partido', power: 'sol', cls: 'lamina' }), []);
  assert.match(itemProblems(item('a2', { st: { crit: 999 } }))[0], /acima do máximo/);
  assert.match(itemProblems(item('a3', { st: { dmg: 5 } }))[0], /não existe em charm/);
  assert.match(itemProblems(item('a4', { power: 'sol' }))[0], /não é lendário/);
  assert.match(itemProblems(item('a5', { tier: 500 }))[0], /fora do alcance/);
  assert.match(itemProblems(item('a6', { up: 11 }))[0], /aprimoramento/);
  // aprimorar +10 aumenta o limite
  assert.ok(statCap({ slot: 'weapon', rar: 3, tier: 4, up: 10 }, 'dmg') > statCap({ slot: 'weapon', rar: 3, tier: 4, up: 0 }, 'dmg') * 2);
});

test('save: válido passa, impossível é recusado', () => {
  assert.deepEqual(validateSave(baseSave()).errors, []);
  assert.ok(validateSave(baseSave({ gold: -5 })).errors.length);
  assert.ok(validateSave(baseSave({ lvl: 0 })).errors.length);
  assert.ok(validateSave(baseSave({ diff: 5 })).errors.some(e => /dificuldade|Tormento/.test(e)));
  assert.ok(validateSave(baseSave({ inv: Array.from({ length: 21 }, (_, i) => item('x' + i)) })).errors.includes('bolsa inválida'));
  assert.ok(validateSave(baseSave({ inv: [item('dup'), item('dup')] })).errors.some(e => /repetido/.test(e)));
  assert.ok(validateSave(baseSave({ house: { owned: false, cap: 20, stash: [item('s1')], f: {} } })).errors.some(e => /sem ser comprada/.test(e)));
});

test('save: saltos absurdos desde o último save são recusados; grandes viram alerta', () => {
  const prev = baseSave();
  assert.ok(validateSave(baseSave({ gold: 10_000_000 }), { prev, elapsedMs: 60_000 }).errors.some(e => /Centelhas/.test(e)));
  assert.ok(validateSave(baseSave({ lvl: 2 }), { prev, elapsedMs: 60_000 }).errors.includes('nível diminuiu'));
  const r = validateSave(baseSave({ gold: 20_000 }), { prev, elapsedMs: 60_000 });
  assert.deepEqual(r.errors, []);
  assert.ok(r.flags.length);
});
