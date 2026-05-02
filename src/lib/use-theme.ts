import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

function applyClass(effective: "light" | "dark") {
  const root = document.documentElement;
  if (effective === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  root.style.colorScheme = effective;
}

function resolve(pref: ThemePreference): "light" | "dark" {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return pref;
}

export function useTheme(): {
  preference: ThemePreference;
  effective: "light" | "dark";
  setPreference: (p: ThemePreference) => void;
  cycle: () => void;
} {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [effective, setEffective] = useState<"light" | "dark">(() =>
    typeof window !== "undefined" ? resolve("system") : "light",
  );

  useEffect(() => {
    let cancelled = false;
    window.translateAutomator
      ?.getSettings()
      .then((s) => {
        if (cancelled) return;
        const pref = (s.theme ?? "system") as ThemePreference;
        setPreferenceState(pref);
        const eff = resolve(pref);
        setEffective(eff);
        applyClass(eff);
      })
      .catch(() => {
        const eff = resolve("system");
        setEffective(eff);
        applyClass(eff);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (preference !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const eff = resolve("system");
      setEffective(eff);
      applyClass(eff);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [preference]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    const eff = resolve(p);
    setEffective(eff);
    applyClass(eff);
    window.translateAutomator?.setSettings({ theme: p }).catch(() => {});
  }, []);

  const cycle = useCallback(() => {
    setPreferenceState((prev) => {
      const next: ThemePreference =
        prev === "light" ? "dark" : prev === "dark" ? "system" : "light";
      const eff = resolve(next);
      setEffective(eff);
      applyClass(eff);
      window.translateAutomator?.setSettings({ theme: next }).catch(() => {});
      return next;
    });
  }, []);

  return { preference, effective, setPreference, cycle };
}
