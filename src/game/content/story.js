/* Fios de Tessária · História e diálogos */
/* =========================================================
   HISTÓRIA E DIÁLOGOS
   ========================================================= */
const STORY = [
  'Tessária foi tecida pelo Tear do Sol. Cada pedra, cada folha e cada pessoa é feita de Centelhas: fagulhas de luz costuradas por fios invisíveis.',
  'Há sete invernos, o Sol se apagou. Dizem que o dragão Varkhaz o engoliu.',
  'Desde então o mundo se desfaz. Árvores viram poeira de luz, rios esquecem de correr, e gente some no meio de uma frase.',
  'Você acordou na Vila Brasa com uma agulha de luz na palma da mão. Só os Tecelões nascem assim. O último morreu há cem anos.',
];
const LUCIA_LINES = ['Saio às cinco e pouco da tarde e corro a vila toda. Vinte e sete postes! E de madrugada apago tudo de novo.', 'Toda noite eu acendo um por um. Se algum apagar sozinho, me avisa: lampião que apaga sozinho é Desfio chegando.', 'Viu o santuário ao sul? Antes era só um poço. Depois que a Fenda abriu, as pedras ficaram pretas e começaram a cantar baixinho.', 'O Ivo diz que as minhocas-de-brasa só saem perto do fogo. Eu acho que elas gostam é dos meus lampiões.', 'Dica de quem anda a vila inteira: sentar perto da fogueira cura mais rápido que qualquer poção.', 'Os bonecos da arena não caem nunca. Já tentei com a vara. Duas vezes.'];
const DORA_LINES = ['Fruta fresca, peixe do Ivo e fofoca de graça! A fruta é que se paga.', 'Tem gente que volta da Fenda com cada coisa… Um rapaz me ofereceu uma espada que gritava. Recusei.', 'Se você pescar uma Carpa Dourada, mostra pra mim! Faz três invernos que não vejo uma.', 'Dizem que o Bardo Tomé sabe onde ficam os covis dos Ermos. Mas ele só conta cantando, e desafinado.', 'O Guarda-Roupa da sua casa? Sorte a sua. O meu só tem avental.'];
const DIALOG = {
  lucia: () => [{ who: 'Acendedora Lúcia', text: LUCIA_LINES[Math.floor(Math.random() * LUCIA_LINES.length)] }],
  dora: () => [{ who: 'Feirante Dora', text: DORA_LINES[Math.floor(Math.random() * DORA_LINES.length)] }],
  bardo: () => [{ who: 'Bardo Tomé', text: BARD_SONGS[Math.floor(Math.random() * BARD_SONGS.length)] }, { who: 'Bardo Tomé', text: BARD_RUMORS[Math.floor(Math.random() * BARD_RUMORS.length)] }],
  ysolde() {
    const s = G.save, Y = 'Anciã Ysolde';
    if (!s.met.ysolde) {
      s.met.ysolde = true;
      return [
        { who: Y, text: 'Então a agulha escolheu você. Deixe-me ver sua mão… Sim. Luz de Tear. Faz cem anos que não vejo isso.' },
        { who: Y, text: 'Tessária é um tecido, e alguém está puxando os fios. Sem o Sol, cada noite leva mais um pedaço do mundo.' },
        { who: Y, text: 'O Tear só volta a girar com três Fios Mestres. O Fio Verde dorme no Bosque Sussurrante, guardado pelo velho Guardião de Musgo.' },
        { who: Y, text: 'O Fio de Osso está no Ossuário, no túmulo do Rei Morgrave, o bom rei que morreu nos protegendo. E o Fio de Brasa…' },
        { who: Y, text: '…está na garganta de Varkhaz, o dragão que engoliu o Sol.', choices: [{ t: 'Eu vou.' }, { t: 'Por que eu?', go: [{ who: Y, text: 'Porque a agulha não escolhe heróis. Escolhe quem consegue costurar o que outros rasgaram.' }] }] },
        { who: Y, text: 'Fale com a Bruma na forja antes de partir. E toque a fonte sempre que precisar descansar. O portal do bosque, ao norte, já está aceso.', fn: () => { writeSave(); updateObjective(); } },
      ];
    }
    if (!s.bosses.forest) return [{ who: Y, text: 'O portal do bosque fica ao norte, à esquerda. Siga as trilhas de terra. O Guardião espera no coração do bosque.' }];
    if (!s.bosses.crypt) {
      if (!s.met.ysolde2) return [
        { who: Y, text: 'Você voltou! E traz o Fio Verde… Deixe-me segurá-lo. Está quente, como um coração pequeno.' },
        { who: Y, text: 'O Guardião disse alguma coisa antes de se desfazer?', choices: [{ t: '"Só um fio", ele repetia.', go: [{ who: Y, text: 'Só um fio… Alguém prometeu algo ao Guardião em troca de um fio. Isso não me cheira bem.' }] }, { t: 'Ele me agradeceu.', go: [{ who: Y, text: 'Então ele sofria. Que o musgo o guarde em paz.' }] }] },
        { who: Y, text: 'Vou tecer o Fio Verde no portal do Ossuário. Lá jaz o Rei Morgrave, o rei que morreu nos protegendo… ou é o que contamos às crianças.', fn: () => { s.met.ysolde2 = true; writeSave(); updateObjective(); toast('O PORTAL DO OSSUÁRIO SE ACENDEU', true, 'ao norte da vila'); } },
      ];
      return [{ who: Y, text: 'O portal do Ossuário está aceso. Cuidado com o que os mortos contam.' }];
    }
    if (!s.bosses.peaks) return [{ who: Y, text: 'Morgrave… não. Não pode ser verdade. Eu era criança quando ele morreu. A vila inteira chorou.' }, { who: Y, text: 'Vá aos Picos de Cinza. E, por favor, ouça o dragão antes de julgá-lo. Eu não ouvi ninguém.' }];
    if (!s.ended) return [{ who: Y, text: 'Você poupou o dragão? Então ainda há algo a lembrar. Procure as memórias que faltam, criança. Eu confio em você.' }];
    if (!s.met.act2y) return [
      { who: Y, text: 'Criança… sente isso? O Sol voltou, mas o Tear ainda treme. Ontem a fonte cuspiu água preta, e o reflexo nela não era o meu.' },
      { who: Y, text: 'Quando o Sol se apagou, alguns fios não voltaram para o tecido. Ficaram soltos. E fio solto puxa o mundo pelas bordas.' },
      { who: Y, text: 'A oeste, o Rio Lento virou o Pântano Afogado. Dizem que algo com muitas cabeças engoliu o Fio de Água, e agora os rios esquecem o caminho do mar.' },
      { who: Y, text: 'E a leste a Cidadela de Vidro acordou. Lá o Tear se olha no espelho. Os antigos Tecelões iam lá para ver quem eram de verdade.', choices: [{ t: 'Então eu vou de novo.' }, { t: 'Achei que tinha acabado.', go: [{ who: Y, text: 'Nada que é tecido acaba, criança. Só muda de padrão.' }] }] },
      { who: Y, text: 'Teci um portal no fim da estrada, a oeste. Leve poções. O pântano não tem pressa nenhuma de deixar ninguém sair.', fn: () => { s.met.act2y = true; writeSave(); updateObjective(); toast('ATO II · FIOS SOLTOS', true, 'o portal do Pântano Afogado se acendeu a oeste'); sfx('legend'); } },
    ];
    if (!s.bosses.swamp) return [{ who: Y, text: 'O portal do pântano fica no fim da estrada, a oeste. Não beba a água. E não olhe muito para ela.' }, { who: Y, text: 'Se o caminho ficar fácil demais, peça mais ao Tear: no menu dá para subir a dificuldade. O Tear paga melhor a quem arrisca.' }];
    if (!s.bosses.glass) {
      if (!s.met.act2y2) return [
        { who: Y, text: 'O Fio de Água! Escute… dá para ouvir o rio de novo, lá longe.' },
        { who: Y, text: 'A Hidra falou alguma coisa?', choices: [{ t: '"Mãos de vidro" a alimentaram.', go: [{ who: Y, text: 'Mãos de vidro… Então a coisa na Cidadela já sabe que você existe.' }] }, { t: 'Ela só queria ser um rio.', go: [{ who: Y, text: 'Então descanse, rio velho. Você correu bastante.' }] }] },
        { who: Y, text: 'Teci o portal da Cidadela no fim da estrada, a leste. Lá dentro, cuidado com o que te imita. E com o que some quando você pisca.', fn: () => { s.met.act2y2 = true; writeSave(); updateObjective(); toast('A CIDADELA DE VIDRO DESPERTOU', true, 'portal no fim da estrada, a leste'); sfx('legend'); } },
      ];
      return [{ who: Y, text: 'O portal da Cidadela fica no fim da estrada, a leste. Os espelhos de lá mentem com a sua cara.' }];
    }
    if (!s.met.act2y3) { s.met.act2y3 = true; writeSave(); return [{ who: Y, text: 'Você enfrentou a si mesmo e voltou inteiro. Poucos Tecelões conseguiram isso. Eu não teria conseguido.' }, { who: Y, text: 'Agora o Tear te reconhece. Dizem que no Tormento as Fendas guardam fios que nem eu sei nomear. E os velhos guardiões podem ser desafiados de novo nos seus covis.' }]; }
    return [{ who: Y, text: s.ended === 'B' ? 'Um Sol que pisca para a gente. Cem anos de vida e eu nunca imaginei isso.' : 'O Sol voltou. Sinto falta de algo que nunca conheci, e acho que é do dragão.' }, { who: Y, text: 'Gravei a verdade sobre Morgrave na pedra da fonte. Nenhuma criança vai crescer com a mentira.' }];
  },
  kiko() {
    const s = G.save, K = 'Kiko';
    if (!s.bosses.forest) return [{ who: K, text: 'Você vai matar o dragão? Meu avô dizia que o dragão chorava fogo azul. Dragões choram?' }];
    if (!s.bosses.crypt) return [{ who: K, text: 'O vovô deu uma maçã pro dragão uma vez! Juro! Ninguém acredita em mim.' }];
    if (!s.bosses.peaks) return [{ who: K, text: 'Você tá com cara de quem viu fantasma. Viu? Era assustador? Era o rei?' }];
    if (!s.ended) return [{ who: K, text: 'Você não matou o dragão? O vovô vai ficar tão feliz!' }];
    return [{ who: K, text: s.ended === 'B' ? 'O Sol piscou pra mim! Juro! O vovô disse que é o dragão dando oi.' : 'Vou deixar uma maçã lá no morro. Pra ele, onde estiver.' }];
  },
  desf() {
    const s = G.save, D = 'O Desfiado';
    if (s.ended === 'B') return [{ who: D, text: 'Sinto meus pés no chão de novo. Fio por fio, você me costurou também.' }, { who: D, text: 'Agora ensino as crianças a não arrancar o que não é delas. É o mínimo que devo a Tessária.' }];
    if (s.bosses.peaks && !s.ended) return [{ who: D, text: s.frags.length >= 9 ? 'Você lembra de tudo. Vá ao ninho. Ele está esperando por você.' : `Você poupou o dragão. Bom. ${missingText()} As pedras de memória ficam nos cantos mais afastados de cada reino.` }];
    if (!s.bosses.crypt) return [
      { who: D, text: 'Você puxou o primeiro fio. Sentiu o mundo lembrar de alguma coisa?' },
      { who: D, text: 'Cuidado. Certas memórias foram enterradas de propósito.', choices: [
        { t: 'Quem é você?', go: [{ who: D, text: 'Alguém que costurou o que não devia. Estou me desfazendo há cem anos.' }] },
        { t: 'Que memórias?', go: [{ who: D, text: 'Nove pedras de memória estão espalhadas pelos três reinos. Elas não mentem. As pessoas, sim.' }] }] },
    ];
    if (!s.bosses.peaks && s.met.desf2) return [{ who: D, text: `Vá. E ouça o dragão antes de erguer a arma. Você tem ${s.frags.length} de 9 memórias.` }];
    if (!s.bosses.peaks) return [
      { who: D, text: 'Agora você sabe. O rei não morreu por nós. Ele se recusou a morrer, e o Sol pagou a conta.' },
      { who: D, text: 'Fui eu quem puxou o fio. Eu era o Tecelão da corte.' },
      { who: D, text: 'O dragão não roubou nada. Ele segura a última brasa para que ninguém a arranque de novo.' },
      { who: D, text: `Se você lembrar de tudo, talvez exista outro jeito de terminar esta história. Você tem ${s.frags.length} de 9 memórias.`, fn: () => { s.met.desf2 = true; writeSave(); updateObjective(); toast('O PORTAL DOS PICOS SE ACENDEU', true, 'a nordeste da vila'); } },
    ];
    return [{ who: D, text: 'Obrigado, Tecelagem. Já posso descansar.' }];
  },
  otto() { return [{ who: 'Mercador Otto', text: pick(['Itens de primeira, preço de última! Quer dar uma olhada?', 'Compro o que você não usa. Vendo o que você precisa.', 'Desde que o Sol apagou, só negócio de luz anda bem. Hehe.']), fn: () => openMenu('shop') }]; },
  tarsa() {
    const b = G.save.bosses, k = G.touch ? 'o botão de Esquiva' : 'Espaço', T2 = 'Guarda Tarsa';
    if (!b.forest) return [{ who: T2, text: `Vai pro bosque? As gosmas pulam em cima de você. Fique se mexendo e use ${k} para atravessar os ataques sem levar dano.` }, { who: T2, text: 'E repare no chão: quando aparecer um círculo pontilhado, é aviso. Saia dele.' }];
    if (!b.crypt) return [{ who: T2, text: 'No Ossuário, os esqueletos avisam antes do golpe. Quando o chão piscar na frente deles, saia de lado.' }];
    if (!b.peaks) return [{ who: T2, text: 'Besouros de magma correm em linha reta. Fique de lado e deixe eles baterem na parede: ficam tontos e indefesos.' }];
    return [{ who: T2, text: 'Nunca vi a vila tão clara. Vou até tirar o elmo.' }];
  },
  mel() {
    const s = G.save, lines = [{ who: 'Padeira Mel', text: pick(['Pão quente pra quem segura o mundo nas costas! Come, come.', 'Acabou de sair do forno. Não aceito não como resposta.', 'Você tá parecendo um fio solto. Come mais.']), fn: () => { if (P.hp < P.maxHp) { const h = P.maxHp - Math.round(P.hp); P.hp = P.maxHp; popNum(P.x, 2.2, P.z, '+' + h, 'heal'); sfx('heal'); } } }];
    if (!s.met.mel) { s.met.mel = true; lines.unshift({ who: 'Padeira Mel', text: 'Então você é a agulha de que todos falam! Sempre que passar aqui, tem pão pra recuperar as forças.' }); }
    lines.push(melMenu());
    return lines;
  },
  lio() {
    const b = G.save.bosses;
    const song = b.peaks ? '♪ E o dragão que guardou o Sol virou canção e virou farol ♪' : b.crypt ? '♪ O rei que não quis dormir puxou o céu pra não partir… ♪ Hm. Essa letra é nova. Não sei de onde veio.' : b.forest ? '♪ No bosque, um gigante de musgo chorou, e a agulha costurou o que a dor rasgou ♪' : '♪ Lá nos picos, um dragão sem nome guarda um segredo que o tempo come ♪';
    return [{ who: 'Bardo Lio', text: song }, { who: 'Bardo Lio', text: pick(['Toda canção é uma memória que alguém se recusou a esquecer.', 'Me traga uma história boa e eu viro ela em música.', 'O povo ri das minhas letras. Mas elas sempre acabam certas.']) }];
  },
  ivo() {
    const b = G.save.bosses, L = [{ who: 'Pescador Ivo', text: b.forest ? 'Os peixes voltaram depois que o bosque respirou. Coincidência? Acho que não.' : 'Faz sete invernos que não pesco nada. Mas venho todo dia. Vai que o lago lembra.' }];
    if (b.crypt) L.push({ who: 'Pescador Ivo', text: 'Meu pai jurava que viu o dragão beber água aqui, mansinho, antes de tudo. Ninguém acreditava nele.' });
    if (hasRod()) L.push({ who: 'Pescador Ivo', text: pick(['Peixe grande briga: puxa, espera, puxa de novo. E vara fraca arrebenta, viu?', 'O Remanso, lá embaixo, é onde mora o Rei-do-Rio. Só sobe pra Isca de Fio.', 'O preço da banca muda toda hora. Vendeu muita truta? Ela barateia. Espera um pouco.']),
      choices: [{ t: 'Abrir o Pesqueiro', fn: () => openFishery() }, { t: 'Até mais.' }] });
    return L;
  },
  brann() {
    const b = G.save.bosses, B2 = 'Vovô Brann';
    if (!b.crypt) return [{ who: B2, text: 'O Kiko anda contando histórias por aí? Criança inventa muito. Muito mesmo.' }, { who: B2, text: '…Não me olhe assim. Algumas coisas é melhor não lembrar.' }];
    if (!b.peaks) return [{ who: B2, text: 'Você voltou do Ossuário com outra cara. Então já sabe que contaram mentira pra gente.' }, { who: B2, text: 'Eu era menino quando o dragão pousou no morro. Estava ferido, com fogo saindo pelas escamas. Eu dei uma maçã pra ele.' }, { who: B2, text: 'Ele baixou a cabeça igual cachorro velho e comeu da minha mão. Depois disseram que ele era o monstro, e eu calei. Me perdoe.' }];
    if (!G.save.ended) return [{ who: B2, text: 'Você poupou ele… Obrigado. Se ainda não levou a maçã, leve. Ele vai lembrar.' }];
    return [{ who: B2, text: G.save.ended === 'B' ? 'Às vezes olho pro céu e juro que ele pisca pra mim.' : 'Plantei outra macieira. Pra ele achar o caminho, onde quer que esteja.' }];
  },
  nina() { const b = G.save.bosses; return [{ who: 'Nina', text: pick(b.forest ? ['O Kiko disse que você derrotou uma montanha de musgo! É verdade?', 'Pega eu! Não, pega o Kiko!', 'Quando eu crescer quero ter uma agulha de luz também.'] : ['Você é a pessoa da agulha? Mostra! Brilha?', 'A gente tá brincando de dragão. Eu sou o dragão. RAAAWR.', 'Shhh, tô me escondendo do Kiko.']) }]; },
  bruma() {
    if (!G.save.met.bruma) { G.save.met.bruma = true; return [{ who: 'Ferreira Bruma', text: 'Ei! Você é a tal agulha? Traga Centelhas, aquelas fagulhas douradas que os monstros soltam, e eu tempero seu equipamento.' }, { who: 'Ferreira Bruma', text: 'Fogo de forja ainda funciona sem Sol. Por enquanto.', fn: () => openMenu('forge') }]; }
    return [{ who: 'Ferreira Bruma', text: pick(['O que vai ser hoje?', 'Martelo quente, preço justo.', 'Volte inteira, ouviu? Ou inteiro. Ou em fios, tanto faz, contanto que volte.']), fn: () => openMenu('forge') }];
  },
  bossIntro(type) {
    if (type === 'golem') return [{ who: 'Guardião de Musgo', text: 'PROMESSA… UM FIO… SÓ UM…' }, { who: 'Guardião de Musgo', text: 'NINGUÉM TOCA NO MEU BOSQUE!' }];
    if (type === 'hydra') return [{ who: '', text: 'A água preta ferve. Três pescoços sobem do lodo, e cada cabeça fala com uma voz diferente.' }, { who: 'Hidra do Lodo', text: 'MAIS… FIO… AINDA… COM FOME…' }, { who: 'Hidra do Lodo', text: 'O RIO… ERA… MEU? EU ERA… O RIO?', choices: [{ t: 'Devolva o Fio de Água.' }, { t: 'Quem te alimentou?', go: [{ who: 'Hidra do Lodo', text: 'MÃOS… DE… VIDRO… DISSERAM… "ENGOLE… E… ESQUECE"…' }] }] }];
    if (type === 'reflexo') return [{ who: '', text: 'No centro da sala, um espelho do tamanho de uma porta. Seu reflexo não imita você. Ele sorri primeiro.' }, { who: 'O Reflexo', text: 'Finalmente. Cada fio que você cortou caiu aqui. Cada gosmo, cada osso, cada promessa. Eu sou feito disso.' }, { who: 'O Reflexo', text: 'Fui eu que dei fios soltos para a Hidra. Queria ver se você voltaria por um rio.', choices: [{ t: 'Você é só um eco.' }, { t: 'O que você quer?', go: [{ who: 'O Reflexo', text: 'Ser o Tecelão de verdade. Você costura com dó. Eu costuraria com força.' }] }] }, { who: 'O Reflexo', text: 'Vamos ver quem de nós dois o Tear reconhece.' }];
    if (type === 'skull') return [{ who: 'Rei Morgrave', text: 'Um Tecelão! Depois de cem anos… Venha, criança. Costure-me de novo.' }, { who: 'Rei Morgrave', text: 'Eu lhe darei o que dei a mim mesmo: uma eternidade inteira.', choices: [{ t: 'Nunca.' }, { t: 'Foi você quem apagou o Sol.', go: [{ who: 'Rei Morgrave', text: 'Apagar? Eu o peguei EMPRESTADO! E aquele lagarto ladrão fugiu com o resto!' }] }] }];
    return [{ who: 'Varkhaz', text: 'VÁ EMBORA… A BRASA É MINHA… ELE VAI VOLTAR PARA PEGAR…' }, { who: 'Varkhaz', text: 'NINGUÉM… ARRANCA… O SOL!' }];
  },
  bossOutro(type) {
    if (type === 'hydra') return [{ who: 'Hidra do Lodo', text: '…três bocas… e nenhuma… sabia… o que engolia…' }, { who: 'Hidra do Lodo', text: '…agora… lembro… eu era… só… um rio… cansado…' }, { who: '', text: 'Você recebeu o FIO DE ÁGUA. Em algum lugar, um rio lembra o caminho do mar.' }];
    if (type === 'reflexo') return [{ who: 'O Reflexo', text: 'Então é isso. Você não me apaga. Você me carrega.' }, { who: 'O Reflexo', text: 'Cada fio que você cortou vai pesar. Ótimo. Quem não sente o peso costura torto.' }, { who: '', text: 'Você recebeu o FIO ESPELHADO. O espelho racha, e por trás dele há mais Tear do que qualquer mapa mostra.' }, { who: '', text: 'Na Vila Brasa, a fonte volta a refletir rostos comuns. Ysolde chora um pouco e diz que é a fumaça da forja.' }, { who: '', text: 'Mas o Tear é maior que Tessária. Nas Fendas, fios mais fundos começam a brilhar em cores que ninguém nomeou. O Tormento espera.' }];
    if (type === 'golem') return [{ who: 'Guardião de Musgo', text: 'Ah… a agulha. Obrigado, pequena luz. Eu estava tão cansado de lembrar sozinho.' }, { who: '', text: 'Você recebeu o FIO VERDE. O bosque respira um pouco mais fundo.' }];
    return [{ who: 'Rei Morgrave', text: 'Eu só… não queria… acabar.' }, { who: '', text: 'Você recebeu o FIO DE OSSO. Pela primeira vez em cem anos, o Ossuário fica em silêncio.' }];
  },
  dragonEnd(calm) {
    const s = G.save, n = s.frags.length, all = n >= 9;
    const ch = [{ t: 'Reacender o Tear agora. (Final: O Sol Reaceso)', fn: () => ending('A') }];
    if (all) ch.push({ t: 'Costurar a memória de Varkhaz. (Final: O Sol que Lembra)', fn: () => ending('B') });
    else ch.push({ t: `Ainda não. Vou lembrar de tudo e voltar. (${n} de 9 memórias)`, fn: dragonWait });
    const L = calm
      ? [{ who: '', text: 'Varkhaz levanta a cabeça devagar quando você se aproxima. O fogo nas escamas está calmo.' }, { who: 'Varkhaz', text: all ? 'Você voltou… e seus olhos estão diferentes. Você lembra de tudo, não lembra?' : `Voltou, pequeno Tecelão. Ainda faltam pedaços em você. ${missingText()}` }]
      : [{ who: 'Varkhaz', text: '…A dor parou. Pequeno Tecelão. Você tem a agulha.' }, { who: 'Varkhaz', text: 'Guardei a brasa do Sol por sete invernos para que o rei não a tomasse. Ela me queimou até eu esquecer meu próprio nome.' }];
    if (s.apple && s.q && s.q.brann && s.q.brann.st === 'active' && !s.q.brann.p) L.push({ who: 'Varkhaz', text: '…Esse cheiro. Maçã. Uma criança, no morro… ela ainda vive?' }, { who: '', text: 'Você conta a ele sobre o Vovô Brann. O dragão fecha os olhos, e uma lágrima de fogo azul escorre pela escama.', fn: () => { if (s.q && s.q.brann) { s.q.brann.p = 1; s.q.brann.how = 'dragon'; writeSave(); setTimeout(() => toast('MAÇÃ ENTREGUE', false, 'VOLTE AO VOVÔ BRANN NA VILA', '#ff8a6a'), 400); } } });
    L.push({ who: 'Varkhaz', text: all ? 'Então você conhece o outro caminho. Costure minha memória, e eu viro Sol sem precisar morrer. Ou abra meu peito. A escolha é sua.' : 'Abra meu peito e devolva o Sol ao Tear. Ou encontre as memórias que faltam e volte. Eu espero. Já esperei sete invernos.', choices: ch });
    return L;
  },
};
function missingText() { const s = G.save, m = {}; FRAG.forEach((f, i) => { if (!s.frags.includes(i)) m[f.r] = (m[f.r] || 0) + 1; }); const pp = Object.entries(m).map(([r, n]) => `${RNAME[r]} (${n})`); return pp.length ? 'Faltam memórias em: ' + pp.join(', ') + '.' : ''; }
const calmDragonInter = rm => ({ kind: 'dragon', x: rm.wx, z: rm.wz - 1, r: 6.5, model: getModel('dragon'), anim: newAnim(getModel('dragon')), yaw: 0 });
function dragonWait() {
  const s = G.save;
  if (!s.dragonCalm) {
    s.dragonCalm = true; writeSave();
    const rm = RG.rooms.find(r => r.kind === 'boss');
    if (rm && RG.key === 'peaks') { inter.push(calmDragonInter(rm)); inter.push({ kind: 'portal', to: 'hub', x: rm.wx + 6, z: rm.wz + 5, r: 2, lit: true, model: getModel('portal'), anim: newAnim(getModel('portal')), yaw: 0 }); }
    toast('VARKHAZ VAI ESPERAR', true, 'ache as memórias que faltam e volte ao ninho'); setMusic('peaks');
  }
  updateObjective();
}
function poseCalmDragon(A, t, talking) {
  A[1].ty = -.55 + Math.sin(t * 1.2) * .03;
  for (let i = 2; i <= 5; i++) A[i].rx = talking ? 0 : .17;
  A[6].rx = talking ? -.1 : .35 + Math.sin(t * .6) * .05; A[6].ry = talking ? 0 : Math.sin(t * .3) * .2; A[7].rx = .03;
  for (let i = 0; i < 6; i++) A[8 + i].ry = Math.sin(t * .5 - i * .5) * .1;
  A[14].rz = -.35; A[15].rz = -.5; A[16].rz = .35; A[17].rz = .5;
  for (const k of [18, 19]) { A[k].rx = -1.0; A[k].ty = -.4; } for (const k of [20, 21]) { A[k].rx = .5; A[k].ty = -.45; }
}
function epilogue(kind) {
  const s = G.save, q = s.q || {}, done = id => q[id] && q[id].st === 'done', L = [];
  if (kind === 'A') {
    L.push('Você abriu o peito de brasa de Varkhaz. A última brasa subiu, girou no Tear, e o Sol voltou a nascer sobre Tessária.');
    L.push('O dragão sorriu antes de se desfazer em fagulhas. Pela primeira vez em sete invernos, não precisava mais segurar nada.');
    L.push(s.apple ? 'O Vovô Brann plantou mais uma macieira no alto do morro. "Pra ele achar o caminho", disse, e não explicou mais nada.' : 'No alto do morro, Kiko deixa uma maçã todo ano para alguém que não vai voltar.');
    L.push('O Desfiado esperou o primeiro amanhecer na beira da fonte. Quando a luz tocou seu rosto, ele terminou de se desfazer, em paz.');
  } else {
    L.push('Você lembrou de tudo: do rei com medo, do Tecelão culpado, da criança e da maçã. Fio por fio, costurou a mente de Varkhaz de volta ao lugar.');
    L.push('O dragão abriu os olhos, azuis como fogo frio, e disse o próprio nome pela primeira vez em sete invernos.');
    L.push('Depois subiu ao céu e se acendeu. Um Sol novo, quente e vivo, que às vezes pisca para a vila ao entardecer.');
    L.push(s.apple ? 'O Vovô Brann chorou no morro. Na manhã seguinte, havia uma escama dourada no lugar da maçã que ele deixou.' : 'Kiko deixou uma maçã no morro. No dia seguinte, ela tinha sumido.');
    L.push('O Desfiado não se desfez. Você costurou ele de volta, devagar. Hoje ele ensina as crianças a não arrancar o que não é delas.');
  }
  L.push('Ysolde mandou gravar a verdade sobre o Rei Morgrave na pedra da fonte, para que nenhuma criança cresça com a mentira.');
  if (done('lio')) L.push('Lio cantou a canção completa na praça. Dizem que, desde então, ninguém em Tessária esquece um nome.');
  if (done('mel')) L.push('O Pão de Mel com cogumelo de luz virou receita de festa. A fila dobra a esquina toda manhã.');
  if (done('ivo')) L.push('Ivo pesca no rio do Pesqueiro com o anzol do pai e jura que os peixes agora brilham.');
  L.push(kind === 'A' ? 'Tessária está inteira. Mas o Tear guarda ecos, e as Fendas continuam abertas para quem ainda tem fôlego.' : 'Tessária lembra. E enquanto lembrar, o Sol não se apaga.');
  return L;
}
function playStory(lines, cb) { G.storyLines = lines; G.storyEnd = cb; G.storyI = 0; G.mode = 'story'; showOnly('#story'); refreshHudVis(); $('#dialog').hidden = true; storyNext(); }

