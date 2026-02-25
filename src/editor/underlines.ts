import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';
import { RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { SyntaxNode, Tree } from '@lezer/common';
import type { SpellcheckIssue } from '../spellcheck/cspell-lib';

function createMisspelledWordMark(issue: SpellcheckIssue): Decoration {
	return Decoration.mark({
		class: 'cspell-misspelled-word',
		cspellIssue: issue,
	});
}

const ignoreListRegEx = /(frontmatter|code|math|templater|blockid|hashtag)/i;

export const setUnderlines = StateEffect.define<SpellcheckIssue[]>();
export const clearUnderlines = StateEffect.define<null>();

export const underlineDecoration = StateField.define<DecorationSet>({
	create() {
		return Decoration.none;
	},
	update(underlines, tr) {
		underlines = underlines.map(tr.changes);

		const seenPositions: Record<number, boolean> = {};
		let tree: Tree | null = null;

		const canDecorate = (pos: number) => {
			if (seenPositions[pos] === undefined) {
				if (!tree) {
					tree = syntaxTree(tr.state);
				}
				let node: SyntaxNode | null = tree.resolveInner(pos, 1);
				let shouldIgnore = false;
				while (node) {
					if (ignoreListRegEx.test(node.type.name)) {
						shouldIgnore = true;
						break;
					}
					node = node.parent;
				}
				seenPositions[pos] = !shouldIgnore;
			}
			return seenPositions[pos];
		};

		for (const effect of tr.effects) {
			if (effect.is(clearUnderlines)) {
				underlines = Decoration.none;
				continue;
			}

			if (!effect.is(setUnderlines)) {
				continue;
			}

			const builder: RangeSetBuilder<Decoration> = new RangeSetBuilder();
			const docLength = tr.state.doc.length;
			for (const issue of effect.value) {
				const from = Math.max(0, Math.min(docLength, issue.offset));
				const to = Math.max(from, Math.min(docLength, issue.offset + issue.length));
				if (from === to) {
					continue;
				}
				if (!canDecorate(from) || !canDecorate(to)) {
					continue;
				}
				builder.add(from, to, createMisspelledWordMark(issue));
			}
			underlines = builder.finish();
		}

		return underlines;
	},
	provide: (field) => EditorView.decorations.from(field),
});
