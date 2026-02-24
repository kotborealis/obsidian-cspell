import { App, PluginSettingTab, Setting } from 'obsidian';
import ObsidianCSpellPlugin from './main';

export interface CSpellPluginSettings {
	enabled: boolean;
	language: string;
	customWords: string;
	showSuggestionsLimit: number;
	cspellConfigPath: string;
	useWordsFromConfig: boolean;
}

export const DEFAULT_SETTINGS: CSpellPluginSettings = {
	enabled: true,
	language: 'en,ru',
	customWords: '',
	showSuggestionsLimit: 20,
	cspellConfigPath: 'cspell.json',
	useWordsFromConfig: true,
};

export class CSpellSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: ObsidianCSpellPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Enable plugin')
			.setDesc('Enable cspell checks for commands.')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.enabled).onChange(async (value) => {
					this.plugin.settings.enabled = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName('Languages')
			.setDesc('Comma-separated cspell language list, for example: en,ru.')
			.addText((text) =>
				text.setPlaceholder('En, ru').setValue(this.plugin.settings.language).onChange(async (value) => {
					this.plugin.settings.language = value.trim() || 'en';
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName('Custom words')
			.setDesc('Space-separated words to ignore during checks.')
			.addTextArea((textArea) =>
				textArea.setPlaceholder('Obsidian codex').setValue(this.plugin.settings.customWords).onChange(async (value) => {
					this.plugin.settings.customWords = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName('Load words from config file')
			.setDesc('Load words and ignored words from the config file in your vault.')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.useWordsFromConfig).onChange(async (value) => {
					this.plugin.settings.useWordsFromConfig = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName('Config file path')
			.setDesc('Path to config file in vault, for example: cspell.json.')
			.addText((text) =>
				text.setPlaceholder('Enter config path').setValue(this.plugin.settings.cspellConfigPath).onChange(async (value) => {
					this.plugin.settings.cspellConfigPath = value.trim() || 'cspell.json';
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName('Maximum words in notice')
			.setDesc('How many misspelled words to show in a single result notice.')
			.addSlider((slider) =>
				slider
					.setLimits(5, 100, 5)
					.setValue(this.plugin.settings.showSuggestionsLimit)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.showSuggestionsLimit = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
