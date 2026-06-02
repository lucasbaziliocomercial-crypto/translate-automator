import { loadPersonalPromptAddendum } from "./personal-prompt";
import { loadSettings } from "./settings-store";

/**
 * Anexa o addendum native-english (`personal-prompt.md` em userData) ao system
 * prompt base quando o toggle `nativeEnglishEnabled` está ligado. Usado tanto pela
 * tradução quanto pela revisão, para que as preferências pessoais valham nos dois.
 */
export async function buildSystemPrompt(base: string): Promise<string> {
  const settings = loadSettings();
  if (!settings.nativeEnglishEnabled) return base;
  const addendum = await loadPersonalPromptAddendum();
  if (!addendum) return base;
  return `${base}\n\n---\n\n${addendum}`;
}
