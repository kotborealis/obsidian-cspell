import type { CSpellPluginSettings } from '../settings';

export interface SpellcheckResult {
	unknownWords: string[];
	rawOutput: string;
}

interface CSpellIssue {
	text?: string;
	word?: string;
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

type CSpellLibLike = {
	checkText?: (text: string, options?: Record<string, unknown>) => Promise<CSpellCheckResult>;
	checkTextAndGetSuggestions?: (text: string, options?: Record<string, unknown>) => Promise<CSpellCheckResult>;
};

let cachedLib: CSpellLibLike | null = null;

async function loadCSpellLib(): Promise<CSpellLibLike> {
	if (cachedLib) {
		return cachedLib;
	}

	const moduleName = ['@cspell', 'cspell-lib'].join('/');
	const imported = (await import(moduleName)) as CSpellLibLike;
	cachedLib = imported;
	return imported;
}

function parseCustomWords(customWords: string): string[] {
	return customWords
		.split(/[\s,]+/)
		.map((word) => word.trim())
		.filter(Boolean);
}

function normalizeIssues(result: CSpellCheckResult): string[] {
	const unique = new Set<string>();
	for (const issue of result.issues ?? []) {
		const word = issue.text ?? issue.word;
		if (word) {
			unique.add(word);
		}
	}
	return [...unique];
}

export async function runCSpell(content: string, input: CSpellRunInput): Promise<SpellcheckResult> {
	const cspellLib = await loadCSpellLib();
	const options = {
		languageId: input.settings.language,
		ignoreWords: [
			...parseCustomWords(input.settings.customWords),
			...(input.configIgnoreWords ?? []),
		],
		words: input.configWords ?? [],
		fileUri: input.filename,
	};

	const checkText = cspellLib.checkTextAndGetSuggestions ?? cspellLib.checkText;
	if (!checkText) {
		throw new Error('Failed to load @cspell/cspell-lib API.');
	}

	const result = await checkText(content, options);
	const unknownWords = normalizeIssues(result);

	return {
		unknownWords,
		rawOutput: JSON.stringify(result),
	};
}
