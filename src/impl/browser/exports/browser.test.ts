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

			it('handles worker postMessage errors gracefully during initialization', () => {
				const postMessageSpy = vi.fn().mockImplementation(() => {
					throw new Error('Worker communication failed')
				})
				mockWorker.postMessage = postMessageSpy

				expect(() => {
					new BrowserLocalFirst({
						dbName: DB_NAME,
						wsUrl: SOCKET_URL,
						worker: mockWorker
					})
				}).not.toThrow()

				expect(postMessageSpy).toHaveBeenCalled()
			})

			it('handles transition posting errors gracefully', () => {
				const postMessageSpy = vi.fn()
					.mockImplementationOnce(() => {}) // Init call succeeds
					.mockImplementationOnce(() => {
						throw new Error('Transition failed')
					})
				mockWorker.postMessage = postMessageSpy

				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				expect(() => {
					syncEngine.transition({
						action: 'shift_foo_bar',
						impact: TransitionImpact.LocalOnly
					})
				}).not.toThrow()

				expect(postMessageSpy).toHaveBeenCalledTimes(2)
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

			it('handles SharedWorker port postMessage errors gracefully', () => {
				const postMessageSpy = vi.fn().mockImplementation(() => {
					throw new Error('SharedWorker communication failed')
				})
				mockWorker.port.postMessage = postMessageSpy

				expect(() => {
					new BrowserLocalFirst({
						dbName: DB_NAME,
						wsUrl: SOCKET_URL,
						worker: mockWorker
					})
				}).not.toThrow()

				expect(postMessageSpy).toHaveBeenCalled()
			})

			it('handles transition errors on SharedWorker port', () => {
				const postMessageSpy = vi.fn()
					.mockImplementationOnce(() => {}) // Init succeeds
					.mockImplementationOnce(() => {
						throw new Error('Port communication failed')
					})
				mockWorker.port.postMessage = postMessageSpy

				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				expect(() => {
					syncEngine.transition({
						action: 'test_action',
						impact: TransitionImpact.LocalOnly
					})
				}).not.toThrow()

				expect(postMessageSpy).toHaveBeenCalledTimes(2)
				expect(mockWorker.postMessage).not.toHaveBeenCalled()
			})
		})
	})

	describe('Edge Cases', () => {
		describe('Worker', () => {
			let mockWorker: Worker
			beforeEach(() => {
				mockWorker = {
					postMessage: vi.fn()
				} as unknown as Worker
			})

			it('handles empty database name', () => {
				new BrowserLocalFirst({
					dbName: '',
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				expect(mockWorker.postMessage).toHaveBeenCalledWith({
					type: UpstreamWorkerMessageType.Init,
					data: {
						dbName: '',
						wsUrl: SOCKET_URL
					}
				})
			})

			it('handles empty WebSocket URL', () => {
				new BrowserLocalFirst({
					dbName: DB_NAME,
					wsUrl: '',
					worker: mockWorker
				})

				expect(mockWorker.postMessage).toHaveBeenCalledWith({
					type: UpstreamWorkerMessageType.Init,
					data: {
						dbName: DB_NAME,
						wsUrl: ''
					}
				})
			})

			it('handles multiple consecutive transitions', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				const transitions = [
					{ action: 'action_1', impact: TransitionImpact.LocalOnly },
					{ action: 'action_2', impact: TransitionImpact.SomethingElse },
					{ action: 'action_3', impact: TransitionImpact.LocalOnly }
				] as TestingTransition[]

				transitions.forEach(transition => {
					syncEngine.transition(transition)
				})

				// Should have init call + 3 transition calls
				expect(mockWorker.postMessage).toHaveBeenCalledTimes(4)
				
				transitions.forEach((transition, index) => {
					expect(mockWorker.postMessage).toHaveBeenNthCalledWith(index + 2, {
						type: UpstreamWorkerMessageType.Transition,
						data: transition
					})
				})
			})

			it('handles transitions with different impact types', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				// Test LocalOnly impact
				syncEngine.transition({
					action: 'local_action',
					impact: TransitionImpact.LocalOnly
				})

				expect(mockWorker.postMessage).toHaveBeenLastCalledWith({
					type: UpstreamWorkerMessageType.Transition,
					data: {
						action: 'local_action',
						impact: TransitionImpact.LocalOnly
					}
				})

				// Test SomethingElse impact
				syncEngine.transition({
					action: 'other_action',
					impact: TransitionImpact.SomethingElse
				})

				expect(mockWorker.postMessage).toHaveBeenLastCalledWith({
					type: UpstreamWorkerMessageType.Transition,
					data: {
						action: 'other_action',
						impact: TransitionImpact.SomethingElse
					}
				})
			})

			it('handles numeric actions', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				syncEngine.transition({
					action: 12345,
					impact: TransitionImpact.LocalOnly
				} as TestingTransition)

				expect(mockWorker.postMessage).toHaveBeenLastCalledWith({
					type: UpstreamWorkerMessageType.Transition,
					data: {
						action: 12345,
						impact: TransitionImpact.LocalOnly
					}
				})
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

			it('handles rapid sequential transitions', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				// Simulate rapid transitions
				for (let i = 0; i < 10; i++) {
					syncEngine.transition({
						action: `rapid_action_${i}`,
						impact: TransitionImpact.LocalOnly
					})
				}

				// Should have init call + 10 transition calls
				expect(mockWorker.port.postMessage).toHaveBeenCalledTimes(11)
				expect(mockWorker.postMessage).not.toHaveBeenCalled()
			})

			it('handles transitions with complex action strings', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				const complexActions = [
					'action_with_underscores_and_numbers_123',
					'action-with-dashes-and-special-chars-!@#',
					'actionWithCamelCase',
					'action.with.dots.and.periods',
					'action/with/slashes',
					'',  // Empty action
					'action with spaces',
					'action\nwith\nnewlines',
					'action\twith\ttabs'
				]

				complexActions.forEach(action => {
					syncEngine.transition({
						action,
						impact: TransitionImpact.SomethingElse
					})

					expect(mockWorker.port.postMessage).toHaveBeenLastCalledWith({
						type: UpstreamWorkerMessageType.Transition,
						data: {
							action,
							impact: TransitionImpact.SomethingElse
						}
					})
				})
			})

			it('handles transitions with optional data field', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				const transitionWithData = {
					action: 'action_with_data',
					impact: TransitionImpact.LocalOnly,
					data: { key: 'value', nested: { prop: 123 } }
				} as TestingTransition

				syncEngine.transition(transitionWithData)

				expect(mockWorker.port.postMessage).toHaveBeenLastCalledWith({
					type: UpstreamWorkerMessageType.Transition,
					data: transitionWithData
				})
			})
		})
	})

	describe('Worker Type Detection', () => {
		it('correctly identifies regular Worker and uses postMessage', () => {
			const mockWorker = {
				postMessage: vi.fn()
			} as unknown as Worker

			new BrowserLocalFirst({
				dbName: DB_NAME,
				wsUrl: SOCKET_URL,
				worker: mockWorker
			})

			expect(mockWorker.postMessage).toHaveBeenCalled()
		})

		it('correctly identifies SharedWorker and uses port.postMessage', () => {
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

		it('identifies SharedWorker even with additional properties', () => {
			const mockSharedWorker = {
				port: { postMessage: vi.fn() },
				postMessage: vi.fn(),
				terminate: vi.fn(),
				addEventListener: vi.fn()
			} as unknown as SharedWorker

			const syncEngine = new BrowserLocalFirst<TestingTransition>({
				dbName: DB_NAME,
				wsUrl: SOCKET_URL,
				worker: mockSharedWorker
			})

			syncEngine.transition({
				action: 'test_action',
				impact: TransitionImpact.LocalOnly
			})

			expect(mockSharedWorker.port.postMessage).toHaveBeenCalledTimes(2)
			expect(mockSharedWorker.postMessage).not.toHaveBeenCalled()
		})
	})

	describe('Configuration Validation', () => {
		let mockWorker: Worker
		beforeEach(() => {
			mockWorker = {
				postMessage: vi.fn()
			} as unknown as Worker
		})

		it('accepts valid configuration', () => {
			expect(() => {
				new BrowserLocalFirst({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})
			}).not.toThrow()
		})

		it('handles special characters in database name', () => {
			const specialDbNames = [
				'db-name_with.special@chars123',
				'db name with spaces',
				'db\nwith\nnewlines',
				'db/with/slashes',
				'db.with.dots',
				'db@with@symbols#$%',
				'数据库',  // Unicode characters
				'🚀database🔥'  // Emoji
			]

			specialDbNames.forEach(dbName => {
				const syncEngine = new BrowserLocalFirst({
					dbName,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				expect(mockWorker.postMessage).toHaveBeenCalledWith({
					type: UpstreamWorkerMessageType.Init,
					data: {
						dbName,
						wsUrl: SOCKET_URL
					}
				})
			})
		})

		it('handles different WebSocket URL formats', () => {
			const wsUrls = [
				'ws://localhost:8080',
				'wss://secure.example.com:443/socket',
				'ws://127.0.0.1:3000/realtime',
				'wss://api.example.com/v1/websocket?token=abc123',
				'ws://[::1]:8080',  // IPv6
				'wss://example.com/path/to/socket?param1=value1&param2=value2',
				'ws://user:pass@example.com:8080/socket'  // With auth
			]

			wsUrls.forEach(wsUrl => {
				const syncEngine = new BrowserLocalFirst({
					dbName: DB_NAME,
					wsUrl,
					worker: mockWorker
				})

				expect(mockWorker.postMessage).toHaveBeenCalledWith({
					type: UpstreamWorkerMessageType.Init,
					data: {
						dbName: DB_NAME,
						wsUrl
					}
				})
			})
		})
	})

	describe('Message Call Counting', () => {
		describe('Worker', () => {
			let mockWorker: Worker
			beforeEach(() => {
				mockWorker = {
					postMessage: vi.fn()
				} as unknown as Worker
			})

			it('calls postMessage exactly once during initialization', () => {
				new BrowserLocalFirst({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				expect(mockWorker.postMessage).toHaveBeenCalledTimes(1)
			})

			it('increments postMessage calls with each transition', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				expect(mockWorker.postMessage).toHaveBeenCalledTimes(1)

				syncEngine.transition({
					action: 'first_transition',
					impact: TransitionImpact.LocalOnly
				})

				expect(mockWorker.postMessage).toHaveBeenCalledTimes(2)

				syncEngine.transition({
					action: 'second_transition',
					impact: TransitionImpact.SomethingElse
				})

				expect(mockWorker.postMessage).toHaveBeenCalledTimes(3)
			})

			it('maintains accurate call count over many operations', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				const numberOfTransitions = 50
				for (let i = 0; i < numberOfTransitions; i++) {
					syncEngine.transition({
						action: `transition_${i}`,
						impact: i % 2 === 0 ? TransitionImpact.LocalOnly : TransitionImpact.SomethingElse
					})
				}

				// Init + numberOfTransitions
				expect(mockWorker.postMessage).toHaveBeenCalledTimes(1 + numberOfTransitions)
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

			it('never calls direct postMessage on SharedWorker', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				// Multiple operations
				for (let i = 0; i < 5; i++) {
					syncEngine.transition({
						action: `test_transition_${i}`,
						impact: TransitionImpact.LocalOnly
					})
				}

				expect(mockWorker.postMessage).toHaveBeenCalledTimes(0)
				expect(mockWorker.port.postMessage).toHaveBeenCalledTimes(6) // init + 5 transitions
			})

			it('maintains separate call counts for port and direct postMessage', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				expect(mockWorker.port.postMessage).toHaveBeenCalledTimes(1)
				expect(mockWorker.postMessage).toHaveBeenCalledTimes(0)

				syncEngine.transition({
					action: 'test',
					impact: TransitionImpact.LocalOnly
				})

				expect(mockWorker.port.postMessage).toHaveBeenCalledTimes(2)
				expect(mockWorker.postMessage).toHaveBeenCalledTimes(0)
			})
		})
	})

	describe('Message Content Validation', () => {
		describe('Worker', () => {
			let mockWorker: Worker
			beforeEach(() => {
				mockWorker = {
					postMessage: vi.fn()
				} as unknown as Worker
			})

			it('sends correct message structure for initialization', () => {
				new BrowserLocalFirst({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				const initMessage = (mockWorker.postMessage as any).mock.calls[0][0]
				expect(initMessage).toHaveProperty('type', UpstreamWorkerMessageType.Init)
				expect(initMessage).toHaveProperty('data')
				expect(initMessage.data).toHaveProperty('dbName', DB_NAME)
				expect(initMessage.data).toHaveProperty('wsUrl', SOCKET_URL)
			})

			it('sends correct message structure for transitions', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				const testTransition = {
					action: 'test_action',
					impact: TransitionImpact.LocalOnly
				}

				syncEngine.transition(testTransition)

				const transitionMessage = (mockWorker.postMessage as any).mock.calls[1][0]
				expect(transitionMessage).toHaveProperty('type', UpstreamWorkerMessageType.Transition)
				expect(transitionMessage).toHaveProperty('data', testTransition)
			})
		})
	})

	describe('Instance Management', () => {
		it('can create multiple instances with different configurations', () => {
			const mockWorker1 = { postMessage: vi.fn() } as unknown as Worker
			const mockWorker2 = { postMessage: vi.fn() } as unknown as Worker

			const instance1 = new BrowserLocalFirst({
				dbName: 'db1',
				wsUrl: 'ws://localhost:8080',
				worker: mockWorker1
			})

			const instance2 = new BrowserLocalFirst({
				dbName: 'db2',
				wsUrl: 'ws://localhost:9090',
				worker: mockWorker2
			})

			expect(mockWorker1.postMessage).toHaveBeenCalledWith({
				type: UpstreamWorkerMessageType.Init,
				data: { dbName: 'db1', wsUrl: 'ws://localhost:8080' }
			})

			expect(mockWorker2.postMessage).toHaveBeenCalledWith({
				type: UpstreamWorkerMessageType.Init,
				data: { dbName: 'db2', wsUrl: 'ws://localhost:9090' }
			})
		})

		it('instances operate independently', () => {
			const mockWorker1 = { postMessage: vi.fn() } as unknown as Worker
			const mockWorker2 = { postMessage: vi.fn() } as unknown as Worker

			const instance1 = new BrowserLocalFirst<TestingTransition>({
				dbName: 'db1',
				wsUrl: 'ws://localhost:8080',
				worker: mockWorker1
			})

			const instance2 = new BrowserLocalFirst<TestingTransition>({
				dbName: 'db2',
				wsUrl: 'ws://localhost:9090',
				worker: mockWorker2
			})

			instance1.transition({
				action: 'action1',
				impact: TransitionImpact.LocalOnly
			})

			instance2.transition({
				action: 'action2',
				impact: TransitionImpact.SomethingElse
			})

			expect(mockWorker1.postMessage).toHaveBeenCalledTimes(2)
			expect(mockWorker2.postMessage).toHaveBeenCalledTimes(2)

			expect(mockWorker1.postMessage).toHaveBeenLastCalledWith({
				type: UpstreamWorkerMessageType.Transition,
				data: { action: 'action1', impact: TransitionImpact.LocalOnly }
			})

			expect(mockWorker2.postMessage).toHaveBeenLastCalledWith({
				type: UpstreamWorkerMessageType.Transition,
				data: { action: 'action2', impact: TransitionImpact.SomethingElse }
			})
		})
	})
