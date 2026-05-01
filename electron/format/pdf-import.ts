import * as fs from "fs";
import pdfParse from "pdf-parse";

/**
 * Extrai o texto de um PDF e retorna markdown best-effort.
 * Heurística simples: cada linha vira um parágrafo se vier seguida de linha vazia.
 * PDFs não têm estrutura semântica garantida — qualidade depende muito do source.
 */
export async function importPdfToMarkdown(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return cleanup(data.text);
}

function cleanup(raw: string): string {
  const lines = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+$/g, ""));

  const out: string[] = [];
  let prevBlank = true;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      if (!prevBlank) out.push("");
      prevBlank = true;
      continue;
    }
    out.push(line);
    prevBlank = false;
  }
  return out.join("\n").trim() + "\n";
}
