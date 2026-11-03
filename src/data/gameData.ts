import { BoardTile, WheelSegment, Mission, Pawn, GameState } from '../types/game';

export const BOARD_TILES: BoardTile[] = [
  {
    id: 0,
    name: 'GO!',
    type: 'go',
    rewardValue: 500,
    description: 'Pass or land to collect +500 Coins!',
    icon: 'Flag',
    color: 'from-emerald-500 to-green-600'
  },
  {
    id: 1,
    name: 'Gold Mine',
    type: 'coins',
    rewardValue: 150,
    description: 'Collect 150 Coins',
    icon: 'Coins',
    color: 'from-amber-500 to-yellow-600'
  },
  {
    id: 2,
    name: 'Mystery Chest',
    type: 'chest',
    rewardValue: 0,
    description: 'Pick a mystery chest for rare loot!',
    icon: 'Package',
    color: 'from-purple-500 to-indigo-600'
  },
  {
    id: 3,
    name: 'Lucky 2x Boost',
    type: 'multiplier',
    rewardValue: 2,
    description: 'Doubles your next turn earnings!',
    icon: 'Zap',
    color: 'from-blue-500 to-cyan-600'
  },
  {
    id: 4,
    name: 'Fortune Wheel',
    type: 'wheel',
    rewardValue: 0,
    description: 'Free Spin on Rainbow Fortune Wheel!',
    icon: 'Disc3',
    color: 'from-pink-500 to-rose-600'
  },
  {
    id: 5,
    name: 'Gem Vault',
    type: 'coins',
    rewardValue: 250,
    description: 'Collect 250 Coins + 2 Gems',
    icon: 'Gem',
    color: 'from-cyan-500 to-teal-600'
  },
  {
    id: 6,
    name: 'Plinko Drop',
    type: 'minigame',
    rewardValue: 0,
    description: 'Drop the golden ball for cascade multipliers!',
    icon: 'Sparkles',
    color: 'from-violet-500 to-fuchsia-600'
  },
  {
    id: 7,
    name: 'Gold Stash',
    type: 'coins',
    rewardValue: 300,
    description: 'Collect 300 Coins',
    icon: 'Coins',
    color: 'from-amber-500 to-yellow-600'
  },
  {
    id: 8,
    name: 'Bribe & Tax',
    type: 'tax',
    rewardValue: 100,
    description: 'Contribute 100 coins to the Grand Jackpot!',
    icon: 'PiggyBank',
    color: 'from-red-500 to-rose-600'
  },
  {
    id: 9,
    name: 'Energy Station',
    type: 'special',
    rewardValue: 5,
    description: 'Recharge +5 Free Dice Rolls!',
    icon: 'Dices',
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 10,
    name: 'Fortune Wheel',
    type: 'wheel',
    rewardValue: 0,
    description: 'Free Spin on Rainbow Fortune Wheel!',
    icon: 'Disc3',
    color: 'from-pink-500 to-rose-600'
  },
  {
    id: 11,
    name: 'Scratch & Win',
    type: 'minigame',
    rewardValue: 0,
    description: 'Scratch 3 matching tiles to win up to 25x!',
    icon: 'Ticket',
    color: 'from-orange-500 to-amber-600'
  },
  {
    id: 12,
    name: 'Jackpot Oasis',
    type: 'jackpot',
    rewardValue: 1000,
    description: 'Claim 10% of the Progressive Jackpot Pool!',
    icon: 'Trophy',
    color: 'from-yellow-400 to-amber-600'
  },
  {
    id: 13,
    name: 'Royal Treasury',
    type: 'coins',
    rewardValue: 400,
    description: 'Collect 400 Coins',
    icon: 'Coins',
    color: 'from-amber-500 to-yellow-600'
  },
  {
    id: 14,
    name: 'Mystery Chest',
    type: 'chest',
    rewardValue: 0,
    description: 'Open a golden chest for gems and rolls!',
    icon: 'Package',
    color: 'from-purple-500 to-indigo-600'
  },
  {
    id: 15,
    name: 'Turbo Boost 3x',
    type: 'multiplier',
    rewardValue: 3,
    description: 'Triple your next reward payout!',
    icon: 'Flame',
    color: 'from-red-500 to-orange-600'
  },
  {
    id: 16,
    name: 'Fortune Wheel',
    type: 'wheel',
    rewardValue: 0,
    description: 'Spin for cascading rainbow multipliers!',
    icon: 'Disc3',
    color: 'from-pink-500 to-rose-600'
  },
  {
    id: 17,
    name: 'Diamond Mine',
    type: 'coins',
    rewardValue: 500,
    description: 'Collect 500 Coins + 3 Gems',
    icon: 'Gem',
    color: 'from-cyan-500 to-blue-600'
  },
  {
    id: 18,
    name: 'Lucky Box Portal',
    type: 'minigame',
    rewardValue: 0,
    description: 'Pick from 3 mysterious golden boxes!',
    icon: 'Gift',
    color: 'from-emerald-500 to-green-600'
  },
  {
    id: 19,
    name: 'Gold Rush',
    type: 'coins',
    rewardValue: 450,
    description: 'Collect 450 Coins',
    icon: 'Coins',
    color: 'from-amber-500 to-yellow-600'
  },
  {
    id: 20,
    name: 'Roll Recharge',
    type: 'special',
    rewardValue: 8,
    description: 'Supercharge +8 Free Dice Rolls!',
    icon: 'Dices',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 21,
    name: 'Fortune Wheel',
    type: 'wheel',
    rewardValue: 0,
    description: 'High-stakes wheel spin opportunity!',
    icon: 'Disc3',
    color: 'from-pink-500 to-rose-600'
  },
  {
    id: 22,
    name: 'Mystery Chest',
    type: 'chest',
    rewardValue: 0,
    description: 'Rare relic or coin hoard inside!',
    icon: 'Package',
    color: 'from-purple-500 to-indigo-600'
  },
  {
    id: 23,
    name: 'Star Cascade',
    type: 'multiplier',
    rewardValue: 5,
    description: '5x Mega Multiplier on next landing!',
    icon: 'Star',
    color: 'from-amber-400 to-yellow-500'
  }
];

