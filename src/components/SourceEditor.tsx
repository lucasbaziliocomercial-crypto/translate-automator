import { useTranslation } from "@/store/translation";

export function SourceEditor() {
  const source = useTranslation((s) => s.source);
  const setSource = useTranslation((s) => s.setSource);
  const sourceName = useTranslation((s) => s.sourceName);
  const sourceFormat = useTranslation((s) => s.sourceFormat);

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="text-sm font-medium text-slate-700">
          Roteiro original (PT-BR)
        </div>
        <div className="text-xs text-slate-500">
          {sourceName ? (
            <>
              <span className="font-mono">{sourceName}</span>
              {sourceFormat && (
                <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 uppercase">
                  {sourceFormat}
                </span>
              )}
            </>
          ) : (
            "Importe um arquivo .docx ou .pdf"
          )}
        </div>
      </div>
      <textarea
        value={source}
        onChange={(e) => setSource(e.target.value)}
        spellCheck={false}
        placeholder="Conteúdo do roteiro aparecerá aqui após importar. Você pode editar antes de traduzir."
        className="flex-1 w-full p-4 font-mono text-sm leading-relaxed text-slate-800 focus:outline-none"
      />
    </div>
  );
}
