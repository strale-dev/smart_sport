"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type GlobalSearchContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(
  null
);

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => {
    setOpen((value) => !value);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isK = event.key.toLowerCase() === "k";
      if (!isK || !(event.metaKey || event.ctrlKey)) {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      event.preventDefault();
      setOpen(true);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(() => ({ open, setOpen, toggle }), [open, toggle]);

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
    </GlobalSearchContext.Provider>
  );
}

export function useGlobalSearch(): GlobalSearchContextValue {
  const ctx = useContext(GlobalSearchContext);
  if (!ctx) {
    throw new Error("useGlobalSearch must be used within GlobalSearchProvider");
  }
  return ctx;
}
