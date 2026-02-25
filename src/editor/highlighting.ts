import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { MarkdownView } from 'obsidian';
import type { Extension } from '@codemirror/state';
import type ObsidianCSpellPlugin from '../main';
import { loadWordsFromCSpellConfig } from '../spellcheck/cspell-config';
import { runCSpell, type SpellcheckIssue } from '../spellcheck/cspell-lib';
import { clearUnderlines, setUnderlines, underlineDecoration } from './underlines';

class CSpellHighlightPlugin {
	private timer: number | null = null;
	private readonly debounceMs = 350;
	private requestId = 0;

	constructor(private readonly view: EditorView, private readonly plugin: ObsidianCSpellPlugin) {
		this.scheduleCheck();
	}

	update(update: ViewUpdate): void {
		if (update.docChanged || update.viewportChanged) {
			this.scheduleCheck();
		}
	}

	destroy(): void {
		if (this.timer !== null) {
			window.clearTimeout(this.timer);
		}
	}

	private scheduleCheck(): void {
		if (this.timer !== null) {
			window.clearTimeout(this.timer);
		}

		this.timer = window.setTimeout(() => {
			void this.runCheck();
		}, this.debounceMs);
	}

	private async runCheck(): Promise<void> {
		this.requestId += 1;
		const requestId = this.requestId;
		const markdownView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		const file = this.plugin.app.workspace.getActiveFile();

		if (
			!this.plugin.settings.enabled ||
			!this.plugin.settings.liveHighlighting ||
			!markdownView ||
			!file
		) {
			this.clearDecorations();
			return;
		}

		const content = this.view.state.doc.toString();
		let configWords: string[] = [];
		let configIgnoreWords: string[] = [];

		if (this.plugin.settings.useWordsFromConfig) {
			try {
				const loaded = await loadWordsFromCSpellConfig(this.plugin.app.vault, this.plugin.settings.cspellConfigPath);
				configWords = loaded.words;
				configIgnoreWords = loaded.ignoreWords;
			} catch {
				// Ignore read/parse failures for background highlighting.
			}
		}

		try {
			const result = await runCSpell(content, {
				filename: file.path,
				settings: this.plugin.settings,
				configWords,
				configIgnoreWords,
				adapter: this.plugin.app.vault.adapter,
				configDir: this.plugin.app.vault.configDir,
				pluginId: this.plugin.manifest.id,
			});

			if (requestId !== this.requestId) {
				return;
			}

			this.setDecorations(result.issues);
		} catch {
			if (requestId === this.requestId) {
				this.clearDecorations();
			}
		}
	}

	private setDecorations(issues: SpellcheckIssue[]): void {
		this.view.dispatch({
			effects: [setUnderlines.of(issues)],
		});
	}

	private clearDecorations(): void {
		this.view.dispatch({
			effects: [clearUnderlines.of(null)],
		});
	}
}

export function createSpellcheckHighlightExtension(plugin: ObsidianCSpellPlugin): Extension {
	return [
		underlineDecoration,
		ViewPlugin.fromClass(class extends CSpellHighlightPlugin {
			constructor(view: EditorView) {
				super(view, plugin);
			}
		}),
	];
}
