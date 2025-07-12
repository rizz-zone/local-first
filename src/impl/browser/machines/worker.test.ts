import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest'
import { clientMachine } from './worker'
import { createActor } from 'xstate'
import { http, ws } from 'msw'
import { setupServer } from 'msw/node'
import { SOCKET_URL } from '../../../testing/constants'

const socketEndpoint = ws.link(SOCKET_URL)
const server = setupServer(
	socketEndpoint.addEventListener('connection', (server) => {
		server.server.connect()
	}),
	// We shouldn't need this but msw complains (without an error) if we don't have it
	http.get(SOCKET_URL.replace('wss', 'https'), () => {
		return new Response()
	})
)

describe('worker machine', () => {
	let assignedCallback: undefined | (() => Promise<unknown>)
	const lockMethod = vi.fn().mockImplementation(
		(_: string, callback: () => Promise<unknown>) =>
			new Promise<void>((resolve) => {
				assignedCallback = callback
				resolve()
			})
	)
	beforeAll(() => {
		// @ts-expect-error navigator.locks doesn't exist in jsdom
		navigator.locks = {
			request: lockMethod
		}
	})

	it('starts with no connections', () => {
		const machine = createActor(clientMachine)
		machine.start()

		const snapshot = machine.getSnapshot()
		expect(snapshot.value).toEqual({
			websocket: 'disconnected',
			db: 'disconnected',
			superiority: 'follower'
		})
	})

	describe('socket setup', () => {
		let WebSocketOriginal: typeof WebSocket
		let WebSocketMock: typeof WebSocket
		beforeAll(() => {
			WebSocketOriginal = globalThis.WebSocket
		})
		beforeEach(() => {
			WebSocketMock = vi.fn() as unknown as typeof WebSocket
			globalThis.WebSocket = WebSocketMock
		})
		afterAll(() => {
			globalThis.WebSocket = WebSocketOriginal
		})

		it('does not set a websocket up before init', () => {
			const machine = createActor(clientMachine)
			machine.start()
			const { context } = machine.getSnapshot()

			expect(WebSocketMock).not.toBeCalled()
			expect(context.socket).toBeUndefined()
			expect(context.wsUrl).toBeUndefined()
		})
		it('sets a websocket up after init', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})
			const { context } = machine.getSnapshot()

			expect(WebSocketMock).toHaveBeenCalledExactlyOnceWith(SOCKET_URL)
			expect(context.socket).toBeInstanceOf(WebSocket)
			expect(context.wsUrl).toBe(SOCKET_URL)
		})
	})

	describe('socket use', () => {
		beforeAll(() => server.listen())
		afterEach(() => server.resetHandlers())
		afterAll(() => server.close())

		it('changes state after successfully connecting', async () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			await vi.waitUntil(
				() => machine.getSnapshot().value.websocket === 'connected',
				{ timeout: 500, interval: 20 }
			)

			expect(machine.getSnapshot().value).toEqual({
				websocket: 'connected',
				db: 'disconnected',
				superiority: 'follower'
			})
		})
	})

	describe('locking', () => {
		const clear = () => {
			lockMethod.mockClear()
			assignedCallback = undefined
		}
		beforeAll(clear)
		afterEach(clear)

		it('does not request a lock before init', () => {
			const machine = createActor(clientMachine)
			machine.start()

			const snapshot = machine.getSnapshot()
			expect(snapshot.value.superiority).toBe('follower')
			expect(lockMethod).not.toBeCalled()
		})
		it('requests a lock on init', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			const snapshot = machine.getSnapshot()
			// while the lock will still be requested at this point we won't instantly get it
			expect(snapshot.value.superiority).toEqual('follower')
			expect(lockMethod).toHaveBeenCalledOnce()
		})

		describe('callback', () => {
			it('makes this worker superior when called', () => {
				const machine = createActor(clientMachine)
				machine.start()
				machine.send({
					type: 'init',
					wsUrl: SOCKET_URL,
					dbName: 'jerry'
				})
				expect(lockMethod).toHaveBeenCalledOnce()
				expect(assignedCallback).toBeDefined()

				assignedCallback?.()
				vi.waitUntil(
					() => {
						const snapshot = machine.getSnapshot()
						return snapshot.value.superiority === 'leader'
					},
					{
						timeout: 500,
						interval: 5
					}
				)

				const snapshot = machine.getSnapshot()
				expect(snapshot.value.superiority).toEqual('leader')
			})

			it('does not resolve the promise returned by the callback', async () => {
				const machine = createActor(clientMachine)
				machine.start()
				machine.send({
					type: 'init',
					wsUrl: SOCKET_URL,
					dbName: 'jerry'
				})
				expect(lockMethod).toHaveBeenCalledOnce()
				expect(assignedCallback).toBeDefined()

				const promise = assignedCallback?.() as Promise<unknown>
				const timeout = new Promise((resolve) => {
					setTimeout(() => {
						resolve('not resolved')
					}, 600)
				})

				await expect(Promise.race([promise, timeout])).resolves.toBe(
					'not resolved'
				)
			})
		})
	})
})

	describe('database state management', () => {
		let WebSocketOriginal: typeof WebSocket
		beforeAll(() => {
			WebSocketOriginal = globalThis.WebSocket
			globalThis.WebSocket = vi.fn().mockImplementation(() => ({
				onopen: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				close: vi.fn(),
				send: vi.fn(),
				readyState: WebSocket.CONNECTING
			}))
		})
		afterAll(() => {
			globalThis.WebSocket = WebSocketOriginal
		})

		it('transitions to connected state on db connected event', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'test-db'
			})

			machine.send({ type: 'db connected' })

			const snapshot = machine.getSnapshot()
			expect(snapshot.value.db).toBe('connected')
		})

		it('transitions to will never connect state on db cannot connect event', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'test-db'
			})

			machine.send({ type: 'db cannot connect' })

			const snapshot = machine.getSnapshot()
			expect(snapshot.value.db).toBe('will never connect')
		})

		it('appends .sqlite extension to database name', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'mydb'
			})

			const { context } = machine.getSnapshot()
			expect(context.dbName).toBe('mydb.sqlite')
		})

		it('handles database name with special characters', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'test-db_123'
			})

			const { context } = machine.getSnapshot()
			expect(context.dbName).toBe('test-db_123.sqlite')
		})

		it('maintains final state after reaching connected', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'test-db'
			})

			machine.send({ type: 'db connected' })
			
			// Try to send another event - should remain in connected state
			machine.send({ type: 'db cannot connect' })

			const snapshot = machine.getSnapshot()
			expect(snapshot.value.db).toBe('connected')
		})
	})

	describe('websocket error scenarios', () => {
		let WebSocketOriginal: typeof WebSocket
		let mockSocket: any
		beforeAll(() => {
			WebSocketOriginal = globalThis.WebSocket
		})
		beforeEach(() => {
			mockSocket = {
				onopen: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				close: vi.fn(),
				send: vi.fn(),
				readyState: WebSocket.CONNECTING
			}
			globalThis.WebSocket = vi.fn().mockReturnValue(mockSocket)
		})
		afterAll(() => {
			globalThis.WebSocket = WebSocketOriginal
		})

		it('handles websocket disconnection events', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			// Simulate connected state first
			machine.send({ type: 'ws connected' })
			expect(machine.getSnapshot().value.websocket).toBe('connected')

			// Simulate disconnection
			machine.send({ type: 'ws connection issue' })
			const snapshot = machine.getSnapshot()
			expect(snapshot.value.websocket).toBe('disconnected')
		})

		it('sets up websocket onopen handler correctly', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			expect(mockSocket.onopen).toBeTypeOf('function')
		})

		it('triggers ws connected event when socket opens', () => {
			const machine = createActor(clientMachine)
			machine.start()
			
			const sendSpy = vi.spyOn(machine, 'send')
			
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			// Simulate socket opening
			if (mockSocket.onopen) {
				mockSocket.onopen()
			}

			expect(sendSpy).toHaveBeenCalledWith({ type: 'ws connected' })
		})

		it('handles websocket URL changes properly', () => {
			const machine = createActor(clientMachine)
			machine.start()

			machine.send({
				type: 'init',
				wsUrl: 'wss://first-url.com',
				dbName: 'jerry'
			})

			const firstContext = machine.getSnapshot().context
			expect(firstContext.wsUrl).toBe('wss://first-url.com')

			machine.send({
				type: 'init',
				wsUrl: 'wss://second-url.com',
				dbName: 'jerry'
			})

			const secondContext = machine.getSnapshot().context
			expect(secondContext.wsUrl).toBe('wss://second-url.com')
		})
	})

	describe('leadership and locking behavior', () => {
		const clear = () => {
			lockMethod.mockClear()
			assignedCallback = undefined
		}
		beforeAll(() => {
			globalThis.WebSocket = vi.fn().mockImplementation(() => ({
				onopen: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				close: vi.fn(),
				send: vi.fn(),
				readyState: WebSocket.CONNECTING
			}))
		})
		beforeEach(clear)
		afterEach(clear)

		it('uses correct lock name', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			expect(lockMethod).toHaveBeenCalledWith(
				'leader',
				expect.any(Function)
			)
		})

		it('transitions to leader state when lock is acquired', async () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			// Manually trigger leader lock acquired
			machine.send({ type: 'leader lock acquired' })

			await vi.waitUntil(
				() => {
					const snapshot = machine.getSnapshot()
					return snapshot.value.superiority === 'leader'
				},
				{ timeout: 500, interval: 5 }
			)

			const snapshot = machine.getSnapshot()
			expect(snapshot.value.superiority).toBe('leader')
		})

		it('maintains leader state once acquired', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			machine.send({ type: 'leader lock acquired' })
			
			const snapshot1 = machine.getSnapshot()
			expect(snapshot1.value.superiority).toBe('leader')

			// Try to send init again - should remain leader
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			const snapshot2 = machine.getSnapshot()
			expect(snapshot2.value.superiority).toBe('leader')
		})

		it('lock callback returns never-resolving promise', async () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			expect(assignedCallback).toBeDefined()

			const callbackPromise = assignedCallback?.()
			expect(callbackPromise).toBeInstanceOf(Promise)

			// Promise should never resolve
			const timeoutPromise = new Promise(resolve => 
				setTimeout(() => resolve('timeout'), 100)
			)

			const result = await Promise.race([callbackPromise, timeoutPromise])
			expect(result).toBe('timeout')
		})
	})

	describe('parallel state management', () => {
		let WebSocketOriginal: typeof WebSocket
		beforeAll(() => {
			WebSocketOriginal = globalThis.WebSocket
			globalThis.WebSocket = vi.fn().mockImplementation(() => ({
				onopen: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				close: vi.fn(),
				send: vi.fn(),
				readyState: WebSocket.CONNECTING
			}))
		})
		afterAll(() => {
			globalThis.WebSocket = WebSocketOriginal
		})

		it('manages all three parallel states independently', () => {
			const machine = createActor(clientMachine)
			machine.start()

			const initialSnapshot = machine.getSnapshot()
			expect(initialSnapshot.value).toEqual({
				websocket: 'disconnected',
				db: 'disconnected',
				superiority: 'follower'
			})

			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			machine.send({ type: 'ws connected' })
			machine.send({ type: 'db connected' })
			machine.send({ type: 'leader lock acquired' })

			const finalSnapshot = machine.getSnapshot()
			expect(finalSnapshot.value).toEqual({
				websocket: 'connected',
				db: 'connected',
				superiority: 'leader'
			})
		})

		it('allows partial state transitions', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			// Only connect websocket, leave others
			machine.send({ type: 'ws connected' })

			const snapshot = machine.getSnapshot()
			expect(snapshot.value).toEqual({
				websocket: 'connected',
				db: 'disconnected',
				superiority: 'follower'
			})
		})

		it('handles state transitions in different orders', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			// Connect in reverse order: leader -> db -> websocket
			machine.send({ type: 'leader lock acquired' })
			machine.send({ type: 'db connected' })
			machine.send({ type: 'ws connected' })

			const snapshot = machine.getSnapshot()
			expect(snapshot.value).toEqual({
				websocket: 'connected',
				db: 'connected',
				superiority: 'leader'
			})
		})
	})

	describe('context management and data integrity', () => {
		let WebSocketOriginal: typeof WebSocket
		beforeAll(() => {
			WebSocketOriginal = globalThis.WebSocket
			globalThis.WebSocket = vi.fn().mockImplementation(() => ({
				onopen: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				close: vi.fn(),
				send: vi.fn(),
				readyState: WebSocket.CONNECTING
			}))
		})
		afterAll(() => {
			globalThis.WebSocket = WebSocketOriginal
		})

		it('preserves context data across state transitions', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'persistent-db'
			})

			const initialContext = machine.getSnapshot().context

			// Transition through various states
			machine.send({ type: 'ws connected' })
			machine.send({ type: 'db connected' })
			machine.send({ type: 'leader lock acquired' })

			const finalContext = machine.getSnapshot().context
			expect(finalContext.wsUrl).toBe(initialContext.wsUrl)
			expect(finalContext.dbName).toBe(initialContext.dbName)
			expect(finalContext.socket).toBe(initialContext.socket)
		})

		it('handles missing context properties gracefully', () => {
			const machine = createActor(clientMachine)
			machine.start()

			const { context } = machine.getSnapshot()
			expect(context.socket).toBeUndefined()
			expect(context.wsUrl).toBeUndefined()
			expect(context.dbName).toBeUndefined()
		})

		it('maintains WebSocket instance reference', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			const { context } = machine.getSnapshot()
			expect(context.socket).toBeInstanceOf(WebSocket)
			expect(context.socket).toBe(context.socket) // Reference equality
		})
	})

	describe('event handling edge cases', () => {
		let WebSocketOriginal: typeof WebSocket
		beforeAll(() => {
			WebSocketOriginal = globalThis.WebSocket
			globalThis.WebSocket = vi.fn().mockImplementation(() => ({
				onopen: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				close: vi.fn(),
				send: vi.fn(),
				readyState: WebSocket.CONNECTING
			}))
		})
		afterAll(() => {
			globalThis.WebSocket = WebSocketOriginal
		})

		it('ignores unknown events gracefully', () => {
			const machine = createActor(clientMachine)
			machine.start()

			const initialSnapshot = machine.getSnapshot()

			// Send unknown event
			machine.send({ type: 'unknown event' } as any)

			const finalSnapshot = machine.getSnapshot()
			expect(finalSnapshot.value).toEqual(initialSnapshot.value)
		})

		it('handles events sent before init', () => {
			const machine = createActor(clientMachine)
			machine.start()

			// Try to connect websocket before init
			machine.send({ type: 'ws connected' })

			const snapshot = machine.getSnapshot()
			expect(snapshot.value.websocket).toBe('disconnected')
		})

		it('handles multiple rapid events correctly', () => {
			const machine = createActor(clientMachine)
			machine.start()

			// Send rapid sequence of events
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})
			machine.send({ type: 'ws connected' })
			machine.send({ type: 'ws connection issue' })
			machine.send({ type: 'ws connected' })

			const snapshot = machine.getSnapshot()
			expect(snapshot.value.websocket).toBe('connected')
		})

		it('processes events in correct order', async () => {
			const machine = createActor(clientMachine)
			machine.start()

			const events = []
			const originalSend = machine.send.bind(machine)
			machine.send = (event: any) => {
				events.push(event.type)
				return originalSend(event)
			}

			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})
			machine.send({ type: 'ws connected' })
			machine.send({ type: 'db connected' })

			expect(events).toEqual(['init', 'ws connected', 'db connected'])
		})
	})

	describe('machine lifecycle and cleanup', () => {
		let WebSocketOriginal: typeof WebSocket
		let mockSocket: any
		beforeAll(() => {
			WebSocketOriginal = globalThis.WebSocket
		})
		beforeEach(() => {
			mockSocket = {
				onopen: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				close: vi.fn(),
				send: vi.fn(),
				readyState: WebSocket.CONNECTING
			}
			globalThis.WebSocket = vi.fn().mockReturnValue(mockSocket)
		})
		afterAll(() => {
			globalThis.WebSocket = WebSocketOriginal
		})

		it('can be started and stopped multiple times', () => {
			const machine = createActor(clientMachine)
			
			expect(() => {
				machine.start()
				machine.stop()
				machine.start()
				machine.stop()
			}).not.toThrow()
		})

		it('maintains state consistency after stop/start', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			const snapshot1 = machine.getSnapshot()
			machine.stop()
			machine.start()
			const snapshot2 = machine.getSnapshot()

			// After restart, should return to initial state
			expect(snapshot2.value).toEqual({
				websocket: 'disconnected',
				db: 'disconnected',
				superiority: 'follower'
			})
		})

		it('handles stop when not started', () => {
			const machine = createActor(clientMachine)
			expect(() => machine.stop()).not.toThrow()
		})
	})
})
