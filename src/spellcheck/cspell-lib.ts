import type { CSpellUserSettings, Document, ValidationIssue } from 'cspell-lib';
import { getDefaultBundledSettingsAsync, mergeSettings, spellCheckDocument } from 'cspell-lib';
import type { CSpellPluginSettings } from '../settings';
import { DEFAULT_DICTIONARY_TRIES, getDefaultDictionarySettings, toArrayBuffer } from './embedded-dicts-data';

export interface SpellcheckIssue {
	word: string;
	offset: number;
	length: number;
}

export interface SpellcheckResult {
	unknownWords: string[];
	issues: SpellcheckIssue[];
	rawOutput: string;
}

export interface CSpellRunInput {
	filename: string;
	settings: CSpellPluginSettings;
	configWords?: string[];
	configIgnoreWords?: string[];
	adapter?: DictionaryAdapter;
	configDir?: string;
	pluginId?: string;
}

function parseCustomWords(customWords: string): string[] {
	return customWords
		.split(/[\s,]+/)
		.map((word) => word.trim())
		.filter(Boolean);
}

function normalizeIssues(issues: ValidationIssue[]): SpellcheckIssue[] {
	const normalized: SpellcheckIssue[] = [];
	for (const issue of issues) {
		const word = issue.text;
		if (!word || typeof issue.offset !== 'number') {
			continue;
		}

		normalized.push({
			word,
			offset: issue.offset,
			length: issue.length ?? word.length,
		});
	}

	return normalized;
}

function createSettings(
	input: CSpellRunInput,
	dictionarySettings: Pick<CSpellUserSettings, 'dictionaryDefinitions' | 'languageSettings'> = {
		dictionaryDefinitions: [],
		languageSettings: [],
	},
): CSpellUserSettings {
	return {
		language: input.settings.language,
		...dictionarySettings,
		words: input.configWords ?? [],
		ignoreWords: [...parseCustomWords(input.settings.customWords), ...(input.configIgnoreWords ?? [])],
	};
}

let defaultSettingsPromise: Promise<CSpellUserSettings> | null = null;

async function getDefaultSettings(): Promise<CSpellUserSettings> {
	if (!defaultSettingsPromise) {
		defaultSettingsPromise = getDefaultBundledSettingsAsync();
	}
	return defaultSettingsPromise;
}

type DictionaryAdapter = {
	exists(path: string): Promise<boolean>;
	mkdir(path: string): Promise<void>;
	writeBinary(path: string, data: ArrayBuffer): Promise<void>;
	getBasePath?: () => string;
};

const DEFAULT_DICT_DIR = 'dicts/embedded';

async function ensureEmbeddedDictionaries(input: CSpellRunInput): Promise<{
	enUs: string;
	ruRu: string;
} | null> {
	if (!input.adapter || !input.configDir || !input.pluginId) {
		return null;
	}

	const adapter = input.adapter;
	const relativeBaseDir = normalizePath(`${input.configDir}/plugins/${input.pluginId}/${DEFAULT_DICT_DIR}`);
	const writeEnUsPath = normalizePath(`${relativeBaseDir}/en_US.trie.gz`);
	const writeRuRuPath = normalizePath(`${relativeBaseDir}/ru_ru.trie.gz`);

	await ensureDirectory(adapter, relativeBaseDir);
	await ensureBinaryFile(adapter, writeEnUsPath, DEFAULT_DICTIONARY_TRIES.enUs);
	await ensureBinaryFile(adapter, writeRuRuPath, DEFAULT_DICTIONARY_TRIES.ruRu);

	const absoluteBaseDir = resolveAbsolutePath(adapter, relativeBaseDir);
	return {
		enUs: normalizePath(`${absoluteBaseDir}/en_US.trie.gz`),
		ruRu: normalizePath(`${absoluteBaseDir}/ru_ru.trie.gz`),
	};
}

async function ensureDirectory(adapter: DictionaryAdapter, dir: string): Promise<void> {
	const parts = normalizePath(dir).split('/').filter(Boolean);
	let current = '';
	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		if (!(await adapter.exists(current))) {
			await adapter.mkdir(current);
		}
	}
}

async function ensureBinaryFile(adapter: DictionaryAdapter, path: string, data: Uint8Array): Promise<void> {
	if (await adapter.exists(path)) {
		return;
	}
	await adapter.writeBinary(path, toArrayBuffer(data));
}

function normalizePath(value: string): string {
	return value.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
}

function resolveAbsolutePath(adapter: DictionaryAdapter, relativePath: string): string {
	const normalized = normalizePath(relativePath);
	if (isAbsolutePath(normalized)) {
		return normalized;
	}
	const basePath = typeof adapter.getBasePath === 'function' ? normalizePath(adapter.getBasePath()) : '';
	if (!basePath) {
		return normalized;
	}
	return normalizePath(`${basePath}/${normalized}`);
}

function isAbsolutePath(value: string): boolean {
	return value.startsWith('/') || /^[A-Za-z]:\//.test(value) || value.startsWith('\\\\');
}

export async function runCSpell(content: string, input: CSpellRunInput): Promise<SpellcheckResult> {
	const baseSettings = await getDefaultSettings();
	const dictionaryPaths = await ensureEmbeddedDictionaries(input);
	const dictionarySettings = dictionaryPaths
		? getDefaultDictionarySettings(dictionaryPaths)
		: { dictionaryDefinitions: [], languageSettings: [] };
	const rawSettings = createSettings(input, dictionarySettings);
	const settings = mergeSettings(baseSettings, rawSettings);
	const document: Document = {
		uri: input.filename,
		text: content,
		languageId: 'markdown',
		locale: input.settings.language,
	};

	const result = await spellCheckDocument(document, { generateSuggestions: false }, settings);
	if (result.errors?.length) {
		const error = result.errors[0];
		throw error instanceof Error ? error : new Error(String(error));
	}

	const issues = normalizeIssues(result.issues);
	const unknownWords = [...new Set(issues.map((issue) => issue.word))];

	return {
		unknownWords,
		issues,
		rawOutput: JSON.stringify(result.issues),
	};
}
