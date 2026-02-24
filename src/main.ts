import { Plugin } from 'obsidian';
import { CSpellSettingTab, DEFAULT_SETTINGS, type CSpellPluginSettings } from './settings';
import { registerSpellcheckCommands } from './commands/spellcheck';

export default class ObsidianCSpellPlugin extends Plugin {
	settings: CSpellPluginSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();
		registerSpellcheckCommands(this);
		this.addSettingTab(new CSpellSettingTab(this.app, this));
	}

	async loadSettings(): Promise<void> {
		const loaded = (await this.loadData()) as Partial<CSpellPluginSettings> | null;
		this.settings = {
			...DEFAULT_SETTINGS,
			...loaded,
		};
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
