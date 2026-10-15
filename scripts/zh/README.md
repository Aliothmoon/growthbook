# zh-CN UI translation (fork)

This fork adds a Simplified Chinese UI to GrowthBook without changing the
upstream components. The rendered page is translated at runtime from a
dictionary, so merging a new upstream release only touches a few files.

## How it works

| File                                              | Role                                                                                                                                                                                                                                                                                |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/front-end/services/zh/uiTranslator.ts`  | Starts after the app mounts, loads the dictionary, translates text nodes and the `placeholder` / `title` / `aria-label` / `alt` attributes, and watches the DOM with a `MutationObserver`. Its callbacks run before the next paint, so new content is translated before it is shown |
| `packages/front-end/services/zh/dictionary.ts`    | Pure helpers: whitespace normalization, exact lookup, `{0}` patterns                                                                                                                                                                                                                |
| `packages/front-end/pages/_app.tsx`               | One `useEffect` that calls `startUiTranslation()`                                                                                                                                                                                                                                   |
| `packages/front-end/public/zh/dict.zh-CN.json`    | The dictionary, served at `/zh/dict.zh-CN.json` and loaded at runtime                                                                                                                                                                                                               |
| `packages/front-end/test/zhUiTranslation.test.ts` | Tests for the helpers and the DOM translator                                                                                                                                                                                                                                        |
| `scripts/zh/extract-ui-strings.mjs`               | Extracts UI strings from the front-end source with the TypeScript AST                                                                                                                                                                                                               |
| `scripts/zh/dict-tool.mjs`                        | Splits untranslated strings into chunks and merges translated chunks with validation                                                                                                                                                                                                |
| `scripts/zh/glossary.md`                          | Translation rules and glossary                                                                                                                                                                                                                                                      |
| `scripts/zh/Dockerfile`                           | Builds the image: the official image with this fork's front-end build copied over it                                                                                                                                                                                                |

- Language switch: `?lang=en` switches back to English and `?lang=zh` switches to Chinese. The choice is kept in `localStorage` (`gb-ui-lang`); the default is Chinese.
- Not translated: `code`, `pre`, `textarea`, editors (`.ace_editor`, `.cm-editor`, `.monaco-editor`), `contenteditable`, and anything marked `data-no-translate`.
- `packages/front-end/enterprise/` is **not** extracted or modified. It is under the GrowthBook Enterprise License, and modified copies may only be used in production with a valid enterprise license. Strings that only appear there stay in English.

## Known limits

- Only whole text nodes are matched. A sentence split across elements (`Showing <b>3</b> of 10`) is translated piece by piece.
- Values inside patterns are kept as they are, so `5 minutes ago` becomes `5 minutes前`.
- User content that happens to equal a UI string, such as a metric named `Revenue`, is translated too.
- Strings built in ways the extractor does not recognise stay in English. Add them to the dictionary by hand, or extend the extractor.

## Updating to a new GrowthBook release

```bash
git fetch upstream --tags
git rebase --onto vX.Y.Z v5.1.0 zh-cn    # conflicts can only be in _app.tsx
pnpm install --frozen-lockfile
node scripts/zh/extract-ui-strings.mjs /tmp/gb-zh/extract
node scripts/zh/dict-tool.mjs chunks /tmp/gb-zh/extract /tmp/gb-zh 200
# translate /tmp/gb-zh/in/chunk-*.json -> /tmp/gb-zh/out/chunk-*.json,
# { "<i>": "<译文>" } per chunk, following glossary.md
node scripts/zh/dict-tool.mjs merge /tmp/gb-zh   # rejected entries -> problems.json
```

`chunks` only emits strings that are not in the dictionary yet. Strings that
upstream removed stay in the dictionary; they are harmless.

## Building the image

CI does this on every push to `zh-cn`: `.github/workflows/zh-image.yml` builds
the front-end on Linux and pushes `ghcr.io/<owner>/growthbook-zh:<version>`
(plus a `<version>-<sha>` tag). Bump `GROWTHBOOK_VERSION` there when rebasing
onto a new release. The steps it runs:

```bash
pnpm build:deps
pnpm --filter front-end build
# context: .next (without .next/cache) and public
mkdir -p /tmp/gb-zh/image
cp -r packages/front-end/.next /tmp/gb-zh/image/.next && rm -rf /tmp/gb-zh/image/.next/cache
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
