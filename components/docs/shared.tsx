import { useState, useMemo } from "react";

export function Badge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    POST: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    PUT: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    PATCH: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    DELETE: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold font-mono ${colors[method] ?? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}>
      {method}
    </span>
  );
}

export function Code({ children }: { children: string }) {
  const highlighted = useMemo(() => highlight(children), [children]);
  return (
    <pre className="mt-2 overflow-x-auto rounded-lg bg-[#1e1e1e] p-4 text-sm leading-relaxed border border-[#3c3c3c] text-[#d4d4d4]">
      <code dangerouslySetInnerHTML={{ __html: highlighted }} />
    </pre>
  );
}

// ─── Tokenizer ────────────────────────────────────────────────────────────────
function highlight(code: string): string {
  return code
    .split("\n")
    .map((line) => {
      // Full-line comment
      if (line.trimStart().startsWith("//")) {
        return `<span style="color:#6a9955">${esc(line)}</span>`;
      }

      // Split off trailing inline comment
      const ci = findInlineComment(line);
      const main = ci >= 0 ? line.slice(0, ci) : line;
      const comment = ci >= 0 ? line.slice(ci) : "";

      return (
        tokenizeLine(main) +
        (comment ? `<span style="color:#6a9955">${esc(comment)}</span>` : "")
      );
    })
    .join("\n");
}

// Find // not inside a string
function findInlineComment(line: string): number {
  let inStr = false;
  let strChar = "";
  for (let i = 0; i < line.length - 1; i++) {
    const ch = line[i];
    if (!inStr && (ch === '"' || ch === "'")) { inStr = true; strChar = ch; continue; }
    if (inStr && ch === strChar && line[i - 1] !== "\\") { inStr = false; continue; }
    if (!inStr && ch === "/" && line[i + 1] === "/") return i;
  }
  return -1;
}

// Token regex: quoted strings | booleans/null | numbers
const TOKEN_RE = /("(?:[^"\\]|\\.)*")|(\b(?:true|false|null)\b)|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)/g;

function tokenizeLine(line: string): string {
  let result = "";
  let last = 0;
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = TOKEN_RE.exec(line)) !== null) {
    // plain text before this token
    if (m.index > last) {
      result += colorPlain(line.slice(last, m.index));
    }
    last = m.index + m[0].length;

    if (m[1]) {
      // string — key if followed by ":"
      const after = line.slice(last).trimStart();
      const color = after.startsWith(":") ? "#9cdcfe" : "#ce9178";
      result += `<span style="color:${color}">${esc(m[1])}</span>`;
    } else if (m[2]) {
      result += `<span style="color:#569cd6">${esc(m[2])}</span>`;
    } else if (m[3]) {
      result += `<span style="color:#b5cea8">${esc(m[3])}</span>`;
    }
  }

  if (last < line.length) {
    result += colorPlain(line.slice(last));
  }
  return result;
}

// Color plain (non-token) text — punctuation gets a subtle tint, rest is default fg
function colorPlain(s: string): string {
  if (!s) return "";
  // Split on punctuation chars to color them separately
  return s
    .split(/([{}[\],:])/)
    .map((part) => {
      if (!part) return "";
      if (/^[{}[\],:]$/.test(part)) {
        return `<span style="color:#d4d4d4">${esc(part)}</span>`;
      }
      // Everything else: plain text — use a visible light color
      return `<span style="color:#d4d4d4">${esc(part)}</span>`;
    })
    .join("");
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">{children}</h2>;
}

export function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 mt-6 text-base font-semibold text-gray-700 dark:text-gray-200">{children}</h3>;
}

export function FlowStep({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4 mb-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold dark:bg-blue-500">
        {num}
      </div>
      <div>
        <p className="font-semibold text-gray-800 dark:text-gray-100">{title}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

export function Endpoint({
  method,
  path,
  desc,
  auth = true,
  params,
  body,
  response,
}: {
  method: string;
  path: string;
  desc: string;
  auth?: boolean;
  params?: string;
  body?: string;
  response?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3 rounded-xl border border-gray-200 bg-white overflow-hidden dark:border-gray-700 dark:bg-gray-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors dark:hover:bg-gray-700/50"
      >
        <Badge method={method} />
        <code className="flex-1 text-sm font-mono text-gray-800 dark:text-gray-200">{path}</code>
        {!auth && (
          <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
            Public
          </span>
        )}
        <span className="text-gray-400 dark:text-gray-500 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
          <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
          {params && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1 dark:text-gray-400">Query Params</p>
              <Code>{params}</Code>
            </div>
          )}
          {body && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1 dark:text-gray-400">Request Body</p>
              <Code>{body}</Code>
            </div>
          )}
          {response && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1 dark:text-gray-400">Response</p>
              <Code>{response}</Code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
