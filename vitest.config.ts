import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		exclude: [...configDefaults.exclude, '**/*.config.ts'],
		coverage: {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			exclude: [...configDefaults.coverage.exclude!, '**/*.config.ts']
		},
		globals: true
	}
})
