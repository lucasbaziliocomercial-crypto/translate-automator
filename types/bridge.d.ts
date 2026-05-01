import type { TranslateAutomatorBridge } from "../electron/preload";

declare global {
  interface Window {
    translateAutomator: TranslateAutomatorBridge;
  }
}

export {};
