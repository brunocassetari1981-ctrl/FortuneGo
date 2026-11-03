import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CATEGORIES } from '../data/slotGames';

interface CategoryTabsProps {
  active: string;
  onSelect: (id: string) => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({ active, onSelect }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 140, behavior: 'smooth' });
  };

  return (
    <div className="sticky top-[0px] z-30 bg-[#0a1f15]/95 backdrop-blur border-y border-white/5">
      <div className="lobby-container relative flex items-center">
        <button onClick={() => scroll(-1)} className="hidden sm:flex shrink-0 w-7 h-7 ml-2 rounded-full bg-white/10 text-white border border-white/10 hover:bg-white/15 items-center justify-center cursor-pointer">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div ref={scrollRef} className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-hide scroll-smooth px-3 py-2 flex-1">
          {CATEGORIES.map(cat => {
            const isActive = active === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full border font-bold text-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-[#0f2e1f] border-amber-300 shadow-md shadow-amber-500/20'
                    : 'bg-white/5 text-white/75 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/15'
                }`}
              >
                <img src={cat.icon} alt="" className={`w-4 h-4 object-contain ${isActive ? '' : 'opacity-90'}`} loading="lazy" />
                <span>{cat.label}</span>
                {isActive && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-[#0f2e1f] animate-pulse" />}
              </button>
            );
          })}
          {/* Extra tabs like FortuneGo has */}
          {['Recente', 'Favoritos'].map(extra => {
            const isActive = active === extra;
            return (
              <button key={extra} onClick={() => onSelect(extra)} className={`shrink-0 px-3.5 py-2 rounded-full border font-bold text-xs whitespace-nowrap cursor-pointer active:scale-95 ${isActive ? 'bg-amber-400 text-[#0f2e1f] border-amber-300' : 'bg-white/5 text-white/60 border-white/10 hover:text-white'}`}>{extra}</button>
            );
          })}
        </div>
        <button onClick={() => scroll(1)} className="hidden sm:flex shrink-0 w-7 h-7 mr-2 rounded-full bg-white/10 text-white border border-white/10 hover:bg-white/15 items-center justify-center cursor-pointer">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
