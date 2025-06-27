import { beforeEach, describe, expect, it } from 'vitest'
import { sharedWorkerEntrypoint } from './shared_worker'
import { NoPortsError } from '../errors'

const ctx = self as unknown as SharedWorkerGlobalScope

describe('SharedWorker entrypoint', () => {
	beforeEach(() => {
		// @ts-expect-error We want to reset it despite what Normal Usage Patterns would be
		ctx.onconnect = undefined
	})
	describe('constructor', () => {
		it('sets onconnect', () => {
			sharedWorkerEntrypoint()
			expect(ctx.onconnect).toBeDefined()
			expect(ctx.onconnect).toBeTypeOf('function')
		})
		it('throws if no port is provided', () => {
			sharedWorkerEntrypoint()
			expect(() => {
				if (typeof ctx.onconnect !== 'function')
					throw new Error('precondition not satisfied')
				ctx.onconnect(new MessageEvent('connect', { ports: [] }))
			}).toThrow(NoPortsError)
		})
	})
})
