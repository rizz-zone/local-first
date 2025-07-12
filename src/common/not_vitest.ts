export const notVitest = () =>
	// @ts-expect-error We check if 'env' exists first
	'env' in import.meta && 'VITEST' in import.meta.env
