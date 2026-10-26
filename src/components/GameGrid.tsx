import React from 'react';
import { Star, Play, Zap } from 'lucide-react';
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

  // 121bet shows section headline with icon + Tudo button
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

      {/* Grid — matches 121bet list-slide: 3 cols on mobile, 3x? then horizontal scroll on desktop could wrap */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {games.map(game => (
          <div
            key={game.id}
            className="group relative rounded-2xl bg-[#132e23] border border-white/10 overflow-hidden shadow-md hover:shadow-xl hover:border-amber-400/30 hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col"
            onClick={() => onPlay(game)}
          >
            {/* Favorite star — top right like 121bet */}
            <button
              onClick={e => { e.stopPropagation(); onToggleFav?.(game.id); }}
              className={`absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full backdrop-blur flex items-center justify-center border cursor-pointer transition-all ${favSet?.has(game.id) ? 'bg-amber-400 border-amber-300 text-white' : 'bg-black/40 border-white/15 text-white/80 hover:bg-black/60'}`}
            >
              <Star className={`w-3.5 h-3.5 ${favSet?.has(game.id) ? 'fill-white' : ''}`} />
            </button>

            {/* HOT / NEW badge */}
            {(game.hot || game.new) && (
              <div className={`absolute top-1.5 left-1.5 z-10 text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-full border shadow ${game.hot ? 'bg-red-500 text-white border-red-400' : 'bg-emerald-500 text-white border-emerald-400'}`}>
                {game.hot ? 'HOT' : 'NEW'}
              </div>
            )}

            {/* Poster image — 1.33 aspect like PG Soft cards */}
            <div className="relative aspect-[1/1.32] overflow-hidden bg-gradient-to-br from-black/20 to-black/40">
              <img
                src={game.thumb}
                alt={game.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              {/* Gradient overlay for PG Soft look */}
              <div className={`absolute inset-0 bg-gradient-to-t ${game.bgGradient} opacity-10 group-hover:opacity-20 transition-opacity`} />
              {/* Play overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="w-10 h-10 rounded-full bg-white/95 text-[#164633] flex items-center justify-center shadow-lg animate-win-pulse">
                  <Play className="w-5 h-5 fill-[#164633] ml-0.5" />
                </div>
              </div>
              {/* Provider chip bottom */}
              <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-black/60 text-white/80 border border-white/10 backdrop-blur">PG Soft</span>
                <span className="hidden sm:flex items-center gap-0.5 text-[8px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded-full border border-white/10"><Zap className="w-3 h-3 text-amber-300" />{game.rtp.toFixed(1)}%</span>
              </div>
            </div>

            {/* Name bar — line-two style */}
            <div className="bg-[#0f261e] border-t border-white/5 px-1.5 py-2 flex-1 flex items-center justify-center">
              <p className="font-bold text-white text-[11px] leading-tight text-center line-clamp-2">{game.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Promo CTA after grid — like 121bet extra banner */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl p-3 flex items-center gap-3 border border-amber-400/20 bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-orange-500/15">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white text-xl">🎲</div>
          <div className="flex-1">
            <p className="font-black text-white text-xs">Tabuleiro FortuneGo</p>
            <p className="text-[11px] text-amber-100/80">Ganhe rodadas girando no tabuleiro mágico</p>
          </div>
          <span className="text-amber-300 font-black text-xs">›</span>
        </div>
        <div className="rounded-2xl p-3 flex items-center gap-3 border border-violet-400/20 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xl">🎡</div>
          <div className="flex-1">
            <p className="font-black text-white text-xs">Roda Rainbow</p>
            <p className="text-[11px] text-violet-100/80">Gire e ative cascatas com multiplicadores!</p>
          </div>
          <span className="text-violet-300 font-black text-xs">›</span>
        </div>
      </div>
    </div>
  );
};
