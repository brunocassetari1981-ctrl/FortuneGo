import React, { useMemo, useState } from 'react';
import { Header } from './components/Header';
import { FortuneBoard } from './components/FortuneBoard';
import { MissionsModal } from './components/MissionsModal';
import { StoreModal } from './components/StoreModal';
import { MiniGamesModal } from './components/MiniGamesModal';
import { RainbowFortuneWheelModal } from './components/RainbowFortuneWheelModal';
import { BOARD_TILES, AVAILABLE_PAWNS, INITIAL_GAME_STATE, loadGameState, saveGameState } from './data/gameData';
import { GameState, Mission, Pawn, WheelSegment } from './types/game';

const initialGame = loadGameState();

export default function App() {
  const [game, setGame] = useState<GameState>(initialGame);
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [miniGameOpen, setMiniGameOpen] = useState(false);
  const [miniGameType, setMiniGameType] = useState<'chest' | 'scratch' | 'plinko'>('chest');
  const [isRolling, setIsRolling] = useState(false);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [autoRoll, setAutoRoll] = useState(false);

  const applyGameUpdate = (updater: (current: GameState) => GameState) => {
    setGame((current) => {
      const next = updater(current);
      saveGameState(next);
      return next;
    });
  };

  const currentPawn = useMemo(
    () => AVAILABLE_PAWNS.find((pawn) => pawn.id === game.currentPawnId) ?? AVAILABLE_PAWNS[0],
    [game.currentPawnId]
  );

  const pendingMissionsCount = game.missions.filter(
    (mission) => !mission.claimed && mission.current >= mission.target
  ).length;

  const handleToggleSound = () => {
    applyGameUpdate((current) => ({
      ...current,
      soundEnabled: !current.soundEnabled,
    }));
  };

  const handleOpenMissions = () => setMissionsOpen(true);
  const handleOpenStore = () => setStoreOpen(true);
  const handleOpenJackpotInfo = () => setMiniGameOpen(true);

  const handleChangeMultiplier = (multiplier: number) => {
    applyGameUpdate((current) => ({
      ...current,
      rollMultiplier: multiplier,
    }));
  };

  const handleRollDice = () => {
    if (isRolling || game.rolls < game.rollMultiplier) return;

    setIsRolling(true);
    const result = Math.floor(Math.random() * 6) + 1;
    setDiceResult(result);

    const steps = 3 + Math.floor(Math.random() * 3);
    const baseIndex = game.playerTileIndex;
    const nextIndex = (baseIndex + (result * game.rollMultiplier) + steps) % BOARD_TILES.length;

    setTimeout(() => {
      applyGameUpdate((current) => {
        const nextRolls = current.rolls - current.rollMultiplier;
        const nextCoins = current.coins + (BOARD_TILES[nextIndex].rewardValue || 0) + result * 25;
        const nextLevel = current.level + (nextCoins > current.xpToNextLevel ? 1 : 0);
        const nextXp = current.xp + 15 + result * 5;

        return {
          ...current,
          rolls: Math.max(0, nextRolls),
          coins: nextCoins,
          playerTileIndex: nextIndex,
          level: nextLevel,
          xp: nextXp,
          xpToNextLevel: current.xpToNextLevel + (nextLevel > current.level ? 25 : 0),
          jackpotPool: current.jackpotPool + 150,
        };
      });

      setIsRolling(false);
    }, 700);
  };

  const handleMissionClaim = (missionId: string) => {
    applyGameUpdate((current) => ({
      ...current,
      missions: current.missions.map((mission) =>
        mission.id === missionId
          ? {
              ...mission,
              claimed: true,
              current: mission.target,
            }
          : mission
      ),
      coins: current.coins + 250,
      gems: current.gems + 2,
      rolls: Math.min(current.maxRolls, current.rolls + 5),
    }));
  };

  const handleSelectPawn = (pawnId: string) => {
    applyGameUpdate((current) => ({
      ...current,
      currentPawnId: pawnId,
    }));
  };

  const handleBuyPawn = (pawn: Pawn) => {
    if (game.coins < pawn.priceCoins || game.gems < pawn.priceGems) return;

    applyGameUpdate((current) => ({
      ...current,
      coins: current.coins - pawn.priceCoins,
      gems: current.gems - pawn.priceGems,
      unlockedPawns: Array.from(new Set([...current.unlockedPawns, pawn.id])),
      currentPawnId: pawn.id,
    }));
  };

  const handleBuyRolls = (bundle: { rolls: number; costCoins: number; costGems: number }) => {
    if (game.coins < bundle.costCoins || game.gems < bundle.costGems) return;

    applyGameUpdate((current) => ({
      ...current,
      coins: current.coins - bundle.costCoins,
      gems: current.gems - bundle.costGems,
      rolls: Math.min(current.maxRolls, current.rolls + bundle.rolls),
    }));
  };

  const handleSpinWin = (segment: WheelSegment, totalMultiplier: number, isCascade: boolean) => {
    const coinsWon = 250 * totalMultiplier;

    applyGameUpdate((current) => ({
      ...current,
      coins: current.coins + coinsWon,
      jackpotPool: current.jackpotPool + Math.max(50, coinsWon / 10),
      cascadeStreak: isCascade ? current.cascadeStreak + 1 : 1,
      lastSpinColor: segment.colorName,
    }));
  };

  const handleRewardFromMiniGame = (coins: number, gems: number, rolls: number, gameName: string) => {
    applyGameUpdate((current) => ({
      ...current,
      coins: current.coins + coins,
      gems: current.gems + gems,
      rolls: Math.min(current.maxRolls, current.rolls + rolls),
      stats: {
        ...current.stats,
        totalCoinsWon: current.stats.totalCoinsWon + coins,
        miniGamesPlayed: current.stats.miniGamesPlayed + 1,
      },
    }));

    if (gameName) {
      console.log(`Reward received from ${gameName}`);
    }
  };

  const handleAutoRollToggle = () => {
    setAutoRoll((current) => !current);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header
        coins={game.coins}
        gems={game.gems}
        rolls={game.rolls}
        maxRolls={game.maxRolls}
        lastRollRefillTime={game.lastRollRefillTime}
        level={game.level}
        xp={game.xp}
        xpToNextLevel={game.xpToNextLevel}
        jackpotPool={game.jackpotPool}
        soundEnabled={game.soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenMissions={handleOpenMissions}
        onOpenStore={handleOpenStore}
        onOpenJackpotInfo={handleOpenJackpotInfo}
        pendingMissionsCount={pendingMissionsCount}
      />

      <div className="px-3 py-4 sm:px-6">
        <FortuneBoard
          tiles={BOARD_TILES}
          playerIndex={game.playerTileIndex}
          currentPawn={currentPawn}
          rolls={game.rolls}
          rollMultiplier={game.rollMultiplier}
          onChangeMultiplier={handleChangeMultiplier}
          onRollDice={handleRollDice}
          isRolling={isRolling}
          diceResult={diceResult}
          cascadeStreak={game.cascadeStreak}
          onOpenWheel={() => setWheelOpen(true)}
          autoRoll={autoRoll}
          onToggleAutoRoll={handleAutoRollToggle}
          lapCount={Math.floor(game.playerTileIndex / BOARD_TILES.length)}
        />
      </div>

      <MissionsModal
        isOpen={missionsOpen}
        onClose={() => setMissionsOpen(false)}
        missions={game.missions}
        onClaimReward={handleMissionClaim}
      />

      <StoreModal
        isOpen={storeOpen}
        onClose={() => setStoreOpen(false)}
        coins={game.coins}
        gems={game.gems}
        currentPawnId={game.currentPawnId}
        pawns={AVAILABLE_PAWNS.map((pawn) => ({
          ...pawn,
          unlocked: game.unlockedPawns.includes(pawn.id),
        }))}
        onSelectPawn={handleSelectPawn}
        onBuyPawn={handleBuyPawn}
        onBuyRolls={handleBuyRolls}
      />

      <MiniGamesModal
        isOpen={miniGameOpen}
        onClose={() => setMiniGameOpen(false)}
        activeGameType={miniGameType}
        onReward={handleRewardFromMiniGame}
      />

      <RainbowFortuneWheelModal
        isOpen={wheelOpen}
        onClose={() => setWheelOpen(false)}
        cascadeStreak={game.cascadeStreak}
        lastSpinColor={game.lastSpinColor}
        onSpinWin={handleSpinWin}
        coins={game.coins}
      />
    </div>
  );
}
