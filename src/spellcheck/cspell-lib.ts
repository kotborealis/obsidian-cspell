import type { CSpellUserSettings, Document, ValidationIssue } from 'cspell-lib';
import { spellCheckDocument } from 'cspell-lib';
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

interface CSpellIssue {
	text?: string;
	word?: string;
	offset?: number;
	length?: number;
}

interface CSpellCheckResult {
	issues?: CSpellIssue[];
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

export async function runCSpell(content: string, input: CSpellRunInput): Promise<SpellcheckResult> {
	const settings = createSettings(input);
	const document: Document = {
		uri: input.filename,
		text: content,
		languageId: 'markdown',
	};

	const result = await spellCheckDocument(document, { generateSuggestions: false }, settings);
	if (result.errors?.length) {
		throw result.errors[0];
	}

	const issues = normalizeIssues(result.issues);
	const unknownWords = [...new Set(issues.map((issue) => issue.word))];

	return {
		unknownWords,
		issues,
		rawOutput: JSON.stringify(result.issues),
	};
}
