import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Plus, Zap, Trophy, Volume2, VolumeX, Info } from 'lucide-react';
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
  onBet: (betCost: number) => boolean;
  soundEnabled: boolean;
}

export const SlotGameModal: React.FC<SlotGameModalProps> = ({ isOpen, onClose, game, coins, onWin, onBet, soundEnabled }) => {
  const [betIdx, setBetIdx] = useState(1);
  const betOptions = [5, 10, 20, 50, 100, 200, 500];
  const bet = betOptions[betIdx] ?? 10;

  const [grid, setGrid] = useState<string[][]>([]);
  const [spinning, setSpinning] = useState(false);
  const [reelOffsets, setReelOffsets] = useState<number[]>([0, 0, 0, 0, 0]);
  const [lastWin, setLastWin] = useState(0);
  const [winPositions, setWinPositions] = useState<Set<string>>(new Set());
  const [showBigWin, setShowBigWin] = useState(false);
  const [bigWinAmount, setBigWinAmount] = useState(0);
  const [autoSpin, setAutoSpin] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [freeSpins, setFreeSpins] = useState(0);
  const [spinCount, setSpinCount] = useState(47);
  const autoRef = useRef<number | null>(null);
  const [musicOn, setMusicOn] = useState(true);
  const [paytable, setPaytable] = useState<number[]>([250, 10, 2.5, 0.25]);
  const touchStartY = useRef(0);

  // Jackpot values for Rabbit 2 style (WG)
  const jackpotVals = game?.id === 'fortune-rabbit-2' ? { grand: 13057666, major: 1477433, minor: 2, mini: 1 } : null;

  useEffect(() => {
    if (isOpen && game) {
      const init = generateSpin(game, bet, false);
      setGrid(init.grid);
      setLastWin(0);
      setWinPositions(new Set());
      setSpinCount(Math.floor(Math.random() * 30 + 35));
      setPaytable([250, 10, 2.5, 0.25].map(v => +(v * (bet / 10)).toFixed(2)));
      if (musicOn && soundEnabled) sound.playBackground(game.id);
      return () => sound.stopBackground();
    } else {
      sound.stopBackground();
    }
    return () => {
      if (autoRef.current) window.clearInterval(autoRef.current);
      setAutoSpin(false);
      // don't stop background here — handled above
    };
  }, [isOpen, game?.id]);

  useEffect(() => {
    if (musicOn && soundEnabled && isOpen && game) sound.playBackground(game.id);
    else sound.stopBackground();
  }, [musicOn, soundEnabled, isOpen]);

  useEffect(() => {
    if (!autoSpin || spinning || !game) return;
    autoRef.current = window.setInterval(() => handleSpin(), turbo ? 800 : 1400);
    return () => { if (autoRef.current) window.clearInterval(autoRef.current); };
  }, [autoSpin, spinning, game, turbo, bet]);

  if (!isOpen || !game) return null;

  const canSpin = coins >= bet || freeSpins > 0;

  const handleSpin = async () => {
    if (spinning) return;
    if (!canSpin) return;
    if (freeSpins === 0) {
      const ok = onBet(bet);
      if (!ok) return;
    }

    setSpinning(true);
    setLastWin(0);
    setWinPositions(new Set());
    sound.startReelSpinTicks();
    sound.vibrate(30);
    setReelOffsets([0, 0, 0, 0, 0]);

    // staggered reels animation
    const durationBase = turbo ? 420 : 780;
    const reelDelays = game.reels === 3 ? [0, 90, 190] : [0, 80, 160, 240, 320];

    // Animate offsets
    reelDelays.forEach((delay, idx) => {
      setTimeout(() => {
        setReelOffsets(prev => {
          const n = [...prev];
          n[idx] = -120;
          return n;
        });
      }, delay);
    });

    // Interim fake grids during spin for blur illusion
    const interim = setInterval(() => {
      const fake = generateSpin(game, bet, false);
      setGrid(fake.grid);
    }, 85);

    // Wait for all reels to stop sequentially
    await new Promise(r => setTimeout(r, durationBase + (reelDelays[reelDelays.length - 1] || 0) + 120));

    clearInterval(interim);
    sound.stopReelTicks();

    // Stop reels one by one with sound
    for (let i = 0; i < game.reels; i++) {
      await new Promise(r => setTimeout(r, turbo ? 70 : 130));
      sound.playReelStop(i);
      setReelOffsets(prev => { const n = [...prev]; n[i] = 0; return n; });
    }

    const result = generateSpin(game, bet);
    setGrid(result.grid);

    // Build win positions set for highlight
    const winSet = new Set<string>();
    result.winPaylines.forEach(w => {
      w.positions.forEach(([reel, row]) => winSet.add(`${reel}-${row}`));
    });
    setWinPositions(winSet);

    if (result.totalWin > 0) {
      setLastWin(result.totalWin);
      setSpinCount(s => s - 1);
      if (result.isMegaWin) {
        setBigWinAmount(result.totalWin);
        setShowBigWin(true);
        sound.playBigWinSequence();
        confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
        setTimeout(() => setShowBigWin(false), 2400);
        onWin(result.totalWin, game.name, true);
      } else if (result.isBigWin) {
        sound.playWinFanfare();
        confetti({ particleCount: 90, spread: 65 });
        onWin(result.totalWin, game.name, true);
      } else {
        sound.playWinLine();
        onWin(result.totalWin, game.name, false);
      }
      if (result.hasScatter) { setFreeSpins(s => s + 3); sound.playLevelUp(); }
      sound.vibrate(result.isMegaWin ? [60, 30, 60] : 40);
    } else {
      setSpinCount(s => Math.max(0, s - 1));
      sound.playTick(300);
    }

    // Update paytable display (like center column in video)
    if (game.id === 'fortune-rabbit' || game.id === 'fortune-tiger') {
      const mult = bet / 10;
      setPaytable([250 * mult, 10 * mult, 2.5 * mult, 0.25 * mult].map(v => +v.toFixed(2)));
    }

    if (freeSpins > 0) setFreeSpins(s => s - 1);
    setSpinning(false);
  };

  const handleClose = () => {
    setAutoSpin(false);
    if (autoRef.current) window.clearInterval(autoRef.current);
    sound.stopBackground();
    sound.stopReelTicks();
    onClose();
  };

  const onTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (dy > 45 && !spinning) handleSpin(); // swipe up to spin (rolagem interativa)
    if (dy < -45 && !spinning) handleSpin();
  };

  const isFortuneRabbit = game.id === 'fortune-rabbit';
  const isRabbit2 = game.id === 'fortune-rabbit-2';

  return (
    <div className="fixed inset-0 z-[60] bg-black backdrop-blur-[2px] flex items-center justify-center p-0 sm:p-3 overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Full phone container — replicates video portrait 9:16 */}
      <div className="relative w-full max-w-[390px] h-[100dvh] sm:h-[92vh] sm:rounded-[28px] overflow-hidden border-0 sm:border-[7px] sm:border-[#111] bg-[#1a0e2b] flex flex-col shadow-2xl sm:shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
        {/* Status bar (login time like 121bet embeds) */}
        <div className="h-6 bg-[#0a1f15] flex items-center justify-between px-3 text-[10px] font-bold text-white/70 shrink-0">
          <span>FortuneGo • {game.name}</span>
          <span>Horário de login: 00:{String(Math.floor(Date.now()/1000)%60).padStart(2,'0')}:{String(new Date().getSeconds()).padStart(2,'0')}</span>
        </div>

        {/* WG Jackpot header for Rabbit2 (like video) */}
        {isRabbit2 && jackpotVals && (
          <div className="bg-gradient-to-r from-violet-900 via-fuchsia-800 to-violet-900 px-2 py-1.5 flex flex-col gap-1 shrink-0 border-y border-yellow-400/30">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-widest text-yellow-300 flex items-center gap-1">⭐ WG JACKPOT</span>
              <span className="text-[10px] font-bold text-white/70">Tarefa Valor total ganho (1/10)</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <div className="rounded bg-gradient-to-r from-amber-500 to-yellow-400 px-1 py-0.5 text-center border border-yellow-300">
                <p className="text-[8px] font-bold text-white leading-none">GRAND</p>
                <p className="text-[11px] font-black text-white">R$ {jackpotVals.grand.toLocaleString('pt-BR')}</p>
              </div>
              <div className="rounded bg-[#003366] px-1 py-0.5 text-center border border-cyan-400">
                <p className="text-[7px] font-bold text-cyan-200 leading-none">MINOR 2,00 • MINI 1,00</p>
                <p className="text-[10px] font-black text-cyan-300">GRANDE JACKPOT</p>
              </div>
              <div className="rounded bg-gradient-to-r from-fuchsia-600 to-purple-600 px-1 py-0.5 text-center">
                <p className="text-[7px] font-bold text-white leading-none">MAJOR</p>
                <p className="text-[11px] font-black text-white">R$ {jackpotVals.major.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Character header — coelho com roupa vermelha e pagode */}
        <div className="relative h-[18%] min-h-[110px] shrink-0 overflow-hidden bg-gradient-to-b from-[#ff7a45] via-[#ff4d2e] to-[#b91c1c] flex items-center justify-center">
          {/* Pagoda roof */}
          <div className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-[#7c1a1a] to-[#b91c1c] border-b-4 border-yellow-400 shadow" />
          <div className="absolute top-6 inset-x-0 flex justify-center gap-6">
            <span className="w-6 h-7 rounded bg-red-700 border border-yellow-300 flex items-center justify-center text-yellow-200 text-[10px] font-black">恭<br/>喜</span>
            <span className="w-6 h-7 rounded bg-red-700 border border-yellow-300 flex items-center justify-center text-yellow-200 text-[10px] font-black">发<br/>财</span>
          </div>
          {/* Character */}
          <div className="relative mt-6 flex flex-col items-center">
            <img src={game.thumb} alt={game.name} className="w-16 h-16 rounded-full border-4 border-white/30 shadow-lg object-cover bg-white hidden" />
            <div className="text-5xl drop-shadow-[0_3px_10px_rgba(0,0,0,0.6)]">
              {isFortuneRabbit ? '🐰' : isRabbit2 ? '🐰' : game.symbols[0]?.emoji || '🐯'}
            </div>
            <div className="text-[10px] font-black text-white bg-black/20 px-2 py-0.5 rounded-full border border-white/20 mt-1">
              {game.name.toUpperCase()} • RTP {game.rtp.toFixed(1)}%
            </div>
            {/* Firecracker in hand */}
            <span className="absolute -right-4 top-6 text-xl">🧨</span>
          </div>
          {/* Clouds blue bg */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(135,206,250,0.15),transparent_45%)] pointer-events-none" />
          {/* Close */}
          <button onClick={handleClose} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/30 backdrop-blur text-white border border-white/20 flex items-center justify-center active:scale-95">
            <X className="w-4 h-4" />
          </button>
          <button onClick={() => setMusicOn(v => !v)} className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/25 text-white flex items-center justify-center border border-white/10">
            {musicOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Reels Area — dark blue with gold frame, payline numbers sides */}
        <div className="flex-1 bg-[#0b1220] relative flex items-center justify-center p-2 overflow-hidden">
          {/* Gold ornate frame */}
          <div className="absolute inset-2 rounded-2xl border-[6px] border-gradient-to-b from-yellow-300 via-amber-500 to-yellow-600 shadow-[inset_0_0_20px_rgba(255,215,0,0.35)] bg-gradient-to-b from-[#0f2847] to-[#0a1a30] pointer-events-none" style={{ borderColor: '#eab308' }} />

          {/* Left payline numbers */}
          <div className="absolute left-0 top-10 bottom-10 w-7 bg-[#3b1d6e] border-y-4 border-r-4 border-yellow-500 rounded-r-xl flex flex-col items-center justify-around py-2 text-[10px] font-black text-pink-300 shadow-lg z-10">
            {[2,3,1,6,7,4,5,10,8,9].map(n => (
              <span key={`L${n}`} className={`w-5 h-5 rounded-full flex items-center justify-center leading-none ${winPositions.size>0 && n%2===0 ? 'bg-yellow-400 text-black animate-pulse' : 'bg-purple-900/70 text-pink-200'}`}>{n}</span>
            ))}
          </div>
          {/* Right payline numbers */}
          <div className="absolute right-0 top-10 bottom-10 w-7 bg-[#3b1d6e] border-y-4 border-l-4 border-yellow-500 rounded-l-xl flex flex-col items-center justify-around py-2 text-[10px] font-black text-pink-300 shadow-lg z-10">
            {[2,4,1,6,8,3,5,10,7,9].map(n => (
              <span key={`R${n}`} className={`w-5 h-5 rounded-full flex items-center justify-center ${winPositions.size>0 && n===8 ? 'bg-yellow-400 text-black animate-pulse' : 'bg-purple-900/70 text-pink-200'}`}>{n}</span>
            ))}
          </div>

          {/* Center reels */}
          <div className="relative z-10 w-[74%] max-w-[300px] h-[88%] bg-gradient-to-b from-[#143a6b] to-[#0a1f3a] rounded-xl border-2 border-yellow-500/60 overflow-hidden shadow-inner flex">
            {/* Center paytable column for Rabbit (like video: 250, 10, 2.50, 0.25) — only for 3x3 fortune games */}
            {(isFortuneRabbit || game.id === 'fortune-tiger') && (
              <div className="w-[26%] bg-gradient-to-b from-amber-400 via-yellow-400 to-amber-500 border-r-2 border-yellow-600 flex flex-col items-center justify-around py-2 shrink-0">
                {paytable.map((v, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-[#7c1a1a] leading-none">{v.toLocaleString('pt-BR')}</span>
                    {i < paytable.length - 1 && <div className="w-8 h-0.5 bg-amber-700/40 mt-1" />}
                  </div>
                ))}
              </div>
            )}

            {/* Reels grid */}
            <div className={`flex-1 grid ${game.reels === 3 ? 'grid-cols-3' : 'grid-cols-5'} gap-0 h-full`}>
              {Array.from({ length: game.reels }).map((_, reelIdx) => (
                <div key={reelIdx} className="relative overflow-hidden border-r border-yellow-500/20 last:border-0 flex flex-col">
                  {/* Reel strip with translate for rolagem */}
                  <div
                    className="flex flex-col transition-transform will-change-transform"
                    style={{
                      transform: `translateY(${reelOffsets[reelIdx] || 0}px)`,
                      transitionDuration: spinning ? '180ms' : '420ms',
                      transitionTimingFunction: spinning ? 'linear' : 'cubic-bezier(0.22,1,0.36,1)',
                      filter: spinning ? 'blur(0.7px) brightness(1.1)' : 'blur(0)',
                    }}
                  >
                    {(grid[reelIdx] || Array.from({ length: game.rows }, () => game.symbols[0].id)).map((symId, rowIdx) => {
                      const sym = getSymbolById(game, symId) || game.symbols[0];
                      const isWin = winPositions.has(`${reelIdx}-${rowIdx}`);
                      return (
                        <div key={`${reelIdx}-${rowIdx}`} className={`h-[33.333%] min-h-[60px] flex flex-col items-center justify-center relative border-b border-black/10 ${isWin ? 'bg-gradient-to-b from-yellow-200 to-amber-400 animate-win-pulse z-10 scale-[1.02] shadow-[0_0_14px_rgba(255,215,0,0.9)]' : 'bg-gradient-to-b from-[#1e3a5f] to-[#0f2847]'}`}>
                          <span className={`text-2xl leading-none drop-shadow ${isWin ? 'scale-110' : ''}`}>{sym.emoji}</span>
                          <span className="text-[7px] font-black text-white/60 tracking-widest uppercase mt-0.5">{sym.name.slice(0, 8)}</span>
                          {sym.isWild && (
                            <div className="absolute inset-x-1 bottom-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-[#7c1a1a] text-[8px] font-black text-center py-0.5 rounded border border-yellow-200 shadow">
                              WILD
                            </div>
                          )}
                          {isWin && <div className="absolute inset-0 border-2 border-yellow-200 rounded-sm pointer-events-none animate-pulse" />}
                        </div>
                      );
                    })}
                  </div>
                  {/* Win line glow overlay */}
                  {winPositions.size > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-[92%] h-0.5 bg-gradient-to-r from-transparent via-yellow-300 to-transparent blur-[1px] opacity-80 animate-pulse" style={{ top: '50%' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Free spins badge */}
          {freeSpins > 0 && (
            <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-[10px] font-black px-3 py-1 rounded-full border border-white shadow z-20 animate-bounce">
              🎁 {freeSpins} GRÁTIS
            </div>
          )}
          {spinning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-white/20 text-xs font-black tracking-[0.3em] animate-pulse">ROLANDO...</div>
            </div>
          )}
        </div>

        {/* Win banner (like video: WIN 0,05 / Ganhe até x5000) */}
        <div className="h-7 bg-gradient-to-r from-[#3b1d6e] via-[#5b2c8a] to-[#3b1d6e] border-y-2 border-yellow-500 flex items-center justify-center relative shrink-0">
          <div className="absolute left-2 w-6 h-6 rounded-full bg-[#2a0f4a] border border-yellow-400 flex items-center justify-center text-xs">🐰</div>
          <div className="absolute right-2 w-6 h-6 rounded-full bg-[#2a0f4a] border border-yellow-400 flex items-center justify-center text-xs">🐰</div>
          {lastWin > 0 ? (
            <span className="font-fredoka font-black text-yellow-300 text-sm tracking-wide animate-pulse">WIN R$ {lastWin.toFixed(2).replace('.', ',')} • x{(lastWin / bet).toFixed(1)}</span>
          ) : (
            <span className="font-bold text-white/80 text-xs tracking-widest">GANHE ATÉ x5000! • 5 PARA GANHAR</span>
          )}
        </div>

        {/* Bet / Balance bar like video: R$0,08 | 0,10/BET etc */}
        <div className="h-8 bg-[#1a0f2e] border-b border-yellow-500/30 flex items-center justify-between px-2 shrink-0">
          <div className="flex items-center gap-2 text-[11px] font-black">
            <span className="w-6 h-6 rounded-full bg-[#2a0f4a] border border-white/10 flex items-center justify-center text-white text-xs">🌎</span>
            <span className="text-amber-300">R$ {(coins % 100).toFixed(2).replace('.', ',')}</span>
            <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 border border-white/10 text-[9px]">PG</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-300 font-black text-xs">R$ {bet.toFixed(2).replace('.', ',')}</span>
            <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60">⚙️</span>
          </div>
        </div>

        {/* Bottom red control panel — like video: red with gold ornaments, central green spin */}
        <div className="h-[26%] min-h-[112px] bg-gradient-to-b from-[#7a0e0e] via-[#a91a1a] to-[#5c0a0a] flex flex-col items-center justify-between py-2 px-3 shrink-0 relative overflow-hidden">
          {/* Gold ornaments */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-60" />
          <div className="absolute -left-6 -bottom-6 w-20 h-20 rounded-full bg-yellow-400/10 blur-xl" />
          <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-yellow-400/10 blur-xl" />

          {/* Top row: - | 47 | + and Rápido/Auto like video */}
          <div className="w-full flex items-center justify-between">
            <button onClick={() => setBetIdx(i => Math.max(0, i - 1))} className="w-8 h-8 rounded-full bg-black/30 border border-white/15 text-white flex items-center justify-center active:scale-90">
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-14 h-10 rounded-xl bg-gradient-to-b from-[#0a5c2a] to-[#08401d] border-2 border-yellow-400 shadow flex items-center justify-center">
                <span className="font-fredoka font-black text-white text-xl">{spinCount}</span>
              </div>
              <button onClick={() => setBetIdx(i => Math.min(betOptions.length - 1, i + 1))} className="w-8 h-8 rounded-full bg-black/30 border border-white/15 text-white flex items-center justify-center active:scale-90">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setTurbo(v => !v)} className={`px-2.5 py-1 rounded-full border text-[10px] font-black ${turbo ? 'bg-yellow-400 text-black border-yellow-300' : 'bg-white/10 text-white/70 border-white/15'}`}>
                <Zap className="w-3 h-3 inline -mt-0.5" /> {turbo ? 'TURBO' : 'Rápido'}
              </button>
            </div>
          </div>

          {/* Main spin row: left icon - center green spin with bunny ears - right Auto */}
          <div className="w-full flex items-center justify-between">
            <button className="w-9 h-9 rounded-full bg-black/20 border border-white/10 text-white/60 flex items-center justify-center">🎰</button>
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-[10px] font-bold text-white/60">R$ {(bet * 0.8).toFixed(2).replace('.', ',')}</span>
              <button
                onClick={handleSpin}
                disabled={spinning || !canSpin}
                className={`relative w-[82px] h-[82px] rounded-full flex items-center justify-center border-[4px] shadow-[0_6px_18px_rgba(0,0,0,0.6)] active:scale-95 transition-all ${spinning ? 'bg-[#1e7a3a] border-[#2ecc71] animate-pulse' : !canSpin ? 'bg-slate-600 border-slate-400' : 'bg-gradient-to-b from-[#2ecc71] via-[#27ae60] to-[#1e8449] border-[#f1c40f] hover:brightness-110'}`}
              >
                {/* Bunny ears top */}
                <span className="absolute -top-3 left-2 text-lg">👂</span>
                <span className="absolute -top-3 right-2 text-lg">👂</span>
                <span className="text-3xl">🔄</span>
                {spinning && <span className="absolute inset-0 rounded-full border-4 border-white/20 animate-spin border-t-white" style={{ animationDuration: '0.7s' }} />}
              </button>
              <button onClick={() => setAutoSpin(v => !v)} className={`px-3 py-1.5 rounded-full border font-black text-xs ${autoSpin ? 'bg-red-500 text-white border-red-400 animate-pulse' : 'bg-white/10 text-white border-white/15'}`}>
                {autoSpin ? 'PARAR' : 'Auto'}
              </button>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold text-white/50">WINS</span>
              <span className="text-xs font-black text-yellow-300">{lastWin > 0 ? `R$ ${lastWin.toFixed(2).replace('.', ',')}` : '—'}</span>
            </div>
          </div>

          {/* Bottom hint */}
          <div className="flex items-center gap-2 text-[9px] font-bold tracking-widest uppercase text-white/40">
            <Info className="w-3 h-3" /> Toque na tela e arraste para girar • {game.paylines} LINHAS • Deslize para ver prêmios
          </div>
        </div>
      </div>

      {/* Big Win overlay fullscreen */}
      {showBigWin && (
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/95 via-yellow-400/95 to-orange-500/95 flex flex-col items-center justify-center text-center p-6 z-30">
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-4xl shadow-xl animate-bounce">🎉</div>
          <h3 className="font-fredoka font-black text-[#7c1a1a] text-4xl mt-4 drop-shadow">MEGA GANHO!</h3>
          <p className="font-black text-[#7c1a1a] text-1xl mt-2">R$ {bigWinAmount.toFixed(2).replace('.', ',')}</p>
          <p className="text-[#7c1a1a]/80 text-xs font-bold mt-1">{game.name} • x{(bigWinAmount / bet).toFixed(1)}</p>
          <div className="mt-4 flex gap-1">
            {[1,2,3,4,5].map(i => <span key={i} className="w-3 h-3 rounded-full bg-white animate-bounce" style={{ animationDelay: `${i*120}ms` }} />)}
          </div>
          <p className="text-[10px] font-bold tracking-widest text-[#7c1a1a]/60 mt-4">Toque para continuar • Rolagem automática ativa</p>
        </div>
      )}

      {/* Win coins floating */}
      {lastWin > 0 && !showBigWin && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
          <div className="bg-gradient-to-r from-amber-400 to-yellow-400 text-[#7c1a1a] font-black px-5 py-2 rounded-full border-2 border-white shadow-xl animate-coin-float">
            + R$ {lastWin.toFixed(2).replace('.', ',')} 🎉
          </div>
        </div>
      )}
    </div>
  );
};
