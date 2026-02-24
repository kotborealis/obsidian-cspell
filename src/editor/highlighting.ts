/* eslint-disable import/no-extraneous-dependencies */
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { MarkdownView } from 'obsidian';
import type { Extension } from '@codemirror/state';
import type ObsidianCSpellPlugin from '../main';
import { loadWordsFromCSpellConfig } from '../spellcheck/cspell-config';
import { runCSpell } from '../spellcheck/cspell-lib';

const misspelledWordMark = Decoration.mark({
	class: 'cspell-misspelled-word',
});

class CSpellHighlightPlugin {
	decorations: DecorationSet = Decoration.none;
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
			this.updateDecorations([]);
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
			});

			if (requestId !== this.requestId) {
				return;
			}

			this.updateDecorations(
				result.issues.map((issue) => ({
					from: issue.offset,
					to: issue.offset + issue.length,
				})),
			);
		} catch {
			if (requestId === this.requestId) {
				this.updateDecorations([]);
			}
		}
	}

	private updateDecorations(ranges: Array<{ from: number; to: number }>): void {
		const builder = new RangeSetBuilder<Decoration>();
		const docLength = this.view.state.doc.length;
		for (const range of ranges) {
			const from = Math.max(0, Math.min(docLength, range.from));
			const to = Math.max(from, Math.min(docLength, range.to));
			if (from === to) {
				continue;
			}
			builder.add(from, to, misspelledWordMark);
		}

		this.decorations = builder.finish();
		this.view.requestMeasure();
	}
}

export function createSpellcheckHighlightExtension(plugin: ObsidianCSpellPlugin): Extension {
	return ViewPlugin.fromClass(
		class extends CSpellHighlightPlugin {
			constructor(view: EditorView) {
				super(view, plugin);
			}
		},
		{
			decorations: (value) => value.decorations,
		},
	);
}
