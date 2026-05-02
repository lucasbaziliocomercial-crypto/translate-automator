import * as Dialog from "@radix-ui/react-dialog";
import { Settings, X } from "lucide-react";
import { useState } from "react";
import { ClaudeSetupCard } from "./ClaudeSetupCard";
import { Button } from "./Button";

export function SettingsDialog() {
  const [open, setOpen] = useState(false);

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
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
