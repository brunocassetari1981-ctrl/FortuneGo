import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Sparkles, Gem, Dices, ShoppingBag, Award, Trophy } from 'lucide-react';
import { sound } from '../utils/audio';

interface HeaderProps {
  coins: number;
  gems: number;
  rolls: number;
  maxRolls: number;
  lastRollRefillTime: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  jackpotPool: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenMissions: () => void;
  onOpenStore: () => void;
  onOpenJackpotInfo: () => void;
  pendingMissionsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  coins,
  gems,
  rolls,
  maxRolls,
  lastRollRefillTime,
  level,
  xp,
  xpToNextLevel,
  jackpotPool,
  soundEnabled,
  onToggleSound,
  onOpenMissions,
  onOpenStore,
  onOpenJackpotInfo,
  pendingMissionsCount
}) => {
  const [secondsUntilRefill, setSecondsUntilRefill] = useState<number>(60);

  // Timer for +1 roll every 60 seconds if under maxRolls
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastRollRefillTime) / 1000);
      const remaining = Math.max(0, 60 - (elapsed % 60));
      setSecondsUntilRefill(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastRollRefillTime]);

  const xpPercent = Math.min(100, Math.round((xp / xpToNextLevel) * 100));

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-amber-500/20 px-3 py-2 shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Left: Brand & Level */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-yellow-200">
              <span className="text-xl">🎲</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-fredoka text-lg font-bold bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
                  FortuneGo
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                  Live
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-bold text-slate-300">Lv.{level}</span>
                <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Currency Hub */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Rolls / Dice Energy */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1 rounded-xl border border-blue-500/30 shadow-inner">
            <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Dices className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1 leading-tight">
                <span className="font-bold text-blue-300 text-sm">{rolls}</span>
                <span className="text-[10px] text-slate-400">/{maxRolls}</span>
              </div>
              {rolls < maxRolls && (
                <span className="text-[9px] text-blue-400/80 leading-none">
                  +{secondsUntilRefill}s
                </span>
              )}
            </div>
          </div>

          {/* Coins */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1 rounded-xl border border-amber-500/30 shadow-inner">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 animate-pulse">
              <span className="text-sm">🪙</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-amber-300 text-sm tracking-tight">
                {coins.toLocaleString()}
              </span>
              <span className="text-[9px] text-amber-400/70 uppercase tracking-widest leading-none">Coins</span>
            </div>
          </div>

          {/* Gems */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1 rounded-xl border border-cyan-500/30 shadow-inner">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Gem className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-cyan-300 text-sm tracking-tight">
                {gems.toLocaleString()}
              </span>
              <span className="text-[9px] text-cyan-400/70 uppercase tracking-widest leading-none">Gems</span>
            </div>
          </div>

          {/* Jackpot Pool Pill */}
          <button
            onClick={() => {
              sound.playCoin();
              onOpenJackpotInfo();
            }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600/30 via-yellow-500/20 to-amber-600/30 hover:from-amber-600/40 hover:to-yellow-500/30 px-2.5 py-1 rounded-xl border border-amber-400/40 transition-transform active:scale-95 cursor-pointer"
            title="Grand Jackpot"
          >
            <Trophy className="w-3.5 h-3.5 text-yellow-400 animate-bounce-slow" />
            <div className="flex flex-col text-left">
              <span className="text-[9px] text-yellow-300 font-semibold tracking-wider uppercase leading-none">
                Grand Jackpot
              </span>
              <span className="font-fredoka text-xs font-bold text-yellow-200">
                🪙 {jackpotPool.toLocaleString()}
              </span>
            </div>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Daily Missions */}
          <button
            onClick={() => {
              sound.playCoin();
              onOpenMissions();
            }}
            className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/40 transition-all cursor-pointer active:scale-95"
            title="Daily Missions"
          >
            <Award className="w-4 h-4" />
            {pendingMissionsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                {pendingMissionsCount}
              </span>
            )}
          </button>

          {/* Store */}
          <button
            onClick={() => {
              sound.playCoin();
              onOpenStore();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 hover:border-emerald-500/40 transition-all cursor-pointer active:scale-95"
            title="Store & Pawns"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
              soundEnabled
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-red-950/40 hover:bg-red-900/50 text-red-400 border-red-500/30'
            }`}
            title={soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
