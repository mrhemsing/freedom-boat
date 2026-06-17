'use client';

import type { CSSProperties } from 'react';
import { SCORE_BANDS, scoreBand, tierColorVar } from '../../../lib/outlook';

const CX = 130;
const CY = 130;
const R = 96;
const A0 = 135;
const SWEEP = 270;

type GaugeStyle = CSSProperties & {
  '--tier-color': string;
};

const clampScore = (value: number) => Math.max(0, Math.min(100, value));
const ang = (value: number) => A0 + (clampScore(value) / 100) * SWEEP;
const pol = (angle: number) => ({
  x: CX + R * Math.cos((angle * Math.PI) / 180),
  y: CY + R * Math.sin((angle * Math.PI) / 180)
});

function arcPath(v1: number, v2: number) {
  const a1 = ang(v1);
  const a2 = ang(v2);
  const s = pol(a1);
  const e = pol(a2);
  return `M ${s.x} ${s.y} A ${R} ${R} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
}

export default function ScoreGauge({ score }: { score: number }) {
  const normalizedScore = clampScore(Number.isFinite(score) ? score : 0);
  const roundedScore = Math.round(normalizedScore);
  const band = scoreBand(normalizedScore);
  const tier = band.label.toLowerCase();
  const color = tierColorVar(tier);

  const head = pol(ang(normalizedScore));

  return (
    <div className="scoreGauge" style={{ '--tier-color': color } as GaugeStyle}>
      <span className="gaugeGlow" aria-hidden="true" />
      <svg viewBox="0 0 260 260" role="img" aria-label={`Boating score ${roundedScore} of 100, ${band.label}`}>
        {SCORE_BANDS.map((scoreBandItem, index) => {
          const end = Math.max(scoreBandItem.min, scoreBandItem.max - (index < SCORE_BANDS.length - 1 ? 1.2 : 0));
          return (
            <path
              key={scoreBandItem.tone}
              d={arcPath(scoreBandItem.min, end)}
              fill="none"
              stroke={tierColorVar(scoreBandItem.label.toLowerCase())}
              strokeWidth={15}
              opacity={0.2}
            />
          );
        })}
        {Array.from({ length: 11 }, (_, index) => index * 10).map((value) => {
          const angle = ang(value);
          const major = value % 20 === 0;
          const p1 = {
            x: CX + (R + 13) * Math.cos((angle * Math.PI) / 180),
            y: CY + (R + 13) * Math.sin((angle * Math.PI) / 180)
          };
          const p2 = {
            x: CX + (R + (major ? 22 : 18)) * Math.cos((angle * Math.PI) / 180),
            y: CY + (R + (major ? 22 : 18)) * Math.sin((angle * Math.PI) / 180)
          };
          return (
            <line
              key={value}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={`rgba(255,255,255,${major ? 0.35 : 0.16})`}
              strokeWidth={major ? 2 : 1.4}
              strokeLinecap="round"
            />
          );
        })}
        <path
          d={arcPath(0, normalizedScore)}
          fill="none"
          stroke="var(--tier-color)"
          strokeWidth={15}
          strokeLinecap="round"
        />
        <circle cx={head.x} cy={head.y} r={6.5} fill="#fff" />
      </svg>
      <div className="gaugeCenter">
        <span className="gaugeNum">{roundedScore}</span>
        <span className="gaugeWord">{band.label}</span>
        <span className="gaugeOutOf">out of 100</span>
      </div>
    </div>
  );
}
