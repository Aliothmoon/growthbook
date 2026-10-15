#!/usr/bin/env node
// Extract user-visible UI strings from the front-end source for the zh-CN dictionary.
//
// Usage: node scripts/zh/extract-ui-strings.mjs [outDir]   (default: <tmp>/growthbook-zh/extract)
//   writes <outDir>/strings.json  [{ s, files }]  exact UI strings
//          <outDir>/patterns.json [{ p, files }]  template strings, "{0} experiments"
//
// The enterprise directory is skipped: it is under the GrowthBook Enterprise
// License and is not modified or translated in this fork.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const frontEnd = path.join(root, "packages/front-end");
const ts = createRequire(path.join(frontEnd, "package.json"))("typescript");

const outDir = path.resolve(
  process.argv[2] ?? path.join(os.tmpdir(), "growthbook-zh/extract"),
);

const SOURCE_DIRS = [
  "components",
  "pages",
  "ui",
  "hooks",
  "services",
  "contexts",
  "utils",
];
const SKIP_PATH = [
  /[\\/]enterprise[\\/]/,
  /[\\/]test[\\/]/,
  /\.test\.tsx?$/,
  /\.stories\.tsx?$/,
  /[\\/]pages[\\/]api[\\/]/,
  /[\\/]pages[\\/]design-system[\\/]/,
  /[\\/]services[\\/]zh[\\/]/,
];

// JSX attributes that never hold UI copy
const NON_UI_ATTRS = new Set([
  "className",
  "containerClassName",
  "labelClassName",
  "size",
  "color",
  "align",
  "as",
  "status",
  "weight",
  "variant",
  "direction",
  "type",
  "justify",
  "value",
  "radius",
  "language",
  "href",
  "name",
  "wrap",
  "id",
  "field",
  "commercialFeature",
  "target",
  "key",
  "trackingEventModalType",
  "menuPlacement",
  "role",
  "source",
  "rel",
  "stroke",
  "display",
  "docSection",
  "fill",
  "width",
  "height",
  "filter",
  "tipPosition",
  "d",
  "htmlFor",
  "side",
  "maxWidth",
  "minWidth",
  "maxHeight",
  "minHeight",
  "strokeLinecap",
  "resourceType",
  "xmlns",
  "strokeLinejoin",
  "autoComplete",
  "step",
  "precision",
  "fontStyle",
  "src",
  "whiteSpace",
  "position",
  "style",
  "mode",
  "icon",
  "iconPosition",
  "trigger",
  "highContrast",
  "gap",
  "pattern",
  "inputMode",
  "form",
  "method",
  "action",
  "viewBox",
  "transform",
  "fontWeight",
  "textAlign",
  "overflow",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "loading",
  "sizes",
  "accept",
  "dir",
  "lang",
  "encType",
  "scope",
  "headers",
  "colSpan",
  "rowSpan",
  "tabIndex",
  "testId",
  "dataTestId",
  "trackingId",
  "event",
  "eventName",
  "activeClassName",
  "path",
  "route",
  "cacheKey",
  "storageKey",
  "localStorageKey",
  "query",
  "sql",
  "format",
  "dateFormat",
  "timeFormat",
  "orientation",
  "theme",
  "appearance",
  "font",
  "fontSize",
  "fontFamily",
  "anchor",
  "placement",
  "openOn",
  "zIndex",
  "inputClassName",
  "wrapperClassName",
  "bodyClassName",
  "headerClassName",
  "footerClassName",
  "triggerClassName",
  "itemClassName",
]);
const isNonUiAttr = (name) =>
  NON_UI_ATTRS.has(name) ||
  /^(data-|on[A-Z])/.test(name) ||
  /(ClassName|Class|Style|Id|Key|Url|Href|Path|Color|Size|Width|Height|Variant)$/.test(
    name,
  ) ||
  /^(m|p)[trblxy]?$/.test(name);

// Object properties whose string values are UI copy, e.g. { label: "Last 7 days" }
const UI_PROPS = new Set([
  "label",
  "title",
  "description",
  "placeholder",
  "text",
  "header",
  "heading",
  "helpText",
  "tooltip",
  "message",
  "cta",
  "ctaText",
  "buttonText",
  "submitText",
  "confirmText",
  "cancelText",
  "emptyText",
  "emptyMessage",
  "subtitle",
  "subTitle",
  "caption",
  "hint",
  "displayName",
  "tabLabel",
  "sectionTitle",
  "body",
  "content",
  "closeCta",
  "yesText",
  "noText",
  "summary",
  "details",
  "warning",
  "error",
  "successMessage",
  "errorMessage",
  "loadingText",
  "labelText",
  "shortLabel",
  "longLabel",
  "info",
  "note",
  "prompt",
]);

// Calls whose string arguments are shown to the user
const UI_CALLS = new Set([
  "setError",
  "setErrorMessage",
  "setWarning",
  "setSuccess",
  "alert",
  "confirm",
]);

const decodeEntities = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&apos;|&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&times;/g, "×")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

// Same normalization as services/zh/dictionary.ts normalizeText
const normalize = (s) => s.replace(/\s+/g, " ").trim(); // \s includes nbsp

