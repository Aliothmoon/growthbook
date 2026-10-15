import {
  CompiledDictionary,
  compileDictionary,
  normalizeText,
  translateText,
  zhDictionaryValidator,
} from "./dictionary";

// Runtime zh-CN translation of the rendered UI. Text nodes and a few
// attributes are swapped for their dictionary translation right after React
// writes them (MutationObserver callbacks run before the next paint), so the
// source stays untouched and upstream merges stay trivial.

export const DICTIONARY_URL = "/zh/dict.zh-CN.json";
const LANG_STORAGE_KEY = "gb-ui-lang";
const DEBUG_STORAGE_KEY = "gb-ui-zh-debug";

// Code, editors and user-editable content are never translated.
// Add data-no-translate to any element whose text must stay as is.
const SKIP_SELECTOR = [
  "script",
  "style",
  "noscript",
  "code",
  "pre",
  "kbd",
  "samp",
  "textarea",
  "[contenteditable]",
  ".ace_editor",
  ".cm-editor",
  ".monaco-editor",
  "[data-no-translate]",
].join(",");

const ATTRIBUTES = ["placeholder", "title", "aria-label", "alt"];

export type UiTranslator = {
  start: () => void;
  stop: () => void;
  translateTree: (node: Node) => void;
};

export type UiTranslatorOptions = {
  // Called once per distinct text that contains Latin letters but has no translation
  onMiss?: (text: string) => void;
};

export function createUiTranslator(
  dict: CompiledDictionary,
  root: Node,
  { onMiss }: UiTranslatorOptions = {},
): UiTranslator {
  // Values this translator wrote, so its own mutations are not processed again
  const written = new WeakMap<Node, string>();
  const writtenAttrs = new WeakMap<Element, Map<string, string>>();
  const cache = new Map<string, string | null>();
  const reported = new Set<string>();

  function lookup(raw: string): string | null {
    const cached = cache.get(raw);
    if (cached !== undefined) return cached;
    const out = translateText(raw, dict);
    if (cache.size > 20000) cache.clear();
    cache.set(raw, out);
    if (out === null && onMiss) {
      const text = normalizeText(raw);
      if (/[A-Za-z]{2}/.test(text) && !reported.has(text)) {
        reported.add(text);
        onMiss(text);
      }
    }
    return out;
  }

  function isSkipped(el: Element | null): boolean {
    return el !== null && el.closest(SKIP_SELECTOR) !== null;
  }

  function translateTextNode(node: Text) {
    const value = node.nodeValue ?? "";
    if (written.get(node) === value) return;
    const out = lookup(value);
    if (out === null || out === value) return;
    written.set(node, out);
    node.nodeValue = out;
  }

  function setAttr(el: Element, name: string, value: string) {
    if (writtenAttrs.get(el)?.get(name) === value) return;
    const out = lookup(value);
    if (out === null || out === value) return;
    const map = writtenAttrs.get(el) ?? new Map<string, string>();
    map.set(name, out);
    writtenAttrs.set(el, map);
    el.setAttribute(name, out);
  }

  function translateAttributes(el: Element) {
    for (const name of ATTRIBUTES) {
      const value = el.getAttribute(name);
      if (value) setAttr(el, name, value);
    }
    if (
      el instanceof HTMLInputElement &&
      (el.type === "submit" || el.type === "button") &&
      el.value
    ) {
      setAttr(el, "value", el.value);
    }
  }

  function translateTree(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!isSkipped(node.parentElement)) translateTextNode(node as Text);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    if (isSkipped(el)) return;

    translateAttributes(el);
    const doc = el.ownerDocument;
    const walker = doc.createTreeWalker(
      el,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {
        acceptNode: (n) =>
          n.nodeType === Node.ELEMENT_NODE &&
          (n as Element).matches(SKIP_SELECTOR)
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT,
      },
    );
    for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
      if (n.nodeType === Node.TEXT_NODE) translateTextNode(n as Text);
      else translateAttributes(n as Element);
    }
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "childList") {
        record.addedNodes.forEach((n) => translateTree(n));
      } else if (record.type === "characterData") {
        translateTree(record.target);
      } else if (record.type === "attributes") {
        const el = record.target as Element;
        if (!isSkipped(el)) translateAttributes(el);
      }
    }
  });

  return {
    translateTree,
    start: () => {
      translateTree(root);
      observer.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: [...ATTRIBUTES, "value"],
      });
    },
    stop: () => observer.disconnect(),
  };
}

function readLangPreference(): string {
  try {
    // ?lang=en / ?lang=zh switches and remembers the UI language
    const fromQuery = new URLSearchParams(window.location.search).get("lang");
    if (fromQuery === "en" || fromQuery === "zh") {
      window.localStorage.setItem(LANG_STORAGE_KEY, fromQuery);
      return fromQuery;
    }
    return window.localStorage.getItem(LANG_STORAGE_KEY) ?? "zh";
  } catch {
    return "zh";
  }
}

// ?zhdebug=1 records the UI text that has no translation; run
// copy(__gbZhMissing()) in the browser console to export it. ?zhdebug=0 stops.
function readDebugPreference(): boolean {
  try {
    const fromQuery = new URLSearchParams(window.location.search).get(
      "zhdebug",
    );
    if (fromQuery === "1") window.localStorage.setItem(DEBUG_STORAGE_KEY, "1");
    if (fromQuery === "0") window.localStorage.removeItem(DEBUG_STORAGE_KEY);
    return window.localStorage.getItem(DEBUG_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

declare global {
  interface Window {
    __gbZhMissing?: () => string;
  }
}

function createMissCollector(): (text: string) => void {
  // text -> pages it was seen on
  const missing = new Map<string, Set<string>>();
  window.__gbZhMissing = () =>
    JSON.stringify(
      [...missing.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([s, pages]) => ({ s, pages: [...pages].slice(0, 3) })),
      null,
      1,
    );
  return (text) => {
    const pages = missing.get(text) ?? new Set<string>();
    pages.add(window.location.pathname);
    missing.set(text, pages);
  };
}

let started = false;

export async function startUiTranslation(): Promise<void> {
  if (typeof window === "undefined" || started) return;
  if (readLangPreference() !== "zh") return;
  started = true;

  const res = await fetch(DICTIONARY_URL, { cache: "no-cache" });
  if (!res.ok) throw new Error(`zh-CN dictionary: HTTP ${res.status}`);
  const dict = zhDictionaryValidator.parse(await res.json());

  document.documentElement.lang = "zh-CN";
  const onMiss = readDebugPreference() ? createMissCollector() : undefined;
  createUiTranslator(compileDictionary(dict), document.documentElement, {
    onMiss,
  }).start();
}
