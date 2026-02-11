import React from 'react';

export function IconWind({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 8h10a3 3 0 1 0-3-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M3 12h14a3 3 0 1 1-3 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M3 16h7a2 2 0 1 1-2 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconThermometer({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 17a1.5 1.5 0 0 0 0-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconRain({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.7-1.7A4 4 0 0 1 17 18H7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 21l1-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M13 21l1-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 21l1-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconTide({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 18c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M3 14c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path d="M8 6h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 3v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconMap({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 19 3 21V5l6-2 6 2 6-2v16l-6 2-6-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 3v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 5v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconSunrise({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 6l3-3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 18c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 14a6 6 0 0 1 12 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconSunset({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 6l3 3 3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 18c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 14a6 6 0 0 1 12 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconSun({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M12 2v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 19v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M2 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4.2 4.2l2.1 2.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17.7 17.7l2.1 2.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19.8 4.2l-2.1 2.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6.3 17.7l-2.1 2.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconPartlyCloudy({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 17a4 4 0 0 1 0-8 5 5 0 0 1 9.2-1.9" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 7V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <path d="M18.8 8.2 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <path d="M15 20h-8a3 3 0 0 1 0-6 4 4 0 0 1 7.7-1.4A3 3 0 0 1 15 20Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
