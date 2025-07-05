import { vi, beforeEach, describe, expect, it } from 'vitest'
import { workerEntrypoint } from './worker'
import { UpstreamWorkerMessageType } from '../../types/messages/worker/UpstreamWorkerMessage'
import { WorkerLocalFirst } from '../../classes/worker_thread'

const workerScope = globalThis as unknown as DedicatedWorkerGlobalScope

const mockWorkerLocalFirstInstance = {
	init: vi.fn(),
	[Symbol.dispose]: vi.fn()
}

vi.mock('../../classes/worker_thread', () => ({
	WorkerLocalFirst: vi.fn(() => mockWorkerLocalFirstInstance)
}))

const mockedWorkerLocalFirst = vi.mocked(WorkerLocalFirst)

describe('Worker entrypoint', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should set onmessage and onmessageerror handlers', () => {
		workerEntrypoint()
		expect(onmessage).toBeDefined()
		expect(onmessage).toBeTypeOf('function')
		expect(onmessageerror).toBeDefined()
		expect(onmessageerror).toBeTypeOf('function')
	})

	it('should create a new WorkerLocalFirst and initialize it on Init message', () => {
		workerEntrypoint()
		const message = {
			type: UpstreamWorkerMessageType.Init,
			data: { wsUrl: 'ws://localhost:8080', dbName: 'test-db' }
		}
		if (!workerScope.onmessage) throw new Error('onmessage is not defined')
		workerScope.onmessage(new MessageEvent('message', { data: message }))

		expect(mockedWorkerLocalFirst).toHaveBeenCalledOnce()
		expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledWith({
			wsUrl: 'ws://localhost:8080',
			dbName: 'test-db'
		})
	})

	it('should log an error on Ping message', () => {
		const consoleErrorSpy = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {})
		workerEntrypoint()
		const message = {
			type: UpstreamWorkerMessageType.Ping
		}
		if (!workerScope.onmessage) throw new Error('onmessage is not defined')
		workerScope.onmessage(new MessageEvent('message', { data: message }))

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			"main thread tried to ping worker even though it isn't a SharedWorker!"
		)
		consoleErrorSpy.mockRestore()
	})

	it('should log error on message error', () => {
		const consoleErrorSpy = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {})
		workerEntrypoint()
		const errorEvent = new MessageEvent('messageerror', {
			data: 'test error'
		})
		if (!workerScope.onmessageerror)
			throw new Error('onmessageerror is not defined')
		workerScope.onmessageerror(errorEvent)

		expect(consoleErrorSpy).toHaveBeenCalled()
		consoleErrorSpy.mockRestore()
	})
})
