import type { Vault } from 'obsidian';

interface CSpellConfig {
	words?: unknown;
	ignoreWords?: unknown;
}

export interface LoadedCSpellConfig {
	words: string[];
	ignoreWords: string[];
}

function normalizeWordList(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.filter((word): word is string => typeof word === 'string')
		.map((word) => word.trim())
		.filter(Boolean);
}

export async function loadWordsFromCSpellConfig(vault: Vault, configPath: string): Promise<LoadedCSpellConfig> {
	const normalizedPath = configPath.trim() || 'cspell.json';
	const file = vault.getAbstractFileByPath(normalizedPath);
	if (!file || !('path' in file)) {
		return { words: [], ignoreWords: [] };
	}

	const content = await vault.adapter.read(file.path);
	const parsed = JSON.parse(content) as CSpellConfig;

	return {
		words: normalizeWordList(parsed.words),
		ignoreWords: normalizeWordList(parsed.ignoreWords),
	};
}
