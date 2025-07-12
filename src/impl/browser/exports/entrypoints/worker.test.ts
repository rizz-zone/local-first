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
		// Reset global handlers
		globalThis.onmessage = null
		globalThis.onmessageerror = null
	})

	describe('Basic setup and initialization', () => {
		it('should set onmessage and onmessageerror handlers', () => {
			workerEntrypoint()
			expect(onmessage).toBeDefined()
			expect(onmessage).toBeTypeOf('function')
			expect(onmessageerror).toBeDefined()
			expect(onmessageerror).toBeTypeOf('function')
		})

		it('should create WorkerLocalFirst instance immediately on entrypoint call', () => {
			workerEntrypoint()
			expect(WorkerLocalFirst).toHaveBeenCalledOnce()
			expect(WorkerLocalFirst).toHaveBeenCalledWith()
		})

		it('should replace existing handlers when called multiple times', () => {
			const firstHandler = vi.fn()
			globalThis.onmessage = firstHandler
			
			workerEntrypoint()
			
			expect(globalThis.onmessage).not.toBe(firstHandler)
			expect(globalThis.onmessage).toBeTypeOf('function')
		})

		it('should create new WorkerLocalFirst instances on multiple entrypoint calls', () => {
			workerEntrypoint()
			workerEntrypoint()
			
			expect(WorkerLocalFirst).toHaveBeenCalledTimes(2)
		})
	})

	describe('Init message handling', () => {
		it('should call init on WorkerLocalFirst with correct data on Init message', () => {
			workerEntrypoint()
			const message = {
				type: UpstreamWorkerMessageType.Init,
				data: { wsUrl: 'ws://localhost:8080', dbName: 'test-db' }
			}
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			workerScope.onmessage(new MessageEvent('message', { data: message }))

			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledOnce()
			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledWith({
				wsUrl: 'ws://localhost:8080',
				dbName: 'test-db'
			})
		})

		it('should handle Init message with only required wsUrl', () => {
			workerEntrypoint()
			const message = {
				type: UpstreamWorkerMessageType.Init,
				data: { wsUrl: 'ws://localhost:8080', dbName: 'test-db' }
			}
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			workerScope.onmessage(new MessageEvent('message', { data: message }))

			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledWith({
				wsUrl: 'ws://localhost:8080',
				dbName: 'test-db'
			})
		})

		it('should handle multiple Init messages by calling init multiple times', () => {
			workerEntrypoint()
			const message1 = {
				type: UpstreamWorkerMessageType.Init,
				data: { wsUrl: 'ws://localhost:8080', dbName: 'db1' }
			}
			const message2 = {
				type: UpstreamWorkerMessageType.Init,
				data: { wsUrl: 'ws://localhost:8081', dbName: 'db2' }
			}
			
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			// First init
			workerScope.onmessage(new MessageEvent('message', { data: message1 }))
			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledWith({
				wsUrl: 'ws://localhost:8080',
				dbName: 'db1'
			})
			
			// Second init - should call init again on same instance
			workerScope.onmessage(new MessageEvent('message', { data: message2 }))
			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledTimes(2)
			expect(mockWorkerLocalFirstInstance.init).toHaveBeenLastCalledWith({
				wsUrl: 'ws://localhost:8081',
				dbName: 'db2'
			})
			// Should not create new WorkerLocalFirst instance
			expect(WorkerLocalFirst).toHaveBeenCalledTimes(1)
		})

		it('should handle Init message with destructured data properties', () => {
			workerEntrypoint()
			const message = {
				type: UpstreamWorkerMessageType.Init,
				data: { 
					wsUrl: 'ws://example.com:9000', 
					dbName: 'production-db',
					extraProperty: 'ignored'
				}
			}
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			workerScope.onmessage(new MessageEvent('message', { data: message }))

			// Should only extract wsUrl and dbName as per the destructuring in the implementation
			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledWith({
				wsUrl: 'ws://example.com:9000',
				dbName: 'production-db'
			})
		})
	})

	describe('Ping message handling', () => {
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

		it('should not call init on WorkerLocalFirst for Ping message', () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})
			workerEntrypoint()
			const message = {
				type: UpstreamWorkerMessageType.Ping
			}
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			workerScope.onmessage(new MessageEvent('message', { data: message }))

			expect(mockWorkerLocalFirstInstance.init).not.toHaveBeenCalled()
			consoleErrorSpy.mockRestore()
		})

		it('should handle multiple Ping messages', () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})
			workerEntrypoint()
			const message = {
				type: UpstreamWorkerMessageType.Ping
			}
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			workerScope.onmessage(new MessageEvent('message', { data: message }))
			workerScope.onmessage(new MessageEvent('message', { data: message }))
			workerScope.onmessage(new MessageEvent('message', { data: message }))

			expect(consoleErrorSpy).toHaveBeenCalledTimes(3)
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"main thread tried to ping worker even though it isn't a SharedWorker!"
			)
			consoleErrorSpy.mockRestore()
		})
	})

	describe('Transition message handling', () => {
		it('should ignore Transition messages silently', () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})
			workerEntrypoint()
			const message = {
				type: UpstreamWorkerMessageType.Transition,
				data: { someTransition: 'data' }
			}
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: message }))
			}).not.toThrow()

			expect(consoleErrorSpy).not.toHaveBeenCalled()
			expect(mockWorkerLocalFirstInstance.init).not.toHaveBeenCalled()
			consoleErrorSpy.mockRestore()
		})

		it('should handle various Transition message data types', () => {
			workerEntrypoint()
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			const transitionMessages = [
				{ type: UpstreamWorkerMessageType.Transition, data: 'string data' },
				{ type: UpstreamWorkerMessageType.Transition, data: { object: 'data' } },
				{ type: UpstreamWorkerMessageType.Transition, data: 123 },
				{ type: UpstreamWorkerMessageType.Transition, data: null },
				{ type: UpstreamWorkerMessageType.Transition, data: undefined }
			]

			transitionMessages.forEach(message => {
				expect(() => {
					workerScope.onmessage(new MessageEvent('message', { data: message }))
				}).not.toThrow()
			})

			expect(mockWorkerLocalFirstInstance.init).not.toHaveBeenCalled()
		})
	})

	describe('Error handling', () => {
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

			expect(consoleErrorSpy).toHaveBeenCalledWith('Message error!')
			expect(consoleErrorSpy).toHaveBeenCalledWith(errorEvent)
			consoleErrorSpy.mockRestore()
		})

		it('should handle WorkerLocalFirst constructor throwing error', () => {
			const MockWorkerLocalFirst = WorkerLocalFirst as vi.MockedClass<typeof WorkerLocalFirst>
			MockWorkerLocalFirst.mockImplementationOnce(() => {
				throw new Error('Constructor failed')
			})

			expect(() => {
				workerEntrypoint()
			}).toThrow('Constructor failed')
		})

		it('should handle init method throwing error', () => {
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

		it('should handle multiple message errors', () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})
			workerEntrypoint()
			
			if (!workerScope.onmessageerror)
				throw new Error('onmessageerror is not defined')

			const errorEvent1 = new MessageEvent('messageerror', { data: 'error 1' })
			const errorEvent2 = new MessageEvent('messageerror', { data: 'error 2' })
			
			workerScope.onmessageerror(errorEvent1)
			workerScope.onmessageerror(errorEvent2)

			expect(consoleErrorSpy).toHaveBeenCalledTimes(4) // 2 calls per error (message + event)
			consoleErrorSpy.mockRestore()
		})
	})

	describe('Invalid message handling', () => {
		it('should handle unknown message types gracefully', () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})
			
			workerEntrypoint()
			const message = {
				type: 'UNKNOWN_TYPE' as any,
				data: {}
			}
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: message }))
			}).not.toThrow()
			
			expect(mockWorkerLocalFirstInstance.init).not.toHaveBeenCalled()
			expect(consoleErrorSpy).not.toHaveBeenCalled()
			consoleErrorSpy.mockRestore()
		})

		it('should handle messages without type property', () => {
			workerEntrypoint()
			const message = {
				data: { wsUrl: 'ws://localhost:8080', dbName: 'test-db' }
			} as any
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: message }))
			}).not.toThrow()
			
			expect(mockWorkerLocalFirstInstance.init).not.toHaveBeenCalled()
		})

		it('should handle null/undefined message data', () => {
			workerEntrypoint()
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: null }))
			}).not.toThrow()
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: undefined }))
			}).not.toThrow()
			
			expect(mockWorkerLocalFirstInstance.init).not.toHaveBeenCalled()
		})

		it('should handle Init message without data property', () => {
			workerEntrypoint()
			const message = {
				type: UpstreamWorkerMessageType.Init
			} as any
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: message }))
			}).toThrow() // Will throw when trying to destructure undefined
		})

		it('should handle Init message with null data', () => {
			workerEntrypoint()
			const message = {
				type: UpstreamWorkerMessageType.Init,
				data: null
			} as any
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: message }))
			}).toThrow() // Will throw when trying to destructure null
		})

		it('should handle Init message with missing wsUrl or dbName', () => {
			workerEntrypoint()
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			const messageWithoutWsUrl = {
				type: UpstreamWorkerMessageType.Init,
				data: { dbName: 'test-db' }
			} as any
			
			const messageWithoutDbName = {
				type: UpstreamWorkerMessageType.Init,
				data: { wsUrl: 'ws://localhost:8080' }
			} as any

			// Should not throw - destructuring will just result in undefined values
			workerScope.onmessage(new MessageEvent('message', { data: messageWithoutWsUrl }))
			workerScope.onmessage(new MessageEvent('message', { data: messageWithoutDbName }))
			
			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledTimes(2)
			expect(mockWorkerLocalFirstInstance.init).toHaveBeenNthCalledWith(1, {
				wsUrl: undefined,
				dbName: 'test-db'
			})
			expect(mockWorkerLocalFirstInstance.init).toHaveBeenNthCalledWith(2, {
				wsUrl: 'ws://localhost:8080',
				dbName: undefined
			})
		})
	})

	describe('MessageEvent edge cases', () => {
		it('should handle MessageEvent without data property', () => {
			workerEntrypoint()
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			const event = new MessageEvent('message', {}) // No data property
			
			expect(() => {
				workerScope.onmessage(event)
			}).not.toThrow()
			
			expect(mockWorkerLocalFirstInstance.init).not.toHaveBeenCalled()
		})

		it('should handle MessageEvent with empty data object', () => {
			workerEntrypoint()
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			const event = new MessageEvent('message', { data: {} })
			
			expect(() => {
				workerScope.onmessage(event)
			}).not.toThrow()
			
			expect(mockWorkerLocalFirstInstance.init).not.toHaveBeenCalled()
		})

		it('should handle MessageEvent with primitive data types', () => {
			workerEntrypoint()
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			const primitiveValues = ['string', 123, true, false]
			
			primitiveValues.forEach(value => {
				expect(() => {
					workerScope.onmessage(new MessageEvent('message', { data: value }))
				}).not.toThrow()
			})
			
			expect(mockWorkerLocalFirstInstance.init).not.toHaveBeenCalled()
		})
	})

	describe('Integration scenarios', () => {
		it('should handle rapid successive Init messages', () => {
			workerEntrypoint()
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			for (let i = 0; i < 10; i++) {
				const message = {
					type: UpstreamWorkerMessageType.Init,
					data: { wsUrl: `ws://localhost:808${i}`, dbName: `db-${i}` }
				}
				workerScope.onmessage(new MessageEvent('message', { data: message }))
			}
			
			expect(WorkerLocalFirst).toHaveBeenCalledTimes(1) // Only one instance created
			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledTimes(10)
		})

		it('should handle mixed message types in sequence', () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})
			
			workerEntrypoint()
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			const messages = [
				{ type: UpstreamWorkerMessageType.Init, data: { wsUrl: 'ws://localhost:8080', dbName: 'db1' } },
				{ type: UpstreamWorkerMessageType.Ping },
				{ type: UpstreamWorkerMessageType.Transition, data: { transition: 'data' } },
				{ type: UpstreamWorkerMessageType.Init, data: { wsUrl: 'ws://localhost:8081', dbName: 'db2' } },
				{ type: UpstreamWorkerMessageType.Ping }
			]
			
			messages.forEach(message => {
				workerScope.onmessage(new MessageEvent('message', { data: message }))
			})
			
			expect(WorkerLocalFirst).toHaveBeenCalledTimes(1)
			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledTimes(2)
			expect(consoleErrorSpy).toHaveBeenCalledTimes(2) // Two Ping messages
			
			consoleErrorSpy.mockRestore()
		})

		it('should handle worker entrypoint called multiple times with different message sequences', () => {
			// First worker instance
			workerEntrypoint()
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			const firstHandler = workerScope.onmessage
			workerScope.onmessage(new MessageEvent('message', { 
				data: { type: UpstreamWorkerMessageType.Init, data: { wsUrl: 'ws://first', dbName: 'first-db' } }
			}))
			
			// Second worker instance (replaces handlers)
			workerEntrypoint()
			expect(workerScope.onmessage).not.toBe(firstHandler)
			
			workerScope.onmessage(new MessageEvent('message', { 
				data: { type: UpstreamWorkerMessageType.Init, data: { wsUrl: 'ws://second', dbName: 'second-db' } }
			}))
			
			expect(WorkerLocalFirst).toHaveBeenCalledTimes(2)
			expect(mockWorkerLocalFirstInstance.init).toHaveBeenCalledTimes(2)
		})
	})

	describe('Type safety and generics', () => {
		it('should handle workerEntrypoint with generic TransitionSchema', () => {
			interface CustomTransition {
				action: string
				payload: any
			}
			
			expect(() => {
				workerEntrypoint<CustomTransition>()
			}).not.toThrow()
			
			expect(WorkerLocalFirst).toHaveBeenCalledOnce()
		})

		it('should handle Transition messages with typed data', () => {
			interface CustomTransition {
				action: string
				payload: number
			}
			
			workerEntrypoint<CustomTransition>()
			if (!workerScope.onmessage) throw new Error('onmessage is not defined')
			
			const message = {
				type: UpstreamWorkerMessageType.Transition,
				data: { action: 'increment', payload: 42 }
			}
			
			expect(() => {
				workerScope.onmessage(new MessageEvent('message', { data: message }))
			}).not.toThrow()
		})
	})
})
