import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/lib/use-theme";
import { Button } from "./Button";

export function ThemeToggle() {
  const { preference, cycle } = useTheme();

  const icon =
    preference === "light" ? (
      <Sun className="size-4" />
    ) : preference === "dark" ? (
      <Moon className="size-4" />
    ) : (
      <Monitor className="size-4" />
    );

  const label =
    preference === "light"
      ? "Tema: Claro"
      : preference === "dark"
        ? "Tema: Escuro"
        : "Tema: Sistema";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycle}
      title={`${label} — clique para alternar`}
      aria-label={label}
    >
      {icon}
    </Button>
  );
}
