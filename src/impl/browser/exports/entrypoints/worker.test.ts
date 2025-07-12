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
		// Clear any existing handlers
		workerScope.onmessage = null
		workerScope.onmessageerror = null
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

	// Additional comprehensive test cases

	describe('Transition message handling', () => {
		it('should handle Transition messages without errors', () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})
			
			workerEntrypoint()
			const transitionMessage = {
				type: UpstreamWorkerMessageType.Transition,
				data: { someTransition: 'data' }
			}

			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: transitionMessage }))
			}).not.toThrow()

			// Transition messages should not trigger any specific action or errors
			expect(consoleErrorSpy).not.toHaveBeenCalled()
			expect(mockWorkerLocalFirstInstance.init).not.toHaveBeenCalled()

			consoleErrorSpy.mockRestore()
		})

		it('should handle Transition messages with various data types', () => {
			workerEntrypoint()
			const transitionMessages = [
				{ type: UpstreamWorkerMessageType.Transition, data: null },
				{ type: UpstreamWorkerMessageType.Transition, data: undefined },
				{ type: UpstreamWorkerMessageType.Transition, data: 'string' },
				{ type: UpstreamWorkerMessageType.Transition, data: 42 },
				{ type: UpstreamWorkerMessageType.Transition, data: { complex: 'object' } },
				{ type: UpstreamWorkerMessageType.Transition, data: [1, 2, 3] }
			]

			if (!workerScope.onmessage) throw new Error('onmessage is not defined')

			transitionMessages.forEach(message => {
				expect(() => {
					workerScope.onmessage(new MessageEvent('message', { data: message }))
				}).not.toThrow()
			})
		})
	})

	describe('WorkerLocalFirst instance management', () => {
		it('should create only one WorkerLocalFirst instance per entrypoint call', () => {
			workerEntrypoint()
			
			const message1 = {
				type: UpstreamWorkerMessageType.Init,
				data: { wsUrl: 'ws://localhost:8080', dbName: 'test-db-1' }
			}
			const message2 = {
				type: UpstreamWorkerMessageType.Init,
				data: { wsUrl: 'ws://localhost:8081', dbName: 'test-db-2' }
			}

			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			workerScope.onmessage(new MessageEvent('message', { data: message1 }))
			workerScope.onmessage(new MessageEvent('message', { data: message2 }))

			// Should create only one instance but call init twice
			expect(WorkerLocalFirst).toHaveBeenCalledTimes(1)
			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledTimes(2)
			expect(mockWorkerLocalFirstInstance.init).toHaveBeenNthCalledWith(1, {
				wsUrl: 'ws://localhost:8080',
				dbName: 'test-db-1'
			})
			expect(mockWorkerLocalFirstInstance.init).toHaveBeenNthCalledWith(2, {
				wsUrl: 'ws://localhost:8081',
				dbName: 'test-db-2'
			})
		})

		it('should create new WorkerLocalFirst instances for multiple entrypoint calls', () => {
			workerEntrypoint()
			workerEntrypoint()

			expect(WorkerLocalFirst).toHaveBeenCalledTimes(2)
		})

		it('should dispose WorkerLocalFirst instance properly', () => {
			workerEntrypoint()
			
			expect(mockWorkerLocalFirstInstance[Symbol.dispose]).toBeDefined()
			expect(typeof mockWorkerLocalFirstInstance[Symbol.dispose]).toBe('function')
		})
	})

	describe('Init message validation', () => {
		it('should handle Init message with empty strings', () => {
			workerEntrypoint()
			const message = {
				type: UpstreamWorkerMessageType.Init,
				data: { wsUrl: '', dbName: '' }
			}
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: message }))
			}).not.toThrow()

			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledWith({
				wsUrl: '',
				dbName: ''
			})
		})

		it('should handle Init message with special characters', () => {
			workerEntrypoint()
			const message = {
				type: UpstreamWorkerMessageType.Init,
				data: { 
					wsUrl: 'ws://localhost:8080/path?query=value&special=chars!@#$%^&*()', 
					dbName: 'test-db-with-special-chars_123' 
				}
			}
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: message }))
			}).not.toThrow()

			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledWith({
				wsUrl: 'ws://localhost:8080/path?query=value&special=chars!@#$%^&*()',
				dbName: 'test-db-with-special-chars_123'
			})
		})

		it('should handle Init message with very long URLs and names', () => {
			workerEntrypoint()
			const longUrl = 'ws://localhost:8080/' + 'a'.repeat(1000)
			const longDbName = 'db_' + 'b'.repeat(1000)
			
			const message = {
				type: UpstreamWorkerMessageType.Init,
				data: { wsUrl: longUrl, dbName: longDbName }
			}
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: message }))
			}).not.toThrow()

			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledWith({
				wsUrl: longUrl,
				dbName: longDbName
			})
		})
	})

	describe('Error handling scenarios', () => {
		it('should handle WorkerLocalFirst constructor throwing an error', () => {
			vi.mocked(WorkerLocalFirst).mockImplementationOnce(() => {
				throw new Error('Constructor failed')
			})

			expect(() => {
				workerEntrypoint()
			}).toThrow('Constructor failed')
		})

		it('should handle init method throwing an error', () => {
			mockWorkerLocalFirstInstance.init.mockImplementationOnce(() => {
				throw new Error('Init failed')
			})

			workerEntrypoint()
			const message = {
				type: UpstreamWorkerMessageType.Init,
				data: { wsUrl: 'ws://localhost:8080', dbName: 'test-db' }
			}

			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: message }))
			}).toThrow('Init failed')
		})

		it('should handle onmessageerror with various error objects', () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})
			
			workerEntrypoint()
			
			const errorEvents = [
				new MessageEvent('messageerror', { data: 'string error' }),
				new MessageEvent('messageerror', { data: new Error('Error object') }),
				new MessageEvent('messageerror', { data: { error: 'object error' } }),
				new MessageEvent('messageerror', { data: null }),
				new MessageEvent('messageerror', { data: undefined }),
				new MessageEvent('messageerror', { data: 42 })
			]

			if (!workerScope.onmessageerror)
				throw new Error('onmessageerror is not defined')
			
			errorEvents.forEach(errorEvent => {
				workerScope.onmessageerror(errorEvent)
			})

			expect(consoleErrorSpy).toHaveBeenCalledTimes(errorEvents.length * 2) // Two console.error calls per event
			expect(consoleErrorSpy).toHaveBeenCalledWith('Message error!')

			consoleErrorSpy.mockRestore()
		})
	})

	describe('Malformed message handling', () => {
		it('should handle messages without type property', () => {
			workerEntrypoint()
			
			const malformedMessages = [
				{ data: { wsUrl: 'test', dbName: 'test' } }, // missing type
				{ type: undefined, data: { wsUrl: 'test', dbName: 'test' } },
				{ type: null, data: { wsUrl: 'test', dbName: 'test' } }
			]

			if (!workerScope.onmessage) throw new Error('onmessage is not defined')

			malformedMessages.forEach(message => {
				expect(() => {
					workerScope.onmessage(new MessageEvent('message', { data: message }))
				}).not.toThrow()
			})
		})

		it('should handle completely invalid message data', () => {
			workerEntrypoint()
			
			const invalidMessages = [
				null,
				undefined,
				'string',
				42,
				[1, 2, 3],
				{}, // empty object
				{ randomProperty: 'value' }
			]

			if (!workerScope.onmessage) throw new Error('onmessage is not defined')

			invalidMessages.forEach(data => {
				expect(() => {
					workerScope.onmessage(new MessageEvent('message', { data }))
				}).not.toThrow()
			})
		})

		it('should handle MessageEvent without data property', () => {
			workerEntrypoint()
			
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			const eventWithoutData = new MessageEvent('message')
			expect(() => {
				workerScope.onmessage(eventWithoutData)
			}).not.toThrow()
		})
	})

	describe('Handler replacement behavior', () => {
		it('should replace handlers when called multiple times', () => {
			workerEntrypoint()
			const firstOnMessage = workerScope.onmessage
			const firstOnMessageError = workerScope.onmessageerror

			workerEntrypoint()
			
			expect(workerScope.onmessage).not.toBe(firstOnMessage)
			expect(workerScope.onmessageerror).not.toBe(firstOnMessageError)
			expect(workerScope.onmessage).toBeDefined()
			expect(workerScope.onmessageerror).toBeDefined()
		})

		it('should maintain proper handler functionality after replacement', () => {
			workerEntrypoint()
			workerEntrypoint() // Replace handlers

			const message = {
				type: UpstreamWorkerMessageType.Init,
				data: { wsUrl: 'ws://test', dbName: 'test' }
			}

			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: message }))
			}).not.toThrow()

			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalled()
		})
	})

	describe('Message processing order', () => {
		it('should process messages in the order they are received', () => {
			workerEntrypoint()
			
			const messages = [
				{ type: UpstreamWorkerMessageType.Init, data: { wsUrl: 'ws://1', dbName: 'db1' } },
				{ type: UpstreamWorkerMessageType.Transition, data: 'transition1' },
				{ type: UpstreamWorkerMessageType.Ping },
				{ type: UpstreamWorkerMessageType.Init, data: { wsUrl: 'ws://2', dbName: 'db2' } },
				{ type: UpstreamWorkerMessageType.Transition, data: 'transition2' }
			]

			if (!workerScope.onmessage) throw new Error('onmessage is not defined')

			messages.forEach(message => {
				workerScope.onmessage(new MessageEvent('message', { data: message }))
			})

			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledTimes(2)
			expect(mockWorkerLocalFirstInstance.init).toHaveBeenNthCalledWith(1, { wsUrl: 'ws://1', dbName: 'db1' })
			expect(mockWorkerLocalFirstInstance.init).toHaveBeenNthCalledWith(2, { wsUrl: 'ws://2', dbName: 'db2' })
		})
	})

	describe('Performance and stress testing', () => {
		it('should handle rapid message processing', () => {
			workerEntrypoint()
			
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')

			// Send 100 messages rapidly
			for (let i = 0; i < 100; i++) {
				const message = {
					type: UpstreamWorkerMessageType.Init,
					data: { wsUrl: `ws://localhost:${8080 + i}`, dbName: `db-${i}` }
				}
				workerScope.onmessage(new MessageEvent('message', { data: message }))
			}

			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledTimes(100)
		})

		it('should handle mixed message type bursts', () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})
			
			workerEntrypoint()
			
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')

			// Send alternating message types
			for (let i = 0; i < 50; i++) {
				const initMessage = {
					type: UpstreamWorkerMessageType.Init,
					data: { wsUrl: `ws://localhost:${8080 + i}`, dbName: `db-${i}` }
				}
				const pingMessage = { type: UpstreamWorkerMessageType.Ping }
				const transitionMessage = {
					type: UpstreamWorkerMessageType.Transition,
					data: `transition-${i}`
				}

				workerScope.onmessage(new MessageEvent('message', { data: initMessage }))
				workerScope.onmessage(new MessageEvent('message', { data: pingMessage }))
				workerScope.onmessage(new MessageEvent('message', { data: transitionMessage }))
			}

			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledTimes(50)
			expect(consoleErrorSpy).toHaveBeenCalledTimes(50) // Once per ping message

			consoleErrorSpy.mockRestore()
		})
	})
})
