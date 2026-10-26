import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, X, Coins, Gem, Dices, Gift, Sparkles, Flame, Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import { BOARD_TILES, WHEEL_SEGMENTS, AVAILABLE_PAWNS, INITIAL_GAME_STATE, loadGameState, saveGameState } from './data/gameData';
import { SLOT_GAMES } from './data/slotGames';
import { BoardTile, WheelSegment, Mission, Pawn, GameState } from './types/game';
import { FortuneBoard } from './components/FortuneBoard';
import { CasinoHeader } from './components/CasinoHeader';
import { BannerCarousel } from './components/BannerCarousel';
import { CategoryTabs } from './components/CategoryTabs';
import { GameGrid } from './components/GameGrid';
import { SlotGameModal } from './components/SlotGameModal';
import { RainbowFortuneWheelModal } from './components/RainbowFortuneWheelModal';
import { MissionsModal } from './components/MissionsModal';
import { StoreModal } from './components/StoreModal';
import { MiniGamesModal } from './components/MiniGamesModal';
import { BottomTabBar } from './components/BottomTabBar';
import { sound } from './utils/audio';
import { SlotGameDef } from './types/game';

export default function App() {
  const [state, setState] = useState<GameState>(() => {
    const loaded = loadGameState();
    return { ...loaded, lastRollRefillTime: loaded.lastRollRefillTime || Date.now() };
  });

  // UI state
  const [activeCategory, setActiveCategory] = useState('Popular');
  const [view, setView] = useState<'lobby' | 'board'>('lobby');
  const [showWheel, setShowWheel] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [showMiniGames, setShowMiniGames] = useState(false);
  const [miniGameTab, setMiniGameTab] = useState<'chest' | 'scratch' | 'plinko'>('chest');
  const [showJackpotInfo, setShowJackpotInfo] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [activeSlotGame, setActiveSlotGame] = useState<SlotGameDef | null>(null);
  const [showToast, setShowToast] = useState<{ msg: string; sub?: string } | null>(null);
  const [showBoardToast, setShowBoardToast] = useState<string | null>(null);
  const [slotFav, setSlotFav] = useState<Set<string>>(new Set(['fortune-tiger', 'fortune-rabbit']));
  const [bottomTab, setBottomTab] = useState('comecar');

  // Dice & board state
  const [isRolling, setIsRolling] = useState(false);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [autoRoll, setAutoRoll] = useState(false);

  const currentPawn: Pawn = AVAILABLE_PAWNS.find(p => p.id === state.currentPawnId) || AVAILABLE_PAWNS[0];

  // Persist
  useEffect(() => {
    saveGameState(state);
  }, [state]);

  // Sync sound manager
  useEffect(() => {
    sound.setEnabled(state.soundEnabled);
  }, [state.soundEnabled]);

  // Roll refill timer + jackpot growth
  useEffect(() => {
    const id = setInterval(() => {
      setState(prev => {
        let next = { ...prev };
        // refill 1 roll per 60s if under max
        if (prev.rolls < prev.maxRolls) {
          const elapsed = Math.floor((Date.now() - prev.lastRollRefillTime) / 1000);
          if (elapsed >= 60) {
            const add = Math.floor(elapsed / 60);
            const rollsToAdd = Math.min(add, prev.maxRolls - prev.rolls);
            next = {
              ...next,
              rolls: prev.rolls + rollsToAdd,
              lastRollRefillTime: prev.lastRollRefillTime + rollsToAdd * 60 * 1000,
            };
          }
        }
        // jackpot grows slowly
        next.jackpotPool = Math.floor(next.jackpotPool + Math.floor(Math.random() * 8) + 2);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // AutoRoll effect
  useEffect(() => {
    if (!autoRoll) return;
    if (state.rolls < state.rollMultiplier) {
      setAutoRoll(false);
      return;
    }
    if (isRolling) return;
    const t = setTimeout(() => handleRollDice(), 800);
    return () => clearTimeout(t);
  }, [autoRoll, state.rolls, state.rollMultiplier, isRolling]);

  const pushToast = (msg: string, sub?: string) => {
    setShowToast({ msg, sub });
    setTimeout(() => setShowToast(null), 2500);
  };

  const addXP = useCallback((amount: number, cur: GameState): GameState => {
    let xp = cur.xp + amount;
    let level = cur.level;
    let xpToNextLevel = cur.xpToNextLevel;
    let maxRolls = cur.maxRolls;
    let rolls = cur.rolls;
    while (xp >= xpToNextLevel) {
      xp -= xpToNextLevel;
      level += 1;
      xpToNextLevel = Math.floor(xpToNextLevel * 1.25) + 20;
      maxRolls += 2;
      rolls += 5;
      sound.playLevelUp();
      confetti({ particleCount: 100, spread: 80 });
      pushToast(`Level Up! Lv.${level}`, `+5 Rolls • Max ${maxRolls}`);
    }
    return { ...cur, xp, level, xpToNextLevel, maxRolls, rolls };
  }, []);

  const progressMission = useCallback((idOrFn: string | ((m: Mission) => boolean), inc: number, byCoins?: number) => {
    setState(prev => {
      const missions = prev.missions.map(m => {
        let should = false;
        if (typeof idOrFn === 'string') should = m.id === idOrFn;
        else should = idOrFn(m);
        if (!should || m.claimed) return m;
        // Don't exceed target for specific missions that are counting wins/rolls
        const newCurrent = Math.min(m.target, m.current + inc);
        const completed = newCurrent >= m.target ? true : m.completed;
        if (completed && !m.completed) {
          // toast on mission complete
          setTimeout(() => pushToast(`Missão completa: ${m.title}`, `Recompensa: 🪙 ${m.rewardCoins} • 💎 ${m.rewardGems}`), 100);
          sound.playWinFanfare();
        }
        return { ...m, current: newCurrent, completed };
      });
      return { ...prev, missions };
    });
    if (byCoins) {
      setState(prev => {
        const missions = prev.missions.map(m => {
          if (m.id !== 'm8' || m.claimed) return m;
          const newCurrent = Math.min(m.target, m.current + byCoins!);
          const completed = newCurrent >= m.target;
          if (completed && !m.completed) setTimeout(() => pushToast(`Missão completa: ${m.title}!`), 100);
          return { ...m, current: newCurrent, completed };
        });
        return { ...prev, missions };
      });
    }
  }, []);

  const handleChangeMultiplier = (m: number) => {
    setState(s => ({ ...s, rollMultiplier: m }));
  };

  const handleTileEffect = (tile: BoardTile, multiplier: number) => {
    const base = tile.rewardValue;
    let coinsGain = 0;
    let gemsGain = 0;
    let rollsGain = 0;
    let lapCompleted = false;

    switch (tile.type) {
      case 'go':
        coinsGain = 500 * multiplier;
        pushToast(`PASSOU NO GO!`, `+${coinsGain} Coins`);
        // lap counted in handleRollDice
        progressMission('m2', 0); // will be handled there
        break;
      case 'coins':
        coinsGain = base * multiplier;
        if (tile.id === 5 || tile.id === 17) gemsGain = tile.id === 5 ? 2 : 3;
        pushToast(`+${coinsGain} Coins`, tile.name);
        progressMission('m8', 0, coinsGain);
        if (coinsGain >= 500) progressMission(m => m.id === 'm6' && multiplier >= 5, 1);
        break;
      case 'chest':
        setMiniGameTab('chest');
        setShowMiniGames(true);
        setShowBoardToast(`Baú Misterioso! Escolha um tesouro.`);
        progressMission(m => m.id === 'm3', 1);
        break;
      case 'wheel':
        setShowWheel(true);
        setShowBoardToast(`Roda da Fortuna! Gire para cascatas!`);
        break;
      case 'minigame':
        if (tile.id === 6) setMiniGameTab('plinko');
        else if (tile.id === 11) setMiniGameTab('scratch');
        else setMiniGameTab('chest');
        setShowMiniGames(true);
        setShowBoardToast(`Mini-game: ${tile.name}`);
        break;
      case 'multiplier':
        setState(s => ({ ...s, rollMultiplier: base }));
        pushToast(`Multiplicador ${base}x ativo!`, 'Próxima recompensa multiplicada');
        break;
      case 'tax':
        const tax = 100 * multiplier;
        setState(s => ({ ...s, jackpotPool: s.jackpotPool + tax, coins: Math.max(0, s.coins - tax) }));
        pushToast(`Contribuiu ${tax} ao Jackpot`, `Jackpot agora ${state.jackpotPool + tax}`);
        return; // early to not double credit
      case 'jackpot':
        const winJackpot = Math.floor(state.jackpotPool * 0.1);
        coinsGain = Math.max(1000, winJackpot) * multiplier;
        setState(s => ({ ...s, jackpotPool: Math.max(88888, s.jackpotPool - winJackpot) }));
        pushToast(`JACKPOT! +${coinsGain} Coins!`, `10% do pool progressivo`);
        sound.playWinFanfare();
        confetti({ particleCount: 120, spread: 90 });
        break;
      case 'special':
        rollsGain = base;
        pushToast(`+${rollsGain} Rolls`, tile.description);
        break;
      default:
        break;
    }

    if (coinsGain > 0 || gemsGain > 0 || rollsGain > 0) {
      setState(prev => {
        let n: GameState = { ...prev, coins: prev.coins + coinsGain, gems: prev.gems + gemsGain, rolls: Math.min(prev.maxRolls, prev.rolls + rollsGain) };
        n = addXP(Math.floor(coinsGain / 40) + (gemsGain * 5) + (rollsGain * 2) + 5, n);
        n.stats = { ...n.stats, totalCoinsWon: n.stats.totalCoinsWon + coinsGain, chestsOpened: tile.type === 'chest' ? n.stats.chestsOpened + 1 : n.stats.chestsOpened };
        // Sound appropriate
        if (coinsGain >= 1000) sound.playWinFanfare();
        else if (coinsGain > 0) sound.playCoin();
        if (gemsGain > 0) sound.playChestOpen();
        return n;
      });
      if (coinsGain > 0) progressMission(m => m.id === 'm8', 0, coinsGain);
    }

    if (tile.type === 'coins' || tile.type === 'go' || tile.type === 'jackpot') {
      setShowBoardToast(`+${coinsGain} Coins em ${tile.name}`);
    }
  };

  const handleRollDice = () => {
    if (isRolling) return;
    if (state.rolls < state.rollMultiplier) {
      pushToast('Sem rolls suficientes', 'Recarregue ou compre pacotes');
      return;
    }
    setIsRolling(true);
    sound.playDiceRoll();

    // Deduct rolls immediately
    setState(prev => ({ ...prev, rolls: prev.rolls - prev.rollMultiplier, stats: { ...prev.stats, totalRolls: prev.stats.totalRolls + 1 } }));
    progressMission('m1', 1);

    // Roll animation 800ms then advance
    const dice = Math.floor(Math.random() * 6) + 1;
    setDiceResult(dice);

    setTimeout(() => {
      setIsRolling(false);
      setState(prev => {
        let newIdx = prev.playerTileIndex + dice;
        let laps = 0;
        if (newIdx >= BOARD_TILES.length) {
          laps = Math.floor(newIdx / BOARD_TILES.length);
          newIdx = newIdx % BOARD_TILES.length;
        }
        let n: GameState = { ...prev, playerTileIndex: newIdx };
        if (laps > 0) {
          const lapCoins = 500 * prev.rollMultiplier * laps;
          n.coins += lapCoins;
          n.stats = { ...n.stats, lapsCompleted: n.stats.lapsCompleted + laps, totalCoinsWon: n.stats.totalCoinsWon + lapCoins };
          pushToast(`Volta completa! +${laps} Lap(s)`, `+${lapCoins} Coins bônus`);
          // mission m2 is lapsCompleted
          // update missions laps
          n.missions = n.missions.map(m => m.id === 'm2' ? { ...m, current: n.stats.lapsCompleted, completed: n.stats.lapsCompleted >= m.target } : m);
          if (n.stats.lapsCompleted >= 1 && !prev.missions.find(m => m.id === 'm2')?.completed) {
            sound.playWinFanfare();
            confetti({ particleCount: 60, spread: 60 });
          }
          n = addXP(20 * laps, n);
        }

        // Apply tile effect after state update - we do via handler that will use current multiplier
        // Need to do it on next tick with correct tile
        setTimeout(() => {
          const tile = BOARD_TILES[newIdx];
          handleTileEffect(tile, prev.rollMultiplier);
        }, 80);

        // jackpot small growth on roll
        n.jackpotPool += 15 * prev.rollMultiplier;
        return n;
      });
    }, 750);
  };

  const handleWheelWin = (segment: WheelSegment, totalWinMultiplier: number, isCascade: boolean) => {
    const baseCoins = 250;
    const coinsWon = baseCoins * totalWinMultiplier;
    setState(prev => {
      let nextCascade = isCascade ? prev.cascadeStreak + 1 : 1;
      if (!isCascade) nextCascade = 1;
      if (isCascade && nextCascade > 1) sound.playCascadeSwell(nextCascade);
      const n: GameState = {
        ...prev,
        coins: prev.coins + coinsWon,
        gems: prev.gems + (totalWinMultiplier >= 8 ? 3 : totalWinMultiplier >= 5 ? 1 : 0),
        lastSpinColor: segment.colorName,
        cascadeStreak: nextCascade,
        stats: {
          ...prev.stats,
          totalSpins: prev.stats.totalSpins + 1,
          highestMultiplier: Math.max(prev.stats.highestMultiplier, segment.multiplier),
          totalCoinsWon: prev.stats.totalCoinsWon + coinsWon,
          cascadesTriggered: isCascade ? prev.stats.cascadesTriggered + 1 : prev.stats.cascadesTriggered,
        },
      };
      // missions
      const updatedMissions = n.missions.map(m => {
        if (m.id === 'm4') {
          const newCurrent = m.current + 1;
          return { ...m, current: newCurrent, completed: newCurrent >= m.target };
        }
        if (m.id === 'm6' && segment.multiplier >= 5) {
          return { ...m, current: 1, completed: true };
        }
        if (m.id === 'm7' && isCascade) {
          return { ...m, current: 1, completed: true };
        }
        return m;
      });
      let withMissions = { ...n, missions: updatedMissions };
      withMissions = addXP(Math.floor(coinsWon / 30) + (isCascade ? 15 : 5), withMissions);
      // jackpot growth
      withMissions.jackpotPool += Math.floor(coinsWon * 0.08);
      return withMissions;
    });
    // immediate missions progress for wheel counted already via callback? also ensure m4 triggers
    progressMission('m4', 1);
    if (totalWinMultiplier >= 5) progressMission('m6', 1);
    if (isCascade) progressMission('m7', 1);
    pushToast(`Roda: ${segment.label} ${isCascade ? '🔥 CASCADE!' : ''}`, `+${coinsWon} Coins • x${totalWinMultiplier}`);
  };

  const handleMiniGameReward = (coinsR: number, gemsR: number, rollsR: number, gameName: string) => {
    setState(prev => {
      let n: GameState = { ...prev, coins: prev.coins + coinsR, gems: prev.gems + gemsR, rolls: Math.min(prev.maxRolls, prev.rolls + rollsR) };
      n.stats = { ...n.stats, miniGamesPlayed: n.stats.miniGamesPlayed + 1, totalCoinsWon: n.stats.totalCoinsWon + coinsR, chestsOpened: gameName.includes('Chest') ? n.stats.chestsOpened + 1 : n.stats.chestsOpened };
      n = addXP(Math.floor(coinsR / 50) + gemsR * 3 + 8, n);
      return n;
    });
    progressMission('m3', gameName.includes('Chest') ? 1 : 0);
    progressMission('m5', 1);
    progressMission('m8', 0, coinsR);
    pushToast(`${gameName}: +${coinsR} Coins!`, `+${gemsR} Gems • +${rollsR} Rolls`);
  };

  const handleSlotBet = (cost: number): boolean => {
    if (state.coins < cost) {
      pushToast('Saldo insuficiente', 'Faça um depósito para jogar');
      return false;
    }
    setState(s => ({ ...s, coins: s.coins - cost }));
    return true;
  };

  const handleSlotWin = (winCoins: number, gameName: string, isBig: boolean) => {
    setState(prev => {
      let n: GameState = { ...prev, coins: prev.coins + winCoins, stats: { ...prev.stats, totalCoinsWon: prev.stats.totalCoinsWon + winCoins } };
      n = addXP(Math.floor(winCoins / 40) + (isBig ? 12 : 3), n);
      n.jackpotPool += Math.floor(winCoins * 0.05);
      return n;
    });
    progressMission('m8', 0, winCoins);
    if (winCoins >= 250) progressMission('m6', 1);
    // Show toast but SlotModal also handles big win overlay
    if (!isBig && winCoins > 0) pushToast(`${gameName} pagou!`, `+${winCoins} Coins`);
  };

  const handleClaimMission = (missionId: string) => {
    const m = state.missions.find(x => x.id === missionId);
    if (!m || m.current < m.target || m.claimed) return;
    setState(prev => ({
      ...prev,
      coins: prev.coins + m.rewardCoins,
      gems: prev.gems + m.rewardGems,
      rolls: Math.min(prev.maxRolls, prev.rolls + m.rewardRolls),
      missions: prev.missions.map(x => x.id === missionId ? { ...x, claimed: true } : x),
    }));
    pushToast(`Recompensa resgatada!`, `+${m.rewardCoins} Coins • +${m.rewardGems} Gems • +${m.rewardRolls} Rolls`);
    sound.playWinFanfare();
    confetti({ particleCount: 80, spread: 70 });
  };

  const handleSelectPawn = (id: string) => {
    setState(s => ({ ...s, currentPawnId: id }));
    pushToast(`Mascote equipado`, AVAILABLE_PAWNS.find(p => p.id === id)?.name);
  };

  const handleBuyPawn = (pawn: Pawn) => {
    if (state.coins < pawn.priceCoins || state.gems < pawn.priceGems) return;
    setState(s => ({
      ...s,
      coins: s.coins - pawn.priceCoins,
      gems: s.gems - pawn.priceGems,
      unlockedPawns: [...s.unlockedPawns, pawn.id],
    }));
    pushToast(`Desbloqueado: ${pawn.name}`, `Boa sorte com seu novo mascote!`);
    sound.playChestOpen();
  };

  const handleBuyRolls = (bundle: { rolls: number; costCoins: number; costGems: number }) => {
    if (state.coins < bundle.costCoins || state.gems < bundle.costGems) {
      pushToast('Saldo insuficiente', 'Complete missões para ganhar moedas');
      return;
    }
    setState(s => ({ ...s, coins: s.coins - bundle.costCoins, gems: s.gems - bundle.costGems, rolls: Math.min(s.maxRolls, s.rolls + bundle.rolls) }));
    pushToast(`+${bundle.rolls} Rolls creditados!`, 'Boa sorte no tabuleiro!');
    sound.playCoin();
  };

  const handleDeposit = (amount?: number) => {
    const add = amount || 5000;
    setState(s => ({ ...s, coins: s.coins + add, gems: s.gems + Math.floor(add / 500) }));
    setShowDeposit(false);
    pushToast(`Depósito confirmado!`, `+${add.toLocaleString('pt-BR')} Coins • +${Math.floor(add / 500)} Gems`);
    sound.playWinFanfare();
    confetti({ particleCount: 80, spread: 60 });
  };

  const pendingMissionsCount = state.missions.filter(m => m.current >= m.target && !m.claimed).length;

  // Bottom tab handling
  const handleBottomNav = (id: string) => {
    if (id === 'deposit') { setShowDeposit(true); return; }
    setBottomTab(id);
    if (id === 'comecar') setView('lobby');
    else pushToast('Em breve', `${id} estará disponível em atualização futura`);
  };

  return (
    <div className="min-h-screen bg-[#0a1f15] text-slate-100 selection:bg-amber-500 selection:text-black">
      <CasinoHeader
        coins={state.coins}
        gems={state.gems}
        rolls={state.rolls}
        maxRolls={state.maxRolls}
        lastRollRefillTime={state.lastRollRefillTime}
        level={state.level}
        xp={state.xp}
        xpToNextLevel={state.xpToNextLevel}
        jackpotPool={state.jackpotPool}
        soundEnabled={state.soundEnabled}
        onToggleSound={() => setState(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
        onOpenMissions={() => setShowMissions(true)}
        onOpenStore={() => setShowStore(true)}
        onOpenJackpotInfo={() => setShowJackpotInfo(true)}
        pendingMissionsCount={pendingMissionsCount}
        onDeposit={() => setShowDeposit(true)}
      />

      {/* Main content area with bottom tab padding */}
      <main className="pb-20">
        {view === 'lobby' ? (
          <>
            <BannerCarousel onClaimPromo={(id) => {
              if (id.startsWith('q') || id.startsWith('b')) {
                handleDeposit(2000);
              }
            }} />

            <CategoryTabs active={activeCategory} onSelect={setActiveCategory} />

            {/* Live jackpot ticker + wins strip like 121bet */}
            <div className="lobby-container px-3 mt-3">
              <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 p-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white shadow">🏆</div>
                  <div>
                    <p className="text-[10px] font-black tracking-widest uppercase text-amber-200 leading-none">Jackpot Progressivo</p>
                    <p className="font-fredoka font-black text-white text-sm leading-none">R$ {state.jackpotPool.toLocaleString('pt-BR')}</p>
                  </div>
                </div>
                <button onClick={() => setView('board')} className="shrink-0 px-3 py-2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-[#0f2e1f] font-black text-xs shadow hover:brightness-110 active:scale-95 cursor-pointer flex items-center gap-1">
                  <span className="hidden sm:inline">🎲</span> Tabuleiro FortuneGo
                </button>
              </div>

              {/* Winner ticker — mimics 121bet winnerInFooterTop */}
              <div className="mt-2 rounded-full bg-black/40 border border-white/5 px-3 py-1.5 overflow-hidden flex items-center gap-3">
                <span className="shrink-0 text-[10px] font-black px-2 py-1 rounded-full bg-emerald-500 text-white">AO VIVO</span>
                <div className="flex-1 overflow-hidden relative h-4 text-xs">
                  <div className="absolute inset-0 flex items-center gap-6 whitespace-nowrap text-white/80 animate-jackpot-ticker font-semibold">
                    <span>🔥 @{randomName()} ganhou R$ {Math.floor(Math.random() * 8000 + 500).toLocaleString('pt-BR')} no Fortune Tiger</span>
                    <span>⭐ @{randomName()} ganhou R$ {Math.floor(Math.random() * 5000 + 300).toLocaleString('pt-BR')} no Fortune Rabbit</span>
                    <span>💎 @{randomName()} ganhou R$ {Math.floor(Math.random() * 12000 + 1000).toLocaleString('pt-BR')} no Wild Bandito</span>
                    <span>🔥 @{randomName()} ganhou R$ {Math.floor(Math.random() * 8000 + 500).toLocaleString('pt-BR')} no Fortune Dragon</span>
                  </div>
                </div>
              </div>
            </div>

            <GameGrid category={activeCategory} onPlay={setActiveSlotGame} favSet={slotFav} onToggleFav={(id) => {
              setSlotFav(prev => {
                const n = new Set(prev);
                if (n.has(id)) n.delete(id); else n.add(id);
                return n;
              });
            }} />

            {/* Featured Fortune Board promo card — bridges board game with casino lobby */}
            <div className="lobby-container px-3 pb-4">
              <div className="rounded-3xl overflow-hidden border-2 border-amber-400/30 shadow-xl">
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xl shadow">🎲</div>
                      <div>
                        <h3 className="font-fredoka font-black text-white text-sm sm:text-base leading-none">FortuneGo • Tabuleiro Mágico</h3>
                        <p className="text-xs text-amber-100/70">Gire o dado, avance casas e colete prêmios + multiplicadores</p>
                      </div>
                    </div>
                    <span className="hidden sm:flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full bg-amber-400 text-[#0f2e1f]">24 CASAS • 8 PRÊMIOS</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                    {[
                      { icon: '💰', label: 'Coins', value: '+500' },
                      { icon: '🎁', label: 'Baú', value: 'Surpresa' },
                      { icon: '🎡', label: 'Roda', value: 'Cascade x10' },
                      { icon: '⚡', label: 'Boost', value: '5x' },
                      { icon: '🏆', label: 'Jackpot', value: 'R$ 88k' },
                      { icon: '🎲', label: 'Rolls', value: '+8' },
                    ].map(it => (
                      <div key={it.label} className="rounded-2xl bg-white/5 border border-white/10 p-2 flex flex-col items-center gap-1">
                        <span className="text-xl">{it.icon}</span>
                        <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">{it.label}</span>
                        <span className="text-xs font-black text-amber-300">{it.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <button onClick={() => setView('board')} className="flex-1 py-3 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-[#0f2e1f] font-black text-sm shadow-lg hover:brightness-110 active:scale-95 cursor-pointer flex items-center justify-center gap-2">
                      🎮 JOGAR TABULEIRO AGORA • {state.rolls} rolls
                    </button>
                    <button onClick={() => setShowWheel(true)} className="px-5 py-3 rounded-full bg-white/10 border border-white/15 text-white font-bold text-sm hover:bg-white/15 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5">
                      🎡 Girar Roda
                    </button>
                  </div>
                </div>
              </div>
              {/* Footer info like 121bet */}
              <div className="mt-4 rounded-2xl bg-black/30 border border-white/5 p-3 text-center">
                <p className="text-[10px] font-bold tracking-widest uppercase text-white/40">Licenciado • Jogo Responsável • 18+ • FortuneGo 121BET Edition</p>
                <p className="text-[10px] text-white/30 mt-1">Este é um jogo demonstrativo com moeda fictícia. Sem valor monetário real.</p>
              </div>
            </div>
          </>
        ) : (
          <div className="lobby-container px-3 pt-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setView('lobby')} className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-white text-xs font-bold hover:bg-white/15 cursor-pointer flex items-center gap-1.5">
                ← Voltar ao Lobby
              </button>
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1"><Flame className="w-4 h-4" /> Tabuleiro FortuneGo • Lap #{(state.stats.lapsCompleted + 1)}</span>
            </div>
            <FortuneBoard
              tiles={BOARD_TILES}
              playerIndex={state.playerTileIndex}
              currentPawn={currentPawn}
              rolls={state.rolls}
              rollMultiplier={state.rollMultiplier}
              onChangeMultiplier={handleChangeMultiplier}
              onRollDice={handleRollDice}
              isRolling={isRolling}
              diceResult={diceResult}
              cascadeStreak={state.cascadeStreak}
              onOpenWheel={() => setShowWheel(true)}
              autoRoll={autoRoll}
              onToggleAutoRoll={() => setAutoRoll(v => !v)}
              lapCount={state.stats.lapsCompleted}
            />
            {showBoardToast && (
              <div className="mt-3 rounded-2xl bg-amber-500/15 border border-amber-400/30 p-3 text-center animate-pulse">
                <p className="text-sm font-bold text-amber-200">{showBoardToast}</p>
                <button onClick={() => setShowBoardToast(null)} className="text-xs text-amber-300 underline mt-1 cursor-pointer">dispensar</button>
              </div>
            )}
          </div>
        )}
      </main>

      <BottomTabBar active={bottomTab} onChange={handleBottomNav} onDeposit={() => setShowDeposit(true)} />

      {/* Overlays & Modals */}
      <SlotGameModal
        isOpen={!!activeSlotGame}
        game={activeSlotGame}
        onClose={() => setActiveSlotGame(null)}
        coins={state.coins}
        onBet={handleSlotBet}
        onWin={handleSlotWin}
        soundEnabled={state.soundEnabled}
      />

      <RainbowFortuneWheelModal
        isOpen={showWheel}
        onClose={() => setShowWheel(false)}
        cascadeStreak={state.cascadeStreak}
        lastSpinColor={state.lastSpinColor}
        onSpinWin={handleWheelWin}
        coins={state.coins}
      />

      <MissionsModal isOpen={showMissions} onClose={() => setShowMissions(false)} missions={state.missions} onClaimReward={handleClaimMission} />
      <StoreModal isOpen={showStore} onClose={() => setShowStore(false)} coins={state.coins} gems={state.gems} currentPawnId={state.currentPawnId} pawns={AVAILABLE_PAWNS.map(p => ({ ...p, unlocked: state.unlockedPawns.includes(p.id) || p.priceCoins === 0 }))} onSelectPawn={handleSelectPawn} onBuyPawn={handleBuyPawn} onBuyRolls={handleBuyRolls} />
      <MiniGamesModal isOpen={showMiniGames} onClose={() => setShowMiniGames(false)} activeGameType={miniGameTab} onReward={handleMiniGameReward} />

      {/* Jackpot info dialog */}
      {showJackpotInfo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-[#132e23] to-[#0a1f15] border-2 border-amber-400/40 rounded-3xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white"><Trophy className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-fredoka font-black text-white">Grand Jackpot</h3>
                  <p className="text-xs text-amber-200/70">Progressivo • Cresce a cada jogada</p>
                </div>
              </div>
              <button onClick={() => setShowJackpotInfo(false)} className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/15 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="rounded-2xl bg-black/40 border border-amber-400/20 p-4 text-center">
              <p className="text-[10px] font-bold tracking-widest uppercase text-amber-200/70">Pool atual</p>
              <p className="font-fredoka font-black text-3xl text-amber-300">R$ {state.jackpotPool.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-white/60 mt-1">+R$ {Math.floor(Math.random() * 30 + 5)} por segundo • Contribuições de Tax Tiles</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-white/5 border border-white/10 p-3"><p className="font-bold text-white">Como ganhar?</p><p className="text-white/60 mt-1">Caia na casa Jackpot Oasis (tile 12) ou ative 50x na Roda para levar 10% do pool!</p></div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3"><p className="font-bold text-white">Maior prêmio</p><p className="text-amber-300 font-black mt-1">R$ 88.888 em teste interno</p></div>
            </div>
            <button onClick={() => setShowJackpotInfo(false)} className="w-full mt-4 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-[#0f2e1f] font-black hover:brightness-110 cursor-pointer">FECHAR</button>
          </div>
        </div>
      )}

      {/* Deposit modal — mimic 121bet deposito */}
      {showDeposit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-white to-slate-50 rounded-3xl max-w-md w-full p-5 shadow-2xl relative text-slate-900 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowDeposit(false)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center hover:bg-slate-200 cursor-pointer"><X className="w-4 h-4" /></button>
            <h3 className="font-fredoka font-black text-xl text-[#164633] flex items-center gap-2">💳 Depósito Rápido <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">PIX INSTANTÂNEO</span></h3>
            <p className="text-xs text-slate-500 mt-1">Escolha o valor — crédito fictício para demonstração</p>

            <div className="grid grid-cols-3 gap-2 mt-4">
              {[500, 1000, 2000, 5000, 10000, 20000].map(v => (
                <button key={v} onClick={() => handleDeposit(v)} className="rounded-2xl border-2 border-emerald-500/20 bg-emerald-50 hover:bg-emerald-100 p-3 flex flex-col items-center gap-1 cursor-pointer active:scale-95 hover:border-emerald-400 transition-all">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-700">R$</span>
                  <span className="font-black text-emerald-900">{v.toLocaleString('pt-BR')}</span>
                  <span className="text-[9px] font-bold text-emerald-700">+{Math.floor(v / 500)} GEMS BÔNUS</span>
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-3 flex gap-2">
              <span className="text-xl">🎁</span>
              <div>
                <p className="text-xs font-black text-amber-900">Bônus de boas-vindas 100%</p>
                <p className="text-xs text-amber-800/70">Em depósitos acima de R$ 50 você dobra! Limitado a 1x por conta.</p>
              </div>
            </div>

            <button onClick={() => handleDeposit(5000)} className="w-full mt-4 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black shadow hover:brightness-110 active:scale-95 cursor-pointer">DEPOSITAR R$ 5.000 AGORA</button>
            <p className="text-center text-[10px] text-slate-400 mt-2">Demonstração — sem pagamento real • FortuneGo • 18+</p>
          </div>
        </div>
      )}

      {/* Global toast */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] pointer-events-none flex flex-col items-center">
          <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-[#0f2e1f] font-black px-5 py-2.5 rounded-full shadow-xl border-2 border-yellow-200 flex items-center gap-2 animate-bounce-slow">
            <span className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-sm">🎉</span>
            <div className="text-left leading-tight">
              <p className="text-xs sm:text-sm leading-none">{showToast.msg}</p>
              {showToast.sub && <p className="text-[10px] font-bold opacity-70 leading-none">{showToast.sub}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function randomName() {
  const names = ['Carlos', 'Ana', 'Rafael', 'Julia', 'Marcos', 'Beatriz', 'Lucas', 'Fernanda', 'Diego', 'Camila', 'Thiago', 'Leticia'];
  return names[Math.floor(Math.random() * names.length)] + '***' + Math.floor(Math.random() * 90 + 10);
}
