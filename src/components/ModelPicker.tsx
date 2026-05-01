import { useTranslation } from "@/store/translation";
import { MODELS, type ModelId } from "@/lib/providers";
import { useEffect } from "react";

export function ModelPicker() {
  const { modelId, setModelId } = useTranslation();

  useEffect(() => {
    window.translateAutomator.getSettings().then((s) => {
      if (s.lastModelId && (s.lastModelId === "claude-opus-4-7" || s.lastModelId === "gemini-3-pro")) {
        setModelId(s.lastModelId as ModelId);
      }
    });
  }, [setModelId]);

  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <span className="font-medium">Modelo:</span>
      <select
        value={modelId}
        onChange={(e) => {
          const id = e.target.value as ModelId;
          setModelId(id);
          window.translateAutomator.setSettings({ lastModelId: id });
        }}
        className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
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
