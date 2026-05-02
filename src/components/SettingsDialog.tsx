import * as Dialog from "@radix-ui/react-dialog";
import { Settings, X, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./Button";
import { ClaudeSetupCard } from "./ClaudeSetupCard";

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    window.translateAutomator.getSettings().then((s) => {
      setHasGeminiKey(s.hasGeminiKey);
      setGeminiKey("");
    });
  }, [open]);

  const handleSave = async () => {
    if (geminiKey.trim().length === 0) return;
    await window.translateAutomator.setSettings({ geminiApiKey: geminiKey.trim() });
    setHasGeminiKey(true);
    setGeminiKey("");
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="size-4" />
          Configurações
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm dark:bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(90vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Configurações
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label="Fechar"
                className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-5">
            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                Conta Claude (Max 20x)
              </h3>
              <ClaudeSetupCard />
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                Google Gemini API key
              </h3>
              <p className="mb-2 text-xs text-slate-600 dark:text-slate-400">
                Necessária para usar o modelo Gemini 3 Pro. Obtenha em{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 underline dark:text-emerald-400"
                >
                  aistudio.google.com/apikey
                </a>
                . Salva criptografada no seu computador.
              </p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? "text" : "password"}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder={
                      hasGeminiKey
                        ? "•••••••••• (já salva — cole nova para substituir)"
                        : "AIza..."
                    }
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 pr-10 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    aria-label={showKey ? "Ocultar" : "Mostrar"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                  >
                    {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={geminiKey.trim().length === 0}
                >
                  Salvar
                </Button>
              </div>
              {hasGeminiKey && (
                <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
                  ✓ API key Gemini configurada.
                </p>
              )}
              {savedAt && (
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                  Salvo!
                </p>
              )}
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
