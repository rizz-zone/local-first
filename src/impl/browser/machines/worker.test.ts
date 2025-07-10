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
	it('starts with no connections', () => {
		const machine = createActor(clientMachine)
		machine.start()

		const snapshot = machine.getSnapshot()
		expect(snapshot.value).toEqual({
			websocket: 'disconnected',
			db: 'disconnected'
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

			expect(WebSocketMock).toHaveBeenCalledTimes(0)
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
				db: 'disconnected'
			})
		})
	})
})