export const WHEEL_SEGMENTS: WheelSegment[] = [
  { id: 0, label: '2x', multiplier: 2, colorName: 'Orange', colorHex: '#F97316', textColor: '#FFFFFF', weight: 25 },
  { id: 1, label: '3x', multiplier: 3, colorName: 'Green', colorHex: '#10B981', textColor: '#FFFFFF', weight: 22 },
  { id: 2, label: '4x', multiplier: 4, colorName: 'Blue', colorHex: '#3B82F6', textColor: '#FFFFFF', weight: 18 },
  { id: 3, label: '5x', multiplier: 5, colorName: 'Red', colorHex: '#EF4444', textColor: '#FFFFFF', weight: 14 },
  { id: 4, label: '8x', multiplier: 8, colorName: 'Cyan', colorHex: '#06B6D4', textColor: '#FFFFFF', weight: 10 },
  { id: 5, label: '10x', multiplier: 10, colorName: 'Yellow', colorHex: '#EAB308', textColor: '#1E293B', weight: 6 },
  { id: 6, label: '15x', multiplier: 15, colorName: 'Purple', colorHex: '#A855F7', textColor: '#FFFFFF', weight: 4 },
  { id: 7, label: '50x JACKPOT', multiplier: 50, colorName: 'Rainbow Gold', colorHex: '#F59E0B', textColor: '#451A03', weight: 1 }
];

export const AVAILABLE_PAWNS: Pawn[] = [
  { id: 'cat', name: 'Maneki Neko (Lucky Cat)', emoji: '🐱', description: 'Brings prosperity and good luck on coin tiles.', priceCoins: 0, priceGems: 0, unlocked: true },
  { id: 'crown', name: 'Royal Crown', emoji: '👑', description: 'Boosts jackpot payouts by 10%.', priceCoins: 2500, priceGems: 10, unlocked: false },
  { id: 'die', name: 'Golden Die', emoji: '🎲', description: 'Gives +2 starting rolls cap.', priceCoins: 5000, priceGems: 25, unlocked: false },
  { id: 'rocket', name: 'Fortune Rocket', emoji: '🚀', description: 'High speed roller with trailing sparklers.', priceCoins: 10000, priceGems: 50, unlocked: false },
  { id: 'dragon', name: 'Imperial Dragon', emoji: '🐲', description: 'Legendary mascot with rainbow cascades.', priceCoins: 25000, priceGems: 100, unlocked: false }
];

