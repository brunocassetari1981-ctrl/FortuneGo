import { SlotGameDef, SlotSymbol } from '../types/game';

export const SLOT_REEL_COUNT = 3;
export const SLOT_ROW_COUNT = 3;
export const SLOT_REEL_ROW_COUNTS = [3, 4, 3] as const;
export const SLOT_PAYLINE_COUNT = 5;
export const SLOT_REEL_STRIP_LENGTH = 15;

export interface SlotSpinResult {
  grid: string[][]; // [reel][row] symbolId
  winPaylines: Array<{ payline: number; symbolId: string; count: number; amount: number; positions: [number, number][] }>;
  totalWin: number;
  isBigWin: boolean;
  isMegaWin: boolean;
  hasWild: boolean;
  hasScatter: boolean;
}

const PAYLINES = [
  [[0,0],[1,0],[2,0]],
  [[0,1],[1,1],[2,1]],
  [[0,2],[1,3],[2,2]],
  [[0,0],[1,2],[2,2]],
  [[0,2],[1,2],[2,0]],
];

export function generateSpin(game: SlotGameDef, bet: number, forcedWin?: boolean): SlotSpinResult {
  const { symbols } = game;
  const grids: string[][] = [];

  // Build weighted symbol pools — wild/scatter rarer, low-payout more common
  const weighted: SlotSymbol[] = [];
  symbols.forEach(s => {
    let weight = 10;
    if (s.isWild) weight = 3;
    if (s.isScatter) weight = 2;
    if (s.payout[3] >= 40) weight = 4;
    else if (s.payout[3] >= 20) weight = 6;
    else weight = 12;
    for (let i = 0; i < weight; i++) weighted.push(s);
  });

  // Occasionally bias a spin toward a matching pair.
  const shouldWin = forcedWin !== undefined ? forcedWin : Math.random() < 0.34;

  // Generate grid with potential win bias
  for (let r = 0; r < SLOT_REEL_COUNT; r++) {
    const col: string[] = [];
    for (let row = 0; row < (SLOT_REEL_ROW_COUNTS[r] ?? SLOT_ROW_COUNT); row++) {
      const pick = weighted[Math.floor(Math.random() * weighted.length)];
      col.push(pick.id);
    }
    grids.push(col);
  }

  if (shouldWin && (forcedWin === true || Math.random() < 0.62)) {
    const regularSymbols = symbols.filter(s => !s.isScatter);
    const winSym = regularSymbols[Math.floor(Math.random() * regularSymbols.length)];
    const winningLine = PAYLINES[Math.floor(Math.random() * PAYLINES.length)];
    winningLine?.forEach(([reel, row]) => { grids[reel][row] = winSym.id; });
  }

  const winPaylines: SlotSpinResult['winPaylines'] = [];
  let totalWin = 0;
  let hasWild = false;
  let hasScatter = false;

  // Count scatters
  let scatterCount = 0;
  grids.forEach(col => col.forEach(symId => {
    const s = symbols.find(x => x.id === symId);
    if (s?.isWild) hasWild = true;
    if (s?.isScatter) { hasScatter = true; scatterCount++; }
  }));

  // Evaluate each payline
  for (let pi = 0; pi < PAYLINES.length; pi++) {
    const line = PAYLINES[pi];
    if (!line) continue;
    // Build symbol sequence along payline
    const seq: string[] = line.map(([reel, row]) => grids[reel]?.[row]).filter(Boolean) as string[];
    if (seq.length < SLOT_REEL_COUNT) continue;

    // Find first non-wild to determine symbol to match
    let targetId: string | null = null;
    for (const sid of seq) {
      const sym = symbols.find(s => s.id === sid);
      if (!sym) continue;
      if (sym.isWild) continue;
      targetId = sid;
      break;
    }
    if (!targetId) {
      // all wilds -> treat as wild win
      targetId = symbols.find(s => s.isWild)?.id || seq[0];
    }
    if (!targetId) continue;
    const targetSym = symbols.find(s => s.id === targetId);
    if (!targetSym) continue;

    // Count consecutive matching (wild substitutes)
    let count = 0;
    const positions: [number, number][] = [];
    for (let i = 0; i < seq.length; i++) {
      const sid = seq[i];
      const sym = symbols.find(s => s.id === sid);
      if (!sym) break;
      if (sid === targetId || sym.isWild) {
        count++;
        positions.push(line[i] as [number, number]);
      } else break;
    }

    if (count >= SLOT_REEL_COUNT) {
      const basePayout = targetSym.payout[3] || 5;
      // Wild multiplier
      let wildMult = 1;
      // If line contains wild, boost
      const lineHasWild = seq.slice(0, count).some(sid => symbols.find(s => s.id === sid)?.isWild);
      if (lineHasWild) wildMult = 2;

      const amount = Math.floor(bet * basePayout * wildMult);
      if (amount > 0) {
        winPaylines.push({ payline: pi, symbolId: targetId, count, amount, positions });
        totalWin += amount;
      }
    }
  }

  // Scatter bonus (not payline-based)
  if (scatterCount >= 3) {
    const scatterBonus = bet * (scatterCount === 3 ? 5 : scatterCount === 4 ? 15 : 50);
    totalWin += scatterBonus;
    // add pseudo payline for scatter
    winPaylines.push({ payline: 99, symbolId: symbols.find(s => s.isScatter)?.id || 'scatter', count: scatterCount, amount: scatterBonus, positions: [] });
  }

  // Small consolation for near misses? No, keep as is.

  const isBigWin = totalWin >= bet * 10;
  const isMegaWin = totalWin >= bet * 25;

  return {
    grid: grids,
    winPaylines,
    totalWin,
    isBigWin,
    isMegaWin,
    hasWild,
    hasScatter,
  };
}

export function getSymbolById(game: SlotGameDef, id: string): SlotSymbol | undefined {
  return game.symbols.find(s => s.id === id);
}
