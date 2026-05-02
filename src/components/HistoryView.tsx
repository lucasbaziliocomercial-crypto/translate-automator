import { useEffect, useState } from "react";
import {
  Trash2,
  Download as LoadIcon,
  Loader2,
  RefreshCw,
  FileText,
  Sparkles,
} from "lucide-react";
import { Button } from "./Button";
import { useTranslation, joinPartResults } from "@/store/translation";
import type { HistoryEntry } from "../../electron/preload";

interface Props {
  onLoadedEntry: () => void;
}

export function HistoryView({ onLoadedEntry }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const loadHistoryEntry = useTranslation((s) => s.loadHistoryEntry);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await window.translateAutomator.listHistory();
      setEntries(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleLoad = (entry: HistoryEntry) => {
    loadHistoryEntry({
      source: entry.source,
      partResults: entry.partResults,
      sourceName: entry.sourceName,
      sourceFormat: entry.sourceFormat,
      modelId: entry.modelId,
    });
    onLoadedEntry();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Apagar esta entrada do histórico?")) return;
    await window.translateAutomator.deleteHistoryEntry(id);
    refresh();
  };

  const handleClearAll = async () => {
    if (
      !window.confirm(
        `Apagar TODAS as ${entries.length} entradas do histórico? Essa ação não pode ser desfeita.`,
      )
    )
      return;
    await window.translateAutomator.clearHistory();
    refresh();
  };

  return (
    <div className="flex h-full flex-col gap-3 p-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Histórico
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Suas últimas traduções concluídas. Clique em "Carregar" para abrir
            uma na aba Tradução.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw className="size-3.5" />
            Recarregar
          </Button>
          {entries.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearAll}>
              <Trash2 className="size-3.5" />
              Apagar tudo
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-slate-500 dark:text-slate-400">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
          <Sparkles className="size-8 opacity-40" />
          <p className="text-sm">Nenhuma tradução salva ainda.</p>
          <p className="text-xs">
            Suas traduções concluídas aparecerão aqui automaticamente.
          </p>
        </div>
      ) : (
        <ul className="flex-1 overflow-auto space-y-2">
          {entries.map((entry) => (
            <HistoryRow
              key={entry.id}
              entry={entry}
              onLoad={() => handleLoad(entry)}
              onDelete={() => handleDelete(entry.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface RowProps {
  entry: HistoryEntry;
  onLoad: () => void;
  onDelete: () => void;
}

function HistoryRow({ entry, onLoad, onDelete }: RowProps) {
  const date = new Date(entry.updatedAt);
  const dateStr = date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const partsList = Object.keys(entry.partResults)
    .map((k) => parseInt(k, 10))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
  const fullText = joinPartResults(entry.partResults);
  const wordCount = fullText.split(/\s+/).filter(Boolean).length;
  const preview = fullText.slice(0, 180).replace(/\s+/g, " ").trim();

  const modelLabel =
    entry.modelId === "gemini-3-pro"
      ? "Gemini 3 Pro"
      : entry.modelId === "claude-opus-4-7"
        ? "Claude Opus 4.7"
        : entry.modelId;

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <FileText className="size-4 shrink-0 text-slate-500 dark:text-slate-400" />
            <span className="truncate font-medium text-slate-800 dark:text-slate-100">
              {entry.sourceName ?? "(sem nome)"}
            </span>
            {entry.sourceFormat && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {entry.sourceFormat}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>{dateStr}</span>
            <span>·</span>
            <span>{modelLabel}</span>
            {partsList.length > 0 && (
              <>
                <span>·</span>
                <span>
                  Partes:{" "}
                  {partsList.map((p) => `${p}`).join(", ")}
                </span>
              </>
            )}
            <span>·</span>
            <span>{wordCount.toLocaleString("pt-BR")} palavras</span>
          </div>
          {preview && (
            <p className="mt-2 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
              {preview}
              {fullText.length > 180 ? "…" : ""}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="primary" size="sm" onClick={onLoad}>
            <LoadIcon className="size-3.5" />
            Carregar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            title="Apagar entrada"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </li>
  );
}