export const INITIAL_MISSIONS: Mission[] = [
  // Bronze Tier
  {
    id: 'm1',
    title: 'Roll the Dice',
    description: 'Roll dice 10 times on the Fortune Board',
    tier: 'bronze',
    target: 10,
    current: 0,
    rewardCoins: 300,
    rewardGems: 2,
    rewardRolls: 5,
    completed: false,
    claimed: false
  },
  {
    id: 'm2',
    title: 'Board Explorer',
    description: 'Complete 1 full lap around the board',
    tier: 'bronze',
    target: 1,
    current: 0,
    rewardCoins: 500,
    rewardGems: 3,
    rewardRolls: 5,
    completed: false,
    claimed: false
  },
  {
    id: 'm3',
    title: 'Loot Collector',
    description: 'Open 2 Mystery Chests',
    tier: 'bronze',
    target: 2,
    current: 0,
    rewardCoins: 400,
    rewardGems: 2,
    rewardRolls: 4,
    completed: false,
    claimed: false
  },
  // Silver Tier
  {
    id: 'm4',
    title: 'Wheel Spinner',
    description: 'Spin the Rainbow Fortune Wheel 5 times',
    tier: 'silver',
    target: 5,
    current: 0,
    rewardCoins: 1000,
    rewardGems: 5,
    rewardRolls: 8,
    completed: false,
    claimed: false
  },
  {
    id: 'm5',
    title: 'Mini-Game Master',
    description: 'Play 3 mini-games',
    tier: 'silver',
    target: 3,
    current: 0,
    rewardCoins: 1200,
    rewardGems: 6,
    rewardRolls: 10,
    completed: false,
    claimed: false
  },
  {
    id: 'm6',
    title: 'Multiplier Hunt',
    description: 'Hit a 5x or higher multiplier',
    tier: 'silver',
    target: 1,
    current: 0,
    rewardCoins: 1500,
    rewardGems: 8,
    rewardRolls: 10,
    completed: false,
    claimed: false
  },
  // Gold Tier
  {
    id: 'm7',
    title: 'Cascade Champion',
    description: 'Trigger a consecutive color cascade match',
    tier: 'gold',
    target: 1,
    current: 0,
    rewardCoins: 3000,
    rewardGems: 15,
    rewardRolls: 15,
    completed: false,
    claimed: false
  },
  {
    id: 'm8',
    title: 'Fortune Tycoon',
    description: 'Win a total of 10,000 coins',
    tier: 'gold',
    target: 10000,
    current: 0,
    rewardCoins: 5000,
    rewardGems: 25,
    rewardRolls: 20,
    completed: false,
    claimed: false
  }
];

export const INITIAL_GAME_STATE: GameState = {
  coins: 2500,
  gems: 15,
  rolls: 30,
  maxRolls: 40,
  lastRollRefillTime: Date.now(),
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  playerTileIndex: 0,
  rollMultiplier: 1,
  currentPawnId: 'cat',
  jackpotPool: 88888,
  cascadeStreak: 0,
  lastSpinColor: null,
  soundEnabled: true,
  stats: {
    totalRolls: 0,
    totalSpins: 0,
    lapsCompleted: 0,
    highestMultiplier: 1,
    totalCoinsWon: 0,
    chestsOpened: 0,
    miniGamesPlayed: 0,
    cascadesTriggered: 0
  },
  missions: INITIAL_MISSIONS,
  unlockedPawns: ['cat']
};

const STORAGE_KEY = 'fortune_go_save_v1';

export function loadGameState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure merged integrity with initial defaults
      return {
        ...INITIAL_GAME_STATE,
        ...parsed,
        stats: { ...INITIAL_GAME_STATE.stats, ...(parsed.stats || {}) },
        missions: INITIAL_MISSIONS.map(m => {
          const saved = parsed.missions?.find((sm: Mission) => sm.id === m.id);
          return saved ? { ...m, ...saved } : m;
        }),
        unlockedPawns: parsed.unlockedPawns || ['cat']
      };
    }
  } catch (err) {
    console.warn('Could not load game state:', err);
  }
  return INITIAL_GAME_STATE;
}

export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Could not save game state:', err);
  }
}
