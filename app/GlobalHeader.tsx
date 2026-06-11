'use client';

import { useEffect, useRef, useState } from 'react';
import GlobalSearch from './GlobalSearch';
import {
  DEFAULT_HOME_MARINA_ID,
  HOME_MARINA_CHANGE_EVENT,
  HOME_MARINA_STORAGE_KEY,
  homeMarinaHref,
  homeMarinaLabel,
  normalizeHomeMarinaId
} from '../lib/home-marina';
import type { LocationId } from '../lib/locations';

type GlobalHeaderProps = {
  active: 'home' | 'map' | 'browse' | 'conditions' | 'area' | 'contact';
  contextLabel?: string;
  showDaySlot?: boolean;
};

export default function GlobalHeader({ active, showDaySlot = false }: GlobalHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [homeMarina, setHomeMarina] = useState<LocationId>(DEFAULT_HOME_MARINA_ID);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const homeMarinaName = homeMarinaLabel(homeMarina);
  const homeHref = homeMarinaHref(homeMarina);
  const mapHref = active === 'map' ? '/plan-my-trip' : '/plan-my-trip?overview=all';

  useEffect(() => {
    function updateScrolledState() {
      setIsScrolled(window.scrollY > 72);
    }

    updateScrolledState();
    window.addEventListener('scroll', updateScrolledState, { passive: true });
    return () => window.removeEventListener('scroll', updateScrolledState);
  }, []);

  useEffect(() => {
    function readSavedHomeMarina() {
      setHomeMarina(normalizeHomeMarinaId(window.localStorage.getItem(HOME_MARINA_STORAGE_KEY)));
    }

    function onStorage(event: StorageEvent) {
      if (event.key === HOME_MARINA_STORAGE_KEY) readSavedHomeMarina();
    }

    function onHomeMarinaChange(event: Event) {
      const nextId = event instanceof CustomEvent ? event.detail?.id : null;
      setHomeMarina(normalizeHomeMarinaId(nextId));
    }

    readSavedHomeMarina();
    window.addEventListener('storage', onStorage);
    window.addEventListener(HOME_MARINA_CHANGE_EVENT, onHomeMarinaChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(HOME_MARINA_CHANGE_EVENT, onHomeMarinaChange);
    };
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !mobileMenuRef.current?.contains(target)) {
        setIsMobileMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMobileMenuOpen]);

  return (
    <header className={`globalHeader ${showDaySlot ? 'hasDaySlot' : ''} ${isScrolled ? 'scrolled' : ''}`}>
      <a className={`globalBrand ${active === 'home' ? 'active' : ''}`} href="/" aria-label="Fair Tide home" aria-current={active === 'home' ? 'page' : undefined}>
        <img className="fbLogo" src="/fb-logo.svg?v=7" alt="Fair Tide" width={48} height={48} />
        <span className="brandTitle">
          <span className="brandFreedom">Fair Tide</span>
          <span className="brandBoat">BOAT PLANNER</span>
        </span>
      </a>

      <details className="globalMobileMenu" ref={mobileMenuRef} open={isMobileMenuOpen}>
        <summary
          aria-label={isMobileMenuOpen ? 'Close Fair Tide menu' : 'Open Fair Tide menu'}
          aria-expanded={isMobileMenuOpen}
          onClick={(event) => {
            event.preventDefault();
            setIsMobileMenuOpen((isOpen) => !isOpen);
          }}
        >
          <span />
          <span />
          <span />
        </summary>
        <div className="globalMobileMenuPanel" aria-label="Mobile navigation">
          <a className={active === 'conditions' || active === 'home' ? 'active' : ''} href={homeHref} aria-current={active === 'conditions' || active === 'home' ? 'page' : undefined}>
            <strong>{homeMarinaName}</strong>
            <span>Home marina</span>
          </a>
          <a className={active === 'map' ? 'active' : ''} href={mapHref} aria-current={active === 'map' ? 'page' : undefined}>
            <strong>Map</strong>
            <span>Trip planner</span>
          </a>
          <a className={active === 'browse' || active === 'area' ? 'active' : ''} href="/browse" aria-current={active === 'browse' || active === 'area' ? 'page' : undefined}>
            <strong>Browse</strong>
            <span>Directory</span>
          </a>
        </div>
      </details>

      <nav className="globalPrimaryNav" aria-label="Primary navigation">
        <a className={active === 'map' ? 'active' : ''} href={mapHref} aria-current={active === 'map' ? 'page' : undefined}>Map</a>
        <a className={active === 'browse' || active === 'area' ? 'active' : ''} href="/browse" aria-current={active === 'browse' || active === 'area' ? 'page' : undefined}>Browse</a>
      </nav>

      <GlobalSearch selectedLabel={homeMarinaName} />

      {showDaySlot ? (
        <div className="globalContext">
          <div id="planner-day-tabs-slot" className="tripPlannerDaySlot" aria-label="Trip date controls" />
        </div>
      ) : null}

      <a className="globalPrefs" href={homeHref} aria-label={`Home marina: ${homeMarinaName}`}>
        {homeMarinaName}
      </a>
    </header>
  );
}
