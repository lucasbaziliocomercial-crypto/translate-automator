import { useEffect } from "react";
import { useUpdater } from "@/store/updater";

// Registra os listeners IPC do auto-updater uma única vez (no <App/>)
// e despacha pra store. Mantém UpdateButton e StatusBar sincronizados.
export function useUpdaterEvents(): void {
  useEffect(() => {
    const get = useUpdater.getState;
    const offs = [
      // electron-updater faz autoDownload=true, então update-available
      // já significa "começou a baixar". Pular o estado intermediário.
      window.translateAutomator.onUpdateAvailable(({ version }) => {
        get().setDownloading(version, 0);
      }),
      window.translateAutomator.onUpdateNotAvailable(({ currentVersion }) => {
        get().setUpToDate(currentVersion);
      }),
      window.translateAutomator.onUpdateDownloadProgress(({ percent }) => {
        get().setProgress(percent);
      }),
      window.translateAutomator.onUpdateDownloaded(({ version }) => {
        get().setDownloaded(version);
      }),
      window.translateAutomator.onUpdateError(({ message }) => {
        get().setError(message);
      }),
    ];
    return () => {
      offs.forEach((off) => off());
    };
  }, []);
}
