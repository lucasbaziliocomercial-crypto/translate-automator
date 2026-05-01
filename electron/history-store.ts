import { app } from "electron";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import log from "electron-log/main";

export interface HistoryEntry {
  id: string;
  createdAt: number;
  updatedAt: number;
  sourceName: string | null;
  sourceFormat: "docx" | "pdf" | null;
  modelId: string;
  source: string;
  partResults: Record<number, string>;
}

export type HistoryEntryInput = Omit<HistoryEntry, "id" | "createdAt" | "updatedAt">;

const MAX_ENTRIES = 50;

function historyPath(): string {
  return path.join(app.getPath("userData"), "history.json");
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = fs.readFileSync(historyPath(), "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEntry);
  } catch {
    return [];
  }
}

function isValidEntry(e: unknown): e is HistoryEntry {
  if (!e || typeof e !== "object") return false;
  const r = e as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.createdAt === "number" &&
    typeof r.source === "string" &&
    typeof r.modelId === "string"
  );
}

function writeHistory(entries: HistoryEntry[]): void {
  try {
    fs.mkdirSync(path.dirname(historyPath()), { recursive: true });
    fs.writeFileSync(historyPath(), JSON.stringify(entries, null, 2), "utf-8");
  } catch (e) {
    log.error("[history] write failed:", e);
  }
}

function hashSource(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);
}

/**
 * Salva (ou atualiza) uma entrada. Se já existe entrada com o mesmo hash do
 * source, ela é atualizada e movida pro topo. Caso contrário, cria nova.
 * Mantém no máximo MAX_ENTRIES (mais antigas são descartadas).
 */
export function saveHistoryEntry(input: HistoryEntryInput): HistoryEntry {
  const entries = loadHistory();
  const hash = hashSource(input.source);
  const now = Date.now();

  const existingIdx = entries.findIndex(
    (e) => hashSource(e.source) === hash,
  );
  let entry: HistoryEntry;
  if (existingIdx >= 0) {
    const existing = entries[existingIdx];
    entry = { ...existing, ...input, updatedAt: now };
    entries.splice(existingIdx, 1);
  } else {
    entry = {
      id: `${hash}-${now.toString(36)}`,
      createdAt: now,
      updatedAt: now,
      ...input,
    };
  }
  entries.unshift(entry);
  while (entries.length > MAX_ENTRIES) entries.pop();
  writeHistory(entries);
  return entry;
}

export function deleteHistoryEntry(id: string): void {
  const entries = loadHistory().filter((e) => e.id !== id);
  writeHistory(entries);
}

export function clearHistory(): void {
  writeHistory([]);
}
