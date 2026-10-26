import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BANNERS, QUICK_PROMOS } from '../data/slotGames';

interface BannerCarouselProps {
  onClaimPromo?: (id: string) => void;
}

export const BannerCarousel: React.FC<BannerCarouselProps> = ({ onClaimPromo }) => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % BANNERS.length), 4500);
    return () => clearInterval(t);
  }, []);

  const banner = BANNERS[idx];

  return (
    <div className="w-full lobby-container px-3 pt-3 space-y-3">
      {/* Main hero banner — 121bet style: large rounded, gradient overlay, CTA */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-xl h-[148px] sm:h-[190px] bg-black">
        <div className={`absolute inset-0 bg-gradient-to-br ${banner.gradient} opacity-90`} />
        {/* decorative circles like 121bet */}
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-6 -bottom-10 w-56 h-56 rounded-full bg-black/10 blur-2xl" />

        {/* CloudFront image as backdrop with overlay for realism */}
        <img src={banner.img} alt={banner.title} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60" loading="eager" />

        {/* Glass content card */}
        <div className="absolute inset-0 p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/20 backdrop-blur">🔥 OFERTA LIMITADA</span>
            <h3 className="font-fredoka font-black text-white text-lg sm:text-2xl leading-tight mt-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{banner.title}</h3>
            <p className="text-white/90 text-xs sm:text-sm font-semibold mt-1 drop-shadow">{banner.subtitle}</p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => onClaimPromo?.(banner.id)}
                className="px-4 py-2 rounded-full bg-white text-[#164633] font-black text-xs sm:text-sm shadow-lg hover:bg-amber-50 active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                {banner.cta} <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <span className="hidden sm:inline-flex text-[11px] font-bold text-white/80 bg-black/20 backdrop-blur px-2 py-1 rounded-full border border-white/15">Termina em 23:59:59</span>
            </div>
          </div>
          {/* Mascot visual — Fortune Tiger placeholder */}
          <div className="hidden sm:flex w-44 h-32 rounded-2xl bg-white/10 backdrop-blur border border-white/15 items-center justify-center shrink-0 overflow-hidden">
            <img src={banner.img} alt="" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Nav arrows */}
        <button onClick={() => setIdx(i => (i - 1 + BANNERS.length) % BANNERS.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/30 backdrop-blur text-white border border-white/15 flex items-center justify-center hover:bg-black/40 active:scale-95 cursor-pointer">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => setIdx(i => (i + 1) % BANNERS.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/30 backdrop-blur text-white border border-white/15 flex items-center justify-center hover:bg-black/40 active:scale-95 cursor-pointer">
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {BANNERS.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all cursor-pointer ${i === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'}`} />
          ))}
        </div>
      </div>

      {/* Quick promo row — 4 tiles like 121bet fast entry */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_PROMOS.map(p => (
          <button key={p.id} onClick={() => onClaimPromo?.(p.id)} className={`relative overflow-hidden rounded-2xl p-2 sm:p-3 border border-white/10 shadow-md active:scale-95 transition-all cursor-pointer bg-gradient-to-br ${p.color} flex flex-col items-center justify-center gap-1 text-center group`}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <img src={p.img} alt={p.label} className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-xl bg-white/90 p-1 shadow" loading="lazy" />
            <span className="relative text-[10px] sm:text-xs font-black text-white drop-shadow leading-tight">{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
