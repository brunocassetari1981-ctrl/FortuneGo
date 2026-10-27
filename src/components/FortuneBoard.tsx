import React, { useState } from 'react';
import {
  Flag, Coins, Package, Zap, Disc3, Gem, Sparkles, PiggyBank,
  Dices, Ticket, Trophy, Flame, Gift, Star, RefreshCw, ChevronRight
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

const reelSymbols = [
  { name: 'Coroa', icon: 'Trophy', color: 'from-yellow-400 to-amber-500', value: 'x2' },
  { name: 'Moeda', icon: 'Coins', color: 'from-orange-500 to-amber-600', value: 'x3' },
  { name: 'Gema', icon: 'Gem', color: 'from-cyan-400 to-sky-500', value: 'x5' },
  { name: 'Wild', icon: 'Sparkles', color: 'from-pink-500 to-fuchsia-600', value: 'Wild' },
  { name: 'Jackpot', icon: 'Gift', color: 'from-emerald-500 to-teal-600', value: 'x10' },
  { name: 'Bônus', icon: 'Disc3', color: 'from-violet-500 to-purple-600', value: 'x8' },
  { name: 'Fogo', icon: 'Flame', color: 'from-red-500 to-orange-600', value: 'x12' },
  { name: 'Dice', icon: 'Dices', color: 'from-blue-500 to-indigo-600', value: 'x7' },
  { name: 'Sorte', icon: 'Star', color: 'from-amber-400 to-yellow-500', value: 'x15' },
];

const getTileGridPosition = (index: number): { row: number; col: number } => {
  if (index <= 6) {
    return { row: 1, col: index + 1 };
  } else if (index <= 11) {
    return { row: (index - 6) + 1, col: 7 };
  } else if (index <= 18) {
    return { row: 7, col: 7 - (index - 12) };
  } else {
    return { row: 7 - (index - 18), col: 1 };
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

  const slotCells = Array.from({ length: 9 }, (_, index) => {
    const symbol = reelSymbols[(index + playerIndex + lapCount) % reelSymbols.length];
    return { ...symbol, id: index };
  });

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
      <div className="w-full max-w-[760px] mx-auto px-2 sm:px-4 py-2">
        <div className="flex items-center justify-between mb-3 rounded-2xl border border-emerald-400/40 bg-gradient-to-r from-emerald-950/90 via-green-900/80 to-teal-950/95 px-3 py-2 shadow-[0_0_25px_rgba(16,185,129,0.18)]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-500 text-slate-900 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-white/20">
              <span className="text-lg">🎲</span>
            </div>
            <div>
              <div className="font-fredoka text-xl font-black bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-400 bg-clip-text text-transparent leading-none">
                FortuneGo
              </div>
              <div className="text-[9px] uppercase tracking-[0.22em] text-emerald-200/80">
                {lapCount + 1}º volta
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-100">
            <div className="rounded-full border border-amber-400/50 bg-amber-500/15 px-2 py-1 text-amber-200">
              {rolls} rolls
            </div>
            <button
              onClick={onOpenWheel}
              className="flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 px-2.5 py-1.5 text-white shadow-lg shadow-pink-600/30 border border-pink-300/30"
            >
              <Disc3 className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
              <span>Roda</span>
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-slate-900/80 via-slate-900/70 to-indigo-950/80 px-3 py-2 text-center shadow-inner">
          <div className="text-[10px] sm:text-xs uppercase tracking-[0.26em] text-amber-300/90 font-black">
            Ganha até x5000
          </div>
          <div className="mt-1 flex items-center justify-center gap-2 text-[11px] sm:text-sm font-bold text-white">
            <span className="text-amber-300">5 para ganhar</span>
            <span className="text-slate-400">•</span>
            <span className="text-emerald-300">R$ {diceResult ?? '20,00'}</span>
          </div>
        </div>
      </div>

      <div className="relative w-full max-w-[760px] p-2 sm:p-3">
        <div className="absolute inset-x-0 top-10 h-16 bg-gradient-to-r from-amber-400/10 via-pink-500/10 to-amber-400/10 blur-3xl" />

        <div className="relative overflow-hidden rounded-[28px] border-4 border-amber-400/40 bg-gradient-to-br from-emerald-900 via-green-900 to-emerald-950 p-2 sm:p-4 shadow-[0_0_40px_rgba(16,185,129,0.25)]">
          <div className="space-y-2">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-xl border border-amber-400/20 bg-slate-950/60 px-2 py-1.5 text-[10px] sm:text-xs text-slate-200">
              <div className="flex items-center gap-1 text-amber-300">
                <Flame className="w-3.5 h-3.5 fill-amber-400" />
                <span>{cascadeStreak}x</span>
              </div>
              <div className="text-center font-bold uppercase tracking-[0.22em] text-emerald-200">
                {autoRoll ? 'Auto' : 'Manual'}
              </div>
              <div className="text-cyan-300 font-bold">x{rollMultiplier}</div>
            </div>

            <div className="rounded-[22px] border-4 border-amber-500/50 bg-[radial-gradient(circle at center,_rgba(245,158,11,0.18),_rgba(17,24,39,0.95)_40%,_rgba(6,78,59,0.9)_100%)] p-3 shadow-[inset_0_0_30px_rgba(251,191,36,0.1)]">
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                {slotCells.map((slot) => (
                  <div
                    key={slot.id}
                    onClick={() => setSelectedTileInfo(tiles[slot.id % tiles.length] || null)}
                    className={`group relative aspect-square overflow-hidden rounded-2xl border-2 border-amber-200/40 bg-gradient-to-br ${slot.color} p-1.5 shadow-[0_0_18px_rgba(251,191,36,0.12)] transition-transform duration-200 hover:scale-[1.03] cursor-pointer`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_55%)]" />
                    <div className="relative flex h-full w-full flex-col items-center justify-center rounded-xl border border-white/10 bg-slate-950/15 backdrop-blur-[1px]">
                      <div className="mb-1 flex items-center justify-center rounded-full bg-slate-950/35 p-1 text-lg sm:text-xl text-white shadow-inner">
                        {renderTileIcon(slot.icon, 'w-5 h-5 sm:w-6 sm:h-6')}
                      </div>
                      <div className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.14em] text-white/90">
                        {slot.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-200">
                <span className="rounded-full bg-slate-800/80 px-2 py-1">+{rollMultiplier} rolls</span>
                <span className="rounded-full bg-slate-800/80 px-2 py-1">{lapCount + 1} lap</span>
              </div>

              <div className="flex items-center gap-1.5">
                {multiplierOptions.map((mult) => (
                  <button
                    key={mult}
                    disabled={isRolling}
                    onClick={() => {
                      sound.playTick(600);
                      onChangeMultiplier(mult);
                    }}
                    className={`min-w-[42px] rounded-lg border px-2 py-1 text-[11px] font-black transition-all ${
                      rollMultiplier === mult
                        ? 'border-amber-400 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-900 shadow-lg shadow-amber-500/40'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    x{mult}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                disabled={isRolling || rolls < rollMultiplier}
                onClick={onRollDice}
                className={`flex-1 rounded-2xl border px-4 py-3 text-base font-black uppercase tracking-[0.12em] transition-all ${
                  rolls < rollMultiplier
                    ? 'border-slate-700 bg-slate-800 text-slate-500 cursor-not-allowed'
                    : isRolling
                    ? 'border-amber-500 bg-amber-600 text-white animate-pulse'
                    : 'border-amber-300 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-900 shadow-lg shadow-amber-500/30 hover:brightness-110'
                }`}
              >
                {isRolling ? 'Rolando...' : 'Roll Dice'}
              </button>

              <button
                onClick={onToggleAutoRoll}
                className={`rounded-2xl border px-3 py-3 text-[11px] font-black uppercase tracking-[0.12em] transition-all ${
                  autoRoll
                    ? 'border-red-500/60 bg-red-500/20 text-red-200 hover:bg-red-500/30'
                    : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {autoRoll ? 'Parar Auto' : 'Auto'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[760px] flex flex-wrap items-center justify-between gap-2 px-2 sm:px-4 pb-3 pt-2">
        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-300">
          <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
          <span>Tile atual: #{playerIndex + 1}</span>
        </div>

        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-300">
          <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-1">
            Pos.: {playerIndex + 1}/24
          </span>
          <button
            onClick={() => setSelectedTileInfo(tiles[playerIndex] || null)}
            className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/70 px-2 py-1 text-slate-200"
          >
            <ChevronRight className="w-3 h-3" />
            Ver tile
          </button>
        </div>
      </div>

      {selectedTileInfo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-slate-900 p-5 shadow-2xl">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-400">
                {renderTileIcon(selectedTileInfo.icon, 'w-6 h-6')}
              </div>
              <div>
                <h3 className="text-lg font-black text-white">{selectedTileInfo.name}</h3>
                <p className="text-xs text-slate-400">Tile #{selectedTileInfo.id + 1} de 24</p>
              </div>
            </div>

            <p className="mb-4 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
              {selectedTileInfo.description}
            </p>

            {selectedTileInfo.rewardValue > 0 && (
              <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300">
                <span>Base Reward:</span>
                <span>+{selectedTileInfo.rewardValue}</span>
              </div>
            )}

            <button
              onClick={() => setSelectedTileInfo(null)}
              className="w-full rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
