import React from 'react';
import { Play } from 'lucide-react';
import { SlotGameDef } from '../types/game';
import { getGamesByCategory } from '../data/slotGames';

interface GameGridProps {
  category: string;
  onPlay: (game: SlotGameDef) => void;
  onToggleFav?: (id: string) => void;
  favSet?: Set<string>;
}

export const GameGrid: React.FC<GameGridProps> = ({ category, onPlay, onToggleFav, favSet }) => {
  const games = getGamesByCategory(category);

  // FortuneGo shows section headline with icon + Tudo button
  const categoryLabel = category === 'Popular' ? 'Popular' : category;

  return (
    <div className="lobby-container px-3 py-3">
      {/* Headline bar — like _game-headline */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-yellow-500" />
          <h2 className="font-fredoka font-extrabold text-white text-[15px] tracking-tight">{categoryLabel}</h2>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10">{games.length} jogos</span>
        </div>
        <button className="text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer">
          Tudo <span className="w-5 h-5 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">›</span>
        </button>
      </div>

      {/* Grid — matches FortuneGo list-slide: 3 cols on mobile, 3x? then horizontal scroll on desktop could wrap */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {games.map(game => (
          <div
            key={game.id}
            className="group relative rounded-2xl bg-[#132e23] border border-white/10 overflow-hidden shadow-md hover:shadow-xl hover:border-amber-400/30 hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col"
            onClick={() => onPlay(game)}
          >
            {/* Poster image — Fortune Tiger e Rabbit com vídeo em loop na tela inicial */}
            <div className="relative aspect-[1/1.32] overflow-hidden bg-gradient-to-br from-black/15 to-black/35">
              {(game.id === 'fortune-tiger' || game.id === 'fortune-rabbit') ? (
                <video
                  src={`/videos/${game.id}-loop.mp4`}
                  poster={game.thumb}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  className={`h-full w-full object-cover will-change-transform ${game.id === 'fortune-tiger' ? 'scale-[2.05] object-[50%_32%]' : 'scale-[2.05] object-[50%_32%]'}`}

                  onError={e => {
                    const v = e.target as HTMLVideoElement;
                    v.style.display = 'none';
                    const img = v.nextElementSibling as HTMLImageElement | null;
                    if (img) img.style.display = 'block';
                  }}
                />
              ) : null}
              <img
                src={game.thumb}
                alt={game.name}
                className={`h-full w-full object-cover will-change-transform ${game.id === 'fortune-tiger' || game.id === 'fortune-rabbit' ? 'hidden' : 'animate-grid-dance'}`}
                style={game.id === 'fortune-tiger' || game.id === 'fortune-rabbit' ? { display: 'none' } as React.CSSProperties : undefined}
                loading="lazy"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              {/* Play overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="w-10 h-10 rounded-full bg-white/95 text-[#164633] flex items-center justify-center shadow-lg animate-win-pulse">
                  <Play className="w-5 h-5 fill-[#164633] ml-0.5" />
                </div>
              </div>
            </div>

            {/* Name bar — line-two style */}
            <div className="bg-[#0f261e] border-t border-white/5 px-1.5 py-2 flex-1 flex items-center justify-center">
              <p className="font-bold text-white text-[11px] leading-tight text-center line-clamp-2">{game.name}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
