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
		})
	})
})

	describe('Error Handling', () => {
		describe('Worker', () => {
			let mockWorker: Worker
			beforeEach(() => {
				mockWorker = {
					postMessage: vi.fn()
				} as unknown as Worker
			})

			it('handles invalid initialization parameters gracefully', () => {
				expect(() => {
					new BrowserLocalFirst({
						dbName: '',
						wsUrl: SOCKET_URL,
						worker: mockWorker
					})
				}).not.toThrow()

				expect(() => {
					new BrowserLocalFirst({
						dbName: DB_NAME,
						wsUrl: '',
						worker: mockWorker
					})
				}).not.toThrow()
			})

			it('handles null/undefined worker gracefully', () => {
				expect(() => {
					new BrowserLocalFirst({
						dbName: DB_NAME,
						wsUrl: SOCKET_URL,
						worker: null as unknown as Worker
					})
				}).toThrow()

				expect(() => {
					new BrowserLocalFirst({
						dbName: DB_NAME,
						wsUrl: SOCKET_URL,
						worker: undefined as unknown as Worker
					})
				}).toThrow()
			})

			it('handles postMessage failures gracefully', () => {
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
		})

		describe('SharedWorker', () => {
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

			it('handles port.postMessage failures gracefully', () => {
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

			it('handles missing port gracefully', () => {
				const invalidSharedWorker = {
					port: null,
					postMessage: vi.fn()
				} as unknown as TestingSharedWorker

				expect(() => {
					new BrowserLocalFirst({
						dbName: DB_NAME,
						wsUrl: SOCKET_URL,
						worker: invalidSharedWorker
					})
				}).toThrow()
			})
		})
	})

	describe('Transition Edge Cases', () => {
		describe('Worker', () => {
			let mockWorker: Worker
			let syncEngine: BrowserLocalFirst<TestingTransition>

			beforeEach(() => {
				mockWorker = {
					postMessage: vi.fn()
				} as unknown as Worker
				syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})
				vi.clearAllMocks()
			})

			it('handles transition with different impact types', () => {
				const impacts = [
					TransitionImpact.LocalOnly,
					TransitionImpact.SomethingElse
				] as const

				impacts.forEach(impact => {
					syncEngine.transition({
						action: `test_action_${impact}`,
						impact
					})

					expect(mockWorker.postMessage).toHaveBeenLastCalledWith({
						type: UpstreamWorkerMessageType.Transition,
						data: {
							action: `test_action_${impact}`,
							impact
						}
					})
				})

				expect(mockWorker.postMessage).toHaveBeenCalledTimes(impacts.length)
			})

			it('handles transition with empty action string', () => {
				syncEngine.transition({
					action: '',
					impact: TransitionImpact.LocalOnly
				})

				expect(mockWorker.postMessage).toHaveBeenCalledWith({
					type: UpstreamWorkerMessageType.Transition,
					data: {
						action: '',
						impact: TransitionImpact.LocalOnly
					}
				})
			})

			it('handles transition with numeric action', () => {
				syncEngine.transition({
					action: 12345,
					impact: TransitionImpact.LocalOnly
				})

				expect(mockWorker.postMessage).toHaveBeenCalledWith({
					type: UpstreamWorkerMessageType.Transition,
					data: {
						action: 12345,
						impact: TransitionImpact.LocalOnly
					}
				})
			})

			it('handles transition with special characters in action', () => {
				const specialAction = 'special!@#$%^&*()_+-={}[]|\\:";\'<>?,./action'
				syncEngine.transition({
					action: specialAction,
					impact: TransitionImpact.LocalOnly
				})

				expect(mockWorker.postMessage).toHaveBeenCalledWith({
					type: UpstreamWorkerMessageType.Transition,
					data: {
						action: specialAction,
						impact: TransitionImpact.LocalOnly
					}
				})
			})

			it('handles transition with optional data field', () => {
				const transitionWithData = {
					action: 'test_with_data',
					impact: TransitionImpact.LocalOnly,
					data: { userId: 123, timestamp: Date.now() }
				}
				
				syncEngine.transition(transitionWithData)

				expect(mockWorker.postMessage).toHaveBeenCalledWith({
					type: UpstreamWorkerMessageType.Transition,
					data: transitionWithData
				})
			})

			it('handles multiple rapid transitions', () => {
				const transitions = [
					{ action: 'action1', impact: TransitionImpact.LocalOnly },
					{ action: 'action2', impact: TransitionImpact.SomethingElse },
					{ action: 'action3', impact: TransitionImpact.LocalOnly }
				] as const

				transitions.forEach(transition => {
					syncEngine.transition(transition)
				})

				expect(mockWorker.postMessage).toHaveBeenCalledTimes(transitions.length)
				transitions.forEach((transition, index) => {
					expect(mockWorker.postMessage).toHaveBeenNthCalledWith(index + 1, {
						type: UpstreamWorkerMessageType.Transition,
						data: transition
					})
				})
			})

			it('handles transition when worker.postMessage throws', () => {
				mockWorker.postMessage = vi.fn().mockImplementation(() => {
					throw new Error('Worker unavailable')
				})

				expect(() => {
					syncEngine.transition({
						action: 'test_action',
						impact: TransitionImpact.LocalOnly
					})
				}).toThrow('Worker unavailable')
			})
		})

		describe('SharedWorker', () => {
			type TestingSharedWorker = SharedWorker & {
				postMessage: Worker['postMessage']
			}
			let mockWorker: TestingSharedWorker
			let syncEngine: BrowserLocalFirst<TestingTransition>

			beforeEach(() => {
				mockWorker = {
					port: { postMessage: vi.fn() },
					postMessage: vi.fn()
				} as unknown as TestingSharedWorker
				syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})
				vi.clearAllMocks()
			})

			it('handles transition when port.postMessage throws', () => {
				mockWorker.port.postMessage = vi.fn().mockImplementation(() => {
					throw new Error('SharedWorker port unavailable')
				})

				expect(() => {
					syncEngine.transition({
						action: 'test_action',
						impact: TransitionImpact.LocalOnly
					})
				}).toThrow('SharedWorker port unavailable')
			})

			it('ensures regular postMessage is never called during transitions', () => {
				const transitions = [
					{ action: 'action1', impact: TransitionImpact.LocalOnly },
					{ action: 'action2', impact: TransitionImpact.SomethingElse },
					{ action: 'action3', impact: TransitionImpact.LocalOnly }
				] as const

				transitions.forEach(transition => {
					syncEngine.transition(transition)
				})

				expect(mockWorker.postMessage).not.toHaveBeenCalled()
				expect(mockWorker.port.postMessage).toHaveBeenCalledTimes(transitions.length)
			})
		})
	})

	describe('Initialization Edge Cases', () => {
		it('handles very long database names', () => {
			const longDbName = 'a'.repeat(1000)
			const mockWorker = {
				postMessage: vi.fn()
			} as unknown as Worker

			new BrowserLocalFirst({
				dbName: longDbName,
				wsUrl: SOCKET_URL,
				worker: mockWorker
			})

			expect(mockWorker.postMessage).toHaveBeenCalledWith({
				type: UpstreamWorkerMessageType.Init,
				data: {
					dbName: longDbName,
					wsUrl: SOCKET_URL
				}
			})
		})

		it('handles various URL formats', () => {
			const urlFormats = [
				'ws://localhost:8080',
				'wss://secure.example.com:443',
				'ws://127.0.0.1:3000/path',
				'wss://example.com/socket?param=value'
			]

			urlFormats.forEach(url => {
				const mockWorker = {
					postMessage: vi.fn()
				} as unknown as Worker

				new BrowserLocalFirst({
					dbName: DB_NAME,
					wsUrl: url,
					worker: mockWorker
				})

				expect(mockWorker.postMessage).toHaveBeenCalledWith({
					type: UpstreamWorkerMessageType.Init,
					data: {
						dbName: DB_NAME,
						wsUrl: url
					}
				})
			})
		})

		it('handles unicode characters in dbName', () => {
			const unicodeDbName = '数据库_🗄️_測試'
			const mockWorker = {
				postMessage: vi.fn()
			} as unknown as Worker

			new BrowserLocalFirst({
				dbName: unicodeDbName,
				wsUrl: SOCKET_URL,
				worker: mockWorker
			})

			expect(mockWorker.postMessage).toHaveBeenCalledWith({
				type: UpstreamWorkerMessageType.Init,
				data: {
					dbName: unicodeDbName,
					wsUrl: SOCKET_URL
				}
			})
		})

		it('handles special characters in all parameters', () => {
			const specialDbName = 'test-db_with.special@chars'
			const specialUrl = 'wss://user:pass@example.com:8080/path?query=value&other=true'
			const mockWorker = {
				postMessage: vi.fn()
			} as unknown as Worker

			new BrowserLocalFirst({
				dbName: specialDbName,
				wsUrl: specialUrl,
				worker: mockWorker
			})

			expect(mockWorker.postMessage).toHaveBeenCalledWith({
				type: UpstreamWorkerMessageType.Init,
				data: {
					dbName: specialDbName,
					wsUrl: specialUrl
				}
			})
		})
	})

	describe('Type Safety', () => {
		it('properly types generic TestingTransition', () => {
			const mockWorker = {
				postMessage: vi.fn()
			} as unknown as Worker

			const syncEngine = new BrowserLocalFirst<TestingTransition>({
				dbName: DB_NAME,
				wsUrl: SOCKET_URL,
				worker: mockWorker
			})

			// This should compile without type errors
			syncEngine.transition({
				action: 'valid_testing_action',
				impact: TransitionImpact.LocalOnly
			})

			expect(mockWorker.postMessage).toHaveBeenLastCalledWith({
				type: UpstreamWorkerMessageType.Transition,
				data: {
					action: 'valid_testing_action',
					impact: TransitionImpact.LocalOnly
				}
			})
		})

		it('accepts custom transition schemas', () => {
			type CustomTransition = {
				action: string
				impact: TransitionImpact
				customField: boolean
			}

			const mockWorker = {
				postMessage: vi.fn()
			} as unknown as Worker

			const syncEngine = new BrowserLocalFirst<CustomTransition>({
				dbName: DB_NAME,
				wsUrl: SOCKET_URL,
				worker: mockWorker
			})

			syncEngine.transition({
				action: 'custom_action',
				impact: TransitionImpact.SomethingElse,
				customField: true
			})

			expect(mockWorker.postMessage).toHaveBeenLastCalledWith({
				type: UpstreamWorkerMessageType.Transition,
				data: {
					action: 'custom_action',
					impact: TransitionImpact.SomethingElse,
					customField: true
				}
			})
		})
	})

	describe('Call Order and Timing', () => {
		it('ensures init message is always sent before any transition messages', () => {
			const mockWorker = {
				postMessage: vi.fn()
			} as unknown as Worker

			const syncEngine = new BrowserLocalFirst<TestingTransition>({
				dbName: DB_NAME,
				wsUrl: SOCKET_URL,
				worker: mockWorker
			})

			syncEngine.transition({
				action: 'immediate_transition',
				impact: TransitionImpact.LocalOnly
			})

			// Verify call order
			expect(mockWorker.postMessage).toHaveBeenCalledTimes(2)
			expect(mockWorker.postMessage).toHaveBeenNthCalledWith(1, {
				type: UpstreamWorkerMessageType.Init,
				data: {
					dbName: DB_NAME,
					wsUrl: SOCKET_URL
				}
			})
			expect(mockWorker.postMessage).toHaveBeenNthCalledWith(2, {
				type: UpstreamWorkerMessageType.Transition,
				data: {
					action: 'immediate_transition',
					impact: TransitionImpact.LocalOnly
				}
			})
		})

		it('handles rapid initialization and transition calls', () => {
			const mockWorker = {
				postMessage: vi.fn()
			} as unknown as Worker

			const syncEngine = new BrowserLocalFirst<TestingTransition>({
				dbName: DB_NAME,
				wsUrl: SOCKET_URL,
				worker: mockWorker
			})

			// Simulate rapid calls
			for (let i = 0; i < 10; i++) {
				syncEngine.transition({
					action: `rapid_action_${i}`,
					impact: TransitionImpact.LocalOnly
				})
			}

			expect(mockWorker.postMessage).toHaveBeenCalledTimes(11) // 1 init + 10 transitions
		})
	})

	describe('Worker Detection Logic', () => {
		it('correctly identifies Worker vs SharedWorker based on port property', () => {
			// Test Worker (no port property)
			const mockWorker = {
				postMessage: vi.fn()
			} as unknown as Worker

			new BrowserLocalFirst({
				dbName: DB_NAME,
				wsUrl: SOCKET_URL,
				worker: mockWorker
			})

			expect(mockWorker.postMessage).toHaveBeenCalled()

			// Test SharedWorker (has port property)
			const mockSharedWorker = {
				port: { postMessage: vi.fn() },
				postMessage: vi.fn()
			} as unknown as SharedWorker

			new BrowserLocalFirst({
				dbName: DB_NAME,
				wsUrl: SOCKET_URL,
				worker: mockSharedWorker
			})

			expect(mockSharedWorker.port.postMessage).toHaveBeenCalled()
			expect(mockSharedWorker.postMessage).not.toHaveBeenCalled()
		})

		it('handles objects with port property that are not SharedWorkers', () => {
			const ambiguousWorker = {
				port: { postMessage: vi.fn() },
				postMessage: vi.fn(),
				someOtherProperty: 'test'
			} as unknown as Worker | SharedWorker

			new BrowserLocalFirst({
				dbName: DB_NAME,
				wsUrl: SOCKET_URL,
				worker: ambiguousWorker
			})

			// Should still use port.postMessage since 'port' property exists
			expect((ambiguousWorker as any).port.postMessage).toHaveBeenCalled()
			expect((ambiguousWorker as any).postMessage).not.toHaveBeenCalled()
		})
	})
