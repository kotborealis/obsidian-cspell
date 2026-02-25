import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				project: ['./tsconfig.eslint.json'],
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json']
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		files: ["test/**/*.ts", "tests/**/*.ts"],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				...globals.mocha,
				browser: "readonly",
			},
		},
		rules: {
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/await-thenable": "off",
			"@typescript-eslint/no-deprecated": "off",
			"import/no-nodejs-modules": "off",
		},
	},
	{
		files: ["src/spellcheck/cspell-lib.ts"],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
		rules: {
			"import/no-nodejs-modules": "off",
		},
	},
	globalIgnores([
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"eslint.config.js",
		"version-bump.mjs",
		"versions.json",
		"main.js",
	]),
);
