import { configDefaults, defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
	test: {
		exclude: [...configDefaults.exclude, '**/*.config.ts'],
		coverage: {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			exclude: [...configDefaults.coverage.exclude!, '**/*.config.ts'],
			reporter: ['lcov', 'text']
		},
		globals: true,
		environment: 'jsdom'
	},
	// @ts-expect-error There's some kind of type conflict but the plugin definitely works
	plugins: [tsconfigPaths()]
})
