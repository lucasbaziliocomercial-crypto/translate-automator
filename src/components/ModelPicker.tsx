import { useTranslation } from "@/store/translation";
import { MODELS, type ModelId } from "@/lib/providers";
import { useEffect } from "react";

export function ModelPicker() {
  const { modelId, setModelId } = useTranslation();

  useEffect(() => {
    window.translateAutomator.getSettings().then((s) => {
      if (!s.lastModelId) return;
      if (s.lastModelId === "claude-opus-4-7" || s.lastModelId === "gemini-3-1-pro") {
        setModelId(s.lastModelId as ModelId);
        return;
      }
      // Migra escolha antiga: "gemini-3-pro" (descontinuado) → "gemini-3-1-pro".
      if (s.lastModelId === "gemini-3-pro") {
        setModelId("gemini-3-1-pro");
        window.translateAutomator.setSettings({ lastModelId: "gemini-3-1-pro" });
      }
    });
  }, [setModelId]);

  return (
    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
      <span className="font-medium">Modelo:</span>
      <select
        value={modelId}
        onChange={(e) => {
          const id = e.target.value as ModelId;
          setModelId(id);
          window.translateAutomator.setSettings({ lastModelId: id });
        }}
        className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  );
}
