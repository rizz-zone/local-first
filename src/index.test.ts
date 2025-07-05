import { describe, expect, it } from 'vitest'
import { BrowserLocalFirst as IndexBrowserLocalFirst } from './'
import { BrowserLocalFirst } from './exports/browser'

describe('main entrypoint', () => {
	it('exports the same BrowserLocalFirst as browser.ts', () => {
		expect(IndexBrowserLocalFirst).toStrictEqual(BrowserLocalFirst)
	})
	// TODO: durable_object.ts doesn't export anything yet
})
