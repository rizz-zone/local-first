import { describe, expect, it } from 'vitest'
import {
	BrowserLocalFirst as IndexBrowserLocalFirst,
	createDurableObject as IndexCreateDurableObject,
	sharedWorkerEntrypoint as IndexSharedWorkerEntrypoint,
	workerEntrypoint as IndexWorkerEntrypoint
} from './'
import { BrowserLocalFirst } from './impl/browser/exports/browser'
import { createDurableObject } from './impl/do/exports/durable_object'
import { sharedWorkerEntrypoint } from './impl/browser/exports/entrypoints/shared_worker'
import { workerEntrypoint } from './impl/browser/exports/entrypoints/worker'

describe('main entrypoint', () => {
	it('exports the same BrowserLocalFirst as browser.ts', () => {
		expect(IndexBrowserLocalFirst).toStrictEqual(BrowserLocalFirst)
	})

	it('exports the same createDurableObject as durable_object.ts', () => {
		expect(IndexCreateDurableObject).toStrictEqual(createDurableObject)
	})

	it('exports the same sharedWorkerEntrypoint as shared_worker.ts', () => {
		expect(IndexSharedWorkerEntrypoint).toStrictEqual(sharedWorkerEntrypoint)
	})

	it('exports the same workerEntrypoint as worker.ts', () => {
		expect(IndexWorkerEntrypoint).toStrictEqual(workerEntrypoint)
	})
})