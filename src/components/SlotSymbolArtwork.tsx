import React, { useId } from 'react';
import { SlotSymbol } from '../types/game';

interface SlotSymbolArtworkProps {
  symbol: SlotSymbol;
  className?: string;
  style?: React.CSSProperties;
  simplified?: boolean;
  bare?: boolean;
}

type SymbolArtKind =
  | 'animal'
  | 'carrot'
  | 'coin'
  | 'fruit'
  | 'gem'
  | 'lantern'
  | 'envelope'
  | 'fire'
  | 'fan'
  | 'candy'
  | 'cactus'
  | 'guitar'
  | 'crown'
  | 'egg'
  | 'star'
  | 'treasure'
  | 'ring'
  | 'key'
  | 'wing'
  | 'bowl'
  | 'instrument'
  | 'mystery'
  | 'accessory'
  | 'bottle';

function getArtKind(id: string): SymbolArtKind {
  if (/tiger|rabbit|dragon|ox|snake|bandit|neko|hatch/.test(id)) return 'animal';
  if (/ingot|coin|dollar|pouch|coinbag|bell/.test(id)) return 'coin';
  if (/carrot/.test(id)) return 'carrot';
  if (/orange|fruit|apple|berry/.test(id)) return 'fruit';
  if (/pearl|diamond|crystal|gem|jewel|orb/.test(id)) return 'gem';
  if (/lantern/.test(id)) return 'lantern';
  if (/envelope/.test(id)) return 'envelope';
  if (/fire|firecracker/.test(id)) return 'fire';
  if (/fan/.test(id)) return 'fan';
  if (/candy|lollipop|donut|cupcake|cookie|icecream|cake|choco|taco/.test(id)) return 'candy';
  if (/cactus/.test(id)) return 'cactus';
  if (/guitar/.test(id)) return 'guitar';
  if (/maracas|mic|speaker|drum/.test(id)) return 'instrument';
  if (/ring/.test(id)) return 'ring';
  if (/key/.test(id)) return 'key';
  if (/wing/.test(id)) return 'wing';
  if (/bowl/.test(id)) return 'bowl';
  if (/detective|map|book|scroll|statue|mask|lens/.test(id)) return 'mystery';
  if (/tequila|sake|sushi|cup/.test(id)) return 'bottle';
  if (/hat|sombrero|boots/.test(id)) return 'accessory';
  if (/crown/.test(id)) return 'crown';
  if (/egg/.test(id)) return 'egg';
  if (/star|scatter/.test(id)) return 'star';
  if (/pinata/.test(id)) return 'candy';
  return 'treasure';
}

