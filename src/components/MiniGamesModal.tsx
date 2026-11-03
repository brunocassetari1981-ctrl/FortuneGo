import React, { useState } from 'react';
import { X, Sparkles, Gift, Ticket, Play, RotateCcw, Trophy, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';

interface MiniGamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGameType: 'chest' | 'scratch' | 'plinko';
  onReward: (coins: number, gems: number, rolls: number, gameName: string) => void;
}

export const MiniGamesModal: React.FC<MiniGamesModalProps> = ({
  isOpen,
  onClose,
  activeGameType,
  onReward
}) => {
  const [tab, setTab] = useState<'chest' | 'scratch' | 'plinko'>(activeGameType);

  // --- Chest Mini Game State ---
  const [chestsOpened, setChestsOpened] = useState(false);
  const [chosenChest, setChosenChest] = useState<number | null>(null);
  const [chestContents, setChestContents] = useState<Array<{ coins: number; gems: number; rolls: number; label: string }>>([]);

  // --- Scratch Card State ---
  const scratchSymbols = [
    { name: 'Crown', icon: '👑', value: 2500, matchMult: 25 },
    { name: 'Diamond', icon: '💎', value: 1500, matchMult: 15 },
    { name: 'Star', icon: '⭐', value: 800, matchMult: 8 },
    { name: 'Coin', icon: '🪙', value: 500, matchMult: 5 },
    { name: 'Dice', icon: '🎲', value: 300, matchMult: 3 }
  ];
  const [scratchedGrid, setScratchedGrid] = useState<boolean[]>(Array(9).fill(false));
  const [gridSymbols, setGridSymbols] = useState<Array<{ name: string; icon: string; value: number }>>(() => generateScratchGrid());
  const [scratchClaimed, setScratchClaimed] = useState(false);

  // --- Plinko State ---
  const [plinkoDropping, setPlinkoDropping] = useState(false);
  const [plinkoBallPos, setPlinkoBallPos] = useState<{ x: number; y: number } | null>(null);
  const [plinkoResult, setPlinkoResult] = useState<number | null>(null);

  function generateScratchGrid() {
    // Generate 9 tiles with guaranteed 3-of-a-kind chance
    const luckySymbol = scratchSymbols[Math.floor(Math.random() * scratchSymbols.length)];
    const items: Array<{ name: string; icon: string; value: number }> = [];
    // 3 lucky items
    items.push(luckySymbol, luckySymbol, luckySymbol);
    // 6 random
    for (let i = 0; i < 6; i++) {
      items.push(scratchSymbols[Math.floor(Math.random() * scratchSymbols.length)]);
    }
    // Shuffle
    return items.sort(() => Math.random() - 0.5);
  }

  if (!isOpen) return null;

  // Handle Chest Selection
  const handlePickChest = (index: number) => {
    if (chestsOpened) return;
    setChosenChest(index);
    setChestsOpened(true);

    const generated = [
      { coins: 500 + Math.floor(Math.random() * 500), gems: 2, rolls: 3, label: 'Silver Stash' },
      { coins: 1500 + Math.floor(Math.random() * 1500), gems: 8, rolls: 8, label: 'Grand Treasure' },
      { coins: 800 + Math.floor(Math.random() * 400), gems: 4, rolls: 5, label: 'Fortune Relic' }
    ].sort(() => Math.random() - 0.5);

    setChestContents(generated);
    const win = generated[index];

    sound.playChestOpen();
    confetti({ particleCount: 60, spread: 60 });
    onReward(win.coins, win.gems, win.rolls, 'Mystery Chest');
  };

  const handleResetChests = () => {
    setChestsOpened(false);
    setChosenChest(null);
  };

  // Handle Scratch Card
  const handleScratchTile = (index: number) => {
    if (scratchedGrid[index] || scratchClaimed) return;
    sound.playTick(700);
    const updated = [...scratchedGrid];
    updated[index] = true;
    setScratchedGrid(updated);

    // If all or 6+ tiles scratched, calculate winnings
    if (updated.filter(Boolean).length >= 9 && !scratchClaimed) {
      setScratchClaimed(true);
      // Count frequency
      const counts: Record<string, number> = {};
      gridSymbols.forEach((s) => {
        counts[s.name] = (counts[s.name] || 0) + 1;
      });

      let bestSymbolName = '';
      let bestCount = 0;
      Object.entries(counts).forEach(([name, count]) => {
        if (count >= 3 && count > bestCount) {
          bestCount = count;
          bestSymbolName = name;
        }
      });

      if (bestSymbolName) {
        const symbolObj = scratchSymbols.find((s) => s.name === bestSymbolName)!;
        const totalCoins = symbolObj.value * (bestCount >= 4 ? 2 : 1);
        sound.playWinFanfare();
        confetti({ particleCount: 70, spread: 70 });
        onReward(totalCoins, 3, 4, 'Lucky Scratch');
      } else {
        // Consolation prize
        sound.playCoin();
        onReward(300, 1, 2, 'Lucky Scratch');
      }
    }
  };

  const handleResetScratch = () => {
    setScratchedGrid(Array(9).fill(false));
    setGridSymbols(generateScratchGrid());
    setScratchClaimed(false);
  };

  // Handle Plinko Drop
  const plinkoSlots = [2, 5, 10, 25, 50, 25, 10, 5, 2];

  const handleStartPlinko = (slotStart: number) => {
    if (plinkoDropping) return;
    setPlinkoDropping(true);
    setPlinkoResult(null);

    let currentX = slotStart * 10 + 10; // percentage
    let currentY = 5;
    setPlinkoBallPos({ x: currentX, y: currentY });

    const steps = 8;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      currentY += 10;
      // random bounce left or right
      const bounce = (Math.random() - 0.5) * 8;
      currentX = Math.max(8, Math.min(92, currentX + bounce));
      setPlinkoBallPos({ x: currentX, y: currentY });
      sound.playTick(500 + step * 30);

      if (step >= steps) {
        clearInterval(interval);
        // Land into one of 9 bins
        const binIndex = Math.min(8, Math.max(0, Math.floor((currentX / 100) * plinkoSlots.length)));
        const mult = plinkoSlots[binIndex];
        setPlinkoResult(mult);
        setPlinkoDropping(false);
        const winCoins = 100 * mult;
        if (mult >= 10) {
          confetti({ particleCount: 80, spread: 70 });
          sound.playWinFanfare();
        } else {
          sound.playCoin();
        }
        onReward(winCoins, mult >= 25 ? 5 : 1, mult >= 25 ? 5 : 2, 'Plinko Drop');
      }
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto animate-in fade-in">
      <div className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 border-2 border-amber-500/40 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab Header */}
        <div className="flex items-center justify-center gap-1 mb-4 border-b border-slate-800 pb-3">
          <button
            onClick={() => setTab('chest')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              tab === 'chest'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Mystery Chests</span>
          </button>
          <button
            onClick={() => setTab('scratch')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              tab === 'scratch'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Scratch & Win</span>
          </button>
          <button
            onClick={() => setTab('plinko')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              tab === 'plinko'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Plinko Drop</span>
          </button>
        </div>

        {/* --- GAME 1: MYSTERY CHESTS --- */}
        {tab === 'chest' && (
          <div className="flex flex-col items-center">
            <h3 className="font-fredoka text-xl font-bold text-amber-300 mb-1">
              Pick a Mystery Chest!
            </h3>
            <p className="text-xs text-slate-300 mb-6 text-center">
              Choose one of the 3 enchanted chests to reveal your golden treasure hoard.
            </p>

            <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full mb-6">
              {[0, 1, 2].map((idx) => {
                const isChosen = chosenChest === idx;
                const content = chestContents[idx];

                return (
                  <button
                    key={idx}
                    disabled={chestsOpened}
                    onClick={() => handlePickChest(idx)}
                    className={`relative p-3 sm:p-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                      chestsOpened
                        ? isChosen
                          ? 'bg-gradient-to-b from-amber-500/30 to-yellow-500/20 border-amber-400 scale-105'
                          : 'bg-slate-900/60 border-slate-800 opacity-60'
                        : 'bg-gradient-to-b from-slate-800 to-indigo-950/80 border-amber-500/40 hover:border-amber-400 hover:scale-105 active:scale-95'
                    }`}
                  >
                    <div className="text-4xl sm:text-5xl mb-2 animate-bounce-slow">
                      {chestsOpened ? '🎁' : '📦'}
                    </div>
                    <span className="font-bold text-xs text-amber-200">
                      Chest #{idx + 1}
                    </span>

                    {chestsOpened && content && (
                      <div className="mt-2 text-center text-[10px] sm:text-xs">
                        <p className="font-bold text-amber-300">+{content.coins} Coins</p>
                        <p className="text-cyan-300">+{content.gems} Gems</p>
                        <p className="text-blue-300">+{content.rolls} Rolls</p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {chestsOpened && (
              <button
                onClick={handleResetChests}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Play Again</span>
              </button>
            )}
          </div>
        )}

        {/* --- GAME 2: SCRATCH & WIN CARD --- */}
        {tab === 'scratch' && (
          <div className="flex flex-col items-center">
            <h3 className="font-fredoka text-xl font-bold text-amber-300 mb-1">
              Lucky Scratch Card
            </h3>
            <p className="text-xs text-slate-300 mb-4 text-center">
              Tap or scratch the golden foil. Match 3 identical symbols to win huge jackpots!
            </p>

            {/* 3x3 Grid */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[280px] w-full p-3 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 mb-4 shadow-xl">
              {gridSymbols.map((item, idx) => {
                const isRevealed = scratchedGrid[idx];

                return (
                  <button
                    key={idx}
                    onClick={() => handleScratchTile(idx)}
                    className={`aspect-square rounded-xl border flex flex-col items-center justify-center font-bold transition-all cursor-pointer ${
                      isRevealed
                        ? 'bg-gradient-to-br from-slate-900 to-indigo-950 border-amber-400/50 shadow-inner'
                        : 'bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 border-amber-200 hover:brightness-110 active:scale-95 shadow-md'
                    }`}
                  >
                    {isRevealed ? (
                      <div className="flex flex-col items-center animate-in zoom-in-75">
                        <span className="text-2xl">{item.icon}</span>
                        <span className="text-[9px] text-amber-300 font-bold leading-none mt-0.5">
                          {item.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-lg text-amber-900 font-fredoka font-black">?</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Scratch all button */}
            {!scratchClaimed && (
              <button
                onClick={() => {
                  setScratchedGrid(Array(9).fill(true));
                  setTimeout(() => {
                    const fakeClick = [...Array(9).fill(true)];
                    setScratchedGrid(fakeClick);
                    handleScratchTile(8);
                  }, 50);
                }}
                className="text-xs text-amber-400 underline font-semibold mb-3 cursor-pointer"
              >
                Reveal All Squares
              </button>
            )}

            {scratchClaimed && (
              <button
                onClick={handleResetScratch}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Scratch Card</span>
              </button>
            )}
          </div>
        )}

        {/* --- GAME 3: PLINKO DROP --- */}
        {tab === 'plinko' && (
          <div className="flex flex-col items-center">
            <h3 className="font-fredoka text-xl font-bold text-amber-300 mb-1">
              Cascade Plinko Drop
            </h3>
            <p className="text-xs text-slate-300 mb-3 text-center">
              Choose an entry chute at the top to drop the golden ball down into multiplier bins!
            </p>

            {/* Plinko Board */}
            <div className="relative w-full max-w-[340px] h-64 bg-slate-950/80 rounded-2xl border-2 border-indigo-500/30 p-2 flex flex-col justify-between overflow-hidden shadow-inner">
              {/* Drop Slots at Top */}
              <div className="flex justify-between px-3">
                {[1, 3, 5, 7].map((slot) => (
                  <button
                    key={slot}
                    disabled={plinkoDropping}
                    onClick={() => handleStartPlinko(slot)}
                    className="w-8 h-6 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center justify-center cursor-pointer disabled:opacity-50 transition-transform active:scale-90"
                    title={`Drop from slot ${slot}`}
                  >
                    ▼
                  </button>
                ))}
              </div>

              {/* Pegs */}
              <div className="flex flex-col gap-3 my-auto opacity-70">
                {[5, 6, 7, 8].map((pegRow, rIdx) => (
                  <div key={rIdx} className="flex justify-around px-4">
                    {Array.from({ length: pegRow }).map((_, pIdx) => (
                      <div key={pIdx} className="w-2 h-2 rounded-full bg-cyan-400/80 shadow-sm shadow-cyan-400" />
                    ))}
                  </div>
                ))}
              </div>

              {/* Ball Animation */}
              {plinkoBallPos && (
                <div
                  className="absolute w-4 h-4 rounded-full bg-gradient-to-tr from-yellow-300 via-amber-400 to-amber-200 border border-white shadow-lg shadow-amber-400 pointer-events-none transition-all duration-150 -translate-x-1/2"
                  style={{
                    left: `${plinkoBallPos.x}%`,
                    top: `${plinkoBallPos.y}%`
                  }}
                />
              )}

              {/* Multiplier Bins at Bottom */}
              <div className="grid grid-cols-9 gap-0.5 border-t border-slate-700 pt-1">
                {plinkoSlots.map((mult, idx) => (
                  <div
                    key={idx}
                    className={`py-1 rounded text-center text-[8px] font-bold ${
                      mult >= 25
                        ? 'bg-amber-500 text-slate-950'
                        : mult >= 10
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {mult}x
                  </div>
                ))}
              </div>
            </div>

            {plinkoResult && (
              <div className="mt-3 flex items-center gap-2 text-sm font-bold text-amber-300">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Ball landed on {plinkoResult}x multiplier slot!</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
