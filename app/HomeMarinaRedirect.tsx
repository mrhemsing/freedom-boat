'use client';

import { useEffect } from 'react';
import { DEFAULT_HOME_MARINA_ID, HOME_MARINA_STORAGE_KEY, homeMarinaHref, normalizeHomeMarinaId } from '../lib/home-marina';

export default function HomeMarinaRedirect() {
  useEffect(() => {
    const savedHomeMarina = normalizeHomeMarinaId(window.localStorage.getItem(HOME_MARINA_STORAGE_KEY));
    if (savedHomeMarina !== DEFAULT_HOME_MARINA_ID) {
      window.location.replace(homeMarinaHref(savedHomeMarina));
    }
  }, []);

  return null;
}
