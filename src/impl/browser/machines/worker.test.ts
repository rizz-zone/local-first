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

				const callback = assignedCallback
				if (!callback) {
					throw new Error('assignedCallback is undefined')
				}
				callback()

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

				const callback = assignedCallback
				if (!callback) {
					throw new Error('assignedCallback is undefined')
				}
				const promise = callback()
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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
			})) as unknown as typeof WebSocket
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

	describe('WebSocket onopen callback', () => {
		let WebSocketOriginal: typeof WebSocket
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
			const MockWebSocket = vi.fn().mockImplementation(() => mockSocket) as unknown as typeof WebSocket
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
			const MockWebSocket = vi.fn().mockImplementation(() => mockSocket) as unknown as typeof WebSocket
			globalThis.WebSocket = MockWebSocket

			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: 'jerry'
			})

			expect(machine.getSnapshot().value.websocket).toBe('disconnected')

			if (typeof mockSocket.onopen === 'function') {
				mockSocket.onopen()
			} else {
				throw new Error('onopen callback not set')
			}

			expect(machine.getSnapshot().value.websocket).toBe('connected')
		})
	})

	describe('edge case event combinations', () => {
		it('does nothing', () => {})
	})
})