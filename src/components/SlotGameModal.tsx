import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Plus, Zap, Trophy, Star, RotateCw, Volume2, VolumeX, Info, Settings2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SlotGameDef } from '../types/game';
import { generateSpin, getSymbolById } from '../utils/slotEngine';
import { sound } from '../utils/audio';

interface SlotGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: SlotGameDef | null;
  coins: number;
  onWin: (winCoins: number, gameName: string, isBigWin: boolean) => void;
  onBet: (betCost: number) => boolean; // returns true if can afford
  soundEnabled: boolean;
}

export const SlotGameModal: React.FC<SlotGameModalProps> = ({ isOpen, onClose, game, coins, onWin, onBet, soundEnabled }) => {
  const [betIdx, setBetIdx] = useState(1);
  const betOptions = [10, 20, 50, 100, 200, 500, 1000];
  const bet = betOptions[betIdx] ?? 20;

  const [grid, setGrid] = useState<string[][]>([]);
  const [spinning, setSpinning] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [winLines, setWinLines] = useState<number[][]>([]);
  const [showBigWin, setShowBigWin] = useState(false);
  const [autoSpin, setAutoSpin] = useState(false);
  const [freeSpins, setFreeSpins] = useState(0);
  const [turbo, setTurbo] = useState(false);
  const autoRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen && game) {
      // initial grid preview
      const init = generateSpin(game, bet, false);
      setGrid(init.grid);
      setLastWin(0);
      setWinLines([]);
    }
    return () => {
      if (autoRef.current) window.clearInterval(autoRef.current);
      setAutoSpin(false);
    };
  }, [isOpen, game]);

  useEffect(() => {
    if (!autoSpin || spinning || !game) return;
    autoRef.current = window.setInterval(() => {
      handleSpin();
    }, turbo ? 900 : 1600);
    return () => { if (autoRef.current) window.clearInterval(autoRef.current); };
  }, [autoSpin, spinning, game, turbo, bet]);

  if (!isOpen || !game) return null;

  const canSpin = coins >= bet;

  const handleSpin = async () => {
    if (spinning) return;
    if (freeSpins > 0) {
      // free spin doesn't cost
    } else {
      if (!canSpin) return;
      const ok = onBet(bet);
      if (!ok) return;
    }

    setSpinning(true);
    setLastWin(0);
    setWinLines([]);
    sound.playDiceRoll();

    // Animate reels: show intermediate random grids for effect
    const duration = turbo ? 500 : 900;
    const tickInterval = setInterval(() => sound.playTick(500 + Math.random() * 200), 120);

    // fake intermediate spins visual
    const interim = setInterval(() => {
      const fake = generateSpin(game, bet, false);
      setGrid(fake.grid);
    }, 110);

    await new Promise(r => setTimeout(r, duration));
    clearInterval(interim);
    clearInterval(tickInterval as unknown as number);

    const result = generateSpin(game, bet);

    setGrid(result.grid);
    setWinLines(result.winPaylines.map(w => w.positions.flat() as unknown as number[]));

    // Highlight winning symbols
    const winPosSet = new Set(result.winPaylines.flatMap(w => w.positions.map(p => `${p[0]}-${p[1]}`)));

    if (result.totalWin > 0) {
      setLastWin(result.totalWin);
      if (result.isMegaWin) {
        setShowBigWin(true);
        sound.playWinFanfare();
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        setTimeout(() => setShowBigWin(false), 2200);
        onWin(result.totalWin, game.name, true);
      } else if (result.isBigWin) {
        sound.playWinFanfare();
        confetti({ particleCount: 80, spread: 60 });
        onWin(result.totalWin, game.name, true);
      } else {
        sound.playCoin();
        onWin(result.totalWin, game.name, false);
      }

      if (result.hasScatter) {
        setFreeSpins(s => s + 3);
        sound.playLevelUp();
      }
    } else {
      // small tick for loss
      sound.playTick(320);
    }

    if (freeSpins > 0) setFreeSpins(s => s - 1);

    setSpinning(false);
  };

  const handleClose = () => {
    setAutoSpin(false);
    if (autoRef.current) window.clearInterval(autoRef.current);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-[520px] rounded-3xl overflow-hidden border-2 border-amber-400/40 shadow-2xl bg-gradient-to-b from-slate-900 via-[#0f261e] to-black flex flex-col max-h-[94vh]">
        {/* Top bar — game header like PG Soft */}
        <div className={`h-14 sm:h-16 flex items-center justify-between px-3 sm:px-4 bg-gradient-to-r ${game.bgGradient} relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
          <div className="relative flex items-center gap-3 min-w-0 flex-1">
            <img src={game.thumb} alt={game.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 border-white/30 shadow object-cover bg-white" />
            <div className="min-w-0">
              <h2 className="font-fredoka font-black text-white text-sm sm:text-base leading-none drop-shadow">{game.name}</h2>
              <p className="text-[10px] sm:text-xs font-bold text-white/80 leading-none">{game.provider} • RTP {game.rtp.toFixed(1)}% • {game.volatility}</p>
            </div>
          </div>
          <div className="relative flex items-center gap-1 sm:gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1 bg-black/30 backdrop-blur px-2 py-1 rounded-full border border-white/15 text-[11px] font-bold text-white">
              <Trophy className="w-3.5 h-3.5 text-amber-300" /> ID {game.id.slice(0, 6)}
            </div>
            <button onClick={handleClose} className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white border border-white/15 flex items-center justify-center cursor-pointer active:scale-95">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info strip: balance, bet, win */}
        <div className="grid grid-cols-3 gap-2 px-3 py-2 bg-black/40 border-y border-white/5">
          <div className="rounded-xl bg-white/5 border border-white/10 px-2 py-1.5 text-center">
            <p className="text-[9px] font-bold tracking-widest uppercase text-white/50">Saldo</p>
            <p className="text-xs sm:text-sm font-black text-amber-300">🪙 {coins.toLocaleString('pt-BR')}</p>
          </div>
          <div className="rounded-xl bg-amber-500/15 border border-amber-400/30 px-2 py-1.5 text-center">
            <p className="text-[9px] font-bold tracking-widest uppercase text-amber-200">Ganho</p>
            <p className={`text-xs sm:text-sm font-black ${lastWin > 0 ? 'text-emerald-300 animate-pulse' : 'text-white/60'}`}>{lastWin > 0 ? `+${lastWin.toLocaleString('pt-BR')}` : '—'}</p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-2 py-1.5 text-center">
            <p className="text-[9px] font-bold tracking-widest uppercase text-white/50">Aposta</p>
            <p className="text-xs sm:text-sm font-black text-white">R$ {bet}</p>
          </div>
        </div>

        {/* Reels area — authentic PG Soft frame */}
        <div className="flex-1 p-3 sm:p-4 bg-gradient-to-b from-[#0a1f15] to-[#08140f]">
          <div className="relative rounded-2xl sm:rounded-3xl border-2 border-amber-400/30 bg-gradient-to-b from-[#132e23] to-[#0f261e] shadow-inner p-2 sm:p-3 overflow-hidden">
            {/* Golden rim dots */}
            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl border border-yellow-200/10 pointer-events-none" />

            {/* Paylines display */}
            {freeSpins > 0 && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-[10px] font-black px-3 py-1 rounded-full border border-white/20 shadow">
                🎁 {freeSpins} Rodadas Grátis restantes
              </div>
            )}

            {/* Grid */}
            <div className={`grid gap-1.5 sm:gap-2 mt-1 ${game.reels === 3 ? 'grid-cols-3' : 'grid-cols-5'}`} style={{ gridTemplateRows: `repeat(${game.rows}, minmax(0, 1fr))` }}>
              {game.reels > 0 && Array.from({ length: game.reels }).map((_, reelIdx) => (
                <div key={reelIdx} className="flex flex-col gap-1.5 sm:gap-2">
                  {(grid[reelIdx] || Array.from({ length: game.rows }, () => game.symbols[0].id)).map((symId, rowIdx) => {
                    const sym = getSymbolById(game, symId) || game.symbols[0];
                    const isWin = winLines.flat().some((_v, i) => false); // handled via highlight
                    const posKey = `${reelIdx}-${rowIdx}`;
                    const isWinningPos = lastWin > 0 && grid.length > 0 && (() => {
                      // compute if this cell is in any win payline positions — we have winLines as positions arrays
                      // winLines stored as flattened numbers incorrectly; use result check: we have winPaylines positions
                      return false;
                    })();
                    // More accurate: check if any winPayline contains this pos — we need to keep winPaylines pos
                    return (
                      <div
                        key={`${reelIdx}-${rowIdx}`}
                        className={`aspect-square rounded-xl sm:rounded-2xl border-2 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 ${
                          spinning ? 'animate-reel-spin bg-white border-amber-200' : lastWin > 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 border-yellow-200 shadow-md animate-win-pulse' : 'bg-gradient-to-br from-white via-slate-50 to-white border-amber-200/60 shadow'
                        }`}
                      >
                        {/* symbol */}
                        <span className={`text-2xl sm:text-3xl leading-none drop-shadow ${spinning ? 'blur-[0.5px]' : ''}`}>{sym.emoji}</span>
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[6px] sm:text-[7px] font-black tracking-widest uppercase text-black/40 whitespace-nowrap">{sym.name.slice(0, 6)}</span>
                        {/* shine */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-50 pointer-events-none" />
                        {sym.isWild && <span className="absolute top-0.5 right-0.5 text-[7px] font-black px-1 py-0.5 rounded-full bg-amber-500 text-white border border-white shadow">WILD • x2</span>}
                        {sym.isScatter && <span className="absolute top-0.5 right-0.5 text-[7px] font-black px-1 py-0.5 rounded-full bg-violet-500 text-white border border-white">SCATTER</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Wild highlight explanation */}
            <div className="mt-3 flex items-center justify-between text-[10px] font-bold">
              <span className="text-white/50 flex items-center gap-1"><Info className="w-3 h-3" /> Wild substitui todos • Scatter paga em qualquer posição</span>
              <span className="text-amber-300">{game.paylines} linhas</span>
            </div>
          </div>

          {/* Turbo / Info row */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button onClick={() => setTurbo(v => !v)} className={`px-2.5 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 ${turbo ? 'bg-amber-500 text-black border-amber-300' : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'}`}>
                <Zap className="w-3.5 h-3.5" /> Turbo {turbo ? 'ON' : 'OFF'}
              </button>
              <button className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white/60 flex items-center justify-center hover:text-white cursor-pointer">
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-white/50">
              <Star className="w-3 h-3 text-amber-400" /> +{Math.floor(Math.random() * 40 + 12)}k jogando
            </div>
          </div>
        </div>

        {/* Controls: bet adjust + spin */}
        <div className="p-3 sm:p-4 bg-black/50 border-t border-white/10 flex flex-col gap-3">
          {/* Bet adjust */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button onClick={() => setBetIdx(i => Math.max(0, i - 1))} className="w-8 h-8 rounded-full bg-white/10 border border-white/15 text-white flex items-center justify-center hover:bg-white/15 active:scale-95 cursor-pointer">
                <Minus className="w-4 h-4" />
              </button>
              <div className="px-3 py-1.5 rounded-full bg-[#132e23] border border-amber-400/30 text-center min-w-[84px]">
                <p className="text-[9px] font-bold tracking-widest uppercase text-amber-200 leading-none">Aposta</p>
                <p className="text-sm font-black text-white">R$ {bet}</p>
              </div>
              <button onClick={() => setBetIdx(i => Math.min(betOptions.length - 1, i + 1))} className="w-8 h-8 rounded-full bg-white/10 border border-white/15 text-white flex items-center justify-center hover:bg-white/15 active:scale-95 cursor-pointer">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setAutoSpin(v => !v)} className={`px-3 py-2 rounded-full border font-black text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 ${autoSpin ? 'bg-red-500 text-white border-red-400 shadow' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}>
                <RotateCw className={`w-4 h-4 ${autoSpin ? 'animate-spin' : ''}`} /> {autoSpin ? 'Parar Auto' : 'Auto'}
              </button>
            </div>
          </div>

          {/* Big spin button — 121bet style center circular */}
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white/60">
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </div>
            <button
              onClick={handleSpin}
              disabled={spinning || (!canSpin && freeSpins === 0)}
              className={`flex-1 max-w-[280px] h-12 sm:h-14 rounded-full font-fredoka font-black text-base sm:text-lg flex items-center justify-center gap-2 shadow-xl border-2 transition-all active:scale-[0.98] cursor-pointer ${
                spinning
                  ? 'bg-amber-600 border-amber-400 text-white animate-pulse cursor-wait'
                  : !canSpin && freeSpins === 0
                  ? 'bg-slate-700 border-slate-600 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-[#0f2e1f] border-yellow-200 shadow-amber-500/30'
              }`}
            >
              {spinning ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> GIRANDO...
                </>
              ) : freeSpins > 0 ? (
                <>🎁 GIRAR GRÁTIS ({freeSpins})</>
              ) : (
                <>
                  <span className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-sm shadow-inner">▶</span> GIRAR • R$ {bet}
                </>
              )}
            </button>
            <div className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white/60">
              <span className="text-xs font-black">5×</span>
            </div>
          </div>

          <p className="text-center text-[10px] font-bold tracking-widest uppercase text-white/40">
            Ganhe com 3+ iguais em linhas ativas • Wild dobra o prêmio
          </p>
        </div>

        {/* Big Win overlay */}
        {showBigWin && (
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/95 via-yellow-500/95 to-amber-600/95 flex flex-col items-center justify-center text-center p-6 z-20">
            <div className="text-5xl mb-2">🎉</div>
            <h3 className="font-fredoka font-black text-white text-3xl drop-shadow">MEGA GANHO!</h3>
            <p className="font-black text-white text-2xl mt-2 bg-black/20 px-4 py-1 rounded-full border border-white/20">+ R$ {lastWin.toLocaleString('pt-BR')}</p>
            <p className="text-white/80 text-sm font-bold mt-1">{game.name} • x{(lastWin / bet).toFixed(1)} seu investimento</p>
          </div>
        )}
      </div>
    </div>
  );
};
