import React, { useState } from 'react';
import { 
  Flag, Coins, Package, Zap, Disc3, Gem, Sparkles, PiggyBank, 
  Dices, Ticket, Trophy, Flame, Gift, Star, RefreshCw, ChevronRight, Play, Square
} from 'lucide-react';
import { BoardTile, Pawn } from '../types/game';
import { sound } from '../utils/audio';

interface FortuneBoardProps {
  tiles: BoardTile[];
  playerIndex: number;
  currentPawn: Pawn;
  rolls: number;
  rollMultiplier: number;
  onChangeMultiplier: (m: number) => void;
  onRollDice: () => void;
  isRolling: boolean;
  diceResult: number | null;
  cascadeStreak: number;
  onOpenWheel: () => void;
  autoRoll: boolean;
  onToggleAutoRoll: () => void;
  lapCount: number;
}

// Icon mapper for tiles
const renderTileIcon = (iconName: string, className: string = 'w-4 h-4') => {
  switch (iconName) {
    case 'Flag': return <Flag className={className} />;
    case 'Coins': return <Coins className={className} />;
    case 'Package': return <Package className={className} />;
    case 'Zap': return <Zap className={className} />;
    case 'Disc3': return <Disc3 className={className} />;
    case 'Gem': return <Gem className={className} />;
    case 'Sparkles': return <Sparkles className={className} />;
    case 'PiggyBank': return <PiggyBank className={className} />;
    case 'Dices': return <Dices className={className} />;
    case 'Ticket': return <Ticket className={className} />;
    case 'Trophy': return <Trophy className={className} />;
    case 'Flame': return <Flame className={className} />;
    case 'Gift': return <Gift className={className} />;
    case 'Star': return <Star className={className} />;
    default: return <Coins className={className} />;
  }
};

// 7x7 Grid coordinates for the 24 perimeter tiles
const getTileGridPosition = (index: number): { row: number; col: number } => {
  if (index <= 6) {
    return { row: 1, col: index + 1 }; // 1 to 7
  } else if (index <= 11) {
    return { row: (index - 6) + 1, col: 7 }; // row 2 to 6, col 7
  } else if (index <= 18) {
    return { row: 7, col: 7 - (index - 12) }; // row 7, col 7 down to 1
  } else {
    return { row: 7 - (index - 18), col: 1 }; // row 6 down to 2, col 1
  }
};

