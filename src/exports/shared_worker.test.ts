import { vi, beforeEach, describe, expect, it } from 'vitest'
import { sharedWorkerEntrypoint } from './shared_worker'
import { NoPortsError } from '../errors'
import { UpstreamWorkerMessageType } from '../types/messages/worker/UpstreamWorkerMessage'
import { WorkerLocalFirst } from '../classes/worker_thread'

const mockWorkerLocalFirstInstance = {
	init: vi.fn(),
	[Symbol.dispose]: vi.fn()
}

vi.mock('../classes/worker_thread', () => ({
	WorkerLocalFirst: vi.fn(() => mockWorkerLocalFirstInstance)
}))

const mockedWorkerLocalFirst = vi.mocked(WorkerLocalFirst)

const ctx = self as unknown as SharedWorkerGlobalScope

describe('SharedWorker entrypoint', () => {
	beforeEach(() => {
		// @ts-expect-error We want to reset it despite what Normal Usage Patterns would be
		ctx.onconnect = undefined
		vi.clearAllMocks()
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

	describe('onconnect', () => {
		it('should set onmessageerror handler', () => {
			sharedWorkerEntrypoint()
			const port = new MessageChannel().port1
			const event = new MessageEvent('connect', { ports: [port] })

			if (typeof ctx.onconnect !== 'function') {
				throw new Error('precondition not satisfied')
			}
			ctx.onconnect(event)

			expect(port.onmessageerror).toBeTypeOf('function')
		})

		it('should create a new WorkerLocalFirst if one does not exist', () => {
			sharedWorkerEntrypoint()
			const port = new MessageChannel().port1
			const event = new MessageEvent('connect', { ports: [port] })

			if (typeof ctx.onconnect !== 'function') {
				throw new Error('precondition not satisfied')
			}
			ctx.onconnect(event)

			const message = {
				type: UpstreamWorkerMessageType.Init,
				data: { wsUrl: 'ws://localhost:8080', dbName: 'test-db' }
			}
			if (!port.onmessage) throw new Error('port.onmessage is not defined')
			port.onmessage(new MessageEvent('message', { data: message }))

			expect(mockedWorkerLocalFirst).toHaveBeenCalledOnce()
			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledWith({
				wsUrl: 'ws://localhost:8080',
				dbName: 'test-db'
			})
		})

		it('should not create a new WorkerLocalFirst if one already exists', () => {
			sharedWorkerEntrypoint()
			const port1 = new MessageChannel().port1
			const port2 = new MessageChannel().port1

			if (typeof ctx.onconnect !== 'function') {
				throw new Error('precondition not satisfied')
			}
			ctx.onconnect(new MessageEvent('connect', { ports: [port1] }))
			ctx.onconnect(new MessageEvent('connect', { ports: [port2] }))

			const message = {
				type: UpstreamWorkerMessageType.Init,
				data: { wsUrl: 'ws://localhost:8080', dbName: 'test-db' }
			}
			if (!port1.onmessage) throw new Error('port1.onmessage is not defined')
			port1.onmessage(new MessageEvent('message', { data: message }))
			if (!port2.onmessage) throw new Error('port2.onmessage is not defined')
			port2.onmessage(new MessageEvent('message', { data: message }))

			expect(mockedWorkerLocalFirst).toHaveBeenCalledOnce()
			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledOnce()
		})

		it('should do nothing on Init if objectKey is already set for that port', () => {
			sharedWorkerEntrypoint()
			const port = new MessageChannel().port1

			if (typeof ctx.onconnect !== 'function') {
				throw new Error('precondition not satisfied')
			}
			ctx.onconnect(new MessageEvent('connect', { ports: [port] }))

			const message = {
				type: UpstreamWorkerMessageType.Init,
				data: { wsUrl: 'ws://localhost:8080', dbName: 'test-db' }
			}
			if (!port.onmessage) throw new Error('port.onmessage is not defined')
			port.onmessage(new MessageEvent('message', { data: message }))
			port.onmessage(new MessageEvent('message', { data: message })) // second time

			expect(mockedWorkerLocalFirst).toHaveBeenCalledOnce()
			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledOnce()
		})

		it('should log error on message error', () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})
			sharedWorkerEntrypoint()
			const port = new MessageChannel().port1
			const event = new MessageEvent('connect', { ports: [port] })

			if (typeof ctx.onconnect !== 'function') {
				throw new Error('precondition not satisfied')
			}
			ctx.onconnect(event)

			const errorEvent = new MessageEvent('messageerror', {
				data: 'test error'
			})
			if (!port.onmessageerror)
				throw new Error('port.onmessageerror is not defined')
			port.onmessageerror(errorEvent)

			expect(consoleErrorSpy).toHaveBeenCalled()
			consoleErrorSpy.mockRestore()
		})
	})
})
