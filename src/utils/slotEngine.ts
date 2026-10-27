import { SlotGameDef, SlotSymbol } from '../types/game';

export interface SlotSpinResult {
  grid: string[][]; // [reel][row] symbolId
  winPaylines: Array<{ payline: number; symbolId: string; count: number; amount: number; positions: [number, number][] }>;
  totalWin: number;
  isBigWin: boolean;
  isMegaWin: boolean;
  hasWild: boolean;
  hasScatter: boolean;
}

// Paylines definitions: horizontal, diagonals, zigzag
const PAYLINES_5 = [
  // 5 lines for 3x3
  [[0,0],[1,0],[2,0]], // top row
  [[0,1],[1,1],[2,1]], // middle
  [[0,2],[1,2],[2,2]], // bottom
  [[0,0],[1,1],[2,2]], // diag \
  [[0,2],[1,1],[2,0]], // diag /
];
const PAYLINES_10 = [
  ...PAYLINES_5,
  [[0,0],[1,0],[2,1],[3,1],[4,1]],
  [[0,2],[1,2],[2,1],[3,1],[4,1]],
  [[0,1],[1,0],[2,1],[3,2],[4,1]],
  [[0,1],[1,2],[2,1],[3,0],[4,1]],
  [[0,0],[1,1],[2,0],[3,1],[4,0]],
];

export function generateSpin(game: SlotGameDef, bet: number, forcedWin?: boolean): SlotSpinResult {
  const { reels, rows, paylines, symbols } = game;
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

  // Force win injection for fun (about 28% RTP feel)
  const shouldWin = forcedWin !== undefined ? forcedWin : Math.random() < 0.34;

  // Generate grid with potential win bias
  for (let r = 0; r < reels; r++) {
    const col: string[] = [];
    for (let row = 0; row < rows; row++) {
      if (shouldWin && row === 1 && r < 3 && Math.random() < 0.55) {
        // bias middle line to match for win
        // we leave handling to evaluation
      }
      const pick = weighted[Math.floor(Math.random() * weighted.length)];
      col.push(pick.id);
    }
    grids.push(col);
  }

  // If we want to ensure a win ~40% of wins, force middle line to match
  if (shouldWin && Math.random() < 0.62) {
    const winSym = symbols.filter(s => !s.isScatter)[Math.floor(Math.random() * symbols.filter(s => !s.isScatter).length)];
    // Force middle line to have at least 3 in a row
    const winCount = Math.random() < 0.15 ? (reels >= 5 ? 5 : 3) : 3; // occasional 5-in-a-row
    for (let r = 0; r < winCount; r++) {
      grids[r][Math.floor(rows / 2)] = winSym.id;
    }
  }

  // Evaluate paylines
  const activePaylines = paylines === 5 ? PAYLINES_5 : paylines === 10 ? PAYLINES_10.slice(0, paylines) : PAYLINES_5;
  // For 5 reels, we need correct payline coords length; but our 3x3 uses 5 lines; for 5 reels adapt
  let usePaylines = activePaylines;
  if (reels === 5 && paylines > 5) {
    // Use generic 5-reel paylines (horizontal middle plus some)
    usePaylines = Array.from({ length: paylines }, (_, i) => {
      if (i < PAYLINES_10.length) return PAYLINES_10[i];
      // fallback to middle line
      return Array.from({ length: reels }, (_, reel) => [reel, Math.floor(rows/2)] as [number, number]);
    });
  } else if (reels === 3) {
    usePaylines = PAYLINES_5.slice(0, Math.min(paylines, 5));
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
  for (let pi = 0; pi < usePaylines.length; pi++) {
    const line = usePaylines[pi];
    if (!line) continue;
    // Build symbol sequence along payline
    const seq: string[] = line.map(([reel, row]) => grids[reel]?.[row]).filter(Boolean) as string[];
    if (seq.length < 3) continue;

    // Find first non-wild to determine symbol to match
    let targetId: string | null = null;
    let wildCountPrefix = 0;
    for (const sid of seq) {
      const sym = symbols.find(s => s.id === sid);
      if (!sym) continue;
      if (sym.isWild) { wildCountPrefix++; continue; }
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

    // Need at least 3 consecutive
    if (count >= 3) {
      const basePayout = targetSym.payout[3] || 5;
      // For 5-reel games, 4 or 5 in a row pays more
      let payoutMult = basePayout;
      if (count === 4 && targetSym.payout[5]) payoutMult = targetSym.payout[5]! * 0.4;
      if (count === 5 && targetSym.payout[5]) payoutMult = targetSym.payout[5]!;

      // Wild multiplier
      let wildMult = 1;
      // If line contains wild, boost
      const lineHasWild = seq.slice(0, count).some(sid => symbols.find(s => s.id === sid)?.isWild);
      if (lineHasWild) wildMult = 2;

      const amount = Math.floor(bet * payoutMult * wildMult * (count === 5 ? 1.5 : count === 4 ? 1.2 : 1));
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
