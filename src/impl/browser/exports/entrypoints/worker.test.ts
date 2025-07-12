import { vi, beforeEach, describe, expect, it } from 'vitest'
import { workerEntrypoint } from './worker'
import { UpstreamWorkerMessageType } from '../../../../types/messages/worker/UpstreamWorkerMessage'
import { WorkerLocalFirst } from '../../helpers/worker_thread'

const workerScope = globalThis as unknown as DedicatedWorkerGlobalScope

const mockWorkerLocalFirstInstance = {
	init: vi.fn(),
	[Symbol.dispose]: vi.fn()
}

vi.mock('../../helpers/worker_thread', () => ({
	WorkerLocalFirst: vi.fn(() => mockWorkerLocalFirstInstance)
}))

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

		expect(WorkerLocalFirst).toHaveBeenCalledOnce()
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

	describe('Transition message handling', () => {
		it('should handle Transition message with string data', () => {
			workerEntrypoint()
			const message = {
				type: UpstreamWorkerMessageType.Transition,
				data: 'test-transition-data'
			}
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: message }))
			}).not.toThrow()
		})

		it('should handle Transition message with object data', () => {
			workerEntrypoint()
			const transitionData = {
				id: 'transition-1',
				timestamp: Date.now(),
				payload: { user: 'test', action: 'update' }
			}
			const message = {
				type: UpstreamWorkerMessageType.Transition,
				data: transitionData
			}
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: message }))
			}).not.toThrow()
		})

		it('should handle Transition message with null data', () => {
			workerEntrypoint()
			const message = {
				type: UpstreamWorkerMessageType.Transition,
				data: null
			}
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: message }))
			}).not.toThrow()
		})

		it('should handle Transition message with complex nested data', () => {
			workerEntrypoint()
			const complexData = {
				transitions: [
					{ from: 'state1', to: 'state2', trigger: 'event1' },
					{ from: 'state2', to: 'state3', trigger: 'event2' }
				],
				metadata: {
					version: '1.0',
					author: 'test-user',
					nested: { deep: { value: 42 } }
				}
			}
			const message = {
				type: UpstreamWorkerMessageType.Transition,
				data: complexData
			}
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: message }))
			}).not.toThrow()
		})
	})

	describe('Message handling edge cases', () => {
		it('should handle malformed message without type', () => {
			workerEntrypoint()
			const malformedMessage = { data: { wsUrl: 'ws://test', dbName: 'test' } }
			
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: malformedMessage }))
			}).not.toThrow()
		})

		it('should handle message with invalid type', () => {
			workerEntrypoint()
			const message = {
				type: 999 as any,
				data: { someData: 'value' }
			}
			
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: message }))
			}).not.toThrow()
		})

		it('should handle null message data', () => {
			workerEntrypoint()
			
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: null }))
			}).not.toThrow()
		})

		it('should handle undefined message data', () => {
			workerEntrypoint()
			
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: undefined }))
			}).not.toThrow()
		})

		it('should handle empty object message', () => {
			workerEntrypoint()
			
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: {} }))
			}).not.toThrow()
		})
	})

	describe('Init message variations', () => {
		it('should handle Init with additional properties', () => {
			workerEntrypoint()
			const message = {
				type: UpstreamWorkerMessageType.Init,
				data: { 
					wsUrl: 'ws://localhost:8080', 
					dbName: 'test-db',
					extraProperty: 'should be ignored'
				}
			}
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			workerScope.onmessage(new MessageEvent('message', { data: message }))

			expect(WorkerLocalFirst).toHaveBeenCalledOnce()
			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledWith({
				wsUrl: 'ws://localhost:8080',
				dbName: 'test-db',
				extraProperty: 'should be ignored'
			})
		})

		it('should handle Init with empty strings', () => {
			workerEntrypoint()
			const message = {
				type: UpstreamWorkerMessageType.Init,
				data: { wsUrl: '', dbName: '' }
			}
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			workerScope.onmessage(new MessageEvent('message', { data: message }))

			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledWith({
				wsUrl: '',
				dbName: ''
			})
		})

		it('should handle Init with special characters in URLs and names', () => {
			workerEntrypoint()
			const message = {
				type: UpstreamWorkerMessageType.Init,
				data: { 
					wsUrl: 'ws://localhost:8080/path?query=value&param=123#fragment',
					dbName: 'test-db_with-special.chars' 
				}
			}
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			workerScope.onmessage(new MessageEvent('message', { data: message }))

			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledWith({
				wsUrl: 'ws://localhost:8080/path?query=value&param=123#fragment',
				dbName: 'test-db_with-special.chars'
			})
		})
	})

	describe('Error handling scenarios', () => {
		it('should handle WorkerLocalFirst constructor throwing error', () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})
			
			vi.mocked(WorkerLocalFirst).mockImplementation(() => {
				throw new Error('Constructor failed')
			})
			
			expect(() => {
				workerEntrypoint()
			}).toThrow('Constructor failed')
			
			consoleErrorSpy.mockRestore()
		})

		it('should handle WorkerLocalFirst init method throwing error', () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})
			
			const mockInstance = {
				init: vi.fn(() => { throw new Error('Init failed') }),
				[Symbol.dispose]: vi.fn()
			}
			vi.mocked(WorkerLocalFirst).mockImplementation(() => mockInstance)
			
			workerEntrypoint()
			const message = {
				type: UpstreamWorkerMessageType.Init,
				data: { wsUrl: 'ws://localhost:8080', dbName: 'test-db' }
			}
			
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: message }))
			}).toThrow('Init failed')
			
			consoleErrorSpy.mockRestore()
		})
	})

	describe('MessageEvent properties and variations', () => {
		it('should handle MessageEvent with additional properties', () => {
			workerEntrypoint()
			const message = {
				type: UpstreamWorkerMessageType.Init,
				data: { wsUrl: 'ws://localhost:8080', dbName: 'test-db' }
			}
			
			const messageEvent = new MessageEvent('message', {
				data: message,
				origin: 'http://localhost:3000',
				source: null,
				ports: []
			})
			
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(messageEvent)
			}).not.toThrow()
			
			expect(WorkerLocalFirst).toHaveBeenCalledOnce()
		})

		it('should handle different error event data types', () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})
			
			workerEntrypoint()
			
			if (!workerScope.onmessageerror) throw new Error('onmessageerror is not defined')
			
			const errorEvent1 = new MessageEvent('messageerror', { data: 'string error' })
			const errorEvent2 = new MessageEvent('messageerror', { data: { error: 'object error' } })
			const errorEvent3 = new MessageEvent('messageerror', { data: 123 })
			const errorEvent4 = new MessageEvent('messageerror', { data: null })
			
			expect(() => {
				workerScope.onmessageerror(errorEvent1)
				workerScope.onmessageerror(errorEvent2)
				workerScope.onmessageerror(errorEvent3)
				workerScope.onmessageerror(errorEvent4)
			}).not.toThrow()
			
			expect(consoleErrorSpy).toHaveBeenCalledTimes(8) // 2 calls per error event
			consoleErrorSpy.mockRestore()
		})
	})

	describe('Ping message edge cases', () => {
		it('should log error for Ping message with unexpected data structure', () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})
			
			workerEntrypoint()
			const message = {
				type: UpstreamWorkerMessageType.Ping,
				data: { unexpected: 'data', should: 'be ignored' }
			}
			
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			workerScope.onmessage(new MessageEvent('message', { data: message }))
			
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"main thread tried to ping worker even though it isn't a SharedWorker!"
			)
			consoleErrorSpy.mockRestore()
		})
	})

	describe('Mixed message sequences', () => {
		it('should handle sequence of different message types', () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})
			
			workerEntrypoint()
			
			const initMessage = {
				type: UpstreamWorkerMessageType.Init,
				data: { wsUrl: 'ws://localhost:8080', dbName: 'test-db' }
			}
			const transitionMessage = {
				type: UpstreamWorkerMessageType.Transition,
				data: { id: 'test-transition' }
			}
			const pingMessage = {
				type: UpstreamWorkerMessageType.Ping
			}
			
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			// Send sequence of messages
			workerScope.onmessage(new MessageEvent('message', { data: initMessage }))
			workerScope.onmessage(new MessageEvent('message', { data: transitionMessage }))
			workerScope.onmessage(new MessageEvent('message', { data: pingMessage }))
			
			expect(WorkerLocalFirst).toHaveBeenCalledOnce()
			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledOnce()
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"main thread tried to ping worker even though it isn't a SharedWorker!"
			)
			
			consoleErrorSpy.mockRestore()
		})

		it('should handle rapid succession of same message type', () => {
			workerEntrypoint()
			
			const messages = Array.from({ length: 5 }, (_, i) => ({
				type: UpstreamWorkerMessageType.Transition,
				data: { id: `transition-${i}`, index: i }
			}))
			
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				messages.forEach(message => {
					workerScope.onmessage(new MessageEvent('message', { data: message }))
				})
			}).not.toThrow()
		})
	})

	describe('Global scope behavior', () => {
		it('should replace any existing onmessage handler', () => {
			const existingHandler = vi.fn()
			workerScope.onmessage = existingHandler
			
			workerEntrypoint()
			
			expect(workerScope.onmessage).not.toBe(existingHandler)
			expect(workerScope.onmessage).toBeTypeOf('function')
		})

		it('should replace any existing onmessageerror handler', () => {
			const existingHandler = vi.fn()
			workerScope.onmessageerror = existingHandler
			
			workerEntrypoint()
			
			expect(workerScope.onmessageerror).not.toBe(existingHandler)
			expect(workerScope.onmessageerror).toBeTypeOf('function')
		})

		it('should maintain WorkerLocalFirst instance across multiple messages', () => {
			workerEntrypoint()
			
			const initMessage = {
				type: UpstreamWorkerMessageType.Init,
				data: { wsUrl: 'ws://localhost:8080', dbName: 'test-db' }
			}
			const transitionMessage = {
				type: UpstreamWorkerMessageType.Transition,
				data: { id: 'test' }
			}
			
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			workerScope.onmessage(new MessageEvent('message', { data: initMessage }))
			workerScope.onmessage(new MessageEvent('message', { data: transitionMessage }))
			
			// Should only create one instance
			expect(WorkerLocalFirst).toHaveBeenCalledOnce()
			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledOnce()
		})
	})
