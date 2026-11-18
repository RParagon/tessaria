// Entrega o gerador de itens de shared/items.ts ao jogo (que ainda não usa módulos).
// Importado em src/main.js ANTES do jogo, para window.TessItems existir quando ele carregar.
import * as TessItems from '../shared/items';
(window as any).TessItems = TessItems;
// Pesqueiro: peixes, iscas, varas, nível de Pescador e o mercado (as mesmas regras do servidor).
import * as TessFish from '../shared/fish';
(window as any).TessFish = TessFish;