/* ---- caixa de diálogo ---- */
const DLG = { q: [], cur: null, shown: 0, done: null };
// Rumores do Bardo Tomé (Bairro Leste): dicas sobre os Ermos e o co-op
const BARD_RUMORS = [
  'Dizem que na Teia Funda a Rainha guarda um casulo dourado. Quem anda nas teias fica lento… e vira jantar.',
  'Os obeliscos dos Ermos dormem. Toque em um e ele lembra de você. Toque em outro e eles conversam.',
  'Quando a lua fica vermelha nos Ermos, as feras saem em bando. Muito perigo, muita experiência.',
  'Nas Colinas Partidas as pedras caem do céu. Fique fora dos círculos e você vive pra contar.',
  'Vi gente sair de uma caverna nos Ermos com mais ouro do que entrou. A caverna devolve você na porta.',
  'Amigo caído não é amigo perdido. Fique ao lado dele e costure: três segundos e ele levanta.',
  'Na Fenda do grupo, os monstros ficam mais fortes, mas cada um leva o próprio tesouro.',
  'Se seu amigo é novato, leve ele junto: o Fio de Elo puxa ele pra perto de você. E quem ajuda ganha mais Centelhas.',
  'O lago aqui do lado tem um Peixe-Lua. Eu nunca vi. Meu avô jurava que viu.',
  'Os bonecos da arena não reclamam. Bata à vontade e veja quanto dano você faz.',
];
const BARD_SONGS = ['♪ Fio de luz, agulha e mão, costura o Sol de volta ao chão ♪', '♪ Na Vila Brasa a chama não se apaga, quem chega cansado aqui se embriaga… de histórias ♪'];
function say(lines, done) {
  DLG.q = lines.slice(); DLG.done = done || null; G.prevMode = G.mode === 'dialog' ? G.prevMode : G.mode; G.mode = 'dialog';
  input.atk = false; $('#dialog').hidden = false; $('#prompt').hidden = true; refreshHudVis(); nextLine();
}
function nextLine() {
  const L = DLG.q.shift();
  if (!L) { $('#dialog').hidden = true; DLG.cur = null; if (G.mode === 'dialog') G.mode = 'play'; refreshHudVis(); const d = DLG.done; DLG.done = null; if (d) d(); return; }
  DLG.cur = L; DLG.shown = 0; $('#dWho').textContent = L.who || ''; $('#dTxt').textContent = ''; $('#dCh').innerHTML = ''; $('#dNext').hidden = true;
  if (L.fn) { const f = L.fn; L.fn = null; DLG.pendingFn = f; } else DLG.pendingFn = null;
}
function showChoices(L) {
  const box = $('#dCh'); box.innerHTML = '';
  L.choices.forEach(c => {
    const b = document.createElement('button'); b.className = 'px'; b.textContent = c.t; b.disabled = !!c.disabled;
    b.onclick = ev => { ev.stopPropagation(); sfx('ui'); if (c.go) DLG.q.unshift(...c.go); L.choices = null; box.innerHTML = ''; if (c.fn) { $('#dialog').hidden = true; DLG.q = []; DLG.cur = null; G.mode = 'play'; refreshHudVis(); c.fn(); return; } nextLine(); };
    box.appendChild(b);
  });
  const first = box.querySelector('button:not([disabled])'); if (first && !G.touch) first.focus();
}
function updateDialog(dt) {
  const L = DLG.cur; if (!L) return;
  if (DLG.shown < L.text.length) { DLG.shown = Math.min(L.text.length, DLG.shown + dt * 55); $('#dTxt').textContent = L.text.slice(0, Math.floor(DLG.shown)); if (DLG.shown >= L.text.length) lineComplete(); }
}
function lineComplete() {
  const L = DLG.cur; $('#dTxt').textContent = L.text;
  if (DLG.pendingFn) { const f = DLG.pendingFn; DLG.pendingFn = null; f(); if (G.mode !== 'dialog') return; }
  if (L.choices) showChoices(L); else $('#dNext').hidden = false;
}
function advanceDialog() {
  const L = DLG.cur; if (!L) return;
  if (DLG.shown < L.text.length) { DLG.shown = L.text.length; lineComplete(); return; }
  if (L.choices) return;
  sfx('ui'); nextLine();
}
$('#dialog').addEventListener('click', advanceDialog);

