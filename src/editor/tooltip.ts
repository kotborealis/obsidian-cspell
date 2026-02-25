import { EditorView, type Decoration, type Tooltip, showTooltip } from '@codemirror/view';
import { StateField } from '@codemirror/state';
import type ObsidianCSpellPlugin from '../main';
import { clearUnderlines, setUnderlines, underlineDecoration } from './underlines';
import type { SpellcheckIssue } from '../spellcheck/cspell-lib';

function normalizeWords(raw: string): string[] {
	return raw
		.split(/[\s,]+/)
		.map((word) => word.trim())
		.filter(Boolean);
}

function addCustomWord(plugin: ObsidianCSpellPlugin, word: string): Promise<void> {
	const words = normalizeWords(plugin.settings.customWords);
	if (!words.includes(word)) {
		words.push(word);
		plugin.settings.customWords = words.join(' ');
		return plugin.saveSettings();
	}
	return Promise.resolve();
}

function getUnderlineIssue(value: Decoration): SpellcheckIssue | null {
	const spec = value.spec as { cspellIssue?: SpellcheckIssue };
	return spec?.cspellIssue ?? null;
}

function buildTooltip(plugin: ObsidianCSpellPlugin, state: EditorView['state'], existing: Tooltip | null): Tooltip | null {
	const selection = state.selection.main;
	if (state.selection.ranges.length > 1) {
		return null;
	}

	const underlines = state.field(underlineDecoration);
	if (!underlines.size) {
		return null;
	}

	let issue: SpellcheckIssue | null = null;
	let issueStart = -1;
	let issueEnd = -1;
	const rangeFrom = selection.empty ? Math.max(0, selection.from - 1) : selection.from;
	const rangeTo = selection.empty ? selection.from + 1 : selection.to;
	underlines.between(rangeFrom, rangeTo, (from, to, value) => {
		if (!issue) {
			const match = getUnderlineIssue(value);
			if (match) {
				issue = match;
				issueStart = from;
				issueEnd = to;
			}
		}
	});

	if (!issue) {
		return null;
	}

	const issueWord = (issue as SpellcheckIssue).word;

	if (!selection.empty) {
		const matchesUnderline = selection.from === issueStart && selection.to === issueEnd;
		if (!matchesUnderline) {
			return null;
		}
	}

	if (existing && existing.pos === issueStart && existing.end === issueEnd) {
		return existing;
	}

	return {
		pos: issueStart,
		end: issueEnd,
		above: true,
		strictSide: false,
		arrow: false,
		create(view) {
			const dom = document.createElement('div');
			dom.className = 'cspell-tooltip';

			const title = document.createElement('div');
			title.className = 'cspell-tooltip-title';
			title.textContent = 'Spelling issue';
			dom.appendChild(title);

			const word = document.createElement('div');
			word.className = 'cspell-tooltip-word';
			word.textContent = issueWord;
			dom.appendChild(word);

			const actions = document.createElement('div');
			actions.className = 'cspell-tooltip-actions';

			const ignoreButton = document.createElement('button');
			ignoreButton.type = 'button';
			ignoreButton.textContent = 'Add to custom words';
			ignoreButton.addEventListener('click', async () => {
				await addCustomWord(plugin, issueWord);
				view.dispatch({ effects: [clearUnderlines.of(null)] });
			});

			actions.appendChild(ignoreButton);
			dom.appendChild(actions);

			return { dom };
		},
	};
}

export function createSpellcheckTooltip(plugin: ObsidianCSpellPlugin): StateField<Tooltip | null> {
	return StateField.define<Tooltip | null>({
		create(state) {
			return buildTooltip(plugin, state, null);
		},
		update(value, tr) {
			if (tr.docChanged) {
				return null;
			}
			const selectionChanged = tr.selection !== tr.startState.selection;
			if (selectionChanged) {
				return buildTooltip(plugin, tr.state, null);
			}

			if (tr.effects.some((effect) => effect.is(clearUnderlines) || effect.is(setUnderlines))) {
				return buildTooltip(plugin, tr.state, value);
			}
			return value;
		},
		provide: (field) => showTooltip.computeN([field], (state) => {
			const tooltip = state.field(field);
			return tooltip ? [tooltip] : [];
		}),
	});
}
