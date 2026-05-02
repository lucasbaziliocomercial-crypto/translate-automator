import { useCallback, useEffect, useMemo, useState } from "react";
import { findMatches, type MatchRange } from "./find-utils";

export interface UseFindBarReturn {
  isOpen: boolean;
  query: string;
  caseSensitive: boolean;
  currentIndex: number;
  matchCount: number;
  matches: MatchRange[];
  open: (initial?: string) => void;
  close: () => void;
  setQuery: (q: string) => void;
  toggleCaseSensitive: () => void;
  next: () => void;
  prev: () => void;
}

export function useFindBar(text: string): UseFindBarReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQueryState] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const matches = useMemo(
    () => findMatches(text, query, caseSensitive),
    [text, query, caseSensitive],
  );

  useEffect(() => {
    if (matches.length === 0) {
      if (currentIndex !== -1) setCurrentIndex(-1);
      return;
    }
    if (currentIndex === -1) {
      setCurrentIndex(0);
    } else if (currentIndex >= matches.length) {
      setCurrentIndex(matches.length - 1);
    }
  }, [matches.length, currentIndex]);

  const open = useCallback((initial?: string) => {
    setIsOpen(true);
    if (initial && initial.length > 0) {
      setQueryState(initial);
    }
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    setCurrentIndex(q.length === 0 ? -1 : 0);
  }, []);

  const toggleCaseSensitive = useCallback(() => {
    setCaseSensitive((v) => !v);
  }, []);

  const next = useCallback(() => {
    setCurrentIndex((i) => {
      if (matches.length === 0) return -1;
      return (i + 1) % matches.length;
    });
  }, [matches.length]);

  const prev = useCallback(() => {
    setCurrentIndex((i) => {
      if (matches.length === 0) return -1;
      return (i - 1 + matches.length) % matches.length;
    });
  }, [matches.length]);

  return {
    isOpen,
    query,
    caseSensitive,
    currentIndex,
    matchCount: matches.length,
    matches,
    open,
    close,
    setQuery,
    toggleCaseSensitive,
    next,
    prev,
  };
}