export const FortuneBoard: React.FC<FortuneBoardProps> = ({
  tiles,
  playerIndex,
  currentPawn,
  rolls,
  rollMultiplier,
  onChangeMultiplier,
  onRollDice,
  isRolling,
  diceResult,
  cascadeStreak,
  onOpenWheel,
  autoRoll,
  onToggleAutoRoll,
  lapCount
}) => {
  const [selectedTileInfo, setSelectedTileInfo] = useState<BoardTile | null>(null);

  const multiplierOptions = [1, 2, 3, 5];

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      {/* Board Top Stats Bar */}
      <div className="w-full flex items-center justify-between px-3 py-1.5 mb-2 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-bold text-amber-400">🏁 Lap: #{lapCount + 1}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">Position: Tile {playerIndex + 1}/24</span>
        </div>
        <div className="flex items-center gap-2">
          {cascadeStreak > 0 && (
            <div className="flex items-center gap-1 bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
              <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="font-bold">Cascade {cascadeStreak}x Chain!</span>
            </div>
          )}
          <button
            onClick={onOpenWheel}
            className="flex items-center gap-1 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold px-2.5 py-1 rounded-lg text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Disc3 className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
            <span>Spin Wheel</span>
          </button>
        </div>
      </div>

      {/* Main 7x7 Board Container */}
      <div className="relative w-full aspect-square max-w-[580px] p-2 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 rounded-3xl border-2 border-amber-500/30 shadow-2xl shadow-indigo-950/80">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

        {/* 7x7 Grid */}
        <div className="grid grid-cols-7 grid-rows-7 gap-1 sm:gap-1.5 w-full h-full relative z-10">
          {/* Render all 24 perimeter tiles */}
          {tiles.map((tile) => {
            const { row, col } = getTileGridPosition(tile.id);
            const isPlayerHere = playerIndex === tile.id;
            const isGo = tile.type === 'go';
            const isJackpot = tile.type === 'jackpot';
            const isWheel = tile.type === 'wheel';

            return (
              <div
                key={tile.id}
                onClick={() => setSelectedTileInfo(tile)}
                style={{ gridRow: row, gridColumn: col }}
                className={`relative rounded-xl flex flex-col items-center justify-between p-1 cursor-pointer transition-all duration-200 select-none ${
                  isPlayerHere
                    ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 scale-105 z-20 shadow-lg shadow-amber-400/50'
                    : 'hover:scale-102 hover:brightness-110 z-10'
                } ${
                  isGo
                    ? 'bg-gradient-to-br from-emerald-600 to-green-700 border border-emerald-400 text-white'
                    : isJackpot
                    ? 'bg-gradient-to-br from-yellow-500 via-amber-400 to-amber-600 border border-yellow-300 text-slate-950'
                    : isWheel
                    ? 'bg-gradient-to-br from-pink-600 to-purple-700 border border-pink-400 text-white'
                    : tile.type === 'minigame'
                    ? 'bg-gradient-to-br from-violet-600 to-indigo-700 border border-violet-400 text-white'
                    : tile.type === 'chest'
                    ? 'bg-gradient-to-br from-purple-800 to-slate-800 border border-purple-400 text-purple-200'
                    : tile.type === 'multiplier'
                    ? 'bg-gradient-to-br from-blue-700 to-cyan-800 border border-cyan-400 text-cyan-100'
                    : 'bg-slate-800/90 border border-slate-700/80 text-slate-200'
                }`}
              >
                {/* Tile Number badge */}
                <span className="absolute top-0.5 left-1 text-[8px] sm:text-[9px] font-mono opacity-60">
                  {tile.id + 1}
                </span>

                {/* Tile Icon */}
                <div className="mt-1 flex items-center justify-center">
                  {renderTileIcon(tile.icon, 'w-3 h-3 sm:w-4 sm:h-4')}
                </div>

                {/* Tile Label */}
                <div className="w-full text-center px-0.5">
                  <p className="text-[7px] sm:text-[9px] font-bold leading-tight truncate">
                    {tile.name}
                  </p>
                  {tile.rewardValue > 0 && (
                    <p className="text-[6.5px] sm:text-[8px] font-medium opacity-90 truncate leading-none mt-0.5">
                      +{tile.rewardValue}
                    </p>
                  )}
                </div>

                {/* Player Pawn Marker */}
                {isPlayerHere && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30 animate-bounce-slow">
                    <div className="text-xl sm:text-2xl filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]">
                      {currentPawn.emoji}
                    </div>
                    <div className="w-2 h-1 bg-amber-400 rounded-full blur-[1px]" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Central Area: Dice Roll & Cockpit (Row 2-6, Col 2-6) */}
          <div
            style={{ gridRow: '2 / 7', gridColumn: '2 / 7' }}
            className="rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-indigo-950/95 p-3 flex flex-col items-center justify-between border border-amber-500/20 backdrop-blur-sm shadow-inner"
          >
            {/* Top Center: Multiplier Chips */}
            <div className="w-full flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Bet Multiplier:
              </span>
              <div className="flex items-center gap-1">
                {multiplierOptions.map((mult) => (
                  <button
                    key={mult}
                    disabled={isRolling}
                    onClick={() => {
                      sound.playTick(600);
                      onChangeMultiplier(mult);
                    }}
                    className={`px-2 py-0.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      rollMultiplier === mult
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/40 scale-105'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    x{mult}
                  </button>
                ))}
              </div>
            </div>

            {/* Middle: 3D Animated Dice */}
            <div className="flex flex-col items-center my-auto">
              <div className="relative my-2">
                <div
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-white via-slate-100 to-slate-200 border-2 border-amber-400 shadow-xl shadow-amber-500/20 flex items-center justify-center transition-transform duration-300 ${
                    isRolling ? 'animate-spin scale-110' : 'hover:rotate-3'
                  }`}
                >
                  {isRolling ? (
                    <Dices className="w-10 h-10 sm:w-12 sm:h-12 text-amber-500 animate-pulse" />
                  ) : (
                    <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-fredoka flex flex-col items-center">
                      <span>{diceResult ?? '🎲'}</span>
                      {diceResult && (
                        <span className="text-[9px] uppercase tracking-wider text-amber-600 font-bold -mt-1">
                          Rolled
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center">
                <p className="text-xs text-slate-300 font-medium">
                  Cost: <span className="text-blue-400 font-bold">{rollMultiplier} Rolls</span>
                </p>
              </div>
            </div>

            {/* Bottom: Roll & Auto-Roll Action Controls */}
            <div className="w-full flex flex-col sm:flex-row items-center gap-2">
              <button
                disabled={isRolling || rolls < rollMultiplier}
                onClick={onRollDice}
                className={`flex-1 w-full py-2.5 sm:py-3 px-4 rounded-xl font-bold font-fredoka text-base sm:text-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
                  rolls < rollMultiplier
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    : isRolling
                    ? 'bg-amber-600 text-white animate-pulse'
                    : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 hover:brightness-110 shadow-amber-500/30'
                }`}
              >
                <Dices className="w-5 h-5" />
                <span>{isRolling ? 'ROLLING...' : 'ROLL DICE!'}</span>
              </button>

              <button
                disabled={rolls < rollMultiplier}
                onClick={onToggleAutoRoll}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  autoRoll
                    ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="Toggle Auto-Roll"
              >
                {autoRoll ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-red-400" />
                    <span>Stop Auto</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-slate-300" />
                    <span>Auto Roll</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Tile Inspector Modal / Tooltip */}
      {selectedTileInfo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/40">
                {renderTileIcon(selectedTileInfo.icon, 'w-6 h-6')}
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">{selectedTileInfo.name}</h3>
                <p className="text-xs text-slate-400">Tile #{selectedTileInfo.id + 1} of 24</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mb-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              {selectedTileInfo.description}
            </p>
            {selectedTileInfo.rewardValue > 0 && (
              <div className="flex items-center justify-between text-xs text-amber-300 font-bold mb-4 px-1">
                <span>Base Reward:</span>
                <span>+{selectedTileInfo.rewardValue}</span>
              </div>
            )}
            <button
              onClick={() => setSelectedTileInfo(null)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
