import { ImportButton } from "./ImportButton";
import { ExportButton } from "./ExportButton";
import { TranslateButton } from "./TranslateButton";
import { SourceEditor } from "./SourceEditor";
import { ResultViewer } from "./ResultViewer";

export function TranslateView() {
  return (
    <div className="flex h-full flex-col">
      <main className="grid flex-1 grid-cols-2 gap-3 overflow-hidden p-3">
        <section className="flex flex-col gap-2 overflow-hidden">
          <div className="flex items-center gap-2">
            <ImportButton />
          </div>
          <div className="flex-1 overflow-hidden">
            <SourceEditor />
          </div>
        </section>

        <section className="flex flex-col gap-2 overflow-hidden">
          <div className="h-8" />
          <div className="flex-1 overflow-hidden">
            <ResultViewer />
          </div>
        </section>
      </main>

      <footer className="flex items-center justify-center gap-4 border-t border-slate-200 bg-white px-4 py-3">
        <TranslateButton />
        <ExportButton />
      </footer>
    </div>
  );
}
