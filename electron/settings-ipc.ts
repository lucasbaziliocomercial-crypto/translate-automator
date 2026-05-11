import { ipcMain } from "electron";
import {
  getSettingsForRenderer,
  saveSettings,
  type ThemePreference,
} from "./settings-store";
import { hasPersonalPrompt } from "./personal-prompt";

export function registerSettingsIpc(): void {
  ipcMain.handle("settings:get", () => getSettingsForRenderer());

  ipcMain.handle(
    "settings:set",
    (
      _e,
      patch: {
        lastModelId?: string;
        theme?: ThemePreference;
        nativeEnglishEnabled?: boolean;
      },
    ) => {
      saveSettings(patch);
      return getSettingsForRenderer();
    },
  );

  ipcMain.handle("personal-prompt:available", () => hasPersonalPrompt());
}
