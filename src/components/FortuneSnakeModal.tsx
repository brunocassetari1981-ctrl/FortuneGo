import React, { useState, useEffect, useRef } from 'react';
import { X, Volume2, VolumeX } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SlotGameDef } from '../types/game';
import { generateSpin, getSymbolById } from '../utils/slotEngine';
import { sound } from '../utils/audio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  game: SlotGameDef | null;
  coins: number;
  onWin: (winCoins: number, gameName: string, isBigWin: boolean) => void;
  onBet: (betCost: number) => boolean;
  soundEnabled: boolean;
}

const JACKPOT = { grand: 12395371.38, major: 942017.22, minor: 2, mini: 1 };

function SnakeSymbol({ symId, isWin, game }: { symId: string; isWin: boolean; game: SlotGameDef }) {
  const sym = getSymbolById(game, symId) || game.symbols[0];
  const winCls = isWin ? 'ring-2 ring-yellow-300 shadow-[0_0_14px_rgba(255,215,0,0.9)] scale-[1.03]' : '';
  // Map to reference visuals
  if (sym.id === 'snake') {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-b from-[#2a0d5a] to-[#1a0838] ${winCls}`}>
        <div className="text-3xl leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">🐍</div>
        <div className="mt-0.5 text-[15px] font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-amber-500 drop-shadow-[0_1px_0_rgba(0,0,0,0.9)]" style={{ WebkitTextStroke: '1px #7a4a00' }}>WILD</div>
        {isWin && <div className="absolute inset-0 bg-yellow-400/20 pointer-events-none animate-pulse" />}
      </div>
    );
  }
  if (sym.id === 'ingot') {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-b from-[#2a0d5a] to-[#1a0838] ${winCls}`}>
        <div className="text-3xl drop-shadow-[0_2px_8px_rgba(255,215,0,0.7)]">🟡</div>
        <div className="absolute text-xl">💰</div>
        {/* gold ingot visual: use emoji but styled */}
      </div>
    );
  }
  if (sym.id === 'mic') {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-b from-[#2a0d5a] to-[#1a0838] ${winCls}`}>
        <span className="text-3xl">🎙️</span>
      </div>
    );
  }
  if (sym.id === 'dollar') {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-b from-[#2a0d5a] to-[#1a0838] ${winCls}`}>
        <span className="text-2xl">💲</span>
        <span className="absolute text-[10px] font-black text-yellow-200 mt-6">$</span>
      </div>
    );
  }
  if (sym.id === 'pouch') {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-b from-[#2a0d5a] to-[#1a0838] ${winCls}`}>
        <span className="text-3xl">👛</span>
      </div>
    );
  }
  if (sym.id === 'speakers') {
    return (
      <div className={`w-full h-full flex items-center justify-center gap-1 bg-gradient-to-b from-[#2a0d5a] to-[#1a0838] ${winCls}`}>
        <span className="w-5 h-5 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 border-2 border-white shadow-inner text-[10px] flex items-center justify-center">●</span>
        <span className="w-5 h-5 rounded-full bg-gradient-to-b from-purple-400 to-violet-600 border-2 border-white shadow-inner text-[10px] flex items-center justify-center">●</span>
      </div>
    );
  }
  // fallback
  return (
    <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#2a0d5a] to-[#1a0838] ${winCls}`}>
      <span className="text-2xl">{sym.emoji}</span>
      <span className="text-[7px] font-bold text-white/50">{sym.name}</span>
    </div>
  );
}

