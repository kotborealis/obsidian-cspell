import path from 'node:path';

export const config: WebdriverIO.Config = {
	runner: 'local',
	specs: ['./test/specs/**/*.e2e.ts'],
	maxInstances: 1,
	capabilities: [
		{
			browserName: 'obsidian',
			browserVersion: 'latest',
			'goog:chromeOptions': {
				args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
			},
			'wdio:obsidianOptions': {
				installerVersion: 'latest',
				plugins: ['.'],
				vault: 'test/vaults/simple',
			},
		},
	],
	logLevel: 'warn',
	services: ['obsidian'],
	reporters: ['spec', 'obsidian'],
	framework: 'mocha',
	mochaOpts: {
		ui: 'bdd',
		timeout: 120000,
	},
	xvfbAutoInstall: true,
	cacheDir: path.resolve('.obsidian-cache'),
};
