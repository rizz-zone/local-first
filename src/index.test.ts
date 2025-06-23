import { test, expect, vi } from 'vitest'
import { a } from './index.ts'

const log = vi.spyOn(console, 'log')
test('some test', () => {
	a()
	expect(log).toHaveBeenCalledOnce()
	expect(log).toHaveBeenLastCalledWith('a')
})
