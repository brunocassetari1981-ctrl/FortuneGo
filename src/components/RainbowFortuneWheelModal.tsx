import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Flame, Trophy, Disc3 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { WHEEL_SEGMENTS } from '../data/gameData';
import { WheelSegment } from '../types/game';
import { sound } from '../utils/audio';

interface RainbowFortuneWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  cascadeStreak: number;
  lastSpinColor: string | null;
  onSpinWin: (segment: WheelSegment, totalWinMultiplier: number, isCascade: boolean) => void;
  coins: number;
}

export const RainbowFortuneWheelModal: React.FC<RainbowFortuneWheelModalProps> = ({
  isOpen,
  onClose,
  cascadeStreak,
  lastSpinColor,
  onSpinWin,
  coins
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [resultSegment, setResultSegment] = useState<WheelSegment | null>(null);
  const [spinSummary, setSpinSummary] = useState<{
    segment: WheelSegment;
    baseMultiplier: number;
    cascadeMultiplier: number;
    totalMultiplier: number;
    coinsAwarded: number;
    isCascadeMatch: boolean;
  } | null>(null);

  const numSegments = WHEEL_SEGMENTS.length;
  const degreesPerSegment = 360 / numSegments;
  const wheelRef = useRef<HTMLDivElement>(null);

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setResultSegment(null);
      setSpinSummary(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setSpinSummary(null);
    setResultSegment(null);

    // Pick winning segment based on weights
    const totalWeight = WHEEL_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
    let rand = Math.random() * totalWeight;
    let chosenIndex = 0;
    for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
      if (rand < WHEEL_SEGMENTS[i].weight) {
        chosenIndex = i;
        break;
      }
      rand -= WHEEL_SEGMENTS[i].weight;
    }

    const winningSegment = WHEEL_SEGMENTS[chosenIndex];

    // Compute rotation so winningSegment lands at top pointer (270 degrees or 0 with offset)
    // Pointer is at the top (12 o'clock).
    // Segment 0 center is at (-90 + degreesPerSegment/2) or similar.
    const segmentCenterDeg = chosenIndex * degreesPerSegment + degreesPerSegment / 2;
    // We want top (270 deg or equivalent relative to wheel rotation)
    // Wheel rotates clockwise: currentAngle % 360
    const extraSpins = 5 + Math.floor(Math.random() * 3); // 5 to 7 full rotations
    // Target angle where chosen index lands under the top pointer
    const targetDeg = (360 - segmentCenterDeg + 270) % 360;
    const finalRotation = currentRotation + (extraSpins * 360) + ((targetDeg - (currentRotation % 360) + 360) % 360);

    // Audio ticking intervals during spin
    const duration = 4000;
    const startTime = Date.now();
    let tickCount = 0;
    const tickInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        clearInterval(tickInterval);
        return;
      }
      const progress = elapsed / duration;
      // Frequency of ticks slows down as progress approaches 1
      if (Math.random() > progress * 0.7) {
        sound.playTick(450 + (1 - progress) * 150);
        tickCount++;
      }
    }, 90);

    setCurrentRotation(finalRotation);

    setTimeout(() => {
      clearInterval(tickInterval);
      setIsSpinning(false);
      setResultSegment(winningSegment);

      // Check cascade match
      const isCascade = lastSpinColor === winningSegment.colorName;
      const newStreak = isCascade ? cascadeStreak + 1 : 1;
      const cascadeBoost = newStreak > 1 ? newStreak : 1;
      const totalMultiplier = winningSegment.multiplier * cascadeBoost;
      const baseCoins = 250;
      const coinsWon = baseCoins * totalMultiplier;

      if (totalMultiplier >= 10 || isCascade) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
        sound.playWinFanfare();
      } else {
        sound.playCoin();
      }

      setSpinSummary({
        segment: winningSegment,
        baseMultiplier: winningSegment.multiplier,
        cascadeMultiplier: cascadeBoost,
        totalMultiplier,
        coinsAwarded: coinsWon,
        isCascadeMatch: isCascade
      });

      onSpinWin(winningSegment, totalMultiplier, isCascade);
    }, duration);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto animate-in fade-in">
      <div className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 border-2 border-amber-500/40 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl relative flex flex-col items-center">
        {/* Close Button */}
        <button
          disabled={isSpinning}
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer disabled:opacity-40"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-3">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="font-fredoka text-2xl font-bold bg-gradient-to-r from-amber-300 via-pink-400 to-amber-300 bg-clip-text text-transparent">
              Rainbow Fortune Wheel
            </h2>
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            Consecutive color matches trigger exponential <span className="text-amber-400 font-bold">Cascade Chains</span>!
          </p>
        </div>

        {/* Cascade Chain Status Bar */}
        <div className="w-full flex items-center justify-between px-3 py-1.5 mb-4 rounded-xl bg-slate-950/70 border border-amber-500/30 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Previous Color:</span>
            <span className="font-bold text-amber-300">
              {lastSpinColor ? lastSpinColor : 'None yet'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
            <span className="text-slate-400">Cascade Streak:</span>
            <span className="font-bold text-orange-300">{cascadeStreak}x</span>
          </div>
        </div>

        {/* Wheel Apparatus */}
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center my-2 select-none">
          {/* Wheel Pointer at Top */}
          <div className="absolute -top-3 z-30 flex flex-col items-center pointer-events-none">
            <div className="w-7 h-9 bg-gradient-to-b from-amber-300 to-amber-600 rounded-b-xl shadow-lg border-2 border-white flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-slate-950" />
            </div>
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-amber-600 -mt-0.5" />
          </div>

          {/* Golden Outer Rim */}
          <div className="absolute inset-0 rounded-full border-8 border-amber-400/90 shadow-[0_0_25px_rgba(245,158,11,0.5)] z-20 pointer-events-none flex items-center justify-center">
            {/* Rim Studs / Lights */}
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-yellow-200 border border-amber-600 shadow-sm animate-pulse"
                style={{
                  transform: `rotate(${i * 22.5}deg) translateY(-${32 * 4.2}px)`
                }}
              />
            ))}
          </div>

          {/* Rotating Wheel Canvas/SVG */}
          <div
            ref={wheelRef}
            className="w-full h-full rounded-full overflow-hidden shadow-2xl transition-transform ease-out"
            style={{
              transform: `rotate(${currentRotation}deg)`,
              transitionDuration: isSpinning ? '4000ms' : '0ms',
              transitionTimingFunction: 'cubic-bezier(0.15, 0.85, 0.25, 1)'
            }}
          >
            <svg viewBox="0 0 200 200" className="w-full h-full">
              {WHEEL_SEGMENTS.map((segment, index) => {
                const angle = (2 * Math.PI) / numSegments;
                const startAngle = index * angle;
                const endAngle = (index + 1) * angle;

                const x1 = 100 + 100 * Math.cos(startAngle);
                const y1 = 100 + 100 * Math.sin(startAngle);
                const x2 = 100 + 100 * Math.cos(endAngle);
                const y2 = 100 + 100 * Math.sin(endAngle);

                // Text angle in the middle of segment
                const midAngle = startAngle + angle / 2;
                const textX = 100 + 65 * Math.cos(midAngle);
                const textY = 100 + 65 * Math.sin(midAngle);
                const textRotation = (midAngle * 180) / Math.PI + 90;

                return (
                  <g key={segment.id}>
                    <path
                      d={`M 100 100 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`}
                      fill={segment.colorHex}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                    <text
                      x={textX}
                      y={textY}
                      fill={segment.textColor}
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                    >
                      {segment.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Center Wheel Hub / Gem */}
          <div className="absolute z-20 w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 border-4 border-slate-900 shadow-xl flex items-center justify-center">
            <Disc3 className="w-7 h-7 text-slate-900 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
        </div>

        {/* Result & Reward Card */}
        {spinSummary && (
          <div className="w-full mt-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-amber-500/20 border border-amber-400/50 flex flex-col items-center animate-in zoom-in-95">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span className="font-fredoka text-lg font-bold text-amber-300">
                You Won {spinSummary.segment.label}!
              </span>
            </div>

            {spinSummary.isCascadeMatch && (
              <div className="flex items-center gap-1.5 my-1 text-orange-400 font-bold text-xs animate-bounce">
                <Flame className="w-4 h-4 fill-orange-400" />
                <span>CASCADE CHAIN MATCH! x{spinSummary.cascadeMultiplier} Multiplier!</span>
              </div>
            )}

            <div className="flex items-center gap-3 mt-1 text-sm font-bold text-white">
              <span>Total Multiplier: <span className="text-amber-400">{spinSummary.totalMultiplier}x</span></span>
              <span>•</span>
              <span className="text-yellow-300">🪙 +{spinSummary.coinsAwarded.toLocaleString()} Coins</span>
            </div>
          </div>
        )}

        {/* Spin Trigger Button */}
        <div className="w-full mt-4 flex items-center justify-center">
          <button
            disabled={isSpinning}
            onClick={handleSpin}
            className={`w-full py-3 rounded-2xl font-fredoka font-bold text-lg sm:text-xl transition-all cursor-pointer shadow-xl flex items-center justify-center gap-2 ${
              isSpinning
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 hover:brightness-110 shadow-amber-500/40 active:scale-95'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span>{isSpinning ? 'SPINNING...' : 'SPIN WHEEL FREE!'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
