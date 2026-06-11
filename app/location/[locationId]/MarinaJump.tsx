'use client';

import { useEffect, useRef, useState } from 'react';
import { DEFAULT_HOME_MARINA_ID, HOME_MARINA_CHANGE_EVENT, HOME_MARINA_STORAGE_KEY, normalizeHomeMarinaId } from '../../../lib/home-marina';
import type { LocationId } from '../../../lib/locations';

export type MarinaJumpGroup = {
  label: string;
  options: Array<{
    label: string;
    path: string;
    locationId: LocationId;
  }>;
};

export default function MarinaJump({
  value,
  groups
}: {
  value?: LocationId | '';
  groups: MarinaJumpGroup[];
}) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [homeMarina, setHomeMarina] = useState<LocationId>(DEFAULT_HOME_MARINA_ID);
  const currentPath = value ? `/location/${value}` : '';
  const currentLabel =
    groups.flatMap((group) => group.options).find((option) => option.path === currentPath)?.label ?? 'Select marina';

  useEffect(() => {
    setHomeMarina(normalizeHomeMarinaId(window.localStorage.getItem(HOME_MARINA_STORAGE_KEY)));
  }, []);

  useEffect(() => {
    function closeMenu() {
      if (detailsRef.current) detailsRef.current.open = false;
    }

    function onPointerDown(event: PointerEvent) {
      const details = detailsRef.current;
      if (!details?.open) return;
      if (event.target instanceof Node && details.contains(event.target)) return;
      closeMenu();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      closeMenu();
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  function setAsHome(locationId: LocationId) {
    const nextHome = normalizeHomeMarinaId(locationId);
    window.localStorage.setItem(HOME_MARINA_STORAGE_KEY, nextHome);
    setHomeMarina(nextHome);
    window.dispatchEvent(new CustomEvent(HOME_MARINA_CHANGE_EVENT, { detail: { id: nextHome } }));
  }

  return (
    <details ref={detailsRef} className="marinaJumpMenu">
      <summary aria-label="Open marina menu">
        <span className="marinaJumpSummaryText">
          <span>Marina</span>
          <strong>{currentLabel}</strong>
        </span>
        <span className="marinaJumpBars" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </summary>
      <div className="marinaJumpPanel" aria-label="Marina pages">
        <div className="marinaJumpNetworkLabel" style={{ color: 'rgba(34, 197, 94, 0.65)' }}>
          Freedom Boat Club Network
        </div>
        {groups.map((group) => (
          <div key={group.label}>
            <div className="marinaJumpDivider">{group.label}</div>
            {group.options.map((option) => (
              <div key={option.path} className="marinaJumpOption">
                <a
                  className={option.path === currentPath ? 'active' : undefined}
                  href={option.path}
                >
                  {option.label}
                </a>
                {homeMarina === option.locationId ? (
                  <button
                    type="button"
                    className="marinaHomeButton active"
                    aria-pressed="true"
                    aria-label={`${option.label} is your home marina`}
                    title="Home marina"
                    onClick={() => setAsHome(option.locationId)}
                  >
                    <HouseIcon filled />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="marinaHomeButton"
                    aria-pressed="false"
                    aria-label={`Set ${option.label} as home marina`}
                    title="Set home marina"
                    onClick={() => setAsHome(option.locationId)}
                  >
                    <HouseIcon />
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}

function HouseIcon({ filled = false }: { filled?: boolean }) {
  if (filled) {
    return (
      <svg className="marinaHomeIcon marinaHomeIconFilled" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3.75 10.6 12 3.75l8.25 6.85v9.9a.75.75 0 0 1-.75.75h-4.25v-6.2a.75.75 0 0 0-.75-.75h-5a.75.75 0 0 0-.75.75v6.2H4.5a.75.75 0 0 1-.75-.75v-9.9Z" />
      </svg>
    );
  }

  return (
    <svg className="marinaHomeIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3.75 10.6 12 3.75l8.25 6.85v9.9a.75.75 0 0 1-.75.75h-4.25v-6.2a.75.75 0 0 0-.75-.75h-5a.75.75 0 0 0-.75.75v6.2H4.5a.75.75 0 0 1-.75-.75v-9.9Z" />
    </svg>
  );
}
