import { MarkdownView, Notice } from 'obsidian';
import type ObsidianCSpellPlugin from '../main';
import { loadWordsFromCSpellConfig } from '../spellcheck/cspell-config';
import { runCSpell } from '../spellcheck/cspell-lib';

function getView(plugin: ObsidianCSpellPlugin): MarkdownView | null {
	return plugin.app.workspace.getActiveViewOfType(MarkdownView);
}

async function checkText(plugin: ObsidianCSpellPlugin, onlySelection: boolean): Promise<void> {
	if (!plugin.settings.enabled) {
		new Notice('Spell-check is disabled in plugin settings.');
		return;
	}

	const activeFile = plugin.app.workspace.getActiveFile();
	const view = getView(plugin);
	if (!activeFile || !view) {
		new Notice('Open a Markdown note to run spell-check.');
		return;
	}

	const selection = view.editor.getSelection().trim();
	if (onlySelection && !selection) {
		new Notice('Select text before running selection spell-check.');
		return;
	}

	const content = onlySelection ? selection : selection || view.editor.getValue();
	let configWords: string[] = [];
	let configIgnoreWords: string[] = [];

	if (plugin.settings.useWordsFromConfig) {
		try {
			const loaded = await loadWordsFromCSpellConfig(plugin.app.vault, plugin.settings.cspellConfigPath);
			configWords = loaded.words;
			configIgnoreWords = loaded.ignoreWords;
		} catch {
			new Notice('Could not read cspell config file. Continuing without config words.');
		}
	}

	let result;
	try {
		result = await runCSpell(content, {
			filename: activeFile.path,
			settings: plugin.settings,
			configWords,
			configIgnoreWords,
		});
	} catch (error) {
		new Notice(error instanceof Error ? `Spell-check failed: ${error.message}` : 'Spell-check failed.');
		return;
	}

	if (result.unknownWords.length === 0) {
		new Notice('No spelling issues found.');
		return;
	}

	const list = result.unknownWords.slice(0, plugin.settings.showSuggestionsLimit).join(', ');
	const extra =
		result.unknownWords.length > plugin.settings.showSuggestionsLimit
			? ` (+${result.unknownWords.length - plugin.settings.showSuggestionsLimit} more)`
			: '';
	new Notice(`Found ${result.unknownWords.length} words: ${list}${extra}`);
}

export function registerSpellcheckCommands(plugin: ObsidianCSpellPlugin): void {
	plugin.addCommand({
		id: 'cspell-check-current-note',
		name: 'Check spelling in current note',
		callback: () => void checkText(plugin, false),
	});

	plugin.addCommand({
		id: 'cspell-check-selection',
		name: 'Check spelling in selection',
		callback: () => void checkText(plugin, true),
	});
}
