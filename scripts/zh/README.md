# zh-CN UI translation (fork)

This fork adds a Simplified Chinese UI to GrowthBook without changing the
upstream components. The rendered page is translated at runtime from a
dictionary, so merging a new upstream release only touches a few files.

## How it works

| File                                              | Role                                                                                                                                                                                                                                                                                |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/front-end/services/zh/uiTranslator.ts`  | Starts after the app mounts, loads the dictionary, translates text nodes and the `placeholder` / `title` / `aria-label` / `alt` attributes, and watches the DOM with a `MutationObserver`. Its callbacks run before the next paint, so new content is translated before it is shown |
| `packages/front-end/services/zh/dictionary.ts`    | Pure helpers: whitespace normalization, exact lookup, patterns                                                                                                                                                                                                                      |
| `packages/front-end/pages/_app.tsx`               | One `useEffect` that calls `startUiTranslation()`                                                                                                                                                                                                                                   |
| `packages/front-end/public/zh/dict.zh-CN.json`    | The dictionary, served at `/zh/dict.zh-CN.json` and loaded at runtime. Generated, do not edit by hand                                                                                                                                                                               |
| `packages/front-end/test/zhUiTranslation.test.ts` | Tests for the helpers and the DOM translator                                                                                                                                                                                                                                        |
| `scripts/zh/extract-ui-strings.mjs`               | Extracts UI strings from the front-end and `packages/shared` sources with the TypeScript AST                                                                                                                                                                                        |
| `scripts/zh/dict-tool.mjs`                        | Splits untranslated strings into chunks and merges translated chunks with validation                                                                                                                                                                                                |
| `scripts/zh/manual.zh-CN.json`                    | Hand-written entries for text that is not in the source, such as date-fns output (`3 days ago`, `yesterday at 3:12 PM`). Applied on every merge and wins over translated chunks                                                                                                     |
| `scripts/zh/glossary.md`                          | Translation rules and glossary                                                                                                                                                                                                                                                      |
| `scripts/zh/Dockerfile`                           | Builds the image from the official one with this fork's front-end build                                                                                                                                                                                                             |

- Language switch: `?lang=en` switches back to English and `?lang=zh` switches to Chinese. The choice is kept in `localStorage` (`gb-ui-lang`); the default is Chinese.
- Not translated: `code`, `pre`, `textarea`, editors (`.ace_editor`, `.cm-editor`, `.monaco-editor`), `contenteditable`, and anything marked `data-no-translate`.
- `packages/front-end/enterprise/` and `packages/shared/src/enterprise/` are **not** extracted or modified. They are under the GrowthBook Enterprise License, and modified copies may only be used in production with a valid enterprise license. Strings that only appear there stay in English.

### Dictionary entries

- `strings`: exact UI text, matched after collapsing whitespace.
- `patterns`: `{0}`, `{1}` match any value; `{#0}` only matches a number, which keeps generic patterns such as `{#0} days` from catching other text. The most specific pattern (longest fixed text) wins. Values captured by `{0}` are looked up again, so `3 days ago` goes through `{#0} days ago`, and `last Monday at 3:12 PM` through `last {0} at {1}` and `Monday`.
- A placeholder glued to a word, such as `field{1}`, is treated as an English plural suffix: when the value is `s`, `es` or empty it is dropped.

## Finding untranslated text

Open the app with `?zhdebug=1` (kept in `localStorage` until `?zhdebug=0`),
browse the pages, then run `copy(__gbZhMissing())` in the browser console. It
copies every text that had no translation, with the pages it was seen on, as
`[{ "s": "...", "pages": ["/experiments"] }]`. Add the useful ones to
`manual.zh-CN.json`, or extend the extractor and translate the new chunks.

## Known limits

- Only whole text nodes are matched. A sentence split across elements (`Showing <b>3</b> of 10`) is translated piece by piece.
- User content that happens to equal a UI string, such as a metric named `Revenue`, is translated too.
- Text from the back-end (error messages, defaults) and strings built in ways the extractor does not recognise stay in English.

## Paid features are hidden

This build runs without a GrowthBook license, so paid (Pro / Enterprise)
features are hidden instead of being shown locked, and so are pages built on
the Enterprise-licensed code under `enterprise/` (Product Analytics, Timeline,
Metric Effects, Correlations…), which may only be used in production with a
Pro or Enterprise license.

- `packages/front-end/services/oss/hiddenRoutes.tsx` lists the hidden routes. `sidebarNav.ts` drops them from the sidebar and Cmd+K search, and `_app.tsx` redirects them home. Tested in `test/ossHiddenRoutes.test.ts`.
- `next.config.js` sets upstream's `HIDE_GROWTHBOOK_UPGRADE_CTAS`. Upgrade buttons, `PremiumCallout`, `UpgradeMessage`, the pricing and paid-feature links on Get Started, and the Experiment Impact box check it.
- Tabs and settings sections that only hold a paid feature are shown only with `hasCommercialFeature(...)`: feature Simulate / Code Refs / Validation, experiment Dashboards, metric Slices and Auto Slices, Metric Groups, Teams and Roles, project Approvals, and the Approval Flows / Custom Markdown / AI, bandit, learning and ramp schedule settings. The "Open in Explorer" buttons are removed.
- Single locked options inside free forms (CUPED, sequential testing, schedules…) are left as upstream shows them, with their paid badge.

## Updating to a new GrowthBook release

```bash
git fetch upstream --tags
git rebase --onto vX.Y.Z v5.1.0 zh-cn    # conflicts: _app.tsx and the files above
pnpm install --frozen-lockfile
node scripts/zh/extract-ui-strings.mjs /tmp/gb-zh/extract
node scripts/zh/dict-tool.mjs chunks /tmp/gb-zh/extract /tmp/gb-zh 200
# translate /tmp/gb-zh/in/chunk-*.json -> /tmp/gb-zh/out/chunk-*.json,
# { "<i>": "<译文>" } per chunk, following glossary.md
node scripts/zh/dict-tool.mjs merge /tmp/gb-zh   # rejected entries -> problems.json
```

`chunks` only emits strings that are not in the dictionary yet. Strings that
upstream removed stay in the dictionary; they are harmless. After editing only
`manual.zh-CN.json`, run `node scripts/zh/dict-tool.mjs merge` without a work dir.

## Building the image

CI does this on every push to `zh-cn`: `.github/workflows/zh-image.yml` builds
the front-end on Linux, builds the image, checks it against the official one
(runtime config, ownership and modes, the `.next` file count), and pushes
`ghcr.io/<owner>/growthbook-zh:<version>` plus a `<version>-<sha>` tag. Bump
`GROWTHBOOK_VERSION` there when rebasing onto a new release.

The Dockerfile copies the official image's filesystem **without** its
front-end `.next` and `public` into a fresh image, then adds this fork's build
(browser source maps removed). Layering on top of the official image instead
would keep the replaced `.next` in a lower layer and grow the image by its
size. The official image's runtime config (`ENV`, `USER`, `WORKDIR`, `CMD`) is
repeated in the Dockerfile; the CI check fails if it drifts after an upgrade.

The steps it runs:

```bash
pnpm build:deps
pnpm --filter front-end build
mkdir -p /tmp/gb-zh/image
cp -r packages/front-end/.next /tmp/gb-zh/image/.next
rm -rf /tmp/gb-zh/image/.next/cache
find /tmp/gb-zh/image/.next -name '*.map' -delete
cp -r packages/front-end/public /tmp/gb-zh/image/public
docker build -f scripts/zh/Dockerfile --build-arg GROWTHBOOK_VERSION=5.1.0 -t growthbook-zh:5.1.0 /tmp/gb-zh/image
```

**Build on Linux.** On Windows two upstream build steps fail:

- `pnpm build:deps` fails in `packages/sdk-react`: its rollup `external` check
  treats Windows absolute paths (`F:\...`) as external modules. Copying `dist/`
  from the published `@growthbook/growthbook-react` package of the same version
  into `packages/sdk-react/dist` works around it, which is enough for tests and
  type-checking.
- `next build` with Turbopack cannot resolve Bootstrap's relative sass imports
  (`@import "functions"`, and `@import "progress"` resolves to the npm `progress`
  package).

`GROWTHBOOK_VERSION` must be the release this branch is based on, so the
runtime `node_modules` in the official image match the lockfile used for the build.

The dictionary is loaded at runtime, so a dictionary-only change can also be
deployed by replacing `public/zh/dict.zh-CN.json` in the container, for example
with a bind mount, without rebuilding.

## Memory

The container runs the back-end API and the Next.js front-end server as two
Node processes, plus the Python stats server and the `run-apps.js` supervisor.
Measured at idle on 5.1.0:

| Process          | RSS     | V8 heap after a full GC | Loaded CommonJS modules |
| ---------------- | ------- | ----------------------- | ----------------------- |
| back-end         | ~450 MB | ~305 MB                 | ~6700 (54 MB of source) |
| front-end (Next) | ~410 MB | ~295 MB                 | ~3000 (27 MB of source) |
| stats server     | ~130 MB | (numpy, scipy, pandas)  |                         |
| run-apps.js      | ~50 MB  |                         |                         |

The heap is live data, not garbage, so it is the code and the objects built
when modules load:

- The back-end loads the client SDK of every supported warehouse at start,
  whichever one is used: `googleapis` (~23 MB of heap on its own),
  `snowflake-sdk` (~22 MB), `@databricks/sql` and `mssql` (~12 MB each),
  `mongoose`, BigQuery, Athena, ClickHouse… together over 100 MB.
- The Next server renders every page through the same `_app` shell, so the
  first server render loads the whole front-end bundle (echarts, highlight.js,
  refractor…). Turning off `experimental.preloadEntriesOnStart` brings the
  idle process down to ~55 MB, but the first request then takes ~25 s and the
  process goes back to ~400 MB, so it is left on.

`NODE_OPTIONS=--max-old-space-size=…` does not shrink any of this. It is still
useful as a cap so both processes cannot grow together past the container
limit; `PM2_AUTORESTART=true` and `PM2_MAX_MEMORY_RESTART` make
`scripts/run-apps.js` restart a single process instead of stopping the
container. Plan for about 1 GB for the container, plus MongoDB.
