import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserLocalFirst } from './browser'
import { DB_NAME, SOCKET_URL } from '../../../testing/constants'
import {
	type UpstreamWorkerMessage,
	UpstreamWorkerMessageType
} from '../../../types/messages/worker/UpstreamWorkerMessage'
import type { TestingTransition } from '../../../testing/transitions'
import { TransitionImpact } from '../../../types/transitions/Transition'

describe('BrowserLocalFirst', () => {
	describe('Constructor', () => {
		let mockWorker: Worker
		beforeEach(() => {
			mockWorker = {
				postMessage: vi.fn()
			} as unknown as Worker
		})

		it('should create instance with valid configuration', () => {
			const instance = new BrowserLocalFirst({
				dbName: DB_NAME,
				wsUrl: SOCKET_URL,
				worker: mockWorker
			})
			
			expect(instance).toBeInstanceOf(BrowserLocalFirst)
		})

		it('should handle constructor with various dbName values', () => {
			const testCases = ['test-db', 'db123', 'my_database', 'a']
			
			testCases.forEach(dbName => {
				const instance = new BrowserLocalFirst({
					dbName,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})
				expect(instance).toBeInstanceOf(BrowserLocalFirst)
			})
		})

		it('should handle constructor with various wsUrl values', () => {
			const testCases = [
				'ws://localhost:3000',
				'wss://secure.example.com/socket',
				'ws://127.0.0.1:8080/path',
				'wss://example.com:443/ws?token=abc123'
			]
			
			testCases.forEach(wsUrl => {
				const instance = new BrowserLocalFirst({
					dbName: DB_NAME,
					wsUrl,
					worker: mockWorker
				})
				expect(instance).toBeInstanceOf(BrowserLocalFirst)
			})
		})

		it('should store worker reference internally', () => {
			const instance = new BrowserLocalFirst({
				dbName: DB_NAME,
				wsUrl: SOCKET_URL,
				worker: mockWorker
			})
			
			const internalWorker = (instance as unknown as { worker: Worker }).worker
			expect(internalWorker).toBe(mockWorker)
		})
	})

	describe('Worker', () => {
		describe('message posting via .postMessage()', () => {
			let mockWorker: Worker
			beforeEach(() => {
				mockWorker = {
					postMessage: vi.fn()
				} as unknown as Worker
			})

			it('inits', () => {
				new BrowserLocalFirst({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				expect(mockWorker.postMessage).toHaveBeenCalledExactlyOnceWith({
					type: UpstreamWorkerMessageType.Init,
					data: {
						dbName: DB_NAME,
						wsUrl: SOCKET_URL
					}
				} satisfies UpstreamWorkerMessage<TestingTransition>)
			})

			it('sends transitions', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})
				syncEngine.transition({
					action: 'shift_foo_bar',
					impact: TransitionImpact.LocalOnly
				})

				expect(mockWorker.postMessage).toHaveBeenLastCalledWith({
					type: UpstreamWorkerMessageType.Transition,
					data: {
						action: 'shift_foo_bar',
						impact: TransitionImpact.LocalOnly
					}
				})
			})

			it('sends multiple transitions in sequence', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})
				
				const transition1 = { action: 'shift_foo_bar', impact: TransitionImpact.LocalOnly }
				const transition2 = { 
					action: 3, 
					impact: TransitionImpact.SomethingElse,
					data: { foo: 'test', bar: 42 }
				} as TestingTransition

				syncEngine.transition(transition1)
				syncEngine.transition(transition2)

				expect(mockWorker.postMessage).toHaveBeenCalledTimes(3)

				const postMock = mockWorker.postMessage as ReturnType<typeof vi.fn>
				expect(postMock).toHaveBeenNthCalledWith(2, {
					type: UpstreamWorkerMessageType.Transition,
					data: transition1
				})

				expect(postMock).toHaveBeenNthCalledWith(3, {
					type: UpstreamWorkerMessageType.Transition,
					data: transition2
				})
			})

			it('handles worker postMessage errors during initialization', () => {
				const failingWorker = {
					postMessage: vi.fn().mockImplementation(() => {
						throw new Error('Worker communication failed')
					})
				} as unknown as Worker

				expect(() => {
					new BrowserLocalFirst({
						dbName: DB_NAME,
						wsUrl: SOCKET_URL,
						worker: failingWorker
					})
				}).toThrow('Worker communication failed')
			})

			it('handles worker postMessage errors during transition', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				mockWorker.postMessage = vi.fn().mockImplementation(() => {
					throw new Error('Transition failed')
				})

				expect(() => {
					syncEngine.transition({
						action: 'shift_foo_bar',
						impact: TransitionImpact.LocalOnly
					})
				}).toThrow('Transition failed')
			})

			it('handles transition with SomethingElse impact and data', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})
				
				const complexTransition = {
					action: 3,
					impact: TransitionImpact.SomethingElse,
					data: { foo: 'hello', bar: 123 }
				} as TestingTransition

				syncEngine.transition(complexTransition)

				expect(mockWorker.postMessage).toHaveBeenLastCalledWith({
					type: UpstreamWorkerMessageType.Transition,
					data: complexTransition
				})
			})

			it('preserves exact transition data structure', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				const originalTransition = {
					action: 3,
					impact: TransitionImpact.SomethingElse,
					data: {
						foo: 'test_value',
						bar: 999
					}
				} as TestingTransition

				syncEngine.transition(originalTransition)

				const postMock = mockWorker.postMessage as ReturnType<typeof vi.fn>
				const lastCall = postMock.mock.calls[1][0]
				expect(lastCall.data).toEqual(originalTransition)
				expect(lastCall.data).not.toBe(originalTransition)
			})

			it('maintains correct message types', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				syncEngine.transition({
					action: 'shift_foo_bar',
					impact: TransitionImpact.LocalOnly
				})

				const postMock = mockWorker.postMessage as ReturnType<typeof vi.fn>
				const calls = postMock.mock.calls
				expect(calls[0][0].type).toBe(UpstreamWorkerMessageType.Init)
				expect(calls[1][0].type).toBe(UpstreamWorkerMessageType.Transition)
			})

			it('handles rapid successive transitions', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				const rapidTransitions = Array.from({ length: 50 }).map(() => ({
					action: 'shift_foo_bar',
					impact: TransitionImpact.LocalOnly
				})) as TestingTransition[]

				rapidTransitions.forEach(transition => {
					syncEngine.transition(transition)
				})

				expect(mockWorker.postMessage).toHaveBeenCalledTimes(51)
			})
		})
	})

	describe('SharedWorker', () => {
		describe('message posting via .port.postMessage()', () => {
			type TestingSharedWorker = SharedWorker & {
				postMessage: Worker['postMessage']
			}
			let mockWorker: TestingSharedWorker
			beforeEach(() => {
				mockWorker = {
					port: { postMessage: vi.fn() },
					postMessage: vi.fn()
				} as unknown as TestingSharedWorker
			})

			it('inits', () => {
				new BrowserLocalFirst({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				expect(mockWorker.port.postMessage).toHaveBeenCalledExactlyOnceWith({
					type: UpstreamWorkerMessageType.Init,
					data: {
						dbName: DB_NAME,
						wsUrl: SOCKET_URL
					}
				} satisfies UpstreamWorkerMessage<TestingTransition>)
				expect(mockWorker.postMessage).not.toBeCalled()
			})

			it('sends transitions', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})
				syncEngine.transition({
					action: 'shift_foo_bar',
					impact: TransitionImpact.LocalOnly
				})

				expect(mockWorker.port.postMessage).toHaveBeenLastCalledWith({
					type: UpstreamWorkerMessageType.Transition,
					data: {
						action: 'shift_foo_bar',
						impact: TransitionImpact.LocalOnly
					}
				})
				expect(mockWorker.postMessage).not.toBeCalled()
			})

			it('handles SharedWorker port postMessage errors during initialization', () => {
				const failingSharedWorker = {
					port: {
						postMessage: vi.fn().mockImplementation(() => {
							throw new Error('SharedWorker port communication failed')
						})
					},
					postMessage: vi.fn()
				} as unknown as TestingSharedWorker

				expect(() => {
					new BrowserLocalFirst({
						dbName: DB_NAME,
						wsUrl: SOCKET_URL,
						worker: failingSharedWorker
					})
				}).toThrow('SharedWorker port communication failed')
			})

			it('handles SharedWorker port postMessage errors during transition', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				mockWorker.port.postMessage = vi.fn().mockImplementation(() => {
					throw new Error('Port transition failed')
				})

				expect(() => {
					syncEngine.transition({
						action: 'shift_foo_bar',
						impact: TransitionImpact.LocalOnly
					})
				}).toThrow('Port transition failed')
			})

			it('sends multiple transitions without calling worker.postMessage', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})
				
				const transitions = [
					{ action: 'shift_foo_bar', impact: TransitionImpact.LocalOnly },
					{ action: 3, impact: TransitionImpact.SomethingElse, data: { foo: 'test', bar: 1 } }
				] as TestingTransition[]

				transitions.forEach(transition => {
					syncEngine.transition(transition)
				})

				expect(mockWorker.port.postMessage).toHaveBeenCalledTimes(3)
				expect(mockWorker.postMessage).not.toHaveBeenCalled()
			})

			it('correctly routes all messages through port for SharedWorker', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				syncEngine.transition({ action: 'shift_foo_bar', impact: TransitionImpact.LocalOnly })
				syncEngine.transition({ 
					action: 3, 
					impact: TransitionImpact.SomethingElse, 
					data: { foo: 'test', bar: 42 } 
				})

				expect(mockWorker.port.postMessage).toHaveBeenCalledTimes(3)
				expect(mockWorker.postMessage).not.toBeCalled()
			})
		})
	})

	describe('Worker Detection Logic', () => {
		it('should correctly identify Worker vs SharedWorker', () => {
			const regularWorker = {
				postMessage: vi.fn()
			} as unknown as Worker

			const sharedWorker = {
				port: { postMessage: vi.fn() },
				postMessage: vi.fn()
			} as unknown as SharedWorker

			new BrowserLocalFirst({
				dbName: DB_NAME,
				wsUrl: SOCKET_URL,
				worker: regularWorker
			})

			new BrowserLocalFirst({
				dbName: DB_NAME,
				wsUrl: SOCKET_URL,
				worker: sharedWorker
			})

			expect(regularWorker.postMessage).toHaveBeenCalledOnce()
			expect(sharedWorker.port.postMessage).toHaveBeenCalledOnce()
			expect(sharedWorker.postMessage).not.toBeCalled()
		})

		it('should handle worker with port property that is not a SharedWorker', () => {
			const workerWithPort = {
				postMessage: vi.fn(),
				port: { postMessage: vi.fn() }
			} as unknown as SharedWorker

			new BrowserLocalFirst({
				dbName: DB_NAME,
				wsUrl: SOCKET_URL,
				worker: workerWithPort
			})

			expect(workerWithPort.port.postMessage).toHaveBeenCalledOnce()
			expect(workerWithPort.postMessage).not.toBeCalled()
		})

		it('should handle worker objects with additional properties', () => {
			const extendedWorker = {
				postMessage: vi.fn(),
				terminate: vi.fn(),
				onmessage: null,
				onerror: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				customProperty: 'test'
			} as unknown as Worker

			expect(() => {
				new BrowserLocalFirst({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: extendedWorker
				})
			}).not.toThrow()

			expect(extendedWorker.postMessage).toHaveBeenCalledOnce()
		})
	})

	describe('Message Structure Validation', () => {
		let mockWorker: Worker
		beforeEach(() => {
			mockWorker = {
				postMessage: vi.fn()
			} as unknown as Worker
		})

		it('should send init message with correct structure', () => {
			const customDbName = 'custom-db'
			const customWsUrl = 'ws://custom.example.com'

			new BrowserLocalFirst({
				dbName: customDbName,
				wsUrl: customWsUrl,
				worker: mockWorker
			})

			expect(mockWorker.postMessage).toHaveBeenCalledWith({
				type: UpstreamWorkerMessageType.Init,
				data: {
					dbName: customDbName,
					wsUrl: customWsUrl
				}
			})
		})

		it('should send transition message with correct structure', () => {
			const syncEngine = new BrowserLocalFirst<TestingTransition>({
				dbName: DB_NAME,
				wsUrl: SOCKET_URL,
				worker: mockWorker
			})

			const testTransition = {
				action: 3,
				impact: TransitionImpact.SomethingElse,
				data: { foo: 'value', bar: 123 }
			} as TestingTransition

			syncEngine.transition(testTransition)

			expect(mockWorker.postMessage).toHaveBeenLastCalledWith({
				type: UpstreamWorkerMessageType.Transition,
				data: testTransition
			})
		})

		it('should preserve all transition properties', () => {
			const syncEngine = new BrowserLocalFirst<TestingTransition>({
				dbName: DB_NAME,
				wsUrl: SOCKET_URL,
				worker: mockWorker
			})

			const complexTransition = {
				action: 3,
				impact: TransitionImpact.SomethingElse,
				data: {
					foo: 'complex_string_with_special_chars_🚀',
					bar: 999999
				}
			} as TestingTransition

			syncEngine.transition(complexTransition)

			const postMock = mockWorker.postMessage as ReturnType<typeof vi.fn>
			const sentMessage = postMock.mock.calls[1][0]
			expect(sentMessage.data).toEqual(complexTransition)
		})
	})

	describe('Error Boundaries', () => {
		it('should not catch or suppress worker postMessage errors', () => {
			const failingWorker = {
				postMessage: vi.fn().mockImplementation(() => {
					throw new Error('Intentional failure')
				})
			} as unknown as Worker

			expect(() => {
				new BrowserLocalFirst({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: failingWorker
				})
			}).toThrow('Intentional failure')
		})

		it('should not catch or suppress SharedWorker port postMessage errors', () => {
			const failingSharedWorker = {
				port: {
					postMessage: vi.fn().mockImplementation(() => {
						throw new Error('SharedWorker failure')
					})
				},
				postMessage: vi.fn()
			} as unknown as SharedWorker

			expect(() => {
				new BrowserLocalFirst({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: failingSharedWorker
				})
			}).toThrow('SharedWorker failure')
		})

		it('should propagate transition errors immediately', () => {
			const mockWorker = {
				postMessage: vi.fn()
			} as unknown as Worker

			const syncEngine = new BrowserLocalFirst<TestingTransition>({
				dbName: DB_NAME,
				wsUrl: SOCKET_URL,
				worker: mockWorker
			})

			mockWorker.postMessage = vi.fn().mockImplementation(() => {
				throw new Error('Transition error')
			})

			expect(() => {
				syncEngine.transition({
					action: 'shift_foo_bar',
					impact: TransitionImpact.LocalOnly
				})
			}).toThrow('Transition error')
		})
	})

	describe('Performance and Load Characteristics', () => {
		it('should handle high-frequency transitions without degradation', () => {
			const mockWorker = {
				postMessage: vi.fn()
			} as unknown as Worker

			const syncEngine = new BrowserLocalFirst<TestingTransition>({
				dbName: DB_NAME,
				wsUrl: SOCKET_URL,
				worker: mockWorker
			})

			const startTime = performance.now()
			
			for (let i = 0; i < 1000; i++) {
				syncEngine.transition({
					action: 'shift_foo_bar',
					impact: TransitionImpact.LocalOnly
				})
			}

			const endTime = performance.now()
			const duration = endTime - startTime

			expect(mockWorker.postMessage).toHaveBeenCalledTimes(1001)
			expect(duration).toBeLessThan(1000)
		})

		it('should maintain consistent behavior across worker types under load', () => {
			const regularWorker = { postMessage: vi.fn() } as unknown as Worker
			const sharedWorker = {
				port: { postMessage: vi.fn() },
				postMessage: vi.fn()
			} as unknown as SharedWorker

			const syncEngine1 = new BrowserLocalFirst<TestingTransition>({
				dbName: DB_NAME,
				wsUrl: SOCKET_URL,
				worker: regularWorker
			})

			const syncEngine2 = new BrowserLocalFirst<TestingTransition>({
				dbName: DB_NAME,
				wsUrl: SOCKET_URL,
				worker: sharedWorker
			})

			for (let i = 0; i < 100; i++) {
				const transition = {
					action: 'shift_foo_bar',
					impact: TransitionImpact.LocalOnly
				} as TestingTransition

				syncEngine1.transition(transition)
				syncEngine2.transition(transition)
			}

			expect(regularWorker.postMessage).toHaveBeenCalledTimes(101)
			expect(sharedWorker.port.postMessage).toHaveBeenCalledTimes(101)
			expect(sharedWorker.postMessage).not.toBeCalled()
		})
	})
})