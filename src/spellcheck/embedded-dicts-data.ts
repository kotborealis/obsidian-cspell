import type { CSpellUserSettings } from 'cspell-lib';
import enUsTrie from '../../dicts/en_us/en_US.trie.gz';
import ruRuTrie from '../../dicts/ru_ru/ru_ru.trie.gz';

export interface DefaultDictionaryPaths {
	enUs: string;
	ruRu: string;
}

export const DEFAULT_DICTIONARY_TRIES = {
	enUs: enUsTrie,
	ruRu: ruRuTrie,
};

export function getDefaultDictionarySettings(paths: DefaultDictionaryPaths): Pick<
	CSpellUserSettings,
	'dictionaryDefinitions' | 'languageSettings'
> {
	return {
		dictionaryDefinitions: [
			{
				name: 'en_us',
				path: paths.enUs,
				description: 'American English Dictionary',
				ignoreForbiddenWords: true,
			},
			{
				name: 'ru-ru',
				path: paths.ruRu,
				description: 'Russian Dictionary (Combined)',
				ignoreForbiddenWords: true,
			},
		],
		languageSettings: [
			{
				languageId: '*',
				locale: 'en,en-US',
				dictionaries: ['en_us'],
			},
			{
				languageId: '*',
				locale: 'ru,ru-ru',
				dictionaries: ['ru-ru'],
			},
		],
	};
}

export function toArrayBuffer(data: Uint8Array): ArrayBuffer {
	return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}
