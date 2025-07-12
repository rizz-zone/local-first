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

		machine.send({ type: 'ws connected' })
		expect(machine.getSnapshot().value.websocket).toBe('connected')

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
		// Try to send another event - should remain in leader state
		machine.send({ type: 'db connected' })

		const snapshot = machine.getSnapshot()
		expect(snapshot.value.superiority).toBe('leader')
	})
})