function SymbolMotif({ kind, id, color, accent }: { kind: SymbolArtKind; id: string; color: string; accent: string }) {
  switch (kind) {
    case 'animal':
      return (
        <g>
          {id.includes('rabbit') ? (
            <>
              <path d="M47 54Q31 20 42 17q14-3 18 34m11 2q4-37 19-36 12 3-3 39" fill={color} stroke="#fff4c2" strokeWidth="4" />
              <path d="M48 44q-5-19-2-20 6 1 9 18m23 0q5-18 10-17 3 2-3 20" fill="#ffb5ce" />
              <ellipse cx="64" cy="72" rx="34" ry="31" fill={color} stroke="#fff4c2" strokeWidth="4" />
              <circle cx="52" cy="69" r="4" fill="#24132e" />
              <circle cx="76" cy="69" r="4" fill="#24132e" />
              <ellipse cx="64" cy="81" rx="9" ry="6" fill="#ffb5ce" />
              <path d="m60 82 4 4 4-4" fill="none" stroke="#57213b" strokeWidth="3" strokeLinecap="round" />
            </>
          ) : id.includes('snake') ? (
            <>
              <path d="M38 85q-15-10-3-25l29-21q11-8 23 0 12 9 0 18L60 79q-7 6 2 11l19-1q14 0 13-13" fill="none" stroke={color} strokeWidth="19" strokeLinecap="round" />
              <path d="M38 85q-15-10-3-25l29-21q11-8 23 0 12 9 0 18L60 79q-7 6 2 11l19-1q14 0 13-13" fill="none" stroke="#fff4c2" strokeWidth="3" strokeLinecap="round" opacity=".8" />
              <circle cx="87" cy="39" r="11" fill={color} stroke="#fff4c2" strokeWidth="3" />
              <circle cx="90" cy="37" r="2.5" fill="#fff" />
              <path d="m94 44 11 4m-2-1 4-4m-4 4 4 3" stroke="#ff78a8" strokeWidth="3" strokeLinecap="round" />
            </>
          ) : (
            <>
              <path d="M37 45 32 23q-1-8 7-3l20 14h10l20-14q8-5 7 3l-5 22q10 10 8 25-3 31-37 34-34-3-37-34-2-15 12-25Z" fill={color} stroke="#fff4c2" strokeWidth="4" strokeLinejoin="round" />
              {id.includes('dragon') && <path d="m45 40-4-17 19 13m23 4 4-17-19 13" fill={color} stroke="#fff4c2" strokeWidth="4" strokeLinejoin="round" />}
              {id.includes('ox') && <path d="M39 49Q18 32 28 24q10-6 22 17m39 8q21-17 11-25-10-6-22 17" fill="none" stroke="#fff2b0" strokeWidth="7" strokeLinecap="round" />}
              <path d="M43 69q7-8 15 0m12 0q8-8 15 0" fill="none" stroke="#24132e" strokeWidth="5" strokeLinecap="round" />
              <ellipse cx="64" cy="82" rx="8" ry="5" fill="#fff1df" />
              <path d="m60 81 4 4 4-4" fill="none" stroke="#57213b" strokeWidth="3" strokeLinecap="round" />
              {id.includes('tiger') && <path d="m43 52 7 5m35-5-7 5m-29 31 8-4m22 4-8-4" stroke={accent} strokeWidth="4" strokeLinecap="round" />}
              <circle cx="49" cy="67" r="3" fill="#fff" />
              <circle cx="79" cy="67" r="3" fill="#fff" />
            </>
          )}
        </g>
      );
    case 'carrot':
      return (
        <g transform="rotate(18 64 66)">
          <path d="M61 49q-18-20-10-28 15 1 19 25m-3 1q-2-23 13-27 8 13-6 32m-10 0q10-27 28-23 0 17-22 30" fill="#51d76b" stroke="#d4ffba" strokeWidth="3" strokeLinejoin="round" />
          <path d="M40 43q22-12 47 5L64 106q-4 10-9 0L34 57q-3-8 6-14Z" fill={color} stroke="#fff0bd" strokeWidth="4" strokeLinejoin="round" />
          <path d="m46 58 11 4m-4 13 9 3" stroke="#ffd28a" strokeWidth="4" strokeLinecap="round" />
          <path d="M43 51q8-8 17-6" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".75" />
        </g>
      );
    case 'coin':
      return (
        <g>
          <path d="m28 48 36-20 36 20-9 42H37Z" fill={color} stroke="#fff2a6" strokeWidth="4" strokeLinejoin="round" />
          <path d="m28 48 36 17 36-17M37 90l27-25 28 25" fill="none" stroke={accent} strokeWidth="4" strokeLinejoin="round" />
          <circle cx="64" cy="51" r="11" fill="#fff3b0" />
          <path d="M64 43v16m-5-12h8q5 0 2 4l-9 1q-4 4 1 5h8" fill="none" stroke="#99520d" strokeWidth="3" strokeLinecap="round" />
          <path d="m43 43 4-8m38 8-4-8" stroke="#fff9d2" strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    case 'fruit':
      return (
        <g>
          <path d="M66 39q19-19 35-10-10 18-31 18" fill="#58d66d" stroke="#d7ffb0" strokeWidth="3" />
          <path d="M62 43q-8-13-2-19 9 5 9 18" fill="#31a857" />
          <path d="M64 41c-10-11-34-4-36 17-3 27 17 44 36 40 20 4 39-13 36-40-2-21-26-28-36-17Z" fill={color} stroke="#fff2c2" strokeWidth="4" />
          <path d="M43 55q5-10 15-10" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".8" />
          <circle cx="75" cy="69" r="3" fill={accent} opacity=".7" />
          <circle cx="55" cy="78" r="2.5" fill={accent} opacity=".7" />
        </g>
      );
    case 'gem':
      return (
        <g>
          <path d="m28 47 17-22h38l17 22-36 52Z" fill={color} stroke="#e8fdff" strokeWidth="4" strokeLinejoin="round" />
          <path d="M28 47h72M45 25l19 74 19-74M28 47l36 13 36-13" fill="none" stroke={accent} strokeWidth="4" strokeLinejoin="round" />
          <path d="m47 33 9-2-14 16Z" fill="#fff" opacity=".75" />
        </g>
      );
    case 'lantern':
      return (
        <g>
          <path d="M49 29h30m-25-7h20m-20 84h20m-25-7h30" stroke="#fff2b0" strokeWidth="5" strokeLinecap="round" />
          <path d="M42 35q22-13 44 0l7 14v31q-29 20-58 0V49Z" fill={color} stroke="#ffe8a3" strokeWidth="4" />
          <path d="M52 34v49m12-51v54m12-51v48" stroke={accent} strokeWidth="4" opacity=".9" />
          <path d="M58 106v9m12-9v9m-17 0h22" stroke="#ffd35b" strokeWidth="4" strokeLinecap="round" />
          <path d="M45 49h38m-38 30h38" stroke="#fff2b0" strokeWidth="3" opacity=".8" />
        </g>
      );
    case 'envelope':
      return (
        <g>
          <rect x="28" y="31" width="72" height="65" rx="10" fill={color} stroke="#ffe6a1" strokeWidth="4" />
          <path d="m31 40 33 27 33-27M31 89l25-24m41 24L72 65" fill="none" stroke="#ffb24c" strokeWidth="5" strokeLinejoin="round" />
          <circle cx="64" cy="60" r="13" fill="#ffd34e" stroke="#fff3bd" strokeWidth="3" />
          <path d="m64 51 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#c34633" />
        </g>
      );
    case 'fire':
      return (
        <g>
          <path d="M64 101c-21 0-33-14-26-31 4-10 13-15 12-31 13 8 15 17 15 23 10-10 9-23 8-30 20 16 28 33 18 53-5 10-15 16-27 16Z" fill={color} stroke="#ffe8a3" strokeWidth="4" />
          <path d="M64 91c-10 0-16-8-12-17 2-4 6-7 7-13 9 6 18 17 12 25-2 3-4 5-7 5Z" fill="#fff3a1" />
          <path d="m76 32 17-16" stroke="#fff1c1" strokeWidth="4" strokeLinecap="round" />
          <path d="m93 16 8-2-3 8" fill="none" stroke="#ff9b50" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case 'fan':
      return (
        <g>
          <path d="M64 93 23 48q-7-9 5-14 12-5 24 0 7-15 20-15 13 0 19 15 13-5 24 0 12 5 5 14Z" fill={color} stroke="#ffe8b0" strokeWidth="4" />
          <path d="M64 93 28 38m36 55-4-59m4 59 20-59m-20 59 43-50" fill="none" stroke={accent} strokeWidth="4" />
          <circle cx="64" cy="93" r="9" fill="#ffd35b" stroke="#fff3bd" strokeWidth="3" />
          <path d="m64 102 0 12" stroke="#f4b83a" strokeWidth="5" strokeLinecap="round" />
        </g>
      );
    case 'candy':
      return (
        <g>
          <path d="m26 47 15 7-1 20-16 8 5-17Zm76 0-15 7 1 20 16 8-5-17Z" fill={accent} stroke="#fff2c2" strokeWidth="4" strokeLinejoin="round" />
          <rect x="36" y="39" width="56" height="48" rx="20" fill={color} stroke="#fff2c2" strokeWidth="4" />
          <path d="M48 44q-12 20 0 39m16-43v45m16-41q12 20 0 38" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity=".75" />
          <circle cx="64" cy="63" r="7" fill="#fff3b0" opacity=".85" />
        </g>
      );
    case 'cactus':
      return (
        <g>
          <path d="M56 103V43q0-12 10-12t10 12v18h9V50q0-10 9-10t9 10v19q0 12-13 12H76v22Z" fill={color} stroke="#d6ffb5" strokeWidth="4" strokeLinejoin="round" />
          <path d="M57 63H45q-12 0-12-12V42q0-9 9-9t9 9v9h5m29 5 6-6m-20 30 6-7" fill="none" stroke={color} strokeWidth="11" strokeLinecap="round" />
          <path d="m57 63 0 8m0 12 0 8m19-54 0 8m0 51 0 7" stroke="#eaffc8" strokeWidth="3" strokeLinecap="round" />
          <path d="M30 105h72" stroke="#e2bb70" strokeWidth="5" strokeLinecap="round" />
        </g>
      );
    case 'guitar':
      return (
        <g transform="rotate(-28 64 64)">
          <path d="M57 43h14v45q0 14-7 18-7-4-7-18Z" fill={color} stroke="#ffe5a0" strokeWidth="4" />
          <path d="M53 39h22v11H53z" fill="#e9b853" stroke="#fff1ba" strokeWidth="3" />
          <path d="M64 50v51m-5-48v47m10-47v47" stroke="#fff4cd" strokeWidth="2" />
          <circle cx="64" cy="72" r="15" fill={accent} stroke="#fff2c2" strokeWidth="4" />
          <circle cx="64" cy="72" r="5" fill="#452349" />
          <path d="M54 36h20v-8H54z" fill={color} stroke="#ffe5a0" strokeWidth="3" />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path d="m27 43 21 17 16-33 16 33 21-17-8 49H35Z" fill={color} stroke="#fff3ae" strokeWidth="4" strokeLinejoin="round" />
          <path d="M35 79h58M43 92h42" stroke={accent} strokeWidth="5" strokeLinecap="round" />
          <circle cx="48" cy="58" r="5" fill="#fff" />
          <circle cx="64" cy="40" r="5" fill="#fff" />
          <circle cx="80" cy="58" r="5" fill="#fff" />
        </g>
      );
    case 'ring':
      return (
        <g>
          <ellipse cx="64" cy="73" rx="31" ry="22" fill="none" stroke={color} strokeWidth="14" />
          <ellipse cx="64" cy="73" rx="31" ry="22" fill="none" stroke="#fff1a8" strokeWidth="4" />
          <path d="m64 27 17 18-17 19-17-19Z" fill="#49e6ff" stroke="#e9ffff" strokeWidth="4" strokeLinejoin="round" />
          <path d="m64 29 1 32m-16-16h30" stroke="#fff" strokeWidth="3" opacity=".8" />
        </g>
      );
    case 'key':
      return (
        <g transform="rotate(-35 64 64)">
          <circle cx="48" cy="48" r="19" fill="none" stroke={color} strokeWidth="12" />
          <circle cx="48" cy="48" r="19" fill="none" stroke="#fff2b0" strokeWidth="3" />
          <path d="M63 63 98 98m-13-13 9-9m-19-1 9-9" stroke={color} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M63 63 98 98m-13-13 9-9m-19-1 9-9" stroke="#fff2b0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case 'wing':
      return (
        <g>
          <path d="M25 92q10-47 72-68 5 31-8 51-18 25-64 17Z" fill={color} stroke="#fff0bd" strokeWidth="4" />
          <path d="M31 89q21-29 59-53M46 88q16-22 40-38M62 88q11-15 24-23" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" />
          <path d="m42 78 1 16m17-28 4 22m15-33 5 19" stroke="#fff" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case 'bowl':
      return (
        <g>
          <path d="M27 58h74q-4 36-37 40-33-4-37-40Z" fill={color} stroke="#fff0af" strokeWidth="4" />
          <path d="M27 58q37 17 74 0" fill="none" stroke="#fff4c2" strokeWidth="5" />
          <path d="M41 99h46m-36 8h26" stroke={accent} strokeWidth="5" strokeLinecap="round" />
          <path d="M48 51q-7-13 2-20m14 20q-7-13 2-20m12 20q-7-13 2-20" fill="none" stroke="#ffb5e5" strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    case 'instrument':
      return (
        <g>
          <rect x="49" y="24" width="30" height="58" rx="15" fill={color} stroke="#fff0b8" strokeWidth="4" />
          <path d="M55 42h18m-18 10h18m-18 10h18" stroke={accent} strokeWidth="4" strokeLinecap="round" />
          <path d="M64 82v20m-16 5h32m-23-5 7-10 7 10" fill="none" stroke="#ffe6a1" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="64" cy="31" r="4" fill="#fff" />
        </g>
      );
    case 'mystery':
      return (
        <g>
          <circle cx="55" cy="53" r="25" fill={color} fillOpacity=".75" stroke="#e8ffff" strokeWidth="5" />
          <circle cx="55" cy="53" r="17" fill="none" stroke="#fff" strokeWidth="3" opacity=".8" />
          <path d="m73 72 26 27" stroke="#ffd35b" strokeWidth="13" strokeLinecap="round" />
          <path d="m73 72 26 27" stroke="#fff2b0" strokeWidth="4" strokeLinecap="round" />
          <path d="m42 51 9-10 8 10-8 10Z" fill="#fff" opacity=".75" />
        </g>
      );
    case 'accessory':
      return (
        <g>
          <path d="M25 77q9-8 19-10 7-25 20-25t20 25q10 2 19 10-38 17-78 0Z" fill={color} stroke="#fff0b8" strokeWidth="4" strokeLinejoin="round" />
          <path d="M44 67q20 10 40 0m-42 14h44" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" />
          <path d="M53 53h22" stroke="#ffd35b" strokeWidth="5" strokeLinecap="round" />
        </g>
      );
    case 'bottle':
      return (
        <g>
          <path d="M51 25h26v15l9 10v42q0 10-11 10H53q-11 0-11-10V50l9-10Z" fill={color} stroke="#eaffd0" strokeWidth="4" strokeLinejoin="round" />
          <path d="M51 25h26v15H51zm-5 45h36v20H46z" fill="#fff" fillOpacity=".35" stroke="#fff4c2" strokeWidth="3" />
          <path d="M57 53h14m-14 8h14" stroke={accent} strokeWidth="4" strokeLinecap="round" />
          <path d="M57 33h14" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case 'egg':
      return (
        <g>
          <path d="M64 22c-20 0-36 34-36 55a36 36 0 0 0 72 0c0-21-16-55-36-55Z" fill={color} stroke="#fff4c7" strokeWidth="4" />
          <path d="M43 74q8-8 16 0t16 0 16 0" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" />
          <circle cx="51" cy="53" r="4" fill="#fff" opacity=".8" />
          <path d="M52 92q12 10 24 0" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    case 'star':
      return (
        <g>
          <path d="m64 19 13 29 32 4-24 21 7 32-28-17-28 17 7-32-24-21 32-4Z" fill={color} stroke="#fff6c4" strokeWidth="4" strokeLinejoin="round" />
          <path d="m64 38 7 19 20 2-15 13 4 19-16-10-16 10 4-19-15-13 20-2Z" fill={accent} opacity=".75" />
          <circle cx="64" cy="64" r="5" fill="#fff" />
        </g>
      );
    case 'treasure':
      return (
        <g>
          <path d="M30 48q0-19 17-19h34q17 0 17 19v9H30Z" fill={color} stroke="#ffe8a7" strokeWidth="4" />
          <path d="M25 55h78v39H25z" fill={color} stroke="#ffe8a7" strokeWidth="4" />
          <path d="M33 64h62v21H33z" fill={accent} opacity=".65" />
          <rect x="56" y="63" width="16" height="20" rx="4" fill="#ffd34e" stroke="#fff2b0" strokeWidth="3" />
          <circle cx="64" cy="70" r="3" fill="#8a3b2b" />
          <path d="M36 48h56m-50 47 8 9m36-9-8 9" stroke="#fff2b0" strokeWidth="4" strokeLinecap="round" />
        </g>
      );
  }
}

export const SlotSymbolArtwork: React.FC<SlotSymbolArtworkProps> = ({ symbol, className, style, simplified = false, bare = false }) => {
  const id = useId().replace(/:/g, '');
  const color = symbol.color || '#fbbf24';
  const accent = symbol.isWild ? '#fef08a' : '#ffffff';
  const kind = getArtKind(symbol.id.toLowerCase());

  if (bare) {
    return (
      <svg
        aria-hidden="true"
        className={className}
        style={style}
        viewBox="0 0 128 128"
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
      >
        <SymbolMotif kind={kind} id={symbol.id.toLowerCase()} color={color} accent={accent} />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      style={style}
      viewBox="0 0 128 128"
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
    >
      <defs>
        <radialGradient id={`${id}-back`} cx="35%" cy="25%">
          <stop offset="0%" stopColor={color} stopOpacity=".95" />
          <stop offset="100%" stopColor="#11102d" />
        </radialGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff5c2" />
          <stop offset="45%" stopColor={symbol.isWild ? '#fff29a' : color} />
          <stop offset="100%" stopColor="#7b3bff" />
        </linearGradient>
        {!simplified && (
          <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      <circle cx="64" cy="64" r="59" fill={`url(#${id}-back)`} stroke={`url(#${id}-rim)`} strokeWidth="6" />
      <circle cx="64" cy="64" r="51" fill="none" stroke="#fff" strokeOpacity=".24" strokeWidth="2" />
      <path d="M24 50q8-24 30-29" fill="none" stroke="#fff" strokeOpacity=".42" strokeWidth="4" strokeLinecap="round" />
      {simplified ? (
        <SymbolMotif kind={kind} id={symbol.id.toLowerCase()} color={color} accent={accent} />
      ) : (
        <g filter={`url(#${id}-glow)`}>
          <SymbolMotif kind={kind} id={symbol.id.toLowerCase()} color={color} accent={accent} />
        </g>
      )}
      <path d="m101 26 2 6 6 2-6 2-2 6-2-6-6-2 6-2zM27 92l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill="#fff6c7" />
    </svg>
  );
};
