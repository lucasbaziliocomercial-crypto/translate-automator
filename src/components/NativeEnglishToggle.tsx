import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/cn";

export function NativeEnglishToggle() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      window.translateAutomator.isPersonalPromptAvailable(),
      window.translateAutomator.getSettings(),
    ])
      .then(([hasFile, settings]) => {
        if (cancelled) return;
        setAvailable(hasFile);
        setEnabled(settings.nativeEnglishEnabled === true);
      })
      .catch(() => {
        if (cancelled) return;
        setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!available) return null;

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    window.translateAutomator
      .setSettings({ nativeEnglishEnabled: next })
      .catch(() => {
        setEnabled(!next);
      });
  };

  const label = enabled
    ? "Inglês nativo: ATIVO"
    : "Inglês nativo: desativado";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      title={`${label} — clique para alternar`}
      aria-label={label}
      aria-pressed={enabled}
      className={cn(
        enabled &&
          "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60",
      )}
    >
      <Sparkles className="size-4" />
    </Button>
  );
}
