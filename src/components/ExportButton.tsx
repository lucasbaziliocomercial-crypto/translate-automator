import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "./Button";
import { useTranslation, joinPartResults } from "@/store/translation";

export function ExportButton() {
  const [busy, setBusy] = useState(false);
  const partResults = useTranslation((s) => s.partResults);
  const sourceFormat = useTranslation((s) => s.sourceFormat);
  const sourceName = useTranslation((s) => s.sourceName);
  const setError = useTranslation((s) => s.setError);

  const result = joinPartResults(partResults);
  const disabled = result.trim().length === 0 || busy;

  const handleClick = async () => {
    if (disabled) return;
    setBusy(true);
    try {
      const r = await window.translateAutomator.exportFile({
        markdown: result,
        defaultFormat: sourceFormat ?? "docx",
        defaultName: sourceName ?? "traducao",
      });
      if (r.canceled) return;
      if (!r.ok) {
        setError(r.reason ?? "Falha ao exportar.");
        return;
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled}
      variant="primary"
      size="lg"
      title={
        disabled && result.trim().length === 0
          ? "Traduza algo primeiro para exportar."
          : undefined
      }
    >
      {busy ? (
        <Loader2 className="size-5 animate-spin" />
      ) : (
        <Download className="size-5" />
      )}
      Exportar tradução
    </Button>
  );
}
