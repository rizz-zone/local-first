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
	http.get(SOCKET_URL.replace('wss', 'https'), () => new Response())
)

describe('worker machine', () => {
	let assignedCallback: (() => Promise<unknown>) | undefined
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

			expect(WebSocketMock).toHaveBeenCalledOnce()
			expect(WebSocketMock).toHaveBeenCalledWith(SOCKET_URL)
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
			expect(snapshot.value.superiority).toEqual('follower')
			expect(lockMethod).toHaveBeenCalledOnce()
		})

		describe('callback', () => {
			it('makes this worker superior when called', async () => {
				const machine = createActor(clientMachine)
				machine.start()
				machine.send({
					type: 'init',
					wsUrl: SOCKET_URL,
					dbName: 'jerry'
				})
				expect(lockMethod).toHaveBeenCalledOnce()
				expect(assignedCallback).toBeDefined()

				await assignedCallback!()

				await vi.waitUntil(
					() => machine.getSnapshot().value.superiority === 'leader',
					{ timeout: 500, interval: 5 }
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

				const promise = assignedCallback!()
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

	describe('database state transitions', () => {
		it('can transition to connected state', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			machine.send({ type: 'db connected' })

			const snapshot = machine.getSnapshot()
			expect(snapshot.value.db).toBe('connected')
		})

		it('can transition to will never connect state', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			machine.send({ type: 'db cannot connect' })

			const snapshot = machine.getSnapshot()
			expect(snapshot.value.db).toBe('will never connect')
		})

		it('appends .sqlite to database name on init', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'test-db'
			})

			const { context } = machine.getSnapshot()
			expect(context.dbName).toBe('test-db.sqlite')
		})

		it('handles database events before init gracefully', () => {
			const machine = createActor(clientMachine)
			machine.start()

			machine.send({ type: 'db connected' })
			machine.send({ type: 'db cannot connect' })

			const snapshot = machine.getSnapshot()
			expect(snapshot.value.db).toBe('will never connect')
		})
	})

	describe('websocket connection error handling', () => {
		let WebSocketOriginal: typeof WebSocket
		let MockWebSocket: any

		beforeAll(() => {
			WebSocketOriginal = globalThis.WebSocket
		})
		afterEach(() => {
			globalThis.WebSocket = WebSocketOriginal
		})

		it('handles ws connection issue event', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			machine.send({ type: 'ws connected' })
			expect(machine.getSnapshot().value.websocket).toBe('connected')

			machine.send({ type: 'ws connection issue' })
			const snapshot = machine.getSnapshot()
			expect(snapshot.value.websocket).toBe('disconnected')
		})

		it('creates new WebSocket on multiple inits', () => {
			MockWebSocket = vi.fn().mockImplementation(() => ({
				onopen: null,
				close: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
			globalThis.WebSocket = MockWebSocket

			const machine = createActor(clientMachine)
			machine.start()

			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})
			expect(MockWebSocket).toHaveBeenCalledTimes(2)

			machine.send({
				type: 'init',
				wsUrl: 'wss://different.com',
				dbName: 'tom'
			})
			expect(MockWebSocket).toHaveBeenCalledTimes(3)
		})
	})

	describe('parallel state management', () => {
		it('manages all three parallel states independently', () => {
			const machine = createActor(clientMachine)
			machine.start()

			let snapshot = machine.getSnapshot()
			expect(snapshot.value).toEqual({
				websocket: 'disconnected',
				db: 'disconnected',
				superiority: 'follower'
			})

			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			snapshot = machine.getSnapshot()
			expect(snapshot.value.websocket).toBe('disconnected')
			expect(snapshot.value.db).toBe('disconnected')
			expect(snapshot.value.superiority).toBe('follower')

			machine.send({ type: 'ws connected' })
			snapshot = machine.getSnapshot()
			expect(snapshot.value.websocket).toBe('connected')
			expect(snapshot.value.db).toBe('disconnected')
			expect(snapshot.value.superiority).toBe('follower')

			machine.send({ type: 'db connected' })
			snapshot = machine.getSnapshot()
			expect(snapshot.value.websocket).toBe('connected')
			expect(snapshot.value.db).toBe('connected')
			expect(snapshot.value.superiority).toBe('follower')
		})

		it('handles final states correctly', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			machine.send({ type: 'db connected' })
			assignedCallback!()

			const snapshot = machine.getSnapshot()
			expect(snapshot.value.db).toBe('connected')
			expect(snapshot.value.superiority).toBe('leader')
		})
	})

	describe('context mutation edge cases', () => {
		it('preserves existing context when wsUrl is missing in establishSocket', () => {
			const machine = createActor(clientMachine)
			machine.start()

			const snapshot = machine.getSnapshot()
			expect(snapshot.context.socket).toBeUndefined()
			expect(snapshot.context.wsUrl).toBeUndefined()
		})

		it('handles context updates correctly for non-init events', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			const beforeSnapshot = machine.getSnapshot()
			const initialContext = { ...beforeSnapshot.context }

			machine.send({ type: 'ws connected' })
			const afterSnapshot = machine.getSnapshot()
			expect(afterSnapshot.context.wsUrl).toBe(initialContext.wsUrl)
			expect(afterSnapshot.context.dbName).toBe(initialContext.dbName)
		})
	})

	describe('navigator.locks integration', () => {
		const originalLocks = navigator.locks

		afterAll(() => {
			// @ts-expect-error Restore original locks
			navigator.locks = originalLocks
		})

		it('calls navigator.locks.request with correct parameters', () => {
			const requestSpy = vi.fn().mockImplementation(
				(name: string, callback: () => Promise<unknown>) => {
					expect(name).toBe('leader')
					expect(typeof callback).toBe('function')
					return Promise.resolve()
				}
			)
			// @ts-expect-error Mock navigator.locks
			navigator.locks = { request: requestSpy }

			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			expect(requestSpy).toHaveBeenCalledOnce()
		})

		it('handles missing navigator.locks gracefully', () => {
			// @ts-expect-error Remove navigator.locks
			delete (navigator as any).locks

			expect(() => {
				const machine = createActor(clientMachine)
				machine.start()
				machine.send({
					type: 'init',
					wsUrl: SOCKET_URL,
					dbName: 'jerry'
				})
			}).toThrow()
		})
	})

	describe('WebSocket onopen callback', () => {
		let WebSocketOriginal: typeof WebSocket
		let mockSocket: any

		beforeAll(() => {
			WebSocketOriginal = globalThis.WebSocket
		})
		afterEach(() => {
			globalThis.WebSocket = WebSocketOriginal
		})

		it('sets up onopen callback correctly', () => {
			mockSocket = {
				onopen: null,
				close: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}
			const MockWebSocket = vi.fn().mockImplementation(() => mockSocket)
			globalThis.WebSocket = MockWebSocket

			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			expect(typeof mockSocket.onopen).toBe('function')
		})

		it('onopen callback sends ws connected event', () => {
			mockSocket = {
				onopen: null,
				close: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}
			const MockWebSocket = vi.fn().mockImplementation(() => mockSocket)
			globalThis.WebSocket = MockWebSocket

			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			expect(machine.getSnapshot().value.websocket).toBe('disconnected')

			mockSocket.onopen!()

			expect(machine.getSnapshot().value.websocket).toBe('connected')
		})
	})

	describe('edge case event combinations', () => {
		it('handles events sent before machine is started', () => {
			const machine = createActor(clientMachine)
			// @ts-expect-error send before start
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})
			machine.start()

			const snapshot = machine.getSnapshot()
			expect(snapshot.context.wsUrl).toBeUndefined()
			expect(snapshot.context.dbName).toBeUndefined()
		})

		it('handles rapid state transitions', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			machine.send({ type: 'ws connected' })
			machine.send({ type: 'ws connection issue' })
			machine.send({ type: 'ws connected' })
			machine.send({ type: 'db connected' })
			machine.send({ type: 'db cannot connect' })

			const snapshot = machine.getSnapshot()
			expect(snapshot.value.websocket).toBe('connected')
			expect(snapshot.value.db).toBe('will never connect')
		})

		it('maintains state consistency during complex transitions', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})
			machine.send({ type: 'ws connected' })
			machine.send({ type: 'db connected' })
			assignedCallback!()

			const snapshot = machine.getSnapshot()
			expect(snapshot.value).toEqual({
				websocket: 'connected',
				db: 'connected',
				superiority: 'leader'
			})
			expect(snapshot.context.wsUrl).toBe(SOCKET_URL)
			expect(snapshot.context.dbName).toBe('jerry.sqlite')
		})
	})

	describe('type safety and validation', () => {
		it('accepts properly typed init events', () => {
			const machine = createActor(clientMachine)
			machine.start()

			machine.send({
				type: 'init',
				wsUrl: 'wss://example.com',
				dbName: 'test'
			})
			machine.send({ type: 'ws connected' })
			machine.send({ type: 'ws connection issue' })
			machine.send({ type: 'db connected' })
			machine.send({ type: 'db cannot connect' })
			machine.send({ type: 'leader lock acquired' })

			expect(machine.getSnapshot()).toBeDefined()
		})

		it('handles string variations in dbName', () => {
			const machine = createActor(clientMachine)
			machine.start()

			const testCases = [
				'simple',
				'with-dashes',
				'with_underscores',
				'with123numbers',
				'UPPERCASE',
				'mixedCase',
				'very-long-database-name-with-many-characters'
			]

			testCases.forEach((dbName) => {
				machine.send({
					type: 'init',
					wsUrl: SOCKET_URL,
					dbName
				})

				const snapshot = machine.getSnapshot()
				expect(snapshot.context.dbName).toBe(`${dbName}.sqlite`)
			})
		})
	})
})