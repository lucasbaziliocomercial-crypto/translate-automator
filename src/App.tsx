import { useEffect, useRef, useState } from "react";
import { ModelPicker } from "./components/ModelPicker";
import { SettingsDialog } from "./components/SettingsDialog";
import { StatusBar } from "./components/StatusBar";
import { TranslateView } from "./components/TranslateView";
import { HistoryView } from "./components/HistoryView";
import { useTranslation } from "./store/translation";
import { cn } from "./lib/cn";

type TabId = "translate" | "history";

export default function App() {
  const [tab, setTab] = useState<TabId>("translate");

  const partResults = useTranslation((s) => s.partResults);
  const inProgressCount = useTranslation((s) => s.inProgressCount);
  const source = useTranslation((s) => s.source);
  const sourceName = useTranslation((s) => s.sourceName);
  const sourceFormat = useTranslation((s) => s.sourceFormat);
  const modelId = useTranslation((s) => s.modelId);
  const prevInProgress = useRef(inProgressCount);

  // Auto-save no histórico quando a última parte termina (transição de >0 → 0).
  useEffect(() => {
    const justFinished =
      prevInProgress.current > 0 && inProgressCount === 0;
    prevInProgress.current = inProgressCount;
    if (!justFinished) return;
    const hasContent = Object.values(partResults).some(
      (s) => typeof s === "string" && s.trim().length > 0,
    );
    if (!hasContent) return;
    if (!source.trim()) return;
    window.translateAutomator
      .saveHistory({
        source,
        partResults,
        sourceName,
        sourceFormat,
        modelId,
      })
      .catch(() => {
        // best-effort — não atrapalha a UX se falhar
      });
  }, [inProgressCount, partResults, source, sourceName, sourceFormat, modelId]);

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-slate-900">
            Translate Automator
          </h1>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            PT-BR → EN-US
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ModelPicker />
          <SettingsDialog />
        </div>
      </header>

      <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-4">
        <TabButton active={tab === "translate"} onClick={() => setTab("translate")}>
          Tradução
        </TabButton>
        <TabButton active={tab === "history"} onClick={() => setTab("history")}>
          Histórico
        </TabButton>
      </div>

      <div className="border-b border-slate-200 bg-white px-4 py-2">
        <StatusBar />
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === "translate" ? (
          <TranslateView />
        ) : (
          <HistoryView onLoadedEntry={() => setTab("translate")} />
        )}
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "text-emerald-700"
          : "text-slate-500 hover:text-slate-700",
      )}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
      )}
    </button>
  );
}
