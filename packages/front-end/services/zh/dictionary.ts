import { z } from "zod";

// zh-CN UI dictionary, served from public/zh/dict.zh-CN.json.
// Keys are English UI strings extracted by scripts/zh/extract-ui-strings.mjs;
// patterns use {0}, {1}, … for the values that vary, e.g. "{0} experiments".
export const zhDictionaryValidator = z.object({
  strings: z.record(z.string(), z.string()),
  patterns: z.record(z.string(), z.string()),
});

export type ZhDictionary = z.infer<typeof zhDictionaryValidator>;

type CompiledPattern = {
  re: RegExp;
  template: string;
  // placeholder number for each capture group, in capture order
  order: number[];
  // capture groups glued to a word, e.g. field{1}: an English plural suffix
  // ("s", "es" or empty) is dropped, any other value is kept
  suffix: boolean[];
  literalLength: number;
};

const PLURAL_SUFFIX = /^(s|es)?$/i;

export type CompiledDictionary = {
  strings: Map<string, string>;
  patterns: CompiledPattern[];
};

const PLACEHOLDER = /^\{\d+\}$/;

// Must match normalize() in scripts/zh/extract-ui-strings.mjs
// (\s includes the non-breaking space)
export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function compileDictionary(dict: ZhDictionary): CompiledDictionary {
  const strings = new Map<string, string>();
  for (const [en, zh] of Object.entries(dict.strings)) {
    const key = normalizeText(en);
    if (key && zh) strings.set(key, zh);
  }

  const patterns: CompiledPattern[] = [];
  for (const [en, zh] of Object.entries(dict.patterns)) {
    if (!zh) continue;
    const parts = normalizeText(en)
      .split(/(\{\d+\})/)
      .filter((part) => part !== "");
    const order: number[] = [];
    const suffix: boolean[] = [];
    const source = parts
      .map((part, i) => {
        if (!PLACEHOLDER.test(part)) return escapeRegExp(part);
        const glued = i > 0 && /[A-Za-z]$/.test(parts[i - 1]);
        order.push(Number(part.slice(1, -1)));
        suffix.push(glued);
        return glued ? "(.*?)" : "(.+?)";
      })
      .join("");
    const literalLength = parts
      .filter((part) => !PLACEHOLDER.test(part))
      .join("").length;
    if (!order.length || literalLength < 2) continue;
    patterns.push({
      re: new RegExp(`^${source}$`),
      template: zh,
      order,
      suffix,
      literalLength,
    });
  }
  // The most specific pattern wins
  patterns.sort((a, b) => b.literalLength - a.literalLength);

  return { strings, patterns };
}

// Translate one piece of UI text, keeping its surrounding whitespace.
// Returns null when there is nothing to translate.
export function translateText(
  raw: string,
  dict: CompiledDictionary,
): string | null {
  const key = normalizeText(raw);
  if (!key || !/[A-Za-z]/.test(key)) return null;

  const lead = raw.match(/^\s*/)?.[0] ?? "";
  const trail = raw.slice(lead.length).match(/\s*$/)?.[0] ?? "";

  const exact = dict.strings.get(key);
  if (exact !== undefined) return lead + exact + trail;

  if (key.length > 300) return null;
  for (const { re, template, order, suffix } of dict.patterns) {
    const match = re.exec(key);
    if (!match) continue;
    let out = template;
    order.forEach((n, i) => {
      const value = match[i + 1];
      const fill = suffix[i] && PLURAL_SUFFIX.test(value) ? "" : value;
      out = out.split(`{${n}}`).join(fill);
    });
    return lead + out + trail;
  }
  return null;
}
