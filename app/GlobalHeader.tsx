'use client';

import { useEffect, useState } from 'react';
import GlobalSearch from './GlobalSearch';

type GlobalHeaderProps = {
  active: 'home' | 'map' | 'browse' | 'conditions' | 'area';
  contextLabel?: string;
  showDaySlot?: boolean;
};

export default function GlobalHeader({ active, contextLabel, showDaySlot = false }: GlobalHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function updateScrolledState() {
      setIsScrolled(window.scrollY > 72);
    }

    updateScrolledState();
    window.addEventListener('scroll', updateScrolledState, { passive: true });
    return () => window.removeEventListener('scroll', updateScrolledState);
  }, []);

  return (
    <header className={`globalHeader ${isScrolled ? 'scrolled' : ''}`}>
      <a className={`globalBrand ${active === 'home' ? 'active' : ''}`} href="/" aria-label="FAIRTIDE home" aria-current={active === 'home' ? 'page' : undefined}>
        <img className="fbLogo" src="/fb-logo.svg?v=7" alt="FAIRTIDE" width={48} height={48} />
        <span className="brandTitle">
          <span className="brandFreedom">FAIRTIDE</span>
          <span className="brandBoat">BOAT PLANNER</span>
        </span>
      </a>

      <nav className="globalPrimaryNav" aria-label="Primary navigation">
        <a className={active === 'map' ? 'active' : ''} href="/plan-my-trip" aria-current={active === 'map' ? 'page' : undefined}>Map</a>
        <a className={active === 'browse' || active === 'area' ? 'active' : ''} href="/browse" aria-current={active === 'browse' || active === 'area' ? 'page' : undefined}>Browse</a>
      </nav>

      <GlobalSearch selectedLabel="Port Moody" />

      <div className="globalContext">
        {showDaySlot ? <div id="planner-day-tabs-slot" className="tripPlannerDaySlot" aria-label="Trip date controls" /> : null}
        {!showDaySlot && contextLabel ? <span>{contextLabel}</span> : null}
      </div>

      <a className="globalPrefs" href="/location/port-moody" aria-label="Home marina preferences">
        Port Moody
      </a>
    </header>
  );
}
