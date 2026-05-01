import { ipcMain } from "electron";
import { getSettingsForRenderer, saveSettings } from "./settings-store";

export function registerSettingsIpc(): void {
  ipcMain.handle("settings:get", () => getSettingsForRenderer());

  ipcMain.handle(
    "settings:set",
    (_e, patch: { geminiApiKey?: string; lastModelId?: string }) => {
      saveSettings(patch);
      return getSettingsForRenderer();
    },
  );
}
