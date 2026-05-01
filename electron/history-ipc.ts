import { ipcMain } from "electron";
import {
  loadHistory,
  saveHistoryEntry,
  deleteHistoryEntry,
  clearHistory,
  type HistoryEntryInput,
} from "./history-store";

export function registerHistoryIpc(): void {
  ipcMain.handle("history:list", () => loadHistory());

  ipcMain.handle("history:save", (_e, input: HistoryEntryInput) => {
    return saveHistoryEntry(input);
  });

  ipcMain.handle("history:delete", (_e, id: string) => {
    deleteHistoryEntry(id);
    return { ok: true };
  });

  ipcMain.handle("history:clear", () => {
    clearHistory();
    return { ok: true };
  });
}
