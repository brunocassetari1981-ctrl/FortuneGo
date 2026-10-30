import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Minus, Plus, Zap, Volume2, VolumeX, Info, RotateCw, PlayCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SlotGameDef } from '../types/game';
import { SlotReel } from './SlotReel';
import { FortuneArtwork } from './FortuneArtwork';
import { SlotSymbolArtwork } from './SlotSymbolArtwork';
import { generateSpin, SLOT_PAYLINE_COUNT, SLOT_REEL_COUNT, SLOT_REEL_ROW_COUNTS, SLOT_ROW_COUNT } from '../utils/slotEngine';
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
  const paytable = [250, 10, 2.5, 0.25].map(value => +(value * (bet / 10)).toFixed(2));

  const [grid, setGrid] = useState<string[][]>([]);
  const [spinning, setSpinning] = useState(false);
  const [spinId, setSpinId] = useState(0);
  const [lastWin, setLastWin] = useState(0);
  const [winPositions, setWinPositions] = useState<Set<string>>(new Set());
  const [showBigWin, setShowBigWin] = useState(false);
  const [bigWinAmount, setBigWinAmount] = useState(0);
  const [autoSpin, setAutoSpin] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [freeSpins, setFreeSpins] = useState(0);
  const autoRef = useRef<number | null>(null);
  const [musicOn, setMusicOn] = useState(true);
  const touchStartY = useRef(0);
  const stoppedReelsRef = useRef(new Set<number>());
  const spinCompletionRef = useRef<((completed: boolean) => void) | null>(null);

  useEffect(() => {
    if (isOpen && game) {
      const init = generateSpin(game, bet, false);
      setGrid(init.grid);
      setLastWin(0);
      setWinPositions(new Set());
    }
  }, [isOpen, game?.id]);

  useEffect(() => {
    if (musicOn && soundEnabled && isOpen && game) sound.playBackground();
    else sound.stopBackground();
    return () => sound.stopBackground();
  }, [musicOn, soundEnabled, isOpen, game?.id]);

  useEffect(() => {
    if (!autoSpin || spinning || !game) return;
    autoRef.current = window.setInterval(() => handleSpin(), turbo ? 800 : 1400);
    return () => { if (autoRef.current) window.clearInterval(autoRef.current); };
  }, [autoSpin, spinning, game, turbo, bet]);

  const handleReelStop = useCallback((reelIndex: number) => {
    if (stoppedReelsRef.current.has(reelIndex)) return;
    stoppedReelsRef.current.add(reelIndex);

    if (stoppedReelsRef.current.size === SLOT_REEL_COUNT) {
      sound.stopReelTicks();
      const resolve = spinCompletionRef.current;
      spinCompletionRef.current = null;
      resolve?.(true);
    }
    sound.playReelStop(reelIndex);
  }, []);

  if (!isOpen || !game) return null;

  const headerSubtitle = `${game.name.toUpperCase()} • RTP ${game.rtp.toFixed(1)}% • ${game.volatility}`;
  const canSpin = coins >= bet || freeSpins > 0;

  const handleSpin = async () => {
    if (spinning) return;
    if (!canSpin) return;
    if (freeSpins === 0) {
      const ok = onBet(bet);
      if (!ok) return;
    }

    const result = generateSpin(game, bet);
    stoppedReelsRef.current = new Set<number>();
    const spinFinished = new Promise<boolean>(resolve => {
      spinCompletionRef.current = resolve;
    });
    setSpinning(true);
    setLastWin(0);
    setWinPositions(new Set());
    sound.startReelSpinTicks();
    sound.vibrate(30);
    setGrid(result.grid);
    setSpinId(id => id + 1);
    const completed = await spinFinished;
    spinCompletionRef.current = null;
    if (!completed) return;

    const winSet = new Set<string>();
    result.winPaylines.forEach(w => {
      w.positions.forEach(([reel, row]) => winSet.add(`${reel}-${row}`));
    });
    setWinPositions(winSet);

    if (result.totalWin > 0) {
      setLastWin(result.totalWin);
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
      sound.playTick(300);
    }

    if (freeSpins > 0) setFreeSpins(s => s - 1);
    setSpinning(false);
  };

  const handleClose = () => {
    setAutoSpin(false);
    setSpinning(false);
    if (autoRef.current) window.clearInterval(autoRef.current);
    const resolveSpin = spinCompletionRef.current;
    spinCompletionRef.current = null;
    resolveSpin?.(false);
    sound.stopBackground();
    sound.stopReelTicks();
    onClose();
  };

  const onTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (dy > 45 && !spinning) handleSpin();
    if (dy < -45 && !spinning) handleSpin();
  };

  // Cores temáticas por personagem — mantém mesma interação
  const headerBg = `linear-gradient(to bottom, ${game.primaryColor}, ${game.secondaryColor})`;
  const bottomBg = `linear-gradient(to bottom, ${game.primaryColor}dd, ${game.secondaryColor}dd)`;

  return (
    <div className="fixed inset-y-0 left-0 z-[60] flex w-screen items-center justify-center overflow-hidden bg-black/70 p-0 backdrop-blur-[2px] sm:p-3" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <FortuneArtwork game={game} className="pointer-events-none absolute inset-0 h-full w-full scale-110 opacity-40 blur-xl" />
      <div aria-hidden="true" className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden border-0 bg-[#1a0e2b] shadow-2xl sm:h-[92vh] sm:rounded-[28px] sm:border-[7px] sm:border-[#111] sm:shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
        {/* Status bar */}
        <div className="h-6 bg-[#0a1f15] flex items-center justify-between px-3 text-[10px] font-bold text-white/70 shrink-0">
          <span>FortuneGo • {game.name}</span>
          <span>Horário de login: 00:{String(Math.floor(Date.now()/1000)%60).padStart(2,'0')}:{String(new Date().getSeconds()).padStart(2,'0')}</span>
        </div>

        {/* Character header — cor por personagem, mesmo layout */}
        <div className="relative z-20 h-[18%] min-h-[100px] max-h-[140px] shrink-0 overflow-visible flex items-center justify-center" style={{ background: headerBg }}>
          <div className="absolute inset-0 overflow-hidden">
            <FortuneArtwork game={game} className="h-full w-full object-cover object-center opacity-55" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${game.primaryColor}77, ${game.secondaryColor}cc)` }} />
          </div>
          <div className="absolute top-0 inset-x-0 h-6 opacity-90" style={{ background: game.primaryColor, borderBottom: `4px solid ${game.secondaryColor}` }} />
          <div className="absolute bottom-0 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center">
            <SlotSymbolArtwork
              symbol={game.symbols.find(symbol => symbol.isWild) ?? game.symbols[0]}
              bare
              className="h-[clamp(100px,28vw,128px)] w-[clamp(100px,28vw,128px)] drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]"
            />
            <div className="-mt-2 whitespace-nowrap rounded-full border border-white/30 bg-black/35 px-2 py-0.5 text-[8px] font-black text-white shadow backdrop-blur">
              {headerSubtitle}
            </div>
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.16),transparent_40%)] pointer-events-none" />
          <button onClick={handleClose} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/30 backdrop-blur text-white border border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:bg-red-500/80 hover:shadow-[0_0_14px_rgba(255,255,255,0.5)] active:scale-95">
            <X className="w-4 h-4" />
          </button>
          <button onClick={() => setMusicOn(v => !v)} aria-label={musicOn ? 'Silenciar música do jogo' : 'Ativar música do jogo'} className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/25 text-white flex items-center justify-center border border-white/10 transition-all duration-200 hover:scale-110 hover:border-white/60 hover:shadow-[0_0_14px_rgba(255,255,255,0.45)] active:scale-95">
            {musicOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Shared three-reel cabinet with the same paytable and controls in every slot. */}
        <div className="flex-1 bg-[#0b1220] relative flex items-center justify-center p-1 overflow-visible">
          {/* Left payline */}
          <div className="absolute left-0 top-10 bottom-10 w-7 border-y-4 border-r-4 rounded-r-xl flex flex-col items-center justify-around py-2 font-black shadow-lg z-10" style={{ backgroundColor: game.primaryColor, borderColor: game.secondaryColor, color: 'white' }}>
            {Array.from({ length: SLOT_PAYLINE_COUNT }, (_, index) => index + 1).map(n => (
              <span key={`L${n}`} className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] leading-none ${winPositions.size>0 ? 'bg-yellow-400 text-black animate-pulse' : 'bg-black/30 text-white'}`}>{n}</span>
            ))}
          </div>
          {/* Right payline */}
          <div className="absolute right-0 top-10 bottom-10 w-7 border-y-4 border-l-4 rounded-l-xl flex flex-col items-center justify-around py-2 font-black shadow-lg z-10" style={{ backgroundColor: game.primaryColor, borderColor: game.secondaryColor, color: 'white' }}>
            {Array.from({ length: SLOT_PAYLINE_COUNT }, (_, index) => index + 1).map(n => (
              <span key={`R${n}`} className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${winPositions.size>0 ? 'bg-yellow-400 text-black animate-pulse' : 'bg-black/30 text-white'}`}>{n}</span>
            ))}
          </div>

          <div className="relative z-10 flex h-full w-[94%] max-w-[360px] flex-col overflow-visible" style={{ background: 'transparent' }}>
            <div className="relative z-30 grid h-[14%] min-h-9 shrink-0 grid-cols-4 border-b-2" style={{ background: `linear-gradient(to right, ${game.primaryColor}cc, ${game.secondaryColor}cc, ${game.primaryColor}cc)`, borderColor: game.secondaryColor }}>
              {paytable.map((value, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-center px-0.5 ${index < paytable.length - 1 ? 'border-r border-black/20' : ''}`}
                >
                  <span className="rounded-md border border-white/30 bg-black/20 px-1.5 py-1 text-center text-[clamp(9px,2.4vw,14px)] font-black leading-none text-white shadow">
                    {value.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
            <div
              className="relative z-10 grid min-h-0 flex-1 w-full grid-cols-3 self-center overflow-visible"
              style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
            >
              {Array.from({ length: SLOT_REEL_COUNT }, (_, reelIdx) => (
                <SlotReel
                  key={reelIdx}
                  game={game}
                  symbols={grid[reelIdx] ?? Array.from({ length: SLOT_REEL_ROW_COUNTS[reelIdx] ?? SLOT_ROW_COUNT }, () => game.symbols[0].id)}
                  isSpinning={spinning}
                  spinId={spinId}
                  reelIndex={reelIdx}
                  turbo={turbo}
                  stopDelay={(turbo ? 220 : 850) + reelIdx * (turbo ? 280 : 700)}
                  winPositions={winPositions}
                  onStop={handleReelStop}
                />
              ))}
            </div>
          </div>

          {freeSpins > 0 && (
            <div className="absolute top-1 left-1/2 -translate-x-1/2 text-white text-[10px] font-black px-3 py-1 rounded-full border border-white shadow z-20 animate-bounce" style={{ background: game.secondaryColor }}>
              🎁 {freeSpins} GRÁTIS
            </div>
          )}
          {spinning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-white/20 text-xs font-black tracking-[0.3em] animate-pulse">ROLANDO...</div>
            </div>
          )}
        </div>

        {/* Banner win — mesma para todos, cor do personagem */}
        <div className="relative z-30 h-7 border-y-2 flex items-center justify-center shrink-0" style={{ background: `linear-gradient(to right, ${game.primaryColor}, ${game.secondaryColor})`, borderColor: game.secondaryColor }}>
          <div className="absolute left-2 w-6 h-6 rounded-full border flex items-center justify-center text-xs" style={{ background: '#2a0f4a', borderColor: game.secondaryColor }}>{game.symbols[0]?.emoji}</div>
          <div className="absolute right-2 w-6 h-6 rounded-full border flex items-center justify-center text-xs" style={{ background: '#2a0f4a', borderColor: game.secondaryColor }}>{game.symbols[0]?.emoji}</div>
          {lastWin > 0 ? (
            <span className="font-black text-yellow-200 text-sm tracking-wide animate-pulse">WIN R$ {lastWin.toFixed(2).replace('.', ',')} • x{(lastWin / bet).toFixed(1)}</span>
          ) : (
            <span className="font-bold text-white/90 text-xs tracking-widest">ALINHE OS SÍMBOLOS PARA GANHAR</span>
          )}
        </div>

        {/* Bet bar */}
        <div className="h-8 bg-[#1a0f2e] border-b flex items-center justify-between px-2 shrink-0" style={{ borderColor: `${game.secondaryColor}55` }}>
          <div className="flex items-center gap-2 text-[11px] font-black">
            <span className="w-6 h-6 rounded-full bg-[#2a0f4a] border border-white/10 flex items-center justify-center text-white text-xs">🌎</span>
            <span className="text-amber-300">R$ {coins.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 border border-white/10 text-[9px]">PG</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-300 font-black text-xs">R$ {bet.toFixed(2).replace('.', ',')}</span>
            <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60">⚙️</span>
          </div>
        </div>

        {/* Bottom control — mesma interação para todos, cores por personagem */}
        <div className="relative flex h-[17%] min-h-[100px] shrink-0 flex-col items-center justify-between overflow-hidden px-3 py-1.5" style={{ background: bottomBg }}>
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-60" />
          <div className="absolute -left-6 -bottom-6 w-20 h-20 rounded-full bg-yellow-400/10 blur-xl" />
          <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-yellow-400/10 blur-xl" />

          <div className="z-10 flex w-full items-center justify-between text-[10px] font-black uppercase tracking-wider">
            <span className="text-white/75">{freeSpins > 0 ? `🎁 ${freeSpins} giros grátis` : 'Boa sorte!'}</span>
            <span className="text-yellow-200">{lastWin > 0 ? `Ganho R$ ${lastWin.toFixed(2).replace('.', ',')}` : 'Prêmios na tela'}</span>
          </div>

          <div className="z-10 flex w-full items-center justify-between">
            <div className="flex min-w-0 flex-1 justify-center">
              <button
                disabled={spinning}
                onClick={() => setTurbo(v => !v)}
                aria-label={turbo ? 'Desativar modo turbo' : 'Ativar modo turbo'}
                className={`flex h-11 w-11 items-center justify-center rounded-full border shadow transition-all duration-200 hover:scale-110 hover:shadow-[0_0_16px_rgba(255,215,0,0.5)] active:scale-95 disabled:opacity-40 ${turbo ? 'border-yellow-200 bg-yellow-400 text-black' : 'border-white/20 bg-black/25 text-white hover:border-white/55'}`}
                title={turbo ? 'Desativar modo turbo' : 'Ativar modo turbo'}
              >
                <Zap className="h-5 w-5" />
              </button>
            </div>
            <div className="flex min-w-0 flex-1 justify-center">
              <button
                disabled={spinning}
                onClick={() => setBetIdx(i => Math.max(0, i - 1))}
                aria-label="Diminuir aposta"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white transition-all duration-200 hover:scale-110 hover:border-yellow-200/70 hover:bg-black/50 hover:shadow-[0_0_16px_rgba(255,215,0,0.4)] active:scale-90 disabled:opacity-40"
                title="Diminuir aposta"
              >
                <Minus className="h-5 w-5" />
              </button>
            </div>
            <div className="flex min-w-0 flex-[1.4] justify-center">
              <button
                onClick={handleSpin}
                disabled={spinning || !canSpin}
                aria-label={spinning ? 'Giro em andamento' : 'Girar'}
                className={`relative flex h-[76px] w-[76px] items-center justify-center rounded-full border-[4px] shadow-[0_6px_18px_rgba(0,0,0,0.6)] transition-all duration-200 active:scale-95 ${spinning ? 'animate-pulse border-[#2ecc71] bg-[#1e7a3a]' : !canSpin ? 'border-slate-400 bg-slate-600' : 'border-[#f1c40f] hover:scale-105 hover:brightness-125 hover:shadow-[0_0_24px_rgba(255,215,0,0.65)]'}`}
                style={{ background: spinning ? '#1e7a3a' : `linear-gradient(to bottom, ${game.secondaryColor}, ${game.primaryColor})`, borderColor: '#f1c40f' }}
                title="Girar"
              >
                <RotateCw className="h-9 w-9 text-white drop-shadow" />
                {spinning && <span className="absolute inset-0 rounded-full border-4 border-white/20 animate-spin border-t-white" style={{ animationDuration: '0.7s' }} />}
              </button>
            </div>
            <div className="flex min-w-0 flex-1 justify-center">
              <button
                disabled={spinning}
                onClick={() => setBetIdx(i => Math.min(betOptions.length - 1, i + 1))}
                aria-label="Aumentar aposta"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white transition-all duration-200 hover:scale-110 hover:border-yellow-200/70 hover:bg-black/50 hover:shadow-[0_0_16px_rgba(255,215,0,0.4)] active:scale-90 disabled:opacity-40"
                title="Aumentar aposta"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <div className="flex min-w-0 flex-1 justify-center">
              <button
                onClick={() => setAutoSpin(v => !v)}
                aria-label={autoSpin ? 'Parar giros automáticos' : 'Ativar giros automáticos'}
                className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-200 hover:scale-110 hover:shadow-[0_0_16px_rgba(255,255,255,0.35)] active:scale-95 ${autoSpin ? 'animate-pulse border-red-300 bg-red-500 text-white' : 'border-white/20 bg-black/25 text-white hover:border-white/55'}`}
                title={autoSpin ? 'Parar giros automáticos' : 'Ativar giros automáticos'}
              >
                <PlayCircle className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="z-10 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-white/60">
            <Info className="h-3 w-3" />
            <span>{turbo ? 'Turbo' : 'Rápido'}</span>
            <span>•</span>
            <span>{autoSpin ? 'Auto ligado' : 'Auto'}</span>
            <span>•</span>
            <span>{SLOT_PAYLINE_COUNT} linhas</span>
          </div>
        </div>
      </div>

      {showBigWin && (
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/95 via-yellow-400/95 to-orange-500/95 flex flex-col items-center justify-center text-center p-6 z-30">
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-4xl shadow-xl animate-bounce">🎉</div>
          <h3 className="font-black text-[#7c1a1a] text-4xl mt-4 drop-shadow">MEGA GANHO!</h3>
          <p className="font-black text-[#7c1a1a] mt-2">R$ {bigWinAmount.toFixed(2).replace('.', ',')}</p>
          <p className="text-[#7c1a1a]/80 text-xs font-bold mt-1">{game.name} • x{(bigWinAmount / bet).toFixed(1)}</p>
          <div className="mt-4 flex gap-1">
            {[1,2,3,4,5].map(i => <span key={i} className="w-3 h-3 rounded-full bg-white animate-bounce" style={{ animationDelay: `${i*120}ms` }} />)}
          </div>
          <p className="text-[10px] font-bold tracking-widest text-[#7c1a1a]/60 mt-4">Toque para continuar</p>
        </div>
      )}

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
