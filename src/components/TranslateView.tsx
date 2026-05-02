import { useMemo } from "react";
import { Search } from "lucide-react";
import { useTranslation, joinPartResults } from "@/store/translation";
import { useFindBar } from "@/lib/use-find-bar";
import { Button } from "./Button";
import { ImportButton } from "./ImportButton";
import { ExportButton } from "./ExportButton";
import { TranslateButton } from "./TranslateButton";
import { SourceEditor } from "./SourceEditor";
import { ResultViewer } from "./ResultViewer";

export function TranslateView() {
  const source = useTranslation((s) => s.source);
  const partResults = useTranslation((s) => s.partResults);
  const result = useMemo(() => joinPartResults(partResults), [partResults]);

  const sourceFind = useFindBar(source);
  const resultFind = useFindBar(result);

  return (
    <div className="flex h-full flex-col">
      <main className="grid flex-1 grid-cols-2 gap-3 overflow-hidden p-3">
        <section className="flex flex-col gap-2 overflow-hidden">
          <div className="flex items-center gap-2">
            <ImportButton />
            <Button
              onClick={() => sourceFind.open()}
              variant="outline"
              size="sm"
              title="Pesquisar no roteiro original"
            >
              <Search className="size-4" />
              Pesquisar
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <SourceEditor find={sourceFind} />
          </div>
        </section>

        <section className="flex flex-col gap-2 overflow-hidden">
          <div className="flex h-8 items-center gap-2">
            <Button
              onClick={() => resultFind.open()}
              variant="outline"
              size="sm"
              title="Pesquisar na tradução"
            >
              <Search className="size-4" />
              Pesquisar
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ResultViewer find={resultFind} />
          </div>
        </section>
      </main>

      <footer className="flex items-center justify-center gap-6 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <TranslateButton />
        <ExportButton />
      </footer>
    </div>
  );
}
