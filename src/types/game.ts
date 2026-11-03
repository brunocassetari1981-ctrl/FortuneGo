export interface BoardTile {
  id: number;
  name: string;
  type: 'go' | 'coins' | 'wheel' | 'chest' | 'minigame' | 'multiplier' | 'tax' | 'jackpot' | 'special';
  rewardValue: number;
  description: string;
  icon: string;
  color: string;
}

export interface WheelSegment {
  id: number;
  label: string;
  multiplier: number;
  colorName: string;
  colorHex: string;
  textColor: string;
  weight: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold';
  target: number;
  current: number;
  rewardCoins: number;
  rewardGems: number;
  rewardRolls: number;
  completed: boolean;
  claimed: boolean;
}

export interface Pawn {
  id: string;
  name: string;
  emoji: string;
  description: string;
  priceCoins: number;
  priceGems: number;
  unlocked: boolean;
}

export interface GameStats {
  totalRolls: number;
  totalSpins: number;
  lapsCompleted: number;
  highestMultiplier: number;
  totalCoinsWon: number;
  chestsOpened: number;
  miniGamesPlayed: number;
  cascadesTriggered: number;
}

export interface GameState {
  coins: number;
  gems: number;
  rolls: number;
  maxRolls: number;
  lastRollRefillTime: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  playerTileIndex: number;
  rollMultiplier: number;
  currentPawnId: string;
  jackpotPool: number;
  cascadeStreak: number;
  lastSpinColor: string | null;
  soundEnabled: boolean;
  stats: GameStats;
  missions: Mission[];
  unlockedPawns: string[];
}

// Slot System Types
export interface SlotSymbol {
  id: string;
  emoji: string;
  name: string;
  payout: { 3: number };
  isWild?: boolean;
  isScatter?: boolean;
  color: string;
}

export interface SlotGameDef {
  id: string;
  name: string;
  provider: string;
  audio?: string;
  thumb: string;
  banner: string;
  primaryColor: string;
  secondaryColor: string;
  bgGradient: string;
  reels: number;
  rows: number;
  paylines: number;
  symbols: SlotSymbol[];
  freeSpinsTrigger?: string;
  description: string;
  rtp: number;
  volatility: 'Baixa' | 'Média' | 'Alta';
  category: string[];
  hot?: boolean;
  new?: boolean;
}

export interface SpinResult {
  grid: string[][];
  winLines: { line: number[]; symbolId: string; count: number; payout: number }[];
  totalWin: number;
  isBigWin: boolean;
  isFreeSpin: boolean;
}
