import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Award, ShoppingBag, Trophy, Dices, Menu, X } from 'lucide-react';
import { sound } from '../utils/audio';

interface CasinoHeaderProps {
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
  onDeposit: () => void;
}

export const CasinoHeader: React.FC<CasinoHeaderProps> = ({
  coins, gems, rolls, maxRolls, lastRollRefillTime, level, xp, xpToNextLevel, jackpotPool,
  soundEnabled, onToggleSound, onOpenMissions, onOpenStore, onOpenJackpotInfo, pendingMissionsCount, onDeposit
}) => {
  const [secondsUntilRefill, setSecondsUntilRefill] = useState(60);

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
    <header className="sticky top-0 z-40 w-full shadow-xl border-b border-[#1a5c3a]/60" style={{ background: 'linear-gradient(180deg, #194C38 0%, #164633 50%, #113829 100%)' }}>
      {/* Top green app bar — FortuneGo identity */}
      <div className="lobby-container px-3 py-2 flex items-center justify-between gap-2">
        {/* Left: Logo + Lv */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 flex items-center justify-center shadow-lg border border-yellow-200/80">
            <span className="text-xl">🎰</span>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-fredoka text-[18px] font-extrabold tracking-tight text-white drop-shadow">
                Fortune<span className="bg-gradient-to-r from-amber-300 to-yellow-200 bg-clip-text text-transparent">Go</span>
              </span>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-400 text-[#164633] tracking-widest">OFICIAL</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-bold text-amber-200">Lv.{level}</span>
              <div className="w-14 h-1.5 bg-black/30 rounded-full overflow-hidden border border-white/10">
                <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-300" style={{ width: `${xpPercent}%` }} />
              </div>
              <span className="text-[9px] text-white/60">{xpPercent}%</span>
            </div>
          </div>
          {/* Mobile: just FortuneGo text */}
          <div className="sm:hidden">
            <p className="font-fredoka font-extrabold text-white leading-none text-[15px]">Fortune<span className="text-amber-300">Go</span></p>
            <p className="text-[9px] text-amber-200/80 font-bold tracking-widest leading-none">Lv.{level} • {xpPercent}%</p>
          </div>
        </div>

        {/* Center: Currency Hub — compact pills like FortuneGo */}
        <div className="flex items-center gap-1.5 flex-1 justify-center max-w-[520px]">
          {/* Rolls */}
          <div className="flex items-center gap-1 bg-black/25 backdrop-blur px-2 py-1 rounded-full border border-white/10">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-inner">
              <Dices className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col leading-none">
              <div className="flex items-baseline gap-0.5">
                <span className="text-xs font-black text-white">{rolls}</span>
                <span className="text-[9px] text-white/60">/{maxRolls}</span>
              </div>
              {rolls < maxRolls && <span className="text-[8px] font-bold text-cyan-200 leading-none">+{secondsUntilRefill}s</span>}
            </div>
          </div>
          {/* Coins */}
          <div className="flex items-center gap-1 bg-black/25 backdrop-blur px-2 py-1 rounded-full border border-amber-400/30">
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-[12px] shadow">🪙</span>
            <div className="flex flex-col leading-none pr-1">
              <span className="text-xs font-black text-amber-100 tracking-tight">{coins.toLocaleString('pt-BR')}</span>
              <span className="text-[8px] font-bold text-amber-200/70 uppercase tracking-widest">Coins</span>
            </div>
          </div>
          {/* Gems */}
          <div className="hidden sm:flex items-center gap-1 bg-black/25 backdrop-blur px-2 py-1 rounded-full border border-cyan-400/30">
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-white">💎</span>
            <div className="flex flex-col leading-none pr-1">
              <span className="text-xs font-black text-cyan-100">{gems.toLocaleString('pt-BR')}</span>
              <span className="text-[8px] font-bold text-cyan-200/70 uppercase tracking-widest">Gems</span>
            </div>
          </div>
          {/* Jackpot pill */}
          <button
            onClick={() => { sound.playCoin(); onOpenJackpotInfo(); }}
            className="hidden md:flex items-center gap-1.5 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 px-2.5 py-1 rounded-full border border-yellow-300/60 shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-white drop-shadow animate-bounce-slow" />
            <div className="flex flex-col leading-none text-left">
              <span className="text-[8px] font-black tracking-widest uppercase text-white/90 leading-none">Jackpot</span>
              <span className="text-[11px] font-fredoka font-bold text-white leading-none">R$ {jackpotPool.toLocaleString('pt-BR')}</span>
            </div>
          </button>
        </div>

        {/* Right: Actions + Deposit CTA */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => { sound.playCoin(); onOpenMissions(); }} className="relative p-2 rounded-full bg-white/10 hover:bg-white/15 text-amber-100 border border-white/10 active:scale-95 cursor-pointer">
            <Award className="w-4 h-4" />
            {pendingMissionsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center leading-none animate-bounce">{pendingMissionsCount}</span>
            )}
          </button>
          <button onClick={() => { sound.playCoin(); onOpenStore(); }} className="hidden sm:flex p-2 rounded-full bg-white/10 hover:bg-white/15 text-emerald-100 border border-white/10 active:scale-95 cursor-pointer">
            <ShoppingBag className="w-4 h-4" />
          </button>
          <button onClick={onToggleSound} className={`hidden sm:flex p-2 rounded-full border active:scale-95 cursor-pointer ${soundEnabled ? 'bg-white/10 text-white border-white/10' : 'bg-red-500/20 text-red-200 border-red-400/30'}`}>
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {/* Deposit CTA — big amber like FortuneGo */}
          <button onClick={() => { sound.playCoin(); onDeposit(); }} className="ml-1 px-3 sm:px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-[#164633] font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 border border-yellow-200 active:scale-95 flex items-center gap-1 cursor-pointer">
            <span className="hidden sm:inline">💳</span> Depósito
          </button>
        </div>
      </div>

      {/* Secondary strip — jackpot marquee + promo hint (mobile) */}
      <div className="bg-black/20 border-t border-white/5">
        <div className="lobby-container flex items-center justify-between px-3 py-1.5 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="shrink-0 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-xs">🔥</span>
            <div className="overflow-hidden flex-1 relative h-4">
              <div className="absolute inset-0 flex items-center gap-6 animate-jackpot-ticker whitespace-nowrap text-xs">
                <span className="font-bold text-amber-200">🏆 Prêmio acumulado R$ {jackpotPool.toLocaleString('pt-BR')} — jogue Fortune Tiger agora! </span>
                <span className="font-bold text-cyan-200">⚡ Cascade ativo — ganhe multiplicadores exponenciais no Wheel! </span>
                <span className="font-bold text-emerald-200">🎁 Bônus de boas-vindas 100% + rodadas grátis </span>
                <span className="font-bold text-amber-200">🏆 Prêmio acumulado R$ {jackpotPool.toLocaleString('pt-BR')} — jogue Fortune Tiger agora! </span>
              </div>
            </div>
          </div>
          <button onClick={onOpenJackpotInfo} className="shrink-0 hidden sm:flex items-center gap-1 text-[11px] font-bold text-amber-200 hover:text-white cursor-pointer">Ver prêmios <span>›</span></button>
        </div>
      </div>
    </header>
  );
};
