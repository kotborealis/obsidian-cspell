import type { CSpellUserSettings, Document, ValidationIssue } from 'cspell-lib';
import { getDefaultBundledSettingsAsync, mergeSettings, spellCheckDocument } from 'cspell-lib';
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
	return {
		language: input.settings.language,
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

export async function runCSpell(content: string, input: CSpellRunInput): Promise<SpellcheckResult> {
	const baseSettings = await getDefaultSettings();
	const settings = mergeSettings(baseSettings, createSettings(input));
	const document: Document = {
		uri: input.filename,
		text: content,
		languageId: 'markdown',
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
