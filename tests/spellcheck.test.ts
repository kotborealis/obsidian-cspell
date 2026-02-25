import { describe, expect, it } from 'vitest';
import type { CSpellPluginSettings } from '../src/settings';
import { runCSpell } from '../src/spellcheck/cspell-lib';

const BASE_SETTINGS: CSpellPluginSettings = {
	enabled: true,
	language: 'en',
	customWords: '',
	showSuggestionsLimit: 20,
	cspellConfigPath: 'cspell.json',
	useWordsFromConfig: false,
	liveHighlighting: true,
};

function createSettings(overrides: Partial<CSpellPluginSettings> = {}): CSpellPluginSettings {
	return {
		...BASE_SETTINGS,
		...overrides,
	};
}

describe('runCSpell', () => {
	it('detects misspelled words', async () => {
		const result = await runCSpell('This has a misspelld word.', {
			filename: 'notes/test.md',
			settings: createSettings(),
		});

		expect(result.unknownWords).toContain('misspelld');
		expect(result.issues.length).toBeGreaterThan(0);
	});

	it('respects custom ignore words', async () => {
		const result = await runCSpell('This has a misspelld word.', {
			filename: 'notes/test.md',
			settings: createSettings({ customWords: 'misspelld' }),
		});

		expect(result.unknownWords).not.toContain('misspelld');
	});

	it('respects config words', async () => {
		const result = await runCSpell('Obsidain is great.', {
			filename: 'notes/test.md',
			settings: createSettings(),
			configWords: ['Obsidain'],
		});

		expect(result.unknownWords).not.toContain('Obsidain');
	});

	it('loads default en-US dictionary', async () => {
		const result = await runCSpell('The color is fine.', {
			filename: 'notes/test.md',
			settings: createSettings({ language: 'en-US' }),
		});

		expect(result.unknownWords).not.toContain('color');
	});

	it('loads default ru dictionary', async () => {
		const result = await runCSpell('привет мир', {
			filename: 'notes/test.md',
			settings: createSettings({ language: 'ru' }),
		});

		expect(result.unknownWords).not.toContain('привет');
		expect(result.unknownWords).not.toContain('мир');
	});

	it('supports multiple locales', async () => {
		const result = await runCSpell('Hello привет', {
			filename: 'notes/test.md',
			settings: createSettings({ language: 'en,ru' }),
		});

		expect(result.unknownWords).not.toContain('привет');
		expect(result.unknownWords).not.toContain('Hello');
	});
});
