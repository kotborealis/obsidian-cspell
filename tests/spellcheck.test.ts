import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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

const TEST_PLUGIN_ID = 'obsidian-cspell';
let tempRoot = '';
let testConfigDir = 'test-config';

const testAdapter = {
	async exists(targetPath: string): Promise<boolean> {
		const fullPath = resolveTestPath(targetPath);
		try {
			await fs.stat(fullPath);
			return true;
		} catch {
			return false;
		}
	},
	async mkdir(targetPath: string): Promise<void> {
		const fullPath = resolveTestPath(targetPath);
		await fs.mkdir(fullPath, { recursive: true });
	},
	async writeBinary(targetPath: string, data: ArrayBuffer): Promise<void> {
		const fullPath = resolveTestPath(targetPath);
		await fs.mkdir(path.dirname(fullPath), { recursive: true });
		await fs.writeFile(fullPath, Buffer.from(data));
	},
};

function resolveTestPath(targetPath: string): string {
	const normalized = targetPath.split('/').join(path.sep);
	if (path.isAbsolute(normalized)) {
		return normalized;
	}
	return path.join(tempRoot, normalized);
}

function createSettings(overrides: Partial<CSpellPluginSettings> = {}): CSpellPluginSettings {
	return {
		...BASE_SETTINGS,
		...overrides,
	};
}

describe('runCSpell', () => {
	beforeAll(async () => {
		tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'obsidian-cspell-'));
		testConfigDir = path.join(tempRoot, 'config');
	});

	afterAll(async () => {
		if (tempRoot) {
			await fs.rm(tempRoot, { recursive: true, force: true });
		}
	});

	it('detects misspelled words', async () => {
		const result = await runCSpell('This has a misspelld word.', {
			filename: 'notes/test.md',
			settings: createSettings(),
			adapter: testAdapter,
			configDir: testConfigDir,
			pluginId: TEST_PLUGIN_ID,
		});

		expect(result.unknownWords).toContain('misspelld');
		expect(result.issues.length).toBeGreaterThan(0);
	});

	it('respects custom ignore words', async () => {
		const result = await runCSpell('This has a misspelld word.', {
			filename: 'notes/test.md',
			settings: createSettings({ customWords: 'misspelld' }),
			adapter: testAdapter,
			configDir: testConfigDir,
			pluginId: TEST_PLUGIN_ID,
		});

		expect(result.unknownWords).not.toContain('misspelld');
	});

	it('respects config words', async () => {
		const result = await runCSpell('Obsidain is great.', {
			filename: 'notes/test.md',
			settings: createSettings(),
			configWords: ['Obsidain'],
			adapter: testAdapter,
			configDir: testConfigDir,
			pluginId: TEST_PLUGIN_ID,
		});

		expect(result.unknownWords).not.toContain('Obsidain');
	});

	it('loads default en-US dictionary', async () => {
		const result = await runCSpell('The color is fine.', {
			filename: 'notes/test.md',
			settings: createSettings({ language: 'en-US' }),
			adapter: testAdapter,
			configDir: testConfigDir,
			pluginId: TEST_PLUGIN_ID,
		});

		expect(result.unknownWords).not.toContain('color');
	});

	it('loads default ru dictionary', async () => {
		const result = await runCSpell('привет мир', {
			filename: 'notes/test.md',
			settings: createSettings({ language: 'ru' }),
			adapter: testAdapter,
			configDir: testConfigDir,
			pluginId: TEST_PLUGIN_ID,
		});

		expect(result.unknownWords).not.toContain('привет');
		expect(result.unknownWords).not.toContain('мир');
	});

	it('supports multiple locales', async () => {
		const result = await runCSpell('Hello привет', {
			filename: 'notes/test.md',
			settings: createSettings({ language: 'en,ru' }),
			adapter: testAdapter,
			configDir: testConfigDir,
			pluginId: TEST_PLUGIN_ID,
		});

		expect(result.unknownWords).not.toContain('привет');
		expect(result.unknownWords).not.toContain('Hello');
	});
});
