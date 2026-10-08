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
