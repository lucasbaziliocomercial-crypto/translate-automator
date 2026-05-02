import { Fragment, type ReactNode } from "react";
import {
  detectMaleLeadName,
  findMmcParagraphLineRanges,
  isLineInRanges,
  isPovHeader,
} from "./highlight-mmc";
import {
  PART_HEADER_RE,
  CHAPTER_HEADER_RE,
  DIVIDER_RE,
  END_OF_PART_RE,
} from "./format-html";
import { escapeRegex } from "./find-utils";
import { cn } from "./cn";

interface RenderOptions {
  highlightMmc?: boolean;
  maleLeadName?: string | null;
  skipPartHeader?: boolean;
  showCursor?: boolean;
}

interface SearchCtx {
  searchRe: RegExp;
  counter: { value: number };
  currentIdx: number;
}

const ARIAL_STACK = `Arial, "Helvetica Neue", Helvetica, sans-serif`;

const StreamingCursor = () => (
  <span
    aria-hidden
    className="ml-0.5 inline-block w-[0.5ch] animate-pulse text-emerald-600 dark:text-emerald-400"
  >
    ▍
  </span>
);

function wrapMatchesInString(
  s: string,
  ctx: SearchCtx,
  keyPrefix: string,
): ReactNode[] {
  const out: ReactNode[] = [];
  const re = ctx.searchRe;
  re.lastIndex = 0;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const idx = ctx.counter.value++;
    const isCurrent = idx === ctx.currentIdx;
    out.push(
      <mark
        key={`${keyPrefix}-mk-${k++}`}
        data-search-match-index={idx}
        className={cn(
          "rounded-sm px-0.5",
          isCurrent
            ? "bg-orange-400 text-slate-900 ring-2 ring-orange-500 dark:bg-orange-500 dark:text-slate-50"
            : "bg-yellow-200 text-slate-900 dark:bg-yellow-700 dark:text-yellow-50",
        )}
      >
        {m[0]}
      </mark>,
    );
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

function pushText(
  target: ReactNode[],
  text: string,
  ctx: SearchCtx | null,
  keyPrefix: string,
) {
  if (!ctx) {
    if (text.length > 0) target.push(text);
    return;
  }
  for (const node of wrapMatchesInString(text, ctx, keyPrefix)) target.push(node);
}

function renderInline(
  line: string,
  keyPrefix: string,
  ctx: SearchCtx | null,
): ReactNode {
  if (line.length === 0) return " ";
  const tokens: ReactNode[] = [];
  const re = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|==[^=]+?==)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) {
      pushText(tokens, line.slice(last, m.index), ctx, `${keyPrefix}-t${key}`);
    }
    const match = m[0];
    if (match.startsWith("***")) {
      const inner = match.slice(3, -3);
      const innerKey = `${keyPrefix}-${key++}`;
      const innerNodes: ReactNode[] = [];
      pushText(innerNodes, inner, ctx, `${innerKey}-i`);
      tokens.push(
        <strong key={innerKey}>
          <em>{innerNodes}</em>
        </strong>,
      );
    } else if (match.startsWith("**")) {
      const inner = match.slice(2, -2);
      const innerKey = `${keyPrefix}-${key++}`;
      const innerNodes: ReactNode[] = [];
      pushText(innerNodes, inner, ctx, `${innerKey}-i`);
      tokens.push(<strong key={innerKey}>{innerNodes}</strong>);
    } else if (match.startsWith("==")) {
      const inner = match.slice(2, -2);
      const innerKey = `${keyPrefix}-${key++}`;
      const innerNodes: ReactNode[] = [];
      pushText(innerNodes, inner, ctx, `${innerKey}-i`);
      tokens.push(
        <span
          key={innerKey}
          className="rounded-sm bg-spicy px-0.5 text-slate-900 dark:bg-spicyDark dark:text-rose-50"
        >
          {innerNodes}
        </span>,
      );
    } else {
      const inner = match.slice(1, -1);
      const innerKey = `${keyPrefix}-${key++}`;
      const innerNodes: ReactNode[] = [];
      pushText(innerNodes, inner, ctx, `${innerKey}-i`);
      tokens.push(<em key={innerKey}>{innerNodes}</em>);
    }
    last = m.index + match.length;
  }
  if (last < line.length) {
    pushText(tokens, line.slice(last), ctx, `${keyPrefix}-t${key}`);
  }
  return <Fragment>{tokens}</Fragment>;
}

function renderPlainWithSearch(
  text: string,
  ctx: SearchCtx | null,
  keyPrefix: string,
): ReactNode {
  if (!ctx) return text;
  return <Fragment>{wrapMatchesInString(text, ctx, keyPrefix)}</Fragment>;
}

interface RichRendererProps {
  markdown: string;
  options?: RenderOptions;
  searchQuery?: string;
  searchCaseSensitive?: boolean;
  currentMatchIndex?: number;
}

