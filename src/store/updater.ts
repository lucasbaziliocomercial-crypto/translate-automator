import { create } from "zustand";

// Estado canônico do auto-updater. Único source of truth para evitar que
// StatusBar e UpdateButton mostrem estados conflitantes (banner verde
// "reinicie para atualizar" + ícone amarelo de erro ao mesmo tempo, que
// é o sintoma quando o download falha no Mac sem code-signing).
export type UpdaterState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "up-to-date"; currentVersion: string }
  | { kind: "downloading"; version: string; percent: number }
  | { kind: "downloaded"; version: string }
  | { kind: "error"; message: string; failedVersion?: string }
  | { kind: "dev-disabled" };

interface UpdaterStore {
  state: UpdaterState;
  // Última versão conhecida via update-available — guardada para que um
  // erro subsequente saiba qual versão tentou baixar (usado no botão
  // "Baixar v{X} manualmente").
  lastAnnouncedVersion: string | null;

  setChecking: () => void;
  setDownloading: (version: string, percent: number) => void;
  setProgress: (percent: number) => void;
  setDownloaded: (version: string) => void;
  setError: (message: string) => void;
  setUpToDate: (currentVersion: string) => void;
  setDevDisabled: () => void;
  setIdle: () => void;
}

export const useUpdater = create<UpdaterStore>((set, get) => ({
  state: { kind: "idle" },
  lastAnnouncedVersion: null,

  setChecking: () => set({ state: { kind: "checking" } }),

  setDownloading: (version, percent) =>
    set({
      state: { kind: "downloading", version, percent },
      lastAnnouncedVersion: version,
    }),

  setProgress: (percent) => {
    const cur = get().state;
    if (cur.kind !== "downloading") return;
    set({ state: { ...cur, percent } });
  },

  setDownloaded: (version) =>
    set({
      state: { kind: "downloaded", version },
      lastAnnouncedVersion: version,
    }),

  setError: (message) => {
    const failedVersion = get().lastAnnouncedVersion ?? undefined;
    set({ state: { kind: "error", message, failedVersion } });
  },

  setUpToDate: (currentVersion) =>
    set({ state: { kind: "up-to-date", currentVersion } }),

  setDevDisabled: () => set({ state: { kind: "dev-disabled" } }),

  setIdle: () => set({ state: { kind: "idle" } }),
}));
