// Entrega o gerador de itens de shared/items.ts ao jogo (que ainda não usa módulos).
// Importado em src/main.js ANTES do jogo, para window.TessItems existir quando ele carregar.
import * as TessItems from '../shared/items';
(window as any).TessItems = TessItems;
// Pesqueiro: peixes, iscas, varas, nível de Pescador e o mercado (as mesmas regras do servidor).
import * as TessFish from '../shared/fish';
(window as any).TessFish = TessFish;
// Temporada: Passe do Tear, missões, entrada diária e catálogo de cosméticos (as mesmas regras do servidor).
import * as TessSeason from '../shared/season';
(window as any).TessSeason = TessSeason;
// Atributos de combate que o servidor usa nos duelos (o teste confere que batem com o stats() do jogo).
import * as TessCombat from '../shared/combat';
(window as any).TessCombat = TessCombat;
