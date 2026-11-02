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
  const [musicOn, setMusicOn] = useState(false);
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
    sound.stopBackground();
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
  const CHARACTER_MAP: Record<string, string> = {
    'fortune-tiger': '/characters/fortune-tiger.png',
    'fortune-rabbit': '/characters/fortune-rabbit.png',
    'fortune-dragon': '/characters/fortune-dragon.png',
    'fortune-ox': '/characters/fortune-ox.png',
    'fortune-rabbit-2': '/characters/fortune-rabbit-2.png',
    'fortune-snake': '/characters/fortune-snake.png',
    'pinata-wins': '/characters/pinata-wins.png',
    'wild-bandito': '/characters/wild-bandito.png',
    'dragon-hatch': '/characters/dragon-hatch.png',
  };
  const characterSrc = game ? CHARACTER_MAP[game.id] : undefined;

  // Transparente em todos os jogos — sem cores sólidas
  const headerBg = 'transparent';
  const bottomBg = 'transparent';

  return (
    <div className="fixed inset-y-0 left-0 z-[60] flex w-screen items-center justify-center overflow-hidden bg-black/60 p-0 backdrop-blur-[2px] sm:p-3" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <FortuneArtwork game={game} className="pointer-events-none absolute inset-0 h-full w-full scale-110 opacity-20 blur-xl" />
      <div aria-hidden="true" className="absolute inset-0 bg-transparent" />
      <div className="relative z-10 flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden border border-white/10 bg-black/30 shadow-2xl backdrop-blur-md sm:h-[92vh] sm:rounded-[28px] sm:border-white/10 sm:shadow-[0_20px_60px_rgba(0,0,0,0.6)]">

        {/* Header — só figura 3D sem fundo em todos os jogos */}
        <div className="relative z-20 h-[21%] min-h-[132px] max-h-[152px] shrink-0 overflow-visible flex flex-col items-center justify-end pb-6 bg-transparent border-b border-white/5" style={{ background: headerBg }}>
          <button onClick={handleClose} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/30 backdrop-blur text-white border border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:bg-red-500/80 hover:shadow-[0_0_14px_rgba(255,255,255,0.5)] active:scale-95 z-20">
            <X className="w-4 h-4" />
          </button>
          <button onClick={() => setMusicOn(v => !v)} aria-label={musicOn ? 'Silenciar música do jogo' : 'Ativar música do jogo'} className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/25 text-white flex items-center justify-center border border-white/10 transition-all duration-200 hover:scale-110 hover:border-white/60 hover:shadow-[0_0_14px_rgba(255,255,255,0.45)] active:scale-95 z-20">
            {musicOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
          {characterSrc && (
            <div className="relative z-10 flex flex-col items-center pointer-events-none select-none -mb-1">
              <img
                src={characterSrc}
                alt={game.name}
                draggable={false}
                className={`h-auto w-[clamp(92px,24vw,118px)] object-contain ${spinning ? 'animate-characterSpin' : 'animate-characterFloat'}`}
                style={{ filter: 'drop-shadow(0 12px 14px rgba(0,0,0,0.45))', transformStyle: 'preserve-3d' }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
          <div className="relative z-10 mt-1 whitespace-nowrap rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[9px] font-black tracking-wide text-white shadow backdrop-blur">
            {headerSubtitle}
          </div>
        </div>

        {/* Rolo central - transparente, área responsiva */}
        <div className="flex-1 bg-transparent backdrop-blur-[1px] relative flex items-center justify-center px-1 py-[2.5%] sm:py-3 overflow-visible min-h-[280px] border-y border-white/5">


          <div className="relative z-10 flex h-full w-[92%] max-w-[356px] flex-col overflow-visible" style={{ background: 'transparent' }}>
            <div
              className="relative z-10 grid min-h-0 w-full flex-1 grid-cols-3 self-center overflow-visible"
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
              {/* Personagem animado no rolo central — FortuneGo */}

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



        {/* Bet bar — transparente */}
        <div className="h-8 bg-black/20 backdrop-blur-sm border-b border-white/5 flex items-center justify-between px-2 shrink-0">
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

        {/* Bottom control — transparente em todos os jogos */}
        <div className="relative flex h-[15%] min-h-[86px] max-h-[108px] shrink-0 flex-col items-center justify-between overflow-hidden px-3 py-2 bg-transparent backdrop-blur-sm border-t border-white/5" style={{ background: bottomBg }}>
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
                className={`flex h-11 w-11 items-center justify-center rounded-full border-2 shadow transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-40 ${turbo ? 'border-yellow-200 bg-gradient-to-b from-yellow-300 to-amber-500 text-black shadow-[0_4px_12px_rgba(234,179,8,0.6)]' : 'border-amber-200/70 bg-gradient-to-b from-zinc-700 to-zinc-800 text-amber-300 hover:border-amber-300 hover:shadow-[0_0_16px_rgba(245,158,11,0.4)]'}`}
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
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-amber-200 bg-gradient-to-b from-amber-400 via-orange-500 to-orange-600 text-white shadow-[0_4px_12px_rgba(245,158,11,0.5),0_2px_0_rgba(255,255,255,0.4)_inset] transition-all duration-200 hover:scale-110 hover:brightness-110 hover:shadow-[0_0_20px_rgba(245,158,11,0.6)] active:scale-90 disabled:opacity-40"
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
                className={`relative flex h-[78px] w-[78px] items-center justify-center rounded-full border-[4px] shadow-[0_8px_20px_rgba(0,0,0,0.7)] transition-all duration-200 active:scale-95 ${spinning ? 'animate-pulse border-emerald-300 bg-gradient-to-b from-emerald-400 to-green-700' : !canSpin ? 'border-slate-400 bg-slate-600' : 'border-yellow-200 bg-gradient-to-b from-yellow-300 via-amber-500 to-orange-600 hover:scale-105 hover:brightness-110 hover:shadow-[0_0_28px_rgba(251,191,36,0.8)]'}`}
                style={{ borderColor: '#fde68a', boxShadow: '0 8px 20px rgba(0,0,0,0.5), 0 0 0 2px rgba(252,211,77,0.4) inset' }}
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
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-amber-200 bg-gradient-to-b from-amber-400 via-orange-500 to-orange-600 text-white shadow-[0_4px_12px_rgba(245,158,11,0.5),0_2px_0_rgba(255,255,255,0.4)_inset] transition-all duration-200 hover:scale-110 hover:brightness-110 hover:shadow-[0_0_20px_rgba(245,158,11,0.6)] active:scale-90 disabled:opacity-40"
                title="Aumentar aposta"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <div className="flex min-w-0 flex-1 justify-center">
              <button
                onClick={() => setAutoSpin(v => !v)}
                aria-label={autoSpin ? 'Parar giros automáticos' : 'Ativar giros automáticos'}
                className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-200 hover:scale-110 active:scale-95 ${autoSpin ? 'animate-pulse border-red-200 bg-gradient-to-b from-red-400 to-red-600 text-white shadow-[0_4px_12px_rgba(239,68,68,0.5)]' : 'border-white/20 bg-gradient-to-b from-zinc-700 to-zinc-800 text-white hover:border-white/40 hover:shadow-[0_0_16px_rgba(255,255,255,0.2)]'}`}
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
