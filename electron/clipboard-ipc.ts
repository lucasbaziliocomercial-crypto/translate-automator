import { ipcMain, clipboard } from "electron";
import log from "electron-log/main";

export function registerClipboardIpc(): void {
  ipcMain.handle(
    "clipboard:write-html",
    (_e, args: { html: string; text: string }) => {
      try {
        clipboard.write({ html: args.html, text: args.text });
        return { ok: true };
      } catch (e: any) {
        log.error("[clipboard] erro:", e);
        return { ok: false, reason: e?.message ?? String(e) };
      }
    },
  );
}
