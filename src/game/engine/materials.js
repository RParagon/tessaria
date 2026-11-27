/* Fios de Tessária (módulo ES) · Materiais: linhas da paleta */
/* =========================================================
   MATERIAIS — linhas da paleta (5 tons cada)
   0-7 personagem · 8-15 cenário · 16-21 inimigos · 22-29 chefe
   30 centelha · 31 cura/santuário · 32-63 personagens da vila
   ========================================================= */
export const T = 2; // tamanho do ladrilho em unidades
export const EMS = new Set([6, 7, 14, 20, 21, 26, 27, 30, 31]);
export const isEm = m => EMS.has(m) || (m >= 32 && (m & 7) >= 6) || (m >= 120 && m <= 124);

