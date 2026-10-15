#!/usr/bin/env node
// zh-CN dictionary workflow helpers.
//
//   node scripts/zh/dict-tool.mjs chunks <extractDir> <workDir> [size]
//     Split the strings from extract-ui-strings.mjs that are not in the
//     dictionary yet into <workDir>/in/chunk-NNN.json for translation.
//     Translators write <workDir>/out/chunk-NNN.json: { "<i>": "<译文>" }.
//
//   node scripts/zh/dict-tool.mjs merge <workDir>
//     Validate every out/ chunk against its in/ chunk and merge the valid
//     translations into packages/front-end/public/zh/dict.zh-CN.json.
//     Rejected entries are listed in <workDir>/problems.json.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const DICT_PATH = path.join(
  root,
  "packages/front-end/public/zh/dict.zh-CN.json",
);

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const placeholderSet = (s) =>
  new Set([...s.matchAll(/\{\d+\}/g)].map((m) => m[0]));
// Placeholders glued to a word (field{1}) are usually English plural suffixes
// and may be left out of the translation; all others are required.
const requiredPlaceholders = (s) =>
  new Set([...s.matchAll(/(^|[^A-Za-z])(\{\d+\})/g)].map((m) => m[2]));

function placeholdersOk(en, zh) {
  const all = placeholderSet(en);
  const used = placeholderSet(zh);
  return (
    [...used].every((p) => all.has(p)) &&
    [...requiredPlaceholders(en)].every((p) => used.has(p))
  );
}

function loadDict() {
  if (!fs.existsSync(DICT_PATH)) return { strings: {}, patterns: {} };
  return readJson(DICT_PATH);
}

function saveDict(dict) {
  const sorted = (obj) =>
    Object.fromEntries(
      Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)),
    );
  fs.mkdirSync(path.dirname(DICT_PATH), { recursive: true });
  fs.writeFileSync(
    DICT_PATH,
    JSON.stringify(
      { strings: sorted(dict.strings), patterns: sorted(dict.patterns) },
      null,
      1,
    ) + "\n",
  );
}

function chunks(extractDir, workDir, size = 200) {
  const dict = loadDict();
  const strings = readJson(path.join(extractDir, "strings.json"));
  const patterns = readJson(path.join(extractDir, "patterns.json"));
  const items = [
    ...strings
      .filter((x) => !(x.s in dict.strings))
      .map((x) => ({ s: x.s, f: x.files[0] })),
    ...patterns
      .filter((x) => !(x.p in dict.patterns))
      .map((x) => ({ s: x.p, f: x.files[0], pattern: true })),
  ];
  const inDir = path.join(workDir, "in");
  fs.mkdirSync(inDir, { recursive: true });
  fs.mkdirSync(path.join(workDir, "out"), { recursive: true });
  let n = 0;
  for (let start = 0; start < items.length; start += size, n++) {
    const chunk = items
      .slice(start, start + size)
      .map((it, k) => ({ i: start + k, ...it }));
    fs.writeFileSync(
      path.join(inDir, `chunk-${String(n).padStart(3, "0")}.json`),
      JSON.stringify(chunk, null, 0),
    );
  }
  console.log(`${items.length} untranslated items -> ${n} chunks in ${inDir}`);
}

function checkEntry(item, zh) {
  if (typeof zh !== "string" || zh.trim() === "") return "missing or empty";
  if (!placeholdersOk(item.s, zh)) return "placeholders differ";
  if (zh.length > Math.max(40, item.s.length * 4)) return "suspiciously long";
  return null;
}

function merge(workDir) {
  const dict = loadDict();
  const problems = [];
  let added = 0;
  const inDir = path.join(workDir, "in");
  for (const name of fs
    .readdirSync(inDir)
    .filter((f) => f.endsWith(".json"))
    .sort()) {
    const items = readJson(path.join(inDir, name));
    const outFile = path.join(workDir, "out", name);
    if (!fs.existsSync(outFile)) {
      problems.push({ chunk: name, error: "output missing" });
      continue;
    }
    let out;
    try {
      out = readJson(outFile);
    } catch (e) {
      problems.push({ chunk: name, error: `invalid JSON: ${e.message}` });
      continue;
    }
    for (const item of items) {
      const zh = out[String(item.i)];
      const error = checkEntry(item, zh);
      if (error) {
        problems.push({
          chunk: name,
          i: item.i,
          s: item.s,
          zh: zh ?? null,
          error,
        });
        continue;
      }
      // glossary rule: address the user as 你, not 您
      (item.pattern ? dict.patterns : dict.strings)[item.s] = zh
        .trim()
        .replace(/您/g, "你");
      added++;
    }
  }
  saveDict(dict);
  fs.writeFileSync(
    path.join(workDir, "problems.json"),
    JSON.stringify(problems, null, 1),
  );
  console.log(
    `merged ${added} entries; dictionary now has ${Object.keys(dict.strings).length} strings, ` +
      `${Object.keys(dict.patterns).length} patterns; ${problems.length} problems -> problems.json`,
  );
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === "chunks" && args.length >= 2)
  chunks(args[0], args[1], Number(args[2] ?? 200));
else if (cmd === "merge" && args.length === 1) merge(args[0]);
else {
  console.error(
    "usage: dict-tool.mjs chunks <extractDir> <workDir> [size] | merge <workDir>",
  );
  process.exit(2);
}