// Heuristic: does this string look like UI copy rather than an identifier, URL or code?
function looksLikeCopy(s, fromJsxText) {
  if (s.length < 2 || s.length > 500) return false;
  if (!/[A-Za-z]/.test(s)) return false;
  if (/^(https?:|mailto:|\/|#|\.|\{|\[|<)/.test(s)) return false;
  if (/^[\w.-]+@[\w.-]+$/.test(s)) return false; // email
  if (/^[a-f0-9-]{8,}$/i.test(s)) return false; // ids / hashes
  if (/^[A-Za-z_]\w*(\.\w+)+$/.test(s)) return false; // property paths, file names
  if (
    /^((auto|none|\d*\.?\d+(px|fr|%|rem|em|vh|vw)?|min-content|max-content)\s*)+$/i.test(
      s,
    )
  )
    return false; // CSS values
  if (/[{}<>;=]|=>|\$\{/.test(s) && !fromJsxText) return false; // code-ish
  if (fromJsxText) return true;
  if (/\s/.test(s)) return true; // phrases
  // single token: keep capitalized words like "Save", "Experiments"
  if (/^[A-Z][a-z]+[.!?:]?$/.test(s)) return true;
  if (/^[A-Z][a-z]+(?: [A-Z][a-z]+)*$/.test(s)) return true;
  return false;
}

const strings = new Map(); // text -> Set(files)
const patterns = new Map();

function add(map, text, file) {
  if (!map.has(text)) map.set(text, new Set());
  const files = map.get(text);
  if (files.size < 3) files.add(file);
}

function addString(raw, file, fromJsxText = false) {
  const s = normalize(decodeEntities(raw));
  if (looksLikeCopy(s, fromJsxText)) add(strings, s, file);
}

function addTemplate(node, file) {
  // `${n} experiments` -> "{0} experiments"
  let text = node.head.text;
  node.templateSpans.forEach((span, i) => {
    text += `{${i}}` + span.literal.text;
  });
  const p = normalize(decodeEntities(text));
  const literalPart = p.replace(/\{\d+\}/g, "").trim();
  if (
    literalPart.length >= 2 &&
    /[A-Za-z]{2}/.test(literalPart) &&
    !/[<>;=]|=>/.test(literalPart)
  ) {
    add(patterns, p, file);
  }
}

function propName(node) {
  if (!node) return null;
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text;
  return null;
}

function calleeName(expr) {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  return null;
}

// Is this string/template node in a position where it is rendered or shown?
function uiContext(node) {
  let child = node;
  let parent = node.parent;
  // climb through wrappers that pass the value through
  while (
    parent &&
    (ts.isParenthesizedExpression(parent) ||
      ts.isConditionalExpression(parent) ||
      (ts.isBinaryExpression(parent) &&
        [
          ts.SyntaxKind.BarBarToken,
          ts.SyntaxKind.QuestionQuestionToken,
          ts.SyntaxKind.AmpersandAmpersandToken,
        ].includes(parent.operatorToken.kind) &&
        parent.right === child) ||
      ts.isAsExpression(parent) ||
      ts.isArrayLiteralExpression(parent))
  ) {
    if (ts.isConditionalExpression(parent) && parent.condition === child)
      return false;
    child = parent;
    parent = parent.parent;
  }
  if (!parent) return false;
  if (ts.isJsxExpression(parent)) {
    const holder = parent.parent;
    if (ts.isJsxAttribute(holder)) return !isNonUiAttr(holder.name.getText());
    return ts.isJsxElement(holder) || ts.isJsxFragment(holder);
  }
  if (ts.isJsxAttribute(parent)) return !isNonUiAttr(parent.name.getText());
  if (ts.isPropertyAssignment(parent) && parent.initializer === child) {
    return UI_PROPS.has(propName(parent.name));
  }
  if (ts.isCallExpression(parent) || ts.isNewExpression(parent)) {
    const name = calleeName(parent.expression);
    return name !== null && (UI_CALLS.has(name) || name === "Error");
  }
  if (ts.isReturnStatement(parent)) {
    // return "Some label" inside a function whose name suggests a label
    let fn = parent.parent;
    while (fn && !ts.isFunctionLike(fn)) fn = fn.parent;
    const fnName = fn && fn.name ? fn.name.getText() : "";
    return /(Label|Title|Text|Message|Description|Name|Copy)$/i.test(fnName);
  }
  return false;
}

function visit(node, file) {
  if (ts.isJsxText(node)) {
    addString(node.text, file, true);
  } else if (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node)
  ) {
    if (uiContext(node)) addString(node.text, file);
  } else if (ts.isTemplateExpression(node)) {
    if (uiContext(node)) addTemplate(node, file);
  }
  ts.forEachChild(node, (c) => visit(c, file));
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, files);
    } else if (
      /\.(tsx|ts)$/.test(entry.name) &&
      !entry.name.endsWith(".d.ts")
    ) {
      files.push(full);
    }
  }
  return files;
}

let fileCount = 0;
for (const dir of SOURCE_DIRS) {
  const abs = path.join(frontEnd, dir);
  if (!fs.existsSync(abs)) continue;
  for (const file of walk(abs)) {
    if (SKIP_PATH.some((re) => re.test(file))) continue;
    const text = fs.readFileSync(file, "utf8");
    const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sf = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      kind,
    );
    visit(sf, path.relative(frontEnd, file).replace(/\\/g, "/"));
    fileCount++;
  }
}

const toList = (map, key) =>
  [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([text, files]) => ({ [key]: text, files: [...files] }));

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "strings.json"),
  JSON.stringify(toList(strings, "s"), null, 1),
);
fs.writeFileSync(
  path.join(outDir, "patterns.json"),
  JSON.stringify(toList(patterns, "p"), null, 1),
);
console.log(
  `scanned ${fileCount} files: ${strings.size} strings, ${patterns.size} patterns -> ${outDir}`,
);
