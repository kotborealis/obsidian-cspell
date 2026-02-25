import fs from 'node:fs';
import { defineConfig } from 'vitest/config';

const gzipBinaryPlugin = {
	name: 'gzip-binary-loader',
	enforce: 'pre',
	load(id: string) {
		if (!id.endsWith('.gz')) {
			return null;
		}
		const data = fs.readFileSync(id);
		const base64 = data.toString('base64');
		return `import { Buffer } from 'node:buffer'; export default new Uint8Array(Buffer.from('${base64}', 'base64'));`;
	},
};

export default defineConfig({
	plugins: [gzipBinaryPlugin],
	test: {
		include: ['tests/**/*.test.ts'],
	},
});
