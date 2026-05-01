import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "./Button";
import { useTranslation } from "@/store/translation";
import { markdownToRichHtml, markdownToPlainText } from "@/lib/format-html";

interface Props {
  partNumber: number;
}

export function CopyPartButton({ partNumber }: Props) {
  const partResults = useTranslation((s) => s.partResults);
  const setError = useTranslation((s) => s.setError);
  const [copied, setCopied] = useState(false);

  const partContent = partResults[partNumber];
  const disabled = !partContent || partContent.trim().length === 0;

  const handleClick = async () => {
    if (disabled || !partContent) return;
    const html = markdownToRichHtml(partContent);
    const text = markdownToPlainText(partContent);
    const r = await window.translateAutomator.writeClipboardHtml({ html, text });
    if (!r.ok) {
      setError(r.reason ?? "Falha ao copiar.");
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled}
      variant={copied ? "primary" : "outline"}
      size="sm"
      title={
        disabled
          ? `Parte ${partNumber} ainda não foi traduzida.`
          : `Copia a Parte ${partNumber} formatada (cole no Google Docs).`
      }
    >
      {copied ? (
        <>
          <Check className="size-3.5" />
          Copiado!
        </>
      ) : (
        <>
          <Copy className="size-3.5" />
          Copiar Parte {partNumber}
        </>
      )}
    </Button>
  );
}
