import { Upload, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "./Button";
import { useTranslation } from "@/store/translation";

export function ImportButton() {
  const [busy, setBusy] = useState(false);
  const setSourceFile = useTranslation((s) => s.setSourceFile);
  const setError = useTranslation((s) => s.setError);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await window.translateAutomator.importFile();
      if (r.canceled) return;
      if (!r.ok) {
        setError(r.reason ?? "Falha ao importar.");
        return;
      }
      if (r.format && r.markdown !== undefined && r.sourceName) {
        setSourceFile({
          format: r.format,
          markdown: r.markdown,
          name: r.sourceName,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={busy} variant="outline" size="sm">
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Upload className="size-4" />
      )}
      Importar arquivo
    </Button>
  );
}