export function RichRenderer({
  markdown,
  options,
  searchQuery,
  searchCaseSensitive,
  currentMatchIndex,
}: RichRendererProps) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const skipPartHeader = options?.skipPartHeader ?? true;
  const highlightMmc = options?.highlightMmc ?? true;
  const showCursor = options?.showCursor ?? false;
  const maleLead =
    options?.maleLeadName !== undefined
      ? options.maleLeadName
      : highlightMmc
        ? detectMaleLeadName(markdown)
        : null;
  const mmcRanges = maleLead ? findMmcParagraphLineRanges(lines, maleLead) : [];

  const trimmedQuery = searchQuery?.trim() ?? "";
  const ctx: SearchCtx | null =
    trimmedQuery.length > 0
      ? {
          searchRe: new RegExp(
            escapeRegex(trimmedQuery),
            searchCaseSensitive ? "g" : "gi",
          ),
          counter: { value: 0 },
          currentIdx: currentMatchIndex ?? -1,
        }
      : null;

  let lastRenderableIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i].trim();
    if (t.length === 0) continue;
    if (skipPartHeader && PART_HEADER_RE.test(t)) continue;
    lastRenderableIdx = i;
    break;
  }

  const blocks: ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === "") continue;

    const isMmc = isLineInRanges(i, mmcRanges);
    const cursor = showCursor && i === lastRenderableIdx ? <StreamingCursor /> : null;
    const key = `b-${i}`;

    if (PART_HEADER_RE.test(trimmed)) {
      if (skipPartHeader) continue;
      const cleaned = trimmed.replace(/^#+\s*/, "").replace(/\*+/g, "").trim();
      blocks.push(
        <h1
          key={key}
          className="mb-2 mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100"
        >
          {renderPlainWithSearch(cleaned, ctx, key)}
          {cursor}
        </h1>,
      );
      continue;
    }

    if (CHAPTER_HEADER_RE.test(trimmed)) {
      const cleaned = trimmed.replace(/^#+\s*/, "").replace(/\*+/g, "").trim();
      blocks.push(
        <h1
          key={key}
          className="mb-2 mt-6 text-[20pt] font-bold leading-tight text-slate-900 dark:text-slate-100"
        >
          {renderPlainWithSearch(cleaned, ctx, key)}
          {cursor}
        </h1>,
      );
      continue;
    }

    const pov = isPovHeader(trimmed);
    if (pov.isPov) {
      blocks.push(
        <h2
          key={key}
          className="mb-1 mt-5 text-[14pt] font-bold capitalize leading-tight text-slate-900 dark:text-slate-100"
        >
          ✦ {renderPlainWithSearch(pov.name, ctx, key)}
          {cursor}
        </h2>,
      );
      continue;
    }

    if (DIVIDER_RE.test(trimmed)) {
      blocks.push(
        <p
          key={key}
          className="my-5 text-center tracking-[0.3em] text-slate-400 dark:text-slate-600"
        >
          ________________
          {cursor}
        </p>,
      );
      continue;
    }

    if (END_OF_PART_RE.test(trimmed)) {
      const cleaned = trimmed.replace(/\*+/g, "").trim();
      blocks.push(
        <p
          key={key}
          className="my-6 text-center text-[11pt] font-bold italic text-slate-700 dark:text-slate-300"
        >
          {renderPlainWithSearch(cleaned, ctx, key)}
          {cursor}
        </p>,
      );
      continue;
    }

    const h1 = trimmed.match(/^#\s+(.+)$/);
    const h2 = trimmed.match(/^##\s+(.+)$/);
    const h3 = trimmed.match(/^###\s+(.+)$/);
    const li = trimmed.match(/^[-*]\s+(.+)$/);
    const ol = trimmed.match(/^\d+\.\s+(.+)$/);

    if (h1) {
      blocks.push(
        <h1
          key={key}
          className="mb-2 mt-6 text-[20pt] font-bold leading-tight text-slate-900 dark:text-slate-100"
        >
          {renderInline(h1[1], key, ctx)}
          {cursor}
        </h1>,
      );
      continue;
    }
    if (h2) {
      blocks.push(
        <h2
          key={key}
          className="mb-1 mt-5 text-[16pt] font-bold leading-tight text-slate-900 dark:text-slate-100"
        >
          {renderInline(h2[1], key, ctx)}
          {cursor}
        </h2>,
      );
      continue;
    }
    if (h3) {
      blocks.push(
        <h3
          key={key}
          className="mb-1 mt-4 text-[14pt] font-bold leading-tight text-slate-900 dark:text-slate-100"
        >
          {renderInline(h3[1], key, ctx)}
          {cursor}
        </h3>,
      );
      continue;
    }
    if (li || ol) {
      const inner = renderInline((li ?? ol)![1], key, ctx);
      const wrapped = isMmc ? (
        <span className="rounded-sm bg-mmcGreen px-1 dark:bg-mmcGreenDark">{inner}</span>
      ) : (
        inner
      );
      blocks.push(
        <li key={key} className="ml-6 list-disc text-slate-800 dark:text-slate-200">
          {wrapped}
          {cursor}
        </li>,
      );
      continue;
    }

    const inner = renderInline(line, key, ctx);
    if (isMmc) {
      blocks.push(
        <p
          key={key}
          className="mb-3 rounded-sm bg-mmcGreen px-1 text-slate-900 dark:bg-mmcGreenDark dark:text-emerald-50"
        >
          {inner}
          {cursor}
        </p>,
      );
    } else {
      blocks.push(
        <p key={key} className="mb-3 text-slate-800 dark:text-slate-200">
          {inner}
          {cursor}
        </p>,
      );
    }
  }

  return (
    <div
      className="text-[15px] leading-[1.65]"
      style={{ fontFamily: ARIAL_STACK }}
    >
      {blocks}
    </div>
  );
}
