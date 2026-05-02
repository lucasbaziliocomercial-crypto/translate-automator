import { useEffect, useRef, useState } from "react";
import { Languages, FileText, History } from "lucide-react";
import { ModelPicker } from "./components/ModelPicker";
import { SettingsDialog } from "./components/SettingsDialog";
import { StatusBar } from "./components/StatusBar";
import { ThemeToggle } from "./components/ThemeToggle";
import { UpdateButton } from "./components/UpdateButton";
import { TranslateView } from "./components/TranslateView";
import { HistoryView } from "./components/HistoryView";
import { useTranslation } from "./store/translation";
import { useTheme } from "./lib/use-theme";
import { cn } from "./lib/cn";

type TabId = "translate" | "history";

export default function App() {
  const [tab, setTab] = useState<TabId>("translate");
  // Inicializa o tema (aplica classe `dark` no <html> conforme settings).
  useTheme();

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
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
            <Languages className="size-4" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Translate Automator
          </h1>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            PT-BR → EN-US
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ModelPicker />
          <UpdateButton />
          <ThemeToggle />
          <SettingsDialog />
        </div>
      </header>

      <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
        <TabButton
          active={tab === "translate"}
          onClick={() => setTab("translate")}
          icon={<FileText className="size-4" />}
        >
          Tradução
        </TabButton>
        <TabButton
          active={tab === "history"}
          onClick={() => setTab("history")}
          icon={<History className="size-4" />}
        >
          Histórico
        </TabButton>
      </div>

      <div className="border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
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
  icon: React.ReactNode;
  children: React.ReactNode;
}

function TabButton({ active, onClick, icon, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors",
        active
          ? "text-emerald-700 dark:text-emerald-400"
          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
      )}
    >
      {icon}
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400" />
      )}
    </button>
  );
}
