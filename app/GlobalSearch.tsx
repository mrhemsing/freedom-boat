'use client';

import { FormEvent, KeyboardEvent, useMemo, useRef, useState } from 'react';
import { SEARCH_SUGGESTIONS, type SearchSuggestion } from '../lib/search-suggestions';

const MAX_SUGGESTIONS = 8;

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const blurTimer = useRef<number | null>(null);

  const matches = useMemo(() => findMatches(query), [query]);
  const showSuggestions = isOpen && query.trim().length > 0 && matches.length > 0;

  function openSuggestions() {
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
    setIsOpen(true);
  }

  function closeSuggestionsSoon() {
    blurTimer.current = window.setTimeout(() => setIsOpen(false), 120);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const destination = matches[activeIndex] ?? matches[0];
    window.location.href = destination?.href ?? `/browse?q=${encodeURIComponent(query.trim())}`;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % matches.length);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + matches.length) % matches.length);
    }

    if (event.key === 'Escape') {
      setIsOpen(false);
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      window.location.href = matches[activeIndex]?.href ?? matches[0]?.href ?? `/browse?q=${encodeURIComponent(query.trim())}`;
    }
  }

  return (
    <form className="globalSearch" action="/browse" role="search" onSubmit={submitSearch}>
      <label className="globalSearchBox">
        <span className="srOnly">Search Fairtide</span>
        <input
          name="q"
          type="search"
          value={query}
          placeholder="Search marinas, launches, areas"
          aria-label="Search Fairtide"
          aria-expanded={showSuggestions}
          aria-controls="global-search-suggestions"
          aria-autocomplete="list"
          autoComplete="off"
          onBlur={closeSuggestionsSoon}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setIsOpen(true);
          }}
          onFocus={openSuggestions}
          onKeyDown={handleKeyDown}
        />
      </label>

      {showSuggestions ? (
        <div id="global-search-suggestions" className="globalSearchSuggestions" role="listbox">
          {matches.map((suggestion, index) => (
            <a
              key={suggestion.href}
              className={`globalSearchSuggestion ${index === activeIndex ? 'active' : ''}`}
              href={suggestion.href}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span>
                <strong>{suggestion.label}</strong>
                <em>{suggestion.meta}</em>
              </span>
              <b>{suggestion.type}</b>
            </a>
          ))}
        </div>
      ) : null}
    </form>
  );
}

function findMatches(query: string) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];

  return SEARCH_SUGGESTIONS
    .map((suggestion) => ({
      suggestion,
      score: scoreSuggestion(suggestion, normalizedQuery)
    }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || a.suggestion.label.localeCompare(b.suggestion.label))
    .slice(0, MAX_SUGGESTIONS)
    .map((match) => match.suggestion);
}

function scoreSuggestion(suggestion: SearchSuggestion, query: string) {
  const label = normalize(suggestion.label);
  const meta = normalize(suggestion.meta);
  const keywords = normalize(suggestion.keywords);
  const typeBoost = suggestion.type === 'Conditions' ? 18 : 0;

  if (label === query) return 100 + typeBoost;
  if (label.startsWith(query)) return 90 + typeBoost;
  if (label.split(' ').some((word) => word.startsWith(query))) return 82 + typeBoost;
  if (label.includes(query)) return 72 + typeBoost;
  if (meta.includes(query)) return 54 + typeBoost;
  if (keywords.includes(query)) return 38 + typeBoost;
  return 0;
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
