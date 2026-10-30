import React, { useEffect, useMemo, useRef } from 'react';
import { SlotGameDef, SlotSymbol } from '../types/game';
import { getSymbolById, SLOT_REEL_STRIP_LENGTH, SLOT_ROW_COUNT } from '../utils/slotEngine';
import { SlotSymbolArtwork } from './SlotSymbolArtwork';

interface SlotReelProps {
  game: SlotGameDef;
  symbols: string[];
  isSpinning: boolean;
  spinId: number;
  reelIndex: number;
  turbo: boolean;
  stopDelay: number;
  winPositions: Set<string>;
  onStop: (reelIndex: number) => void;
}

const TARGET_START = 6;
const REEL_COPIES = 2;
const CENTER_CONTENT_HEIGHT = 0.88;

export const SlotReel: React.FC<SlotReelProps> = ({
  game,
  symbols,
  isSpinning,
  spinId,
  reelIndex,
  turbo,
  stopDelay,
  winPositions,
  onStop,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const onStopRef = useRef(onStop);
  const phaseRef = useRef(0);
  const stripRef = useRef<SlotSymbol[]>([]);
  const symbolsKey = symbols.join('\u001f');
  const visibleRowCount = Math.max(symbols.length, SLOT_ROW_COUNT);
  const symbolSize = reelIndex === 1
    ? 'min(24cqh, 96cqw)'
    : 'min(32cqh, 96cqw)';
  const strip = useMemo(() => {
    if (!isSpinning) return [];

    const targetSymbols = symbols.map(id => getSymbolById(game, id) ?? game.symbols[0]);
    const nextStrip = Array.from({ length: SLOT_REEL_STRIP_LENGTH }, () =>
      game.symbols[Math.floor(Math.random() * game.symbols.length)]
    );
    nextStrip.splice(TARGET_START, targetSymbols.length, ...targetSymbols);
    return nextStrip;
  }, [game.id, isSpinning, spinId, symbolsKey]);
  stripRef.current = strip;

  useEffect(() => {
    onStopRef.current = onStop;
  }, [onStop]);

  useEffect(() => {
    const activeStrip = stripRef.current;
    if (!isSpinning || activeStrip.length === 0) return;

    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    let frame = 0;
    let stopTimer = 0;
    let stopCompletionTimer = 0;
    let lastFrameTime = 0;
    let accelerationStarted = 0;
    let stopStarted = 0;
    let stopStartPhase = 0;
    let stopDistance = 0;
    let stopDuration = 0;
    let stopping = false;
    let finished = false;
    const reelHeight = viewport.clientHeight * (reelIndex === 1 ? CENTER_CONTENT_HEIGHT : 1);
    const segmentHeight = reelHeight * SLOT_REEL_STRIP_LENGTH / visibleRowCount;
    const targetPhase = 1 - TARGET_START / SLOT_REEL_STRIP_LENGTH;
    const speed = turbo ? 8 : 1.55;
    const accelerationDuration = turbo ? 140 : 500;

    if (!segmentHeight) return;

    const renderPosition = (phase: number) => {
      phaseRef.current = phase % 1;
      track.style.transform = `translate3d(0, ${(-1 + phaseRef.current) * segmentHeight}px, 0)`;
    };

    phaseRef.current = 0;
    renderPosition(0);

    const beginStopping = (now: number) => {
      stopping = true;
      stopStarted = now;
      stopStartPhase = phaseRef.current;
      const distanceToTarget = (targetPhase - stopStartPhase + 1) % 1;
      stopDistance = distanceToTarget < 0.015 ? 1 : distanceToTarget;
      stopDuration = Math.max(turbo ? 240 : 650, 2 * stopDistance / (speed * 0.82) * 1000);
      stopCompletionTimer = window.setTimeout(() => {
        if (finished) return;
        finished = true;
        renderPosition(targetPhase);
        onStopRef.current(reelIndex);
      }, stopDuration + 100);
    };

    const tick = (now: number) => {
      if (!lastFrameTime) {
        lastFrameTime = now;
        accelerationStarted = now;
      }

      const deltaSeconds = Math.min((now - lastFrameTime) / 1000, 0.05);
      lastFrameTime = now;

      if (stopping) {
        const progress = Math.min((now - stopStarted) / stopDuration, 1);
        const springAmount = 0.012;
        if (progress < 0.82) {
          const approach = progress / 0.82;
          const eased = 1 - (1 - approach) ** 3;
          renderPosition(stopStartPhase + (stopDistance + springAmount) * eased);
        } else {
          const settle = (progress - 0.82) / 0.18;
          const spring = springAmount * (1 - settle) * Math.cos(settle * Math.PI * 3);
          renderPosition(targetPhase + spring);
        }

        if (progress === 1) {
          renderPosition(targetPhase);
          if (!finished) {
            finished = true;
            window.clearTimeout(stopCompletionTimer);
            onStopRef.current(reelIndex);
          }
          return;
        }
      } else {
        const acceleration = Math.min((now - accelerationStarted) / accelerationDuration, 1);
        const easedAcceleration = 1 - (1 - acceleration) ** 2;
        renderPosition(phaseRef.current + speed * easedAcceleration * deltaSeconds);
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    stopTimer = window.setTimeout(() => {
      beginStopping(performance.now());
    }, stopDelay);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(stopTimer);
      window.clearTimeout(stopCompletionTimer);
    };
  }, [isSpinning, reelIndex, spinId, stopDelay, turbo, visibleRowCount]);

  const renderSymbol = (symbol: SlotSymbol, rowIndex: number) => {
    const isWin = winPositions.has(`${reelIndex}-${rowIndex}`);
    return (
      <div
        key={`${symbol.id}-${rowIndex}`}
        className="relative flex min-h-0 flex-1 items-center justify-center"
      >
        <SlotSymbolArtwork
          symbol={symbol}
          className={`h-full w-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)] ${isWin ? 'animate-win-pulse' : ''}`}
          style={{ height: symbolSize, width: symbolSize, maxHeight: 'none', maxWidth: 'none', flexShrink: 0 }}
        />
      </div>
    );
  };

  return (
    <div
      ref={viewportRef}
      className={`relative min-w-0 flex-1 self-center overflow-hidden border-y-2 ${
        reelIndex === 1
          ? 'z-20 h-[132%] border-x-[3px] shadow-[0_0_20px_rgba(40,190,255,0.38)]'
          : 'h-full border-r border-white/15 first:border-l'
      }`}
      style={{
        borderColor: reelIndex === 1 ? '#56d8ff' : `${game.secondaryColor}55`,
        containerType: 'size',
        background: 'linear-gradient(180deg, #26105b 0%, #351474 50%, #26105b 100%)',
      }}
    >
      {isSpinning && strip.length > 0 ? (
        <div
          key="spinning-track"
          ref={trackRef}
          className="absolute inset-x-0 top-0 flex flex-col will-change-transform"
          style={{
            top: reelIndex === 1 ? `${(1 - CENTER_CONTENT_HEIGHT) * 100}%` : 0,
            height: `${SLOT_REEL_STRIP_LENGTH * REEL_COPIES * 100 * (reelIndex === 1 ? CENTER_CONTENT_HEIGHT : 1) / visibleRowCount}%`,
          }}
        >
          {Array.from({ length: REEL_COPIES }, (_, copy) =>
            strip.map((symbol, index) => (
              <div
                key={`${copy}-${index}`}
                className="flex min-h-0 shrink-0 flex-col items-center justify-center"
                style={{ flexBasis: `${100 / (SLOT_REEL_STRIP_LENGTH * REEL_COPIES)}%` }}
              >
                <SlotSymbolArtwork
                  symbol={symbol}
                  simplified
                  className="h-full w-full object-contain"
                  style={{ height: symbolSize, width: symbolSize, maxHeight: 'none', maxWidth: 'none', flexShrink: 0 }}
                />
              </div>
            ))
          )}
        </div>
      ) : (
        <div
          key="settled-symbols"
          className="flex h-full flex-col"
          style={{
            paddingTop: reelIndex === 1 ? `${(1 - CENTER_CONTENT_HEIGHT) * 100}%` : 0,
            boxSizing: 'border-box',
          }}
        >
          {symbols.map((id, rowIndex) => {
            const symbol = getSymbolById(game, id) ?? game.symbols[0];
            return renderSymbol(symbol, rowIndex);
          })}
        </div>
      )}
    </div>
  );
};
