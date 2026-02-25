import { expect } from '@wdio/globals';
import { describe, it, before, beforeEach } from 'mocha';
import { obsidianPage } from 'wdio-obsidian-service';

const COMMAND_ID = 'obsidian-cspell:cspell-check-current-note';

async function waitForNoticeText(expectedText: string): Promise<void> {
	await browser.waitUntil(async () => {
		const notices = await browser.$$('.notice');
		for (const notice of notices) {
			const text = await notice.getText();
			if (text.includes(expectedText)) {
				return true;
			}
		}
		return false;
	}, { timeout: 15000, timeoutMsg: `Expected notice containing "${expectedText}"` });
}

async function setActiveNoteContent(noteContent: string): Promise<void> {
	await browser.executeObsidian(async ({ app, obsidian }, content) => {
		const file = app.vault.getAbstractFileByPath('Welcome.md');
		if (file instanceof obsidian.TFile) {
			await app.vault.modify(file, content);
			await app.workspace.getLeaf(false).openFile(file);
		}
	}, noteContent);

	await browser.waitUntil(async () => {
		return browser.executeObsidian(({ app }) => {
			const active = app.workspace.getActiveFile();
			return active?.path === 'Welcome.md';
		});
	}, { timeout: 10000, timeoutMsg: 'Expected Welcome.md to be active' });
}

async function runSpellcheckCommand(): Promise<void> {
	const ran = await browser.executeObsidian(({ app }, commandId) => {
		return app.commands.executeCommandById(commandId);
	}, COMMAND_ID);
	if (!ran) {
		throw new Error(`Failed to run command: ${COMMAND_ID}`);
	}
}

async function runSpellcheckAndGetNoticeText(): Promise<string> {
	const text = await browser.executeObsidian(async ({ app }, commandId) => {
		document.querySelectorAll('.notice').forEach((notice) => notice.remove());
		const ran = app.commands.executeCommandById(commandId);
		if (!ran) {
			return '';
		}
		const timeoutMs = 20000;
		const start = Date.now();
		while (Date.now() - start < timeoutMs) {
			const notices = Array.from(document.querySelectorAll('.notice'));
			const text = notices.map((notice) => notice.textContent ?? '').join(' | ').trim();
			if (text) {
				return text;
			}
			await new Promise((resolve) => setTimeout(resolve, 200));
		}
		return '';
	}, COMMAND_ID);

	return text;
}

async function disableConfigLoading(): Promise<void> {
	await browser.waitUntil(async () => {
		return browser.executeObsidian(({ app }) => Boolean(app.plugins.getPlugin('obsidian-cspell')));
	}, { timeout: 20000, timeoutMsg: 'obsidian-cspell plugin did not load in time' });

	await browser.executeObsidian(async ({ app }) => {
		const plugin = app.plugins.getPlugin('obsidian-cspell');
		if (!plugin) {
			throw new Error('obsidian-cspell plugin not loaded');
		}
		plugin.settings.enabled = true;
		plugin.settings.language = 'en';
		plugin.settings.customWords = '';
		plugin.settings.useWordsFromConfig = false;
		await plugin.saveSettings();
	});
}

async function setCustomWords(words: string): Promise<void> {
	await browser.executeObsidian(async ({ app }, value) => {
		const plugin = app.plugins.getPlugin('obsidian-cspell');
		if (!plugin) {
			throw new Error('obsidian-cspell plugin not loaded');
		}
		plugin.settings.customWords = value;
		await plugin.saveSettings();
	}, words);
}

describe('Obsidian CSpell plugin', () => {
	before(async () => {
		await browser.reloadObsidian({ vault: 'test/vaults/simple' });
	});

	beforeEach(async () => {
		await obsidianPage.resetVault('test/vaults/simple');
		await disableConfigLoading();
	});

	it('reports misspellings in the current note', async () => {
		await setActiveNoteContent('This has a misspelld word.');
		await browser.pause(1000);
		await runSpellcheckCommand();
		await waitForNoticeText('Found');
	});

	it('reports no issues for clean text', async () => {
		const sentence = 'This sentence is spelled correctly.';
		await setActiveNoteContent(sentence);
		await browser.pause(1000);
		await setCustomWords('This sentence is spelled correctly');
		const noticeText = await runSpellcheckAndGetNoticeText();
		if (!noticeText) {
			throw new Error('Expected a notice to appear');
		}
		expect(noticeText).toContain('No spelling issues found.');
	});
});
