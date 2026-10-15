import {
  CompiledDictionary,
  compileDictionary,
  translateText,
  zhDictionaryValidator,
} from "./dictionary";

// Runtime zh-CN translation of the rendered UI. Text nodes and a few
// attributes are swapped for their dictionary translation right after React
// writes them (MutationObserver callbacks run before the next paint), so the
// source stays untouched and upstream merges stay trivial.

export const DICTIONARY_URL = "/zh/dict.zh-CN.json";
const LANG_STORAGE_KEY = "gb-ui-lang";

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

export function createUiTranslator(
  dict: CompiledDictionary,
  root: Node,
): UiTranslator {
  // Values this translator wrote, so its own mutations are not processed again
  const written = new WeakMap<Node, string>();
  const writtenAttrs = new WeakMap<Element, Map<string, string>>();
  const cache = new Map<string, string | null>();

  function lookup(raw: string): string | null {
    const cached = cache.get(raw);
    if (cached !== undefined) return cached;
    const out = translateText(raw, dict);
    if (cache.size > 20000) cache.clear();
    cache.set(raw, out);
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

let started = false;

export async function startUiTranslation(): Promise<void> {
  if (typeof window === "undefined" || started) return;
  if (readLangPreference() !== "zh") return;
  started = true;

  const res = await fetch(DICTIONARY_URL, { cache: "no-cache" });
  if (!res.ok) throw new Error(`zh-CN dictionary: HTTP ${res.status}`);
  const dict = zhDictionaryValidator.parse(await res.json());

  document.documentElement.lang = "zh-CN";
  createUiTranslator(compileDictionary(dict), document.documentElement).start();
}
