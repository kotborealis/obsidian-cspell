# Obsidian CSpell plugin

Obsidian community plugin that uses cspell for note spell-checking and live misspelling highlights in the editor.

## Features

- Live highlighting with wavy underlines for misspelled words
- Command: **Check spelling in current note**
- Command: **Check spelling in selection**
- Loads `words` and `ignoreWords` from `cspell.json` in your vault
- Settings for languages, custom words, config path, and max words in results
- Local-only processing (no network calls)

## Requirements

- Obsidian Community Plugins enabled
- `@cspell/cspell-lib` bundled with the plugin
- Optional `cspell.json` file in your vault root (or custom path)

## cspell.json support

By default, plugin reads `cspell.json` and imports:

- `words`
- `ignoreWords`

You can disable this behavior in plugin settings or set a custom config path.

## How to use in Obsidian

1. Open **Settings → Community plugins** and enable **Obsidian CSpell**.
2. Open a note and run **Check spelling in current note** from the command palette.
3. Select text and run **Check spelling in selection** to check only the selection.
4. Open plugin settings to configure:
   - **Languages** (for example `en,ru`)
   - **Custom words**
   - **Live highlighting**
   - **Load words from config file** and **Config file path**

### Optional `cspell.json`

Create `cspell.json` in your vault root (or set a custom path in settings) and add words:

```json
{
  "words": ["Obsidian", "Codex"],
  "ignoreWords": ["teh"]
}
```

## Development

```bash
npm install
npm run dev
```

Build production bundle:

```bash
npm run build
```


## Automated release with GitHub Actions

A workflow is included at `.github/workflows/release.yml`.

To publish a release with built artifacts:

1. Ensure `manifest.json` and `versions.json` are updated to the new version.
2. Push a Git tag that exactly matches `manifest.json` version (for example `1.2.0`, without `v`).
3. GitHub Actions will run `npm ci` + `npm run lint` + `npm run build` and create a GitHub Release with:
   - `main.js`
   - `manifest.json`
   - `styles.css` (if present)

If the tag does not match `manifest.json` or the version is missing in `versions.json`, the workflow fails intentionally.

You can also run the workflow manually from **Actions → Release plugin artifacts → Run workflow** to verify build/lint before tagging.

## Manual install for testing

Copy files to:

```text
<Vault>/.obsidian/plugins/obsidian-cspell/
```

Required files:
- `main.js`
- `manifest.json`
- `styles.css` (optional)

Then reload Obsidian and enable plugin in **Settings → Community plugins**.
