import type { CSpellUserSettings, Document, ValidationIssue } from 'cspell-lib';
import { getDefaultBundledSettingsAsync, getDefaultConfigLoader, mergeSettings, spellCheckDocument } from 'cspell-lib';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { CSpellPluginSettings } from '../settings';

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

function createSettings(input: CSpellRunInput): CSpellUserSettings {
	const defaultImports = getDefaultDictionaryImports();
	return {
		language: input.settings.language,
		import: defaultImports,
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

function resolveDictPath(...parts: string[]): string | null {
	const cwdCandidate = path.join(process.cwd(), 'dicts', ...parts);
	if (existsSync(cwdCandidate)) {
		return cwdCandidate;
	}

	const moduleDir = typeof __dirname === 'string' ? __dirname : process.cwd();
	const moduleCandidate = path.join(moduleDir, 'dicts', ...parts);
	if (existsSync(moduleCandidate)) {
		return moduleCandidate;
	}

	return null;
}

function getDefaultDictionaryImports(): string[] {
	const imports: string[] = [];
	const enUs = resolveDictPath('en_us', 'cspell-ext.json');
	if (enUs) {
		imports.push(enUs);
	}
	const ruRu = resolveDictPath('ru_ru', 'cspell-ext.json');
	if (ruRu) {
		imports.push(ruRu);
	}
	return imports;
}

export async function runCSpell(content: string, input: CSpellRunInput): Promise<SpellcheckResult> {
	const baseSettings = await getDefaultSettings();
	const rawSettings = createSettings(input);
	const resolvedImports = await getDefaultConfigLoader().resolveSettingsImports(rawSettings, process.cwd());
	const settings = mergeSettings(baseSettings, resolvedImports);
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
