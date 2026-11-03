import React, { useId } from 'react';
import { SlotGameDef } from '../types/game';

interface FortuneArtworkProps {
  game?: SlotGameDef;
  icon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  className?: string;
}

export const FortuneArtwork: React.FC<FortuneArtworkProps> = ({
  game,
  icon,
  primaryColor,
  secondaryColor,
  className,
}) => {
  const gradientId = useId().replace(/:/g, '');
  const primary = game?.primaryColor ?? primaryColor ?? '#6d28d9';
  const secondary = game?.secondaryColor ?? secondaryColor ?? '#22d3ee';
  const hero = game?.symbols[0]?.emoji ?? icon ?? '💎';
  const coinPositions = [
    { x: 54, y: 112, size: 15 },
    { x: 264, y: 93, size: 12 },
    { x: 275, y: 260, size: 17 },
    { x: 58, y: 314, size: 12 },
    { x: 234, y: 347, size: 10 },
    { x: 84, y: 205, size: 9 },
  ];

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 320 420"
      preserveAspectRatio="xMidYMid slice"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${gradientId}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={primary} />
          <stop offset="52%" stopColor="#17103d" />
          <stop offset="100%" stopColor={secondary} />
        </linearGradient>
        <radialGradient id={`${gradientId}-glow`}>
          <stop offset="0%" stopColor={secondary} stopOpacity=".85" />
          <stop offset="100%" stopColor={secondary} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${gradientId}-gold`} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#fff4b0" />
          <stop offset="48%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#a34d0b" />
        </linearGradient>
        <filter id={`${gradientId}-shadow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="9" />
          <feOffset dy="7" />
          <feComponentTransfer>
            <feFuncA type="linear" slope=".45" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="320" height="420" fill={`url(#${gradientId}-bg)`} />
      <circle cx="160" cy="205" r="172" fill={`url(#${gradientId}-glow)`} />
      <path d="M0 112 160 20l160 92M0 308l160 92 160-92" fill="none" stroke="#fff" strokeOpacity=".1" strokeWidth="2" />
      <path d="M0 141 160 50l160 91M0 279l160 91 160-91" fill="none" stroke={`url(#${gradientId}-gold)`} strokeOpacity=".55" strokeWidth="3" />

      {coinPositions.map(({ x, y, size }, index) => (
        <g key={index} transform={`translate(${x} ${y}) rotate(${index * 17})`}>
          <ellipse rx={size} ry={size * 0.38} cy={size * 0.62} fill="#7c2d12" opacity=".8" />
          <ellipse rx={size} ry={size * 0.66} fill={`url(#${gradientId}-gold)`} stroke="#fff1a8" strokeWidth="2" />
          <ellipse rx={size * 0.62} ry={size * 0.4} fill="none" stroke="#fff3bd" strokeOpacity=".75" strokeWidth="1.5" />
          <path d={`M-${size * 0.22} 0h${size * 0.44}m-${size * 0.22}-${size * 0.13}v${size * 0.26}`} stroke="#a34d0b" strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}

      <g fill="#fff5c2">
        <path d="m48 64 4 11 11 4-11 4-4 11-4-11-11-4 11-4z" opacity=".9" />
        <path d="m266 157 3 8 8 3-8 3-3 8-3-8-8-3 8-3z" opacity=".8" />
        <path d="m63 265 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" opacity=".75" />
        <path d="m245 47 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" opacity=".7" />
      </g>

      <circle cx="160" cy="214" r="92" fill="#100b2e" fillOpacity=".42" stroke={`url(#${gradientId}-gold)`} strokeWidth="5" filter={`url(#${gradientId}-shadow)`} />
      <circle cx="160" cy="214" r="78" fill="none" stroke="#fff4bc" strokeOpacity=".62" strokeWidth="2" />
      <text
        x="160"
        y="252"
        textAnchor="middle"
        fontSize="118"
        filter={`url(#${gradientId}-shadow)`}
      >
        {hero}
      </text>
      <path d="M61 386q99-37 198 0" fill="none" stroke={`url(#${gradientId}-gold)`} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
};