export const FortuneSnakeModal: React.FC<Props> = ({ isOpen, onClose, game, coins, onWin, onBet, soundEnabled }) => {
  const betOptions = [5, 10, 20, 50, 100, 200, 500];
  const [betIdx, setBetIdx] = useState(1);
  const bet = betOptions[betIdx] ?? 10;
  const [grid, setGrid] = useState<string[][]>([]);
  const [spinning, setSpinning] = useState(false);
  const [reelOffsets, setReelOffsets] = useState<number[]>([0, 0, 0]);
  const [lastWin, setLastWin] = useState(0);
  const [winPositions, setWinPositions] = useState<Set<string>>(new Set());
  const [showBigWin, setShowBigWin] = useState(false);
  const [autoSpin, setAutoSpin] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [freeSpins, setFreeSpins] = useState(0);
  const autoRef = useRef<number | null>(null);
  const [musicOn, setMusicOn] = useState(true);
  const [winMessage, setWinMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && game) {
      const init = generateSpin(game, bet, false);
      setGrid(init.grid);
      setLastWin(0);
      setWinPositions(new Set());
      setWinMessage(null);
      if (musicOn && soundEnabled) sound.playBackground(game.id);
      return () => sound.stopBackground();
    } else sound.stopBackground();
    return () => { if (autoRef.current) window.clearInterval(autoRef.current); setAutoSpin(false); };
  }, [isOpen, game?.id]);

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
    if (freeSpins === 0) { const ok = onBet(bet); if (!ok) return; }
    setSpinning(true); setLastWin(0); setWinPositions(new Set()); setWinMessage(null);
    sound.startReelSpinTicks(); sound.vibrate(30);
    setReelOffsets([0, 0, 0]);
    const reelDelays = [0, 90, 190];
    reelDelays.forEach((d, idx) => setTimeout(() => setReelOffsets(prev => { const n=[...prev]; n[idx]=-120; return n;}), d));
    const interim = setInterval(() => { const fake=generateSpin(game, bet, false); setGrid(fake.grid); }, 85);
    await new Promise(r=>setTimeout(r, (turbo?420:780)+190+120));
    clearInterval(interim); sound.stopReelTicks();
    for(let i=0;i<3;i++){ await new Promise(r=>setTimeout(r, turbo?70:130)); sound.playReelStop(i); setReelOffsets(prev=>{const n=[...prev];n[i]=0;return n;})}
    const result = generateSpin(game, bet);
    setGrid(result.grid);
    const winSet=new Set<string>(); result.winPaylines.forEach(w=>w.positions.forEach(([reel,row])=>winSet.add(`${reel}-${row}`))); setWinPositions(winSet);
    // Mensagem como no print: 4 WILD etc
    const wildCount = result.grid.flat().filter(id=>id==='snake').length;
    if (wildCount>=4) setWinMessage('4 WILD aparecem no rolo');
    else if (result.hasScatter) setWinMessage('Modo Cobra da Fortuna!');
    else if (result.totalWin>0 && result.isMegaWin) setWinMessage(`MEGA GANHO R$ ${result.totalWin.toFixed(2).replace('.',',')}`);
    else setWinMessage(null);

    if(result.totalWin>0){
      setLastWin(result.totalWin);
      if(result.isMegaWin){ setShowBigWin(true); sound.playBigWinSequence(); confetti({particleCount:140, spread:90, origin:{y:0.6}}); setTimeout(()=>setShowBigWin(false),2400); onWin(result.totalWin, game.name, true); }
      else if(result.isBigWin){ sound.playWinFanfare(); confetti({particleCount:90, spread:65}); onWin(result.totalWin, game.name, true); }
      else { sound.playWinLine(); onWin(result.totalWin, game.name, false); }
      if(result.hasScatter) setFreeSpins(s=>s+3);
      sound.vibrate(result.isMegaWin?[60,30,60]:40);
    } else { sound.playTick(300); }
    if(freeSpins>0) setFreeSpins(s=>s-1);
    setSpinning(false);
  };

  const handleClose=()=>{ setAutoSpin(false); if(autoRef.current) window.clearInterval(autoRef.current); sound.stopBackground(); sound.stopReelTicks(); onClose(); };
  const touchStartY=useRef(0);
  const onTouchStart=(e:React.TouchEvent)=>{ touchStartY.current=e.touches[0].clientY; };
  const onTouchEnd=(e:React.TouchEvent)=>{ const dy=touchStartY.current-e.changedTouches[0].clientY; if(Math.abs(dy)>45 && !spinning) handleSpin(); };

  return (
    <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center p-0 sm:p-3 overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="relative w-full max-w-[390px] h-[100dvh] sm:h-[92vh] sm:rounded-[24px] overflow-hidden flex flex-col bg-[#1a0a2e] border-0 sm:border-[6px] sm:border-black shadow-2xl">
        {/* System status */}
        <div className="h-7 bg-black flex items-center justify-between px-3 text-[11px] text-white shrink-0">
          <span>02:07</span>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"/><span className="w-5 h-3 rounded bg-white/20"/>● 100</div>
        </div>

        {/* Fortune Snake Header */}
        <div className="shrink-0">
          <div className="h-7 bg-gradient-to-r from-[#0a0a1a] via-[#1a0a3a] to-[#0a0a1a] flex items-center justify-between px-2 border-b border-yellow-500/30">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-black tracking-widest text-yellow-400" style={{fontFamily:'serif'}}>FORTUNE</span>
              <span className="text-[14px] font-black text-yellow-300 -ml-1" style={{fontFamily:'serif', textShadow:'0 1px 0 #000'}}>SNAKE</span>
            </div>
            <div className="flex items-center gap-1 bg-gradient-to-r from-purple-700 via-fuchsia-600 to-purple-700 rounded px-2 py-0.5 border border-yellow-400/50">
              <span className="text-[9px] font-black text-yellow-200">★ WG JACKPOT ★</span>
              <span className="text-[10px] font-black text-white ml-1">GRAND R$ {JACKPOT.grand.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
              <span className="ml-1 w-4 h-4 bg-white/20 rounded flex items-center justify-center text-[8px]">≡</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-0 h-7 text-center">
            <div className="bg-gradient-to-r from-red-600 to-red-500 flex flex-col items-center justify-center border-r border-black/30">
              <span className="text-[8px] font-bold text-yellow-200">MAJOR</span>
              <span className="text-[11px] font-black text-white">R$ {JACKPOT.major.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
            </div>
            <div className="bg-gradient-to-r from-sky-600 to-blue-500 flex flex-col items-center justify-center border-r border-black/30">
              <span className="text-[8px] font-bold text-white">MINOR 2,00</span>
              <span className="text-[9px] font-black text-cyan-100">GRANDE</span>
            </div>
            <div className="bg-gradient-to-r from-emerald-600 to-green-500 flex flex-col items-center justify-center">
              <span className="text-[8px] font-bold text-white">MINI 1,00</span>
              <span className="text-[9px] font-black text-white">PEQUENO</span>
            </div>
          </div>
          <div className="h-6 bg-[#0f0a1e] flex items-center justify-between px-2 border-y border-white/10">
            <span className="text-[10px] font-bold text-yellow-300 flex items-center gap-1">🎯 Tarefa</span>
            <div className="flex-1 mx-2 h-3 bg-black/50 rounded-full border border-white/10 flex items-center px-1">
              <div className="h-1.5 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" style={{width:'16%'}} />
              <span className="text-[8px] text-white/70 ml-1">Aposta acumulada(0/19)</span>
            </div>
            <span className="text-white/50">☰</span>
          </div>
        </div>

        {/* Temple + Reels */}
        <div className="flex-1 relative overflow-hidden bg-gradient-to-b from-[#2d0a4a] via-[#3a0f5e] to-[#1a0838] flex flex-col">
          {/* Pagoda roof decoration */}
          <div className="h-16 shrink-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#8b2fc0] to-[#4a1a7a]" />
            {/* roof tiles */}
            <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-b from-[#6a1a9a] to-[#3a0f5e] border-t-4 border-yellow-400/30" style={{clipPath:'polygon(0 100%, 5% 0, 15% 30%, 25% 0, 35% 30%, 45% 0, 55% 30%, 65% 0, 75% 30%, 85% 0, 95% 30%, 100% 0, 100% 100%)'}} />
            <div className="absolute top-1 left-1/2 -translate-x-1/2 flex gap-1">
              <span className="w-5 h-4 bg-yellow-500/80 rounded text-[8px] flex items-center justify-center">◈</span>
              <span className="w-5 h-4 bg-yellow-500/80 rounded text-[8px] flex items-center justify-center">◈</span>
            </div>
            <div className="absolute bottom-1 inset-x-0 flex justify-center gap-2">
              {Array.from({length:9}).map((_,i)=><span key={i} className="w-2 h-2 rounded-full bg-purple-300 shadow-[0_0_6px_rgba(255,255,255,0.8)] animate-pulse" style={{animationDelay:`${i*80}ms`}} />)}
            </div>
            {/* snake mascot top right */}
            <div className="absolute -bottom-6 right-2 w-20 h-20 flex items-end justify-center">
              <div className="text-6xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">🐍</div>
              <div className="absolute -top-1 right-3 w-7 h-5 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center text-[7px] font-black text-white">WG</div>
            </div>
            {/* left snake with staff */}
            <div className="absolute -bottom-4 left-1 w-12 h-12 text-3xl opacity-90">🐍</div>
          </div>

          {/* Reels container with side rails */}
          <div className="flex-1 flex items-stretch px-2 py-2 gap-0 relative">
            <div className="w-7 bg-gradient-to-b from-[#5b21b6] to-[#3b0f6b] border-2 border-yellow-400/50 rounded-md flex flex-col items-center justify-around py-1 shrink-0 shadow-lg">
              {[2,3,1,6,7,4,5,10,8,9].map(n=> <span key={n} className="text-[10px] font-black text-pink-200 drop-shadow">{n}</span>)}
            </div>
            <div className="flex-1 mx-1 rounded-lg border-[3px] border-cyan-400/70 bg-[#150a2e] overflow-hidden flex shadow-[0_0_12px_rgba(0,255,255,0.3)] relative">
              <div className="flex-1 grid grid-cols-3">
                {Array.from({length:3}).map((_, reelIdx)=>(
                  <div key={reelIdx} className="border-r border-cyan-400/30 last:border-0 flex flex-col relative overflow-hidden">
                    <div className="flex flex-col transition-transform will-change-transform" style={{transform:`translateY(${reelOffsets[reelIdx]||0}px)`, transitionDuration: spinning?'140ms':'380ms', transitionTimingFunction: spinning?'linear':'cubic-bezier(0.22,1,0.36,1)', filter: spinning?'blur(0.6px)':''}}>
                      {(grid[reelIdx] || Array.from({length:3}, ()=>game.symbols[0].id)).map((symId, rowIdx)=>{
                        const isWin = winPositions.has(`${reelIdx}-${rowIdx}`);
                        return (
                          <div key={`${reelIdx}-${rowIdx}`} className="h-[86px] border-b border-black/20 relative" style={{height: 'calc((100%)/3)'}}>
                            <SnakeSymbol symId={symId} isWin={isWin} game={game} />
                            {isWin && <div className="absolute inset-0 border-2 border-yellow-300 pointer-events-none animate-pulse bg-yellow-400/10"/>}
                          </div>
                        );
                      })}
                    </div>
                    {reelIdx===1 && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-[112%] h-6 bg-gradient-to-b from-cyan-400/30 to-transparent pointer-events-none -z-0" />
                    )}
                  </div>
                ))}
              </div>
              {/* WIN highlight bar */}
              {winPositions.size>0 && <div className="absolute inset-x-0 top-1/2 h-0.5 bg-yellow-300/80 blur-[1px] pointer-events-none" />}
              {/* BONUS BET OFF badge */}
              <div className="absolute -bottom-1 right-1 bg-gradient-to-r from-[#7a3a00] to-[#b45309] border-2 border-yellow-300 rounded-full px-2 py-0.5 flex items-center gap-1 shadow">
                <span className="w-5 h-5 rounded-full bg-white text-[#7a3a00] text-[8px] font-black flex items-center justify-center">OFF</span>
                <span className="text-[8px] font-black text-white">BONUS BET</span>
              </div>
            </div>
            <div className="w-7 bg-gradient-to-b from-[#5b21b6] to-[#3b0f6b] border-2 border-yellow-400/50 rounded-md flex flex-col items-center justify-around py-1 shrink-0 shadow-lg">
              {[2,4,1,6,8,3,5,10,7,9].map(n=> <span key={n} className="text-[10px] font-black text-pink-200 drop-shadow">{n}</span>)}
            </div>
          </div>

          {/* Blue WIN bar */}
          <div className="h-9 mx-2 mb-1 rounded-full bg-gradient-to-r from-[#0a4a9a] via-[#1a7ad0] to-[#0a4a9a] border-2 border-yellow-300 flex items-center justify-between px-3 shadow-[0_2px_8px_rgba(0,0,0,0.5)] shrink-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-b from-cyan-300 to-blue-600 border-2 border-white flex items-center justify-center shadow-inner">◉</div>
            <span className="font-black text-yellow-200 text-[13px] tracking-widest drop-shadow">
              {lastWin>0 ? `WIN ${lastWin.toFixed(2).replace('.',',')}` : winMessage ? winMessage : '4 aparecem no rolo 2, recebeu!'}
            </span>
            <div className="w-7 h-7 rounded-full bg-gradient-to-b from-cyan-300 to-blue-600 border-2 border-white flex items-center justify-center shadow-inner">◉</div>
          </div>
          {winMessage && winMessage.includes('Cobra') && (
            <div className="mx-2 -mt-1 mb-1 h-6 rounded bg-gradient-to-r from-yellow-600 to-amber-500 flex items-center justify-center">
              <span className="text-[11px] font-black text-white">🐍 {winMessage} 🐍</span>
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div className="h-[28%] min-h-[140px] bg-gradient-to-b from-[#3b1070] to-[#1a0838] border-t-2 border-yellow-400/30 p-2 flex flex-col justify-between shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-black/30 rounded-full px-2 py-1 border border-white/10">
              <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-[10px]">₿</span>
              <span className="text-yellow-300 font-black text-sm">{(coins%10).toFixed(2).replace('.',',')}</span>
            </div>
            <div className="flex items-center gap-2 bg-black/30 rounded-full px-2 py-1 border border-white/10">
              <span className="text-[10px] text-white/60">🏆</span>
              <span className="text-yellow-300 font-black text-sm">{lastWin.toFixed(2).replace('.',',')}</span>
              <span className="text-[8px] text-white/50">0,10/BET</span>
            </div>
            <button className="flex items-center gap-1 bg-white/10 rounded-full px-3 py-1 border border-white/10 text-white text-xs"><span>☰</span> Mais</button>
          </div>

          <div className="flex items-center justify-between">
            <div className="bg-black/40 rounded-lg px-2 py-1 border border-white/10 flex flex-col items-center">
              <div className="flex items-center gap-1 text-white/70 text-xs">
                <button onClick={()=>setBetIdx(i=>Math.max(0,i-1))} className="w-5 h-5 rounded bg-white/10 flex items-center justify-center">−</button>
                <span>1x</span>
                <button onClick={()=>setBetIdx(i=>Math.min(betOptions.length-1,i+1))} className="w-5 h-5 rounded bg-white/10 flex items-center justify-center">+</button>
              </div>
              <span className="text-white font-bold text-sm">{(bet/100).toFixed(2).replace('.',',')}</span>
              <span className="text-[9px] text-white/50 flex items-center gap-1">⚙ 10Lines</span>
            </div>

            <button onClick={handleSpin} disabled={spinning || !canSpin} className={`w-[78px] h-[78px] rounded-full border-[4px] flex items-center justify-center shadow-[0_6px_16px_rgba(0,0,0,0.6)] active:scale-95 transition ${spinning?'border-yellow-300 bg-green-700 animate-pulse':'border-yellow-400 bg-gradient-to-b from-fuchsia-500 via-pink-500 to-violet-600'}`}>
              <span className="text-3xl">↻</span>
            </button>

            <div className="flex flex-col gap-1">
              <button onClick={()=>setTurbo(v=>!v)} className={`px-3 py-1 rounded-full border text-[11px] font-bold flex items-center gap-1 ${turbo?'bg-yellow-400 text-black border-yellow-300':'bg-white/10 text-white border-white/20'}`}>⚡ Rápido</button>
              <button onClick={()=>setAutoSpin(v=>!v)} className={`px-3 py-1 rounded-full border text-[11px] font-bold flex items-center gap-1 ${autoSpin?'bg-red-500 text-white border-red-300':'bg-white/10 text-white border-white/20'}`}>▶ Auto</button>
            </div>
          </div>

          <div className="flex justify-center">
            <span className="text-[9px] text-white/30 tracking-widest">TOQUE PARA GIRAR • DESLIZE PARA VER PRÊMIOS</span>
          </div>
        </div>

        {/* Close + music */}
        <button onClick={handleClose} className="absolute top-8 right-2 w-7 h-7 rounded-full bg-black/40 text-white border border-white/20 flex items-center justify-center"><X className="w-4 h-4"/></button>
        <button onClick={()=>setMusicOn(v=>!v)} className="absolute top-8 left-2 w-7 h-7 rounded-full bg-black/30 text-white border border-white/10 flex items-center justify-center">{musicOn?<Volume2 className="w-4 h-4"/>:<VolumeX className="w-4 h-4"/>}</button>

        {showBigWin && (
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/95 to-orange-600/95 flex flex-col items-center justify-center z-30 p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-4xl animate-bounce">🎉</div>
            <h3 className="font-black text-[#7c1a1a] text-3xl mt-3">MEGA GANHO!</h3>
            <p className="font-black text-[#7c1a1a] text-xl">R$ {(lastWin||JACKPOT.grand/1000000).toFixed(2).replace('.',',')}</p>
            <p className="text-[#7c1a1a]/70 text-xs mt-1">Fortune Snake • x{(lastWin/bet).toFixed(1)}</p>
          </div>
        )}
      </div>
    </div>
  );
};
