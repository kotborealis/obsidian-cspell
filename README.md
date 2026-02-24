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

## Development

```bash
npm install
npm run dev
```

Build production bundle:

```bash
npm run build
```

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